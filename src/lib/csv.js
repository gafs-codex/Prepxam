// Rows -> a CSV that Excel opens correctly.
export function toCsv(headers, rows) {
    const cell = (value) => {
        let text = value === null || value === undefined ? "" : String(value);
        // a leading = + - @ can run as a formula in Excel, so mark it as text
        if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(filename, csv) {
    // the BOM makes Excel read names with accents correctly
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// CSV text -> rows of cells. Handles quotes, line breaks inside quotes, and ; separated files.
export function parseCsv(text) {
    const clean = text.replace(/^\uFEFF/, "");
    const firstLine = clean.split(/\r?\n/)[0] ?? "";
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";

    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    const endRow = () => {
        row.push(cell);
        cell = "";
        if (row.some((c) => c.trim() !== "")) rows.push(row);
        row = [];
    };

    for (let i = 0; i < clean.length; i++) {
        const ch = clean[i];
        if (quoted) {
            if (ch === '"') {
                if (clean[i + 1] === '"') { cell += '"'; i++; }
                else quoted = false;
            } else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === delimiter) { row.push(cell); cell = ""; }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && clean[i + 1] === "\n") i++;
            endRow();
        } else cell += ch;
    }
    endRow();
    return rows;
}