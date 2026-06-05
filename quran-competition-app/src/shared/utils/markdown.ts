/**
 * A simple markdown parser that converts basic markdown elements to HTML.
 * Supports:
 * - Bold: **text** -> <strong>text</strong>
 * - Underline: __text__ or <u>text</u> -> <u>text</u>
 * - Headings: ### title, ## title, # title -> h3, h2, h1
 * - Bullet list items: lines starting with "- " or "* " -> <ul><li>...</li></ul>
 * - Tables: standard markdown tables with pipe separators and header rows.
 * - Line breaks: \n -> <br />
 */
export function parseMarkdownToHtml(markdown: string): string {
    if (!markdown) return '';

    // First replace HTML tags to sanitize but allow <u> and </u> tags for underlines
    let escaped = markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&lt;u&gt;/g, '<u>')
        .replace(/&lt;\/u&gt;/g, '</u>');

    const lines = escaped.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let inTable = false;
    let tableRows: string[][] = [];

    const flushList = () => {
        if (inList) {
            processedLines.push('</ul>');
            inList = false;
        }
    };

    const flushTable = () => {
        if (inTable && tableRows.length > 0) {
            let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid var(--border,#cbd5e1); font-size:14px; text-align:left;">';
            // Check if there is a separator row at index 1 (e.g. |---|---|)
            let startIndex = 0;
            let hasHeaders = false;
            
            if (tableRows.length > 1) {
                const secondRow = tableRows[1];
                const isSeparator = secondRow.every(cell => /^[:-|-]+$/.test(cell.trim()));
                if (isSeparator) {
                    hasHeaders = true;
                }
            }

            if (hasHeaders) {
                tableHtml += '<thead><tr style="background-color:#f1f5f9; border-bottom:2px solid var(--border,#cbd5e1);">';
                tableRows[0].forEach(cell => {
                    tableHtml += `<th style="padding:10px 12px; font-weight:600; border:1px solid var(--border,#cbd5e1);">${parseInline(cell)}</th>`;
                });
                tableHtml += '</tr></thead>';
                startIndex = 2; // Skip header and separator rows
            }

            tableHtml += '<tbody>';
            for (let i = startIndex; i < tableRows.length; i++) {
                tableHtml += '<tr style="border-bottom:1px solid var(--border,#cbd5e1);">';
                tableRows[i].forEach(cell => {
                    tableHtml += `<td style="padding:10px 12px; border:1px solid var(--border,#cbd5e1);">${parseInline(cell)}</td>`;
                });
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table>';
            
            processedLines.push(tableHtml);
            tableRows = [];
            inTable = false;
        }
    };

    const parseInline = (text: string): string => {
        // Bold: **text**
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Underline: __text__
        formatted = formatted.replace(/__(.*?)__/g, '<u>$1</u>');
        return formatted;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Handle Table
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            flushList();
            inTable = true;
            // Split by '|' and remove the first and last empty elements
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            tableRows.push(cells);
            continue;
        } else {
            flushTable();
        }

        // Handle Headings
        if (trimmed.startsWith('### ')) {
            flushList();
            processedLines.push(`<h3 style="margin-top:16px; margin-bottom:8px; font-weight:600; color:var(--text-h);">${parseInline(trimmed.substring(4))}</h3>`);
            continue;
        }
        if (trimmed.startsWith('## ')) {
            flushList();
            processedLines.push(`<h2 style="margin-top:20px; margin-bottom:10px; font-weight:700; color:var(--text-h);">${parseInline(trimmed.substring(3))}</h2>`);
            continue;
        }
        if (trimmed.startsWith('# ')) {
            flushList();
            processedLines.push(`<h1 style="margin-top:24px; margin-bottom:12px; font-weight:800; color:var(--text-h);">${parseInline(trimmed.substring(2))}</h1>`);
            continue;
        }

        // Handle Bullet Lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) {
                processedLines.push('<ul style="margin:8px 0; padding-left:20px; list-style-type:disc;">');
                inList = true;
            }
            processedLines.push(`<li style="margin-bottom:4px;">${parseInline(trimmed.substring(2))}</li>`);
            continue;
        } else {
            flushList();
        }

        // Blank lines
        if (trimmed === '') {
            processedLines.push('<br />');
        } else {
            processedLines.push(parseInline(line));
        }
    }

    // Flush any remaining tags
    flushList();
    flushTable();

    return processedLines.join('\n');
}
