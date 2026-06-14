import { pb } from '../../api/db';
import { getJuzLabel } from '../../config/fieldsConfig';

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

export function generateVenueListHTML(venueName: string, candidates: any[], venueSlots: any[], judges: any[] = []): string {
    // Group candidates by slot
    const candidatesBySlot: Record<string, any[]> = {};
    
    candidates.forEach(c => {
        // Clean slot name (e.g. "Slot 1") to group correctly
        const slotName = (c.allocated_slot || 'General Slot').split(' (')[0].trim();
        if (!candidatesBySlot[slotName]) {
            candidatesBySlot[slotName] = [];
        }
        candidatesBySlot[slotName].push(c);
    });

    const slotsSorted = Object.keys(candidatesBySlot).sort();
    
    const slotSections = slotsSorted.map((slotName, slotIdx) => {
        const slotCandidates = candidatesBySlot[slotName];
        
        // Find slot timing details
        const foundSlot = venueSlots?.find(s => s.name === slotName);
        const slotTiming = foundSlot?.time || '';
        const slotTitleDisplay = slotTiming ? `${slotName} (${slotTiming})` : slotName;

        const rows = slotCandidates.map((c, index) => {
            const instName = c.expand?.institution_ref?.name || '—';
            const categoryLabel = c.category === '5_juz' ? '5 Juz' : c.category === '15_juz' ? '15 Juz' : '30 Juz';
            const juzOptionLabel = getCompactJuzLabel(c.juzz_options || c.selected_juz);
            
            return `
                <tr>
                    <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; font-weight: bold;">${index + 1}</td>
                    <td style="padding: 8px 6px; border: 1px solid #94a3b8; font-weight: bold;">${c.full_name}</td>
                    <td style="padding: 8px 6px; border: 1px solid #94a3b8; font-family: monospace; font-size: 12px; text-align: center;">${c.participant_id || c.id}</td>
                    <td style="padding: 8px 6px; border: 1px solid #94a3b8; font-size: 13px;">${instName}</td>
                    <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; font-size: 13px;">${categoryLabel} (${juzOptionLabel})</td>
                    <td style="padding: 8px 6px; border: 1px solid #94a3b8; width: 150px;"></td>
                </tr>
            `;
        }).join('');

        const isLast = slotIdx === slotsSorted.length - 1;

        return `
            <div class="slot-page" style="${!isLast ? 'page-break-after: always; margin-bottom: 30px;' : ''}">
                <div class="header">
                    <h1>${COMPETITION_TITLE}</h1>
                    <h2>Venue Allocation & Attendance - ${venueName}</h2>
                    <h3 style="margin-top: 5px; font-size: 16px; color: #0f766e;">${slotTitleDisplay}</h3>
                </div>
                
                <table class="meta-info-table" style="width: 100%; margin-bottom: 12px; font-size: 12px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 3px 0; width: 33%;"><strong>Venue:</strong> ${venueName}</td>
                        <td style="padding: 3px 0; width: 33%; text-align: center;"><strong>Date:</strong> __________________</td>
                        <td style="padding: 3px 0; width: 33%; text-align: right;"><strong>Candidates in Slot:</strong> ${slotCandidates.length}</td>
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
                            <th style="width: 50px; text-align: center; border: 1px solid #94a3b8;">S.No</th>
                            <th style="border: 1px solid #94a3b8;">Participant Name</th>
                            <th style="width: 100px; border: 1px solid #94a3b8; text-align: center;">Register ID</th>
                            <th style="border: 1px solid #94a3b8;">Institution</th>
                            <th style="width: 140px; text-align: center; border: 1px solid #94a3b8;">Category & Juz</th>
                            <th style="width: 150px; text-align: center; border: 1px solid #94a3b8;">Candidate Signature</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
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
                    .slot-page {
                        page-break-after: always;
                    }
                    .slot-page:last-child {
                        page-break-after: avoid;
                    }
                }
            </style>
        </head>
        <body>
            ${slotSections || '<div style="text-align: center; padding: 40px; color: #666;">No candidates allocated to this venue.</div>'}
        </body>
        </html>
    `;
}

export function generateIDCardsHTML(venueName: string, candidates: any[], venueSlots: any[]): string {
    const cards = candidates.map(c => {
        const photoUrl = c.candidate_photo
            ? pb.files.getURL(c, c.candidate_photo)
            : 'https://placehold.co/150x180?text=No+Photo';
        
        const categoryLabel = c.category === '5_juz' ? '5 Juz' : c.category === '15_juz' ? '15 Juz' : '30 Juz';
        const fullJuzLabel = c.juzz_options ? getJuzLabel(c.juzz_options) : (c.selected_juz || 'N/A');
        const instName = c.expand?.institution_ref?.name || 'Individual';
        
        // Find slot timing details
        const cleanSlotName = (c.allocated_slot || '').split(' (')[0].trim();
        const foundSlot = venueSlots?.find(s => s.name === cleanSlotName);
        const slotTiming = foundSlot?.time || (c.allocated_slot ? c.allocated_slot.match(/\(([^)]+)\)/)?.[1] : '') || '';
        const slotDisplay = slotTiming ? `${cleanSlotName} (${slotTiming})` : (c.allocated_slot || 'N/A');

        return `
            <div class="id-card">
                <!-- Header: Premium colored header gradient with brand green -->
                <div class="card-header">
                    <div class="comp-title">${COMPETITION_TITLE}</div>
                    <div class="card-subtitle">CANDIDATE ENTRY PASS</div>
                </div>
                
                <!-- Center Photo and ID Block -->
                <div class="photo-section">
                    <div class="photo-border">
                        <img src="${photoUrl}" class="photo" alt="Candidate Photo" />
                    </div>
                    <div class="app-id">${c.participant_id || c.id}</div>
                </div>
                
                <!-- Bottom Details Area -->
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

                <!-- Footer Allocation Banner: Beautiful brand green gradient, stacked rows to prevent wrapping -->
                <div class="allocation-banner">
                    <div class="alloc-row"><strong>VENUE:</strong> ${c.allocated_venue || venueName}</div>
                    <div class="alloc-row" style="margin-top: 3px;"><strong>SLOT:</strong> ${slotDisplay}</div>
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
                
                /* Spacious Creative ID Card (approx 98mm x 150mm) to fit more details */
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
