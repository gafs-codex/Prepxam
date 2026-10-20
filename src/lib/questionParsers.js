import { clean } from "@/lib/questionRules"
import { parseCsv } from "@/lib/csv"

const norm = (h) => String(h ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")

// ---------- a table: Excel, CSV, or a table inside a Word document ----------

function fromTable(table) {
    const headerAt = table.findIndex((r) => r.some((c) => clean(c) !== ""))
    if (headerAt < 0) return { items: [] }

    const headers = table[headerAt].map(norm)
    const find = (names) => headers.findIndex((h) => names.includes(h))

    const iQuestion = find(["question", "questions", "questiontext", "q"])
    const iAnswer = find(["answer", "correctanswer", "correctoption", "correct", "key", "ans"])
    const iType = find(["type", "questiontype"])
    const iExplain = find(["explanation", "reason", "solution", "note", "notes"])
    const iSubject = find(["subject"])
    const iExam = find(["examtype", "exam"])

    const optionCols = {}
    headers.forEach((h, i) => {
        const m = h.match(/^(?:option|choice)?([a-f])$/)
        if (m) optionCols[m[1]] = i
    })

    if (iQuestion < 0) return { error: "I couldn't find a Question column. The first row must hold the column names." }
    if (iAnswer < 0) return { error: "I couldn't find an Answer column." }
    if (Object.keys(optionCols).length === 0 && iType < 0) {
        return { error: "I couldn't find option columns (Option A, Option B...)." }
    }

    const items = []
    for (let r = headerAt + 1; r < table.length; r++) {
        const row = table[r]
        if (!row.some((c) => clean(c) !== "")) continue
        const cell = (i) => (i >= 0 ? row[i] ?? "" : "")

        items.push({
            label: `Row ${r + 1}`,
            raw: {
                question: cell(iQuestion),
                type: cell(iType),
                // by letter, so a missing column is reported instead of shifting the answers
                options: ["a", "b", "c", "d", "e", "f"].map((L) => (L in optionCols ? cell(optionCols[L]) : "")),
                answer: cell(iAnswer),
                explanation: cell(iExplain),
                subject: cell(iSubject),
                examType: cell(iExam),
            },
        })
    }
    return { items }
}

async function fromSpreadsheet(file) {
    const XLSX = await import("xlsx")
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]   // only the first sheet is read
    if (!sheet) return { error: "The workbook is empty." }
    const table = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false })
    return fromTable(table)
}

// ---------- Word ----------

const OPTION = /^\(?([A-Fa-f])\s*[.):]\s*(.+)$/
const ANSWER = /^(?:correct\s+)?(?:answer|ans|key)\s*[:=\-–]\s*(.*)$/i
const EXPLAIN = /^(?:explanation|reason|solution|note)\s*[:=\-–]\s*(.*)$/i
const NUMBERED = /^(?:q(?:uestion)?\s*)?(\d{1,4})\s*[.):]\s+(.+)$/i

function paragraphLines(el) {
    const copy = el.cloneNode(true)
    copy.querySelectorAll("br").forEach((br) => br.replaceWith("\n"))
    return copy.textContent.split("\n").map(clean).filter(Boolean)
}

function ownText(li) {
    const copy = li.cloneNode(true)
    copy.querySelectorAll("ol, ul").forEach((n) => n.remove())
    return clean(copy.textContent)
}

function walkList(list, depth, blocks) {
    for (const li of Array.from(list.children)) {
        if (li.tagName !== "LI") continue
        const text = ownText(li)
        if (text) blocks.push({ text, list: true, depth })
        for (const nested of Array.from(li.children)) {
            if (nested.tagName === "OL" || nested.tagName === "UL") walkList(nested, depth + 1, blocks)
        }
    }
}

function collectBlocks(doc) {
    const blocks = []
    for (const el of Array.from(doc.body.children)) {
        if (el.tagName === "OL" || el.tagName === "UL") walkList(el, 0, blocks)
        else if (el.tagName === "TABLE") continue
        else for (const text of paragraphLines(el)) blocks.push({ text, list: false, depth: 0 })
    }
    return blocks
}

