export function findExamProblems(exam, questions) {
    const problems = [];

    if (questions.length < exam.number_of_questions) {
        problems.push(`Only ${questions.length} of ${exam.number_of_questions} questions added`);
    }
    if (questions.length > exam.number_of_questions) {
        problems.push(`Has ${questions.length} questions but the target is ${exam.number_of_questions}`);
    }

    questions.forEach((q, i) => {
        const n = i + 1;
        const options = q.options ?? [];

        if (!q.question_text?.trim()) {
            problems.push(`Question ${n} has no text`);
        }
        if (options.length < 2) {
            problems.push(`Question ${n} has fewer than 2 options`);
        }
        if (q.correct_index === null || q.correct_index === undefined || q.correct_index < 0 || q.correct_index >= options.length) {
            problems.push(`Question ${n} has no correct answer marked`);
        }
        if (options.some((o) => !String(o).trim())) {
            problems.push(`Question ${n} has an empty option`);
        }
        const cleaned = options.map((o) => String(o).trim().toLowerCase());
        if (new Set(cleaned).size !== cleaned.length) {
            problems.push(`Question ${n} has duplicate options`);
        }
    });

    return problems;
}