

const COMPETITION_TITLE = 'Quran Hifz Competition 2026';



export function getCompactJuzLabel(code: string): string {
    if (!code) return '';
    const mapping: Record<string, string> = {
        '2630': '26-30',
        '0105': '1-5',
        '0030': '30',
        '01102630': '1-10, 26-30',
        '0115': '1-15',
        '1530': '15-30'
    };
    return mapping[code] || code;
}

export function generateVenueListHTML(venueName: string, candidates: any[], _venueSlots: any[], judges: any[] = []): string {
    const rows = candidates.map((c, index) => {
        const instName = c.expand?.institution_ref?.name || '—';
        const categoryLabel = c.category === '5_juz' ? '5 Juz' : c.category === '15_juz' ? '15 Juz' : '30 Juz';
        const juzOptionLabel = getCompactJuzLabel(c.juzz_options || c.selected_juz);

        return `
            <tr>
                <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; font-weight: bold;">${c.allocated_order || index + 1}</td>
                <td style="padding: 8px 6px; border: 1px solid #94a3b8; font-weight: bold;">${c.full_name}</td>
                <td style="padding: 8px 6px; border: 1px solid #94a3b8; font-family: monospace; font-size: 12px; text-align: center;">${c.participant_id || c.id}</td>
                <td style="padding: 8px 6px; border: 1px solid #94a3b8; font-size: 13px;">${instName}</td>
                <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; font-size: 13px;">${categoryLabel} (${juzOptionLabel})</td>
                <td style="padding: 8px 6px; border: 1px solid #94a3b8; width: 150px;"></td>
            </tr>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Venue Attendance List - ${venueName}</title>
            <style>
                * {
                    box-sizing: border-box;
                }
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 20px;
                    color: #111;
                }
                .header h2 {
                    margin: 5px 0 0 0;
                    font-size: 15px;
                    color: #666;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th {
                    background-color: #f3f4f6;
                    color: #374151;
                    font-weight: bold;
                    padding: 8px 6px;
                    text-align: left;
                    font-size: 13px;
                    border: 1px solid #94a3b8;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="slot-page">
                <div class="header">
                    <h1>${COMPETITION_TITLE}</h1>
                    <h2>Venue Allocation & Attendance - ${venueName}</h2>
                </div>
                
                <table class="meta-info-table" style="width: 100%; margin-bottom: 12px; font-size: 12px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 3px 0; width: 33%;"><strong>Venue:</strong> ${venueName}</td>
                        <td style="padding: 3px 0; width: 33%; text-align: center;"><strong>Date:</strong> __________________</td>
                        <td style="padding: 3px 0; width: 33%; text-align: right;"><strong>Total Candidates:</strong> ${candidates.length}</td>
                    </tr>
                </table>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 5px; text-align: left; background: none; font-size: 11px; color: #000; font-weight: bold;">Judge Details</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: left; background: none; font-size: 11px; color: #000; font-weight: bold; width: 30%;">Phone Number</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; background: none; font-size: 11px; color: #000; font-weight: bold; width: 180px;">Signature</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(() => {
            const list = Array.isArray(judges) ? judges : (judges ? [judges] : []);
            if (list.length > 0) {
                return list.map((j: any, idx: number) => `
                                    <tr>
                                        <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 11px;">Judge ${idx + 1}: ${j.name}</td>
                                        <td style="border: 1px solid #000; padding: 6px; font-family: monospace; font-size: 11px;">${j.phone_number}</td>
                                        <td style="border: 1px solid #000; padding: 6px; height: 35px;"></td>
                                    </tr>
                                `).join('');
            } else {
                return `
                                    <tr>
                                        <td style="border: 1px solid #000; padding: 6px; font-style: italic; font-size: 11px;">No judges assigned.</td>
                                        <td style="border: 1px solid #000; padding: 6px; font-size: 11px;">—</td>
                                        <td style="border: 1px solid #000; padding: 6px; height: 35px; text-align: center; font-size: 10px; color: #64748b;">Signature: __________________</td>
                                    </tr>
                                `;
            }
        })()}
                    </tbody>
                </table>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px; text-align: center; border: 1px solid #94a3b8;">Order</th>
                            <th style="border: 1px solid #94a3b8;">Participant Name</th>
                            <th style="width: 100px; border: 1px solid #94a3b8; text-align: center;">Register ID</th>
                            <th style="border: 1px solid #94a3b8;">Institution</th>
                            <th style="width: 140px; text-align: center; border: 1px solid #94a3b8;">Category & Juz</th>
                            <th style="width: 150px; text-align: center; border: 1px solid #94a3b8;">Candidate Signature</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="6" style="text-align: center; padding: 20px;">No candidates allocated to this venue.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `;
}

export function generateMarksheetHTML(venueName: string, candidates: any[], judges: any[] = []): string {
    const rows = candidates.map((c, index) => {
        const categoryLabel = c.category === '5_juz' ? '5 Juz' : c.category === '15_juz' ? '15 Juz' : '30 Juz';
        const juzOptionLabel = getCompactJuzLabel(c.juzz_options || c.selected_juz);

        return `
            <tr>
                <td style="padding: 6px 4px; border: 1px solid #000; text-align: center; font-weight: bold; font-size: 11px;">${index + 1}</td>
                <td style="padding: 6px 6px; border: 1px solid #000; font-weight: bold; font-size: 11px; text-transform: uppercase;">${c.full_name}</td>
                <td style="padding: 6px 4px; border: 1px solid #000; font-family: monospace; font-size: 10px; text-align: center;">${c.participant_id || c.id}</td>
                <td style="padding: 6px 4px; border: 1px solid #000; text-align: center; font-size: 11px; font-weight: 500;">${categoryLabel} (${juzOptionLabel})</td>
                <td style="border: 1px solid #000; width: 65px;"></td>
                <td style="border: 1px solid #000; width: 65px;"></td>
                <td style="border: 1px solid #000; width: 65px;"></td>
                <td style="border: 1px solid #000; width: 65px;"></td>
                <td style="border: 1px solid #000; width: 80px;"></td>
            </tr>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Marksheet - ${venueName}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: Arial, sans-serif;
                    padding: 15mm;
                    color: #000;
                    background-color: #fff;
                }
                .header-container {
                    text-align: center;
                    margin-bottom: 15px;
                }
                .comp-title {
                    font-size: 18px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .sheet-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 4px;
                    color: #333;
                }
                .meta-table {
                    width: 100%;
                    margin-bottom: 12px;
                    font-size: 11px;
                    border-collapse: collapse;
                }
                .meta-table td {
                    padding: 2px 0;
                }
                table.marks-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                table.marks-table th {
                    border: 1px solid #000;
                    background-color: #f3f4f6;
                    font-weight: bold;
                    padding: 8px 4px;
                    text-align: center;
                    font-size: 11px;
                }
                table.marks-table td {
                    height: 32px;
                }
                .signatures-section {
                    margin-top: 40px;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 30px;
                    text-align: center;
                    font-size: 11px;
                    page-break-inside: avoid;
                }
                .sig-line {
                    border-top: 1px solid #000;
                    margin-top: 40px;
                    padding-top: 5px;
                }
                @page {
                    size: A4 portrait;
                    margin: 10mm 15mm;
                }
                @media print {
                    body { padding: 0; }
                    .marks-table th {
                        background-color: #f3f4f6 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="comp-title">${COMPETITION_TITLE}</div>
                <div class="sheet-title">JUDGES MARKSHEET - ${venueName}</div>
            </div>
            
            <table class="meta-table">
                <tr>
                    <td style="width: 33%;"><strong>Venue:</strong> ${venueName}</td>
                    <td style="width: 33%; text-align: center;"><strong>Date:</strong> ____________________</td>
                    <td style="width: 33%; text-align: right;"><strong>Total Candidates:</strong> ${candidates.length}</td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #000; padding: 5px; text-align: left; background: none; font-size: 11px; color: #000; font-weight: bold;">Judge Details</th>
                        <th style="border: 1px solid #000; padding: 5px; text-align: left; background: none; font-size: 11px; color: #000; font-weight: bold; width: 30%;">Phone Number</th>
                        <th style="border: 1px solid #000; padding: 5px; text-align: center; background: none; font-size: 11px; color: #000; font-weight: bold; width: 180px;">Signature</th>
                    </tr>
                </thead>
                <tbody>
                    ${(() => {
            const list = Array.isArray(judges) ? judges : (judges ? [judges] : []);
            if (list.length > 0) {
                return list.map((j: any, idx: number) => `
                                <tr>
                                    <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 11px;">Judge ${idx + 1}: ${j.name}</td>
                                    <td style="border: 1px solid #000; padding: 6px; font-family: monospace; font-size: 11px;">${j.phone_number}</td>
                                    <td style="border: 1px solid #000; padding: 6px; height: 35px;"></td>
                                </tr>
                            `).join('');
            } else {
                return `
                                <tr>
                                    <td style="border: 1px solid #000; padding: 6px; font-style: italic; font-size: 11px;">No judges assigned.</td>
                                    <td style="border: 1px solid #000; padding: 6px; font-size: 11px;">—</td>
                                    <td style="border: 1px solid #000; padding: 6px; height: 35px; text-align: center; font-size: 10px; color: #64748b;">Signature: __________________</td>
                                </tr>
                            `;
            }
        })()}
                </tbody>
            </table>

            <table class="marks-table">
                <thead>
                    <tr>
                        <th style="width: 35px;">S.No</th>
                        <th>Participant Name</th>
                        <th style="width: 90px;">Register ID</th>
                        <th style="width: 110px;">Category & Juz</th>
                        <th style="width: 65px;">Tajweed /<br>Qirat<br>(20 M)</th>
                        <th style="width: 65px;">Hifz /<br>Memory<br>(60 M)</th>
                        <th style="width: 65px;">Quranic<br>Quiz<br>(20 M)</th>
                        <th style="width: 65px;">Total<br>Marks<br>(100 M)</th>
                        <th style="width: 80px;">Judge<br>Signature</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="9" style="text-align: center; padding: 20px;">No candidates allocated.</td></tr>'}
                </tbody>
            </table>

            <div class="signatures-section" style="display: grid; grid-template-columns: repeat(${Math.max(1, judges.length || 3)}, 1fr); gap: 30px; text-align: center; font-size: 11px; margin-top: 40px; page-break-inside: avoid;">
                ${(() => {
            const list = Array.isArray(judges) ? judges : (judges ? [judges] : []);
            if (list.length > 0) {
                return list.map((j: any) => `
                            <div>
                                <div class="sig-line"><strong>${j.name}</strong> Signature</div>
                            </div>
                        `).join('');
            } else {
                return `
                            <div>
                                <div class="sig-line">Judge 1 Signature</div>
                            </div>
                            <div>
                                <div class="sig-line">Judge 2 Signature</div>
                            </div>
                            <div>
                                <div class="sig-line">Judge 3 Signature</div>
                            </div>
                        `;
            }
        })()}
            </div>
        </body>
        </html>
    `;
}


export function generateVenueMarksheetHTML(
    venueName: string,
    candidates: any[],
    judges: any[],          // actual judge objects with .name field
    round: 'preliminary' | 'final',
    category: string,
    criteria: any[]
): string {
    const judgeList = Array.isArray(judges) ? judges : (judges ? [judges] : []);
    if (judgeList.length === 0) {
        // Fallback: generate one anonymous copy per student
        judgeList.push({ id: 'anon', name: '—' });
    }

    const roundLabelEn = round === 'final' ? 'Final Round' : 'Preliminary Round';

    // Calculate total max marks across all criteria
    const totalMaxMarks = criteria.reduce((sum, c) => sum + (Number(c.outOf) * Number(c.numQuestions || 1)), 0);

    // Build one marksheet card per (judge × student). 
    // We generate: all of judge[0]'s cards first, then judge[1]'s, etc.
    const cards: string[] = [];

    candidates.forEach((c, idx) => {
        const participantId = c.participant_id || c.id;
        const juzLabel = getCompactJuzLabel(c.juzz_options || c.selected_juz);
        const orderNum = round === 'final' ? (c.final_order || idx + 1) : (c.allocated_order || idx + 1);

        judgeList.forEach((judge: any) => {
            const judgeName = judge.name || '—';

            cards.push(`
                <div class="marksheet-card">
                    <!-- Top Header Row -->
                    <div class="ms-header-row">
                        <!-- Stage Box -->
                        <div class="ms-box-stage">
                            <span class="ms-box-label">STAGE</span>
                            <span class="ms-box-value">${venueName}</span>
                        </div>
                        
                        <!-- Middle Title -->
                        <div class="ms-center-title">
                            <div class="ms-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                            <div class="ms-main-heading">QURAN HIFZ COMPETITION 2026</div>
                            <div class="ms-round-heading">${round === 'final' ? 'FINAL ROUND' : 'PRELIMINARY ROUND'}</div>
                            <div class="ms-category-banner">JUZ MARK SHEET - ${category === '5_juz' ? '5' : category === '15_juz' ? '15' : '30'}</div>
                        </div>
                        
                        <!-- Judge Box -->
                        <div class="ms-box-judge">
                            <span class="ms-box-label">JUDGE</span>
                            <span class="ms-box-value">${judgeName}</span>
                        </div>
                    </div>
                    
                    <!-- Candidate Info Bar (Near table style, Name removed) -->
                    <div class="ms-candidate-bar-near">
                        <span><strong>REGISTER ID:</strong> ${participantId}</span>
                        <span><strong>JUZ:</strong> ${juzLabel}</span>
                        <span><strong>ORDER:</strong> ${orderNum}</span>
                    </div>
                    
                    <!-- Grading Table -->
                    <div class="ms-table-container">
                        <table class="ms-dynamic-table">
                            <colgroup>
                                <col style="width: 75px;" />
                                ${criteria.map(col => {
                                    let cols = '';
                                    for (let q = 0; q < (col.numQuestions || 1); q++) {
                                        cols += '<col />';
                                    }
                                    return cols;
                                }).join('')}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th rowspan="2" class="ms-th-total-header">Total</th>
                                    ${criteria.map(col => `
                                        <th colspan="${col.numQuestions || 1}" class="ms-th-crit-header">${col.label}</th>
                                    `).join('')}
                                </tr>
                                <tr>
                                    ${criteria.map(col => {
                let subCols = '';
                for (let q = 0; q < (col.numQuestions || 1); q++) {
                    subCols += `<th class="ms-th-sub-mark">${col.outOf}</th>`;
                }
                return subCols;
            }).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="ms-td-total-value">${totalMaxMarks}</td>
                                    ${criteria.map(col => {
                let subCells = '';
                for (let q = 0; q < (col.numQuestions || 1); q++) {
                    subCells += `
                                                <td class="ms-td-score-box"></td>
                                            `;
                }
                return subCells;
            }).join('')}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Footer / Signature -->
                    <div class="ms-footer-row">
                        <div class="ms-signature-area">
                            <div class="ms-sig-dashed-line"></div>
                            <div class="ms-sig-label">Judge Signature</div>
                        </div>
                        <div class="ms-evaluation-label">
                            ${round === 'final' ? 'Final Evaluation' : 'Preliminary Evaluation'}
                        </div>
                    </div>
                </div>
            `);
        });
    });

    // Layout: 3 cards per A4 page with dynamic cut lines
    let pagesMarkup = '';
    for (let i = 0; i < cards.length; i += 3) {
        const card1 = cards[i];
        const card2 = cards[i + 1] || null;
        const card3 = cards[i + 2] || null;

        pagesMarkup += `
            <div class="print-page">
                <div class="card-slot">${card1}</div>
                ${card2 ? `
                    <div class="cut-line">
                        <span class="cut-text">✂ Cut Here / قص هنا</span>
                    </div>
                    <div class="card-slot">${card2}</div>
                ` : `<div class="card-slot card-empty"></div>`}
                ${card3 ? `
                    <div class="cut-line">
                        <span class="cut-text">✂ Cut Here / قص هنا</span>
                    </div>
                    <div class="card-slot">${card3}</div>
                ` : `<div class="card-slot card-empty"></div>`}
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Marksheets - ${venueName} - ${roundLabelEn}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: Arial, sans-serif;
                    background: #fff;
                    color: #000;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                @page {
                    size: A4 portrait;
                    margin: 0;
                }

                /* ── Page container ── */
                .print-page {
                    width: 210mm;
                    height: 297mm;
                    page-break-after: always;
                    break-after: page;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .print-page:last-child {
                    page-break-after: avoid;
                    break-after: avoid;
                }

                /* ── Card slot: exactly 1/3 of an A4 ── */
                .card-slot {
                    width: 210mm;
                    height: 92mm;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    padding: 3mm 5mm;
                    box-sizing: border-box;
                }
                .card-empty {
                    border-top: none;
                }

                /* ── Cut line ── */
                .cut-line {
                    width: 100%;
                    height: 9mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-top: 1.5px dashed #555;
                    border-bottom: 1.5px dashed #555;
                    background: #f9f9f9;
                    position: relative;
                }
                .cut-text {
                    font-size: 10px;
                    color: #555;
                    font-family: Arial, sans-serif;
                    background: #f9f9f9;
                    padding: 0 8px;
                }

                /* ── Marksheet card ── */
                .marksheet-card {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    border: 2.5px solid #000000;
                    border-radius: 6px;
                    padding: 3mm 4mm;
                    box-sizing: border-box;
                    background-color: #ffffff;
                }

                /* Header */
                .ms-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                }
                .ms-box-stage, .ms-box-judge {
                    border: 2.5px solid #000000;
                    border-radius: 4px;
                    padding: 2px 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-width: 90px;
                    background-color: #ffffff;
                }
                .ms-box-label {
                    font-size: 8px;
                    font-weight: bold;
                    color: #000000;
                    border-bottom: 1.5px solid #000000;
                    padding-bottom: 1px;
                    margin-bottom: 2px;
                    width: 100%;
                    text-align: center;
                    letter-spacing: 0.05em;
                }
                .ms-box-value {
                    font-size: 12px;
                    font-weight: 800;
                    color: #000000;
                    text-align: center;
                }
                .ms-center-title {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                .ms-bismillah {
                    font-family: 'Amiri', 'Noto Naskh Arabic', serif;
                    font-size: 12px;
                    font-weight: bold;
                    color: #000000;
                    margin-bottom: 1px;
                }
                .ms-main-heading {
                    font-size: 13px;
                    font-weight: 800;
                    color: #000000;
                    letter-spacing: 0.02em;
                }
                .ms-round-heading {
                    font-size: 9px;
                    font-weight: bold;
                    color: #000000;
                    margin-top: 1px;
                    letter-spacing: 0.05em;
                }
                .ms-category-banner {
                    background-color: #fef08a; /* yellow background */
                    border: 1.5px solid #000000;
                    padding: 2px 14px;
                    font-size: 10px;
                    font-weight: 800;
                    color: #000000;
                    margin-top: 2px;
                    border-radius: 2px;
                    text-transform: uppercase;
                }

                /* Candidate Info Bar (Near table style) */
                .ms-candidate-bar-near {
                    display: flex;
                    justify-content: flex-start;
                    gap: 24px;
                    width: 100%;
                    font-size: 11px;
                    color: #000000;
                    font-weight: bold;
                    margin-top: 1mm;
                    margin-bottom: 1mm;
                    text-transform: uppercase;
                }

                /* Grading Table */
                .ms-table-container {
                    width: 100%;
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5mm 0;
                }
                .ms-dynamic-table {
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                    background-color: #ffffff;
                    border: 3px solid #000000;
                }
                .ms-dynamic-table th, .ms-dynamic-table td {
                    border: 2px solid #000000;
                    text-align: center;
                    vertical-align: middle;
                    padding: 4px 3px;
                    color: #000000;
                    font-weight: bold;
                }
                .ms-th-total-header {
                    background-color: #f8fafc;
                    font-size: 11px;
                    font-weight: 900;
                    color: #000000;
                    width: 75px;
                }
                .ms-th-crit-header {
                    background-color: #f8fafc;
                    font-size: 11px;
                    font-weight: 900;
                    color: #000000;
                    font-family: 'Amiri', 'Noto Naskh Arabic', sans-serif;
                }
                .ms-th-sub-mark {
                    background-color: #ffffff;
                    font-size: 10px;
                    font-weight: bold;
                    color: #000000;
                    padding: 2px;
                }
                .ms-td-total-value {
                    background-color: #f8fafc;
                    font-size: 12px;
                    font-weight: 900;
                    color: #000000;
                    height: 30px;
                }
                .ms-td-score-box {
                    height: 30px;
                    background-color: #ffffff;
                }

                /* Footer / Signature */
                .ms-footer-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    width: 100%;
                }
                .ms-signature-area {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 180px;
                }
                .ms-sig-dashed-line {
                    width: 100%;
                    border-top: 1.5px dashed #000000;
                    margin-bottom: 4px;
                }
                .ms-sig-label {
                    font-size: 9.5px;
                    font-weight: bold;
                    color: #000000;
                }
                .ms-evaluation-label {
                    font-size: 10px;
                    font-weight: bold;
                    color: #000000;
                }

                @media print {
                    .print-page { page-break-inside: avoid !important; }
                }
            </style>
        </head>
        <body>
            ${pagesMarkup}
        </body>
        </html>
    `;
}