function fromBlocks(blocks) {
    const numbered = blocks.some((b) => (b.list ? b.depth === 0 : NUMBERED.test(b.text)))
    const out = []
    let cur = null

    const begin = (text, last) => {
        if (cur) out.push(cur)
        cur = { question: text, options: [], answer: "", explanation: "", stage: "question", last }
    }
    const addOption = (text, last) => {
        const stripped = text.match(OPTION)
        cur.options.push(stripped ? stripped[2] : text)
        cur.stage = "options"
        cur.last = last
    }

    for (const { text, list, depth } of blocks) {
        let m

        if (cur && (m = text.match(ANSWER))) { cur.answer = m[1]; cur.stage = "answer"; cur.last = "answer"; continue }
        if (cur && (m = text.match(EXPLAIN))) { cur.explanation = m[1]; cur.stage = "explanation"; cur.last = "explanation"; continue }

        // an option typed out: "A. Paris"
        if (cur && (cur.stage === "question" || cur.stage === "options") && (m = text.match(OPTION))) {
            cur.options.push(m[2]); cur.stage = "options"; cur.last = "option"; continue
        }

        if (list) {
            // nested list items are the options of the question above
            if (depth >= 1 && cur) { addOption(text, "option"); continue }

            // a top-level list right after a typed question is its options
            const asOption = cur && (
                (cur.stage === "question" && cur.options.length === 0 && (cur.last === "para" || cur.last === "num")) ||
                (cur.stage === "options" && cur.last === "optionli0")
            )
            if (asOption) { addOption(text, "optionli0"); continue }

            const num = text.match(NUMBERED)
            begin(num ? num[2] : text, "li")
            continue
        }

        // "12. What is ..." or "Q12: ..."
        if ((m = text.match(NUMBERED))) { begin(m[2], "num"); continue }

        // a plain paragraph
        if (cur && cur.stage === "question" && cur.options.length === 0) {
            cur.question += " " + text      // the question carries on
            cur.last = "para"
            continue
        }
        if (cur && cur.stage === "explanation" && numbered) { cur.explanation += " " + text; continue }
        begin(text, "para")
    }
    if (cur) out.push(cur)

    return out.map((q, i) => ({
        label: `Question ${i + 1}`,
        raw: { question: q.question, options: q.options, answer: q.answer, explanation: q.explanation },
    }))
}

function cellText(cell) {
    const paragraphs = cell.querySelectorAll("p")
    return clean(paragraphs.length ? Array.from(paragraphs, (p) => p.textContent).join(" ") : cell.textContent)
}

async function fromWord(file) {
    const mod = await import("mammoth/mammoth.browser")
    const mammoth = mod.default ?? mod
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    const doc = new DOMParser().parseFromString(html, "text/html")

    // 1. tables laid out like the Excel sheet
    const tabular = []
    let sawTable = false
    for (const table of Array.from(doc.querySelectorAll("table"))) {
        const rows = Array.from(table.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map(cellText))
        const header = (rows[0] ?? []).map(norm)
        if (!(header.includes("question") || header.includes("questions"))) continue

        sawTable = true
        const res = fromTable(rows)
        if (res.error) return res
        tabular.push(...res.items)
    }
    if (sawTable) return { items: tabular }

    // 2. ordinary text
    const blocks = collectBlocks(doc)
    if (blocks.length === 0) return { error: "I couldn't find any text in that document." }
    const items = fromBlocks(blocks)
    if (items.length === 0) return { error: "I couldn't find any questions. Check the layout against the example on this page." }
    return { items }
}

// ---------- entry point ----------

export async function readQuestionsFile(file) {
    const name = file.name.toLowerCase()
    try {
        if (name.endsWith(".docx")) return await fromWord(file)
        if (name.endsWith(".xlsx") || name.endsWith(".xls")) return await fromSpreadsheet(file)
        if (name.endsWith(".csv")) return fromTable(parseCsv(await file.text()))
        if (name.endsWith(".doc")) {
            return { error: "Old .doc files can't be read. In Word choose File → Save As → Word Document (.docx)." }
        }
        return { error: "Use a Word (.docx) or Excel (.xlsx) file." }
    } catch (err) {
        console.error(err)
        return { error: "That file couldn't be read. Make sure it isn't password-protected or damaged." }
    }
}