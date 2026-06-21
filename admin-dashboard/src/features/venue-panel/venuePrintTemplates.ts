import { pb } from '../../api/db';
import { getJuzLabel } from '../../config/fieldsConfig';

const COMPETITION_TITLE = 'Quran Hifz Competition 2026';

function getPrintPhotoUrl(record: any, filename: string): string {
    if (!filename) return '';
    let url = pb.files.getURL(record, filename);
    if (url.startsWith('/')) {
        return window.location.origin + url;
    }
    if (url.includes('127.0.0.1:8080') || url.includes('localhost:8080')) {
        return url.replace(/^(https?:\/\/)[^\/]+/, window.location.origin + '/pb1');
    }
    return url;
}

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

export function generateIDCardsHTML(venueName: string, candidates: any[], _venueSlots: any[]): string {
    const cards = candidates.map(c => {
        const photoUrl = getPrintPhotoUrl(c, c.candidate_photo) || 'https://placehold.co/150x180?text=No+Photo';
        
        const categoryLabel = c.category === '5_juz' ? '5 Juz' : c.category === '15_juz' ? '15 Juz' : '30 Juz';
        const fullJuzLabel = c.juzz_options ? getJuzLabel(c.juzz_options) : (c.selected_juz || 'N/A');
        const instName = c.expand?.institution_ref?.name || 'Individual';
        
        return `
            <div class="id-card">
                <div class="card-header">
                    <div class="comp-title">${COMPETITION_TITLE}</div>
                    <div class="card-subtitle">CANDIDATE ENTRY PASS</div>
                </div>
                
                <div class="photo-section">
                    <div class="photo-border">
                        <img src="${photoUrl}" class="photo" alt="Candidate Photo" />
                    </div>
                    <div class="app-id">${c.participant_id || c.id}</div>
                </div>
                
                <div class="details-section">
                    <div class="name-display">${c.full_name}</div>
                    <table class="details-table">
                        <tr>
                            <td class="label">Father Name</td>
                            <td class="colon">:</td>
                            <td class="value">${c.father_name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="label">Guardian Name</td>
                            <td class="colon">:</td>
                            <td class="value">${c.guardian_name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="label">Category</td>
                            <td class="colon">:</td>
                            <td class="value val-highlight">${categoryLabel}</td>
                        </tr>
                        <tr>
                            <td class="label">Juz Option</td>
                            <td class="colon">:</td>
                            <td class="value juz-val">${fullJuzLabel}</td>
                        </tr>
                        <tr>
                            <td class="label">Institution Name</td>
                            <td class="colon">:</td>
                            <td class="value inst-val">${instName}</td>
                        </tr>
                        <tr>
                            <td class="label">WhatsApp</td>
                            <td class="colon">:</td>
                            <td class="value font-bold">${c.whatsapp_number || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="label">Guardian Mob</td>
                            <td class="colon">:</td>
                            <td class="value font-bold">${c.guardian_phone || 'N/A'}</td>
                        </tr>
                    </table>
                </div>

                <div class="allocation-banner">
                    <div class="alloc-row"><strong>VENUE:</strong> ${c.allocated_venue || venueName}</div>
                    <div class="alloc-row" style="margin-top: 3px;"><strong>ORDER:</strong> ${c.allocated_order || 'N/A'}</div>
                </div>
                
                <div class="card-footer">
                    * Please present this card at the venue entrance.
                </div>
            </div>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>ID Cards - ${venueName}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f3f4f6;
                    padding: 20px;
                }
                .cards-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(98mm, 1fr));
                    gap: 25px;
                    justify-content: center;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .id-card {
                    width: 98mm;
                    height: 150mm;
                    background-color: #ffffff;
                    background-image: radial-gradient(circle at 100% 0%, rgba(13, 148, 136, 0.04) 0%, transparent 60%),
                                      radial-gradient(circle at 0% 100%, rgba(13, 148, 136, 0.04) 0%, transparent 60%);
                    border: 3.5px solid #0d9488;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    overflow: hidden;
                    box-shadow: 0 8px 16px rgba(13, 148, 136, 0.15);
                    position: relative;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .card-header {
                    width: 100%;
                    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
                    color: #ffffff;
                    text-align: center;
                    padding: 12px 5px;
                    border-bottom: 3px solid #115e59;
                }
                .comp-title {
                    font-size: 13.5px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                }
                .card-subtitle {
                    font-size: 9px;
                    letter-spacing: 3px;
                    color: #ccfbf1;
                    margin-top: 4px;
                    font-weight: bold;
                }
                .photo-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    margin-top: 10px;
                    margin-bottom: 8px;
                }
                .photo-border {
                    padding: 3px;
                    background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
                    border-radius: 6px;
                    box-shadow: 0 4px 8px rgba(13, 148, 136, 0.2);
                }
                .photo {
                    width: 32mm;
                    height: 38mm;
                    object-fit: cover;
                    border-radius: 4px;
                    background-color: #f8fafc;
                    display: block;
                }
                .app-id {
                    font-family: monospace;
                    font-size: 13px;
                    font-weight: 900;
                    background-color: #0f766e;
                    color: #ffffff;
                    padding: 3px 12px;
                    border-radius: 20px;
                    border: 1px solid #115e59;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    margin-top: 2px;
                }
                .details-section {
                    width: 100%;
                    padding: 0 14px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .name-display {
                    font-size: 15px;
                    font-weight: 900;
                    color: #0f766e;
                    text-transform: uppercase;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 4px;
                    margin-bottom: 6px;
                    width: 100%;
                    text-align: center;
                    letter-spacing: 0.5px;
                }
                .details-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .details-table td {
                    padding: 2.5px 0;
                    font-size: 11.5px;
                    vertical-align: middle;
                    color: #1e293b;
                }
                .details-table .label {
                    font-weight: 800;
                    color: #64748b;
                    width: 34%;
                    text-transform: uppercase;
                    font-size: 9px;
                    letter-spacing: 0.5px;
                }
                .details-table .colon {
                    width: 5%;
                    text-align: center;
                    font-weight: bold;
                    color: #94a3b8;
                }
                .details-table .value {
                    font-weight: 700;
                    color: #0f172a;
                    width: 61%;
                }
                .details-table .font-bold {
                    font-weight: bold;
                }
                .val-highlight {
                    font-weight: 900 !important;
                    color: #0d9488;
                }
                .juz-val {
                    font-weight: 800 !important;
                    color: #0f172a;
                }
                .inst-val {
                    font-weight: 800 !important;
                }
                .allocation-banner {
                    width: calc(100% - 28px);
                    background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
                    border-radius: 6px;
                    padding: 8px 12px;
                    color: #ffffff;
                    margin-top: auto;
                    margin-bottom: 8px;
                    box-shadow: 0 3px 6px rgba(13, 148, 136, 0.2);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                }
                .alloc-row {
                    font-size: 11px;
                    color: #ffffff;
                    width: 100%;
                    text-align: left;
                    font-weight: bold;
                    letter-spacing: 0.3px;
                }
                .card-footer {
                    width: 100%;
                    background-color: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                    padding: 6px;
                    color: #64748b;
                    font-size: 8px;
                    text-align: center;
                    font-style: italic;
                }
                @media print {
                    body {
                        background-color: #ffffff;
                        padding: 0;
                    }
                    .cards-container {
                        gap: 15px;
                    }
                    .id-card {
                        box-shadow: none;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="cards-container">
                ${cards || '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No candidates allocated.</div>'}
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
    templates: Record<string, string>
): string {
    const judgeList = Array.isArray(judges) ? judges : (judges ? [judges] : []);
    if (judgeList.length === 0) {
        // Fallback: generate one anonymous copy per student
        judgeList.push({ id: 'anon', name: 'القاضي' });
    }

    const categoryLabel = category === '5_juz' ? '٥ أجزاء' : category === '15_juz' ? '١٥ جزءاً' : '٣٠ جزءاً';
    const categoryLabelEn = category === '5_juz' ? '5 Juz' : category === '15_juz' ? '15 Juz' : '30 Juz';
    const roundLabel = round === 'final' ? 'الجولة النهائية' : 'الجولة التمهيدية';
    const roundLabelEn = round === 'final' ? 'Final Round' : 'Preliminary Round';

    // Try to get a custom template for this category + round
    const templateKey = `marksheet_template_${category.replace('_juz', '')}_${round}`;
    const customTpl = templates[templateKey] || '';

    // Build one marksheet card per (judge × student). 
    // We generate: all of judge[0]'s cards first, then judge[1]'s, etc.
    const cards: string[] = [];

    candidates.forEach((c, idx) => {
        const participantId = c.participant_id || c.id;
        const fullName = (c.full_name || '').toUpperCase();
        const juzLabel = getCompactJuzLabel(c.juzz_options || c.selected_juz);

        judgeList.forEach((judge: any) => {
            const judgeName = judge.name || 'القاضي';
            const judgePhone = judge.phone_number || '';

            if (customTpl) {
                // Use custom template: extract body, replace placeholders
                const bodyMatch = customTpl.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                let html = bodyMatch ? bodyMatch[1] : customTpl;
                html = html
                    .split('{{competition_title}}').join(COMPETITION_TITLE)
                    .split('{{venue_name}}').join(venueName)
                    .split('{{category_label}}').join(`${categoryLabelEn}`)
                    .split('{{round_label}}').join(roundLabelEn)
                    .split('{{candidate_id}}').join(participantId)
                    .split('{{candidate_name}}').join(fullName)
                    .split('{{judge_label}}').join(judgeName)
                    .split('{{judge_name}}').join(judgeName)
                    .split('{{judge_phone}}').join(judgePhone)
                    .split('{{serial_no}}').join(String(idx + 1));
                cards.push(html);
            } else {
                // Default built-in marksheet card — mimicking PDF layout with Arabic
                cards.push(`
                    <div class="marksheet-card" dir="rtl">
                        <!-- Header -->
                        <div class="ms-header">
                            <div class="ms-title-ar">مسابقة القرآن الكريم للحفظ ٢٠٢٦</div>
                            <div class="ms-title-en">${COMPETITION_TITLE}</div>
                            <div class="ms-badges">
                                <span class="ms-badge ms-badge-cat">${categoryLabel} &nbsp;|&nbsp; ${categoryLabelEn}</span>
                                <span class="ms-badge ms-badge-round">${roundLabel}</span>
                            </div>
                        </div>

                        <!-- Meta info bar -->
                        <table class="ms-meta-table">
                            <tr>
                                <td class="ms-meta-lbl">قاعة / Venue</td>
                                <td class="ms-meta-val">${venueName}</td>
                                <td class="ms-meta-lbl">القاضي / Judge</td>
                                <td class="ms-meta-val ms-judge-name">${judgeName}</td>
                                <td class="ms-meta-lbl">رقم الاتصال</td>
                                <td class="ms-meta-val">${judgePhone}</td>
                            </tr>
                            <tr>
                                <td class="ms-meta-lbl">رقم المشترك</td>
                                <td class="ms-meta-val ms-pid">${participantId}</td>
                                <td class="ms-meta-lbl">اسم المشترك</td>
                                <td class="ms-meta-val ms-name" colspan="3">${fullName}</td>
                            </tr>
                            <tr>
                                <td class="ms-meta-lbl">الأجزاء / Juz</td>
                                <td class="ms-meta-val">${juzLabel}</td>
                                <td class="ms-meta-lbl">التسلسل / S.No</td>
                                <td class="ms-meta-val">${idx + 1}</td>
                                <td class="ms-meta-lbl">التاريخ</td>
                                <td class="ms-meta-val">______________</td>
                            </tr>
                        </table>

                        <!-- Scoring Table (Arabic headers) -->
                        <table class="ms-score-table" dir="rtl">
                            <thead>
                                <tr>
                                    <th class="ms-th-num">#</th>
                                    <th class="ms-th-wide">
                                        <span class="ms-th-ar">معيار التقييم</span>
                                        <span class="ms-th-en">Criterion</span>
                                    </th>
                                    <th class="ms-th-score">
                                        <span class="ms-th-ar">الدرجة الكاملة</span>
                                        <span class="ms-th-en">Full Marks</span>
                                    </th>
                                    <th class="ms-th-score">
                                        <span class="ms-th-ar">الدرجة المحصّلة</span>
                                        <span class="ms-th-en">Score</span>
                                    </th>
                                    <th class="ms-th-score">
                                        <span class="ms-th-ar">ملاحظات</span>
                                        <span class="ms-th-en">Remarks</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="ms-td-center">١</td>
                                    <td class="ms-td-label">
                                        <span class="ms-td-ar">إتقان الحفظ / Hifz Accuracy</span>
                                    </td>
                                    <td class="ms-td-center">٦٠</td>
                                    <td class="ms-td-empty"></td>
                                    <td class="ms-td-empty"></td>
                                </tr>
                                <tr>
                                    <td class="ms-td-center">٢</td>
                                    <td class="ms-td-label">
                                        <span class="ms-td-ar">التجويد والقراءة / Tajweed &amp; Qira'at</span>
                                    </td>
                                    <td class="ms-td-center">٢٠</td>
                                    <td class="ms-td-empty"></td>
                                    <td class="ms-td-empty"></td>
                                </tr>
                                <tr>
                                    <td class="ms-td-center">٣</td>
                                    <td class="ms-td-label">
                                        <span class="ms-td-ar">المتشابهات / Similar Verses</span>
                                    </td>
                                    <td class="ms-td-center">١٠</td>
                                    <td class="ms-td-empty"></td>
                                    <td class="ms-td-empty"></td>
                                </tr>
                                <tr>
                                    <td class="ms-td-center">٤</td>
                                    <td class="ms-td-label">
                                        <span class="ms-td-ar">الأداء والصوت / Voice &amp; Delivery</span>
                                    </td>
                                    <td class="ms-td-center">١٠</td>
                                    <td class="ms-td-empty"></td>
                                    <td class="ms-td-empty"></td>
                                </tr>
                                <tr class="ms-total-row">
                                    <td class="ms-td-center" colspan="2">
                                        <strong>المجموع الكلي / Total</strong>
                                    </td>
                                    <td class="ms-td-center"><strong>١٠٠</strong></td>
                                    <td class="ms-td-empty ms-total-cell"></td>
                                    <td class="ms-td-empty"></td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- Signature row -->
                        <div class="ms-sig-row">
                            <div class="ms-sig-box">
                                <div class="ms-sig-label">توقيع القاضي / Judge Signature</div>
                                <div class="ms-sig-line"></div>
                                <div class="ms-sig-name">${judgeName}</div>
                            </div>
                            <div class="ms-sig-box">
                                <div class="ms-sig-label">ختم / Stamp</div>
                                <div class="ms-sig-line"></div>
                            </div>
                        </div>
                    </div>
                `);
            }
        });
    });

    // Layout: 2 cards per A4 page with a dashed cut line between them
    let pagesMarkup = '';
    for (let i = 0; i < cards.length; i += 2) {
        const card1 = cards[i];
        const card2 = cards[i + 1] || null;

        pagesMarkup += `
            <div class="print-page">
                <div class="card-slot">${card1}</div>
                ${card2 ? `
                    <div class="cut-line">
                        <span class="cut-text">✂ Cut Here / قص هنا</span>
                    </div>
                    <div class="card-slot">${card2}</div>
                ` : `<div class="card-slot card-empty"></div>`}
            </div>
        `;
    }

    // Extract any custom styles from the template
    let customStyles = '';
    if (customTpl) {
        const styleMatch = customTpl.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch) customStyles = styleMatch[1];
    }

    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
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
                    font-family: 'Amiri', 'Noto Naskh Arabic', 'Arial', sans-serif;
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

                /* ── Card slot: exactly half an A4 ── */
                .card-slot {
                    width: 210mm;
                    height: 144mm;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    padding: 6mm 8mm;
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
                    gap: 3mm;
                    border: 1.5px solid #1a1a2e;
                    border-radius: 3px;
                    padding: 4mm 5mm;
                    box-sizing: border-box;
                }

                /* Header */
                .ms-header {
                    text-align: center;
                    border-bottom: 2px solid #1a1a2e;
                    padding-bottom: 3mm;
                    margin-bottom: 2mm;
                }
                .ms-title-ar {
                    font-size: 15px;
                    font-weight: bold;
                    letter-spacing: 0.3px;
                    font-family: 'Amiri', serif;
                }
                .ms-title-en {
                    font-size: 10px;
                    color: #333;
                    margin-top: 1px;
                    font-family: Arial, sans-serif;
                    letter-spacing: 0.5px;
                }
                .ms-badges {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 4px;
                }
                .ms-badge {
                    font-size: 10px;
                    font-weight: bold;
                    padding: 2px 10px;
                    border-radius: 20px;
                    font-family: Arial, sans-serif;
                }
                .ms-badge-cat  { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
                .ms-badge-round { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

                /* Meta table */
                .ms-meta-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9.5px;
                    margin-bottom: 2mm;
                }
                .ms-meta-table td {
                    padding: 2px 5px;
                    border: 1px solid #94a3b8;
                }
                .ms-meta-lbl {
                    background: #f1f5f9;
                    font-weight: bold;
                    white-space: nowrap;
                    font-size: 9px;
                    text-align: right;
                    width: 80px;
                }
                .ms-meta-val { text-align: right; }
                .ms-judge-name { font-weight: bold; color: #0f766e; }
                .ms-pid { font-family: 'Courier New', monospace; font-weight: bold; }
                .ms-name { font-weight: bold; text-transform: uppercase; }

                /* Scoring table */
                .ms-score-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9.5px;
                    flex: 1;
                }
                .ms-score-table th,
                .ms-score-table td {
                    border: 1px solid #1a1a2e;
                    text-align: center;
                    vertical-align: middle;
                }
                .ms-th-num { width: 22px; background: #1a1a2e; color: #fff; padding: 4px 2px; }
                .ms-th-wide { text-align: right !important; padding: 4px 8px; background: #1a1a2e; color: #fff; }
                .ms-th-score { width: 70px; background: #1a1a2e; color: #fff; padding: 4px 3px; }
                .ms-th-ar { display: block; font-size: 10px; font-weight: bold; }
                .ms-th-en { display: block; font-size: 8px; opacity: 0.85; font-family: Arial, sans-serif; }
                .ms-td-center { text-align: center; padding: 3px; font-size: 10px; }
                .ms-td-label { text-align: right; padding: 3px 8px; }
                .ms-td-ar { font-size: 10px; }
                .ms-td-empty { height: 20px; }
                .ms-total-row td { background: #f8fafc; }
                .ms-total-cell { background: #fef3c7 !important; height: 24px; }

                /* Signature row */
                .ms-sig-row {
                    display: flex;
                    gap: 10mm;
                    margin-top: 3mm;
                    padding-top: 2mm;
                    border-top: 1px solid #cbd5e1;
                }
                .ms-sig-box {
                    flex: 1;
                    text-align: center;
                }
                .ms-sig-label {
                    font-size: 8.5px;
                    color: #475569;
                    margin-bottom: 6mm;
                    font-family: Arial, sans-serif;
                }
                .ms-sig-line {
                    border-top: 1px solid #000;
                    margin: 0 10px;
                }
                .ms-sig-name {
                    font-size: 9px;
                    color: #334155;
                    margin-top: 2px;
                    font-weight: bold;
                }

                @media print {
                    .print-page { page-break-inside: avoid !important; }
                }

                /* Custom template overrides */
                ${customStyles}
            </style>
        </head>
        <body>
            ${pagesMarkup}
        </body>
        </html>
    `;
}