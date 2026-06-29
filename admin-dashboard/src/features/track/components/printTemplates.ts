import { pb } from '../../../api/db';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../../api/track';
import { getCategoryLabel, getJuzLabel } from '../../../config/fieldsConfig';

export let COMPETITION_TITLE = `
    <div style="font-size: 18px; font-family: Arial, sans-serif; font-weight: bold; letter-spacing: 0.5px;">QURAN HIFZ COMPETITION ${new Date().getFullYear()}</div>
`;

// Self-executing data fetch from PocketBase metadata collection
(async () => {
    try {
        const record = await pb.collection('metadata').getFirstListItem('key="competition_title"');
        if (record && record.value) {
            COMPETITION_TITLE = record.value.replace(/{year}/g, new Date().getFullYear().toString());
        }
    } catch (error) {
        console.error("Failed to fetch dynamic competition_title from metadata collection:", error);
    }
})();

const PRINT_BASE_STYLES = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
        font-family: 'Times New Roman', Times, serif; 
        color: #000; 
        background: #fff; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
    }
    
    /* Explicitly set to A4 Portrait by default */
    @page { size: A4 portrait; margin: 10mm; }
    
    @media print { 
        .form-page { padding: 0 !important; }
        .sheet { padding: 0 !important; }
    }

    .header { text-align: center; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 2px solid #000; }
    .header h1 { font-size: 22px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3px; }
    .header h2 { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 2px; }
    
    .error-msg { text-align: center; padding: 60px; font-family: sans-serif; }
    .error-msg h2 { color: #dc2626; font-size: 24px; margin-bottom: 10px; }
    .error-msg p { color: #666; font-size: 14px; }
`;

function formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch { return dateStr; }
}

function getPrintPhotoUrl(record: any, filename: string): string {
    if (!filename) return '';
    let url = pb.files.getURL(record, filename);
    if (url.startsWith('/')) {
        return window.location.origin + url;
    }
    // Handle local dev URLs when accessed remotely (e.g. via duckdns)
    if (url.includes('127.0.0.1:8080') || url.includes('localhost:8080')) {
        return url.replace(/^(https?:\/\/)[^\/]+/, window.location.origin + '/pb1');
    }
    return url;
}
function cleanJuzLabelForPrint(label: string): string {
    if (!label) return '';
    return label.replace(/^Juz\s+[\d\-&,\s]+:\s*/i, '');
}

function singleFormHTML(record: ParticipantsApplicationResponse, pageBreak: boolean): string {
    const photoUrl = getPrintPhotoUrl(record, record.candidate_photo);
    const dob = formatDate(record.dob);
    const submitted = formatDate(record.created);

    const expandData = (record as { expand?: { approved_by?: { name?: string, mobile?: string, email?: string }, institution_ref?: any } }).expand;
    const approver = expandData?.approved_by;
    const institution = expandData?.institution_ref;

    const approvedByName = approver?.name || (record.status === 'approved' ? "Organising Committee" : "Pending");
    const approverContact = approver?.mobile || (record.status === 'approved' ? "Official Support" : "N/A");
    const approverEmail = approver?.email || (record.status === 'approved' ? "support@competition.com" : "");

    const rawJuz = record.juz_options ? getJuzLabel(record.juz_options) : (record.selected_juz || 'N/A');
    const juzDisplay = cleanJuzLabelForPrint(rawJuz);
    const arrivalText = record.arrival_status === 'present' ? 'ARRIVED / PRESENT' : (record.arrival_status === 'absent' ? 'NOT ARRIVED / ABSENT' : 'NOT CHECKED-IN / NONE');

    return `
    <div class="form-page" style="${pageBreak ? 'page-break-after:always;' : ''}">
        <div class="header">
            <h1>${COMPETITION_TITLE}</h1>
            <h2>Candidate Application Form</h2>
        </div>

        <!-- Top Banner: Info + Stamp + Photo -->
        <div class="top-banner">
            <div class="top-left">
                <div class="info-row"><span class="info-label">Application ID</span><span class="info-val">${record.participant_id || record.id}</span></div>
                <div class="info-row"><span class="info-label">Status</span><span class="info-val">${record.status.toUpperCase()}</span></div>
                <div class="info-row"><span class="info-label">Submitted On</span><span class="info-val">${submitted}</span></div>
                <div class="info-row"><span class="info-label">Reg. Type</span><span class="info-val">${(record.registration_type || 'individual').charAt(0).toUpperCase() + (record.registration_type || 'individual').slice(1)}</span></div>
                <div class="info-row"><span class="info-label">Arrival Status</span><span class="info-val">${arrivalText}</span></div>
            </div>
            <div class="top-center">
                <div class="approval-stamp">
                    <div class="stamp-badge">APPROVED</div>
                    <div class="stamp-name">${approvedByName}</div>
                    <div class="stamp-contact">Ph: ${approverContact}</div>
                    ${approverEmail ? `<div class="stamp-email">${approverEmail}</div>` : ''}
                </div>
                ${(record.allocated_venue || record.allocated_order) ? `
                <div class="allocation-stamp">
                    <div class="alloc-badge">ALLOCATED</div>
                    <div class="alloc-venue">${record.allocated_venue || 'N/A'} - ${record.allocated_order || 'N/A'}</div>
                </div>
                ` : ''}
            </div>
            <div class="top-right">
                <div class="photo-box">
                    ${photoUrl
            ? `<img src="${photoUrl}" alt="Photo" />`
            : '<span>Passport<br/>Size<br/>Photo</span>'}
                </div>
            </div>
        </div>

        <!-- Personal Details — two-column grid -->
        <div class="section">
            <div class="section-title">Personal Details</div>
            <div class="grid-2col">
                <div class="field"><span class="fl">Full Name</span><span class="fv">${record.full_name}</span></div>
                <div class="field"><span class="fl">Father's Name</span><span class="fv">${record.father_name || 'N/A'}</span></div>
                <div class="field"><span class="fl">Father's Phone</span><span class="fv">${record.father_number || 'N/A'}</span></div>
                <div class="field"><span class="fl">Gender</span><span class="fv">${(record.gender || '').charAt(0).toUpperCase() + (record.gender || '').slice(1)}</span></div>
                <div class="field"><span class="fl">Date of Birth</span><span class="fv">${dob}</span></div>
                <div class="field"><span class="fl">Aadhaar Number</span><span class="fv">${record.aadhaar_number}</span></div>
                <div class="field"><span class="fl">Email</span><span class="fv single-line">${record.email || 'N/A'}</span></div>
                <div class="field"><span class="fl">WhatsApp</span><span class="fv">${record.whatsapp_number}</span></div>
                <div class="field full-width"><span class="fl">Home Address</span><span class="fv">${record.address || 'N/A'}</span></div>
            </div>
        </div>

        <!-- Juz Details — separate section -->
        <div class="section">
            <div class="section-title">Juz Details</div>
            <div class="grid-2col">
                <div class="field"><span class="fl">Category</span><span class="fv">${getCategoryLabel(record.category)}</span></div>
                <div class="field full-width"><span class="fl">Selected Juz</span><span class="fv single-line">${juzDisplay}</span></div>
            </div>
        </div>

        <!-- Guardian Details -->
        <div class="section">
            <div class="section-title">Guardian Details</div>
            <div class="grid-2col">
                <div class="field"><span class="fl">Guardian Name</span><span class="fv">${record.guardian_name || 'N/A'}</span></div>
                <div class="field"><span class="fl">Guardian Phone</span><span class="fv">${record.guardian_phone || 'N/A'}</span></div>
            </div>
        </div>

        ${institution ? `
        <!-- Institution Details -->
        <div class="section">
            <div class="section-title">Institution Details</div>
            <div class="grid-2col">
                <div class="field"><span class="fl">Institution Name</span><span class="fv">${institution.name || 'N/A'}</span></div>
                <div class="field"><span class="fl">Institution ID</span><span class="fv">${institution.institution_id || 'N/A'}</span></div>
                <div class="field"><span class="fl">Email</span><span class="fv single-line">${institution.email || 'N/A'}</span></div>
                <div class="field"><span class="fl">Phone</span><span class="fv">${institution.phone_number || institution.whatsapp_number || 'N/A'}</span></div>
                <div class="field full-width"><span class="fl">Address</span><span class="fv">${institution.address || 'N/A'}</span></div>
            </div>
        </div>
        ` : ''}

        <!-- Additional Information -->
        <div class="section">
            <div class="section-title">Additional Information</div>
            <div class="grid-2col">
                <div class="field"><span class="fl">Accommodation</span><span class="fv">${record.requires_accommodation ? 'Yes' : 'No'}</span></div>
            </div>
        </div>

        <!-- Declaration -->
        <div class="declaration">
            <strong>Declaration &amp; Consent:</strong> By signing this application, I hereby declare that all the information provided is true and accurate. I state that I have read, understood, and solemnly agree to obey and follow the rules, regulations, and guidelines laid down by the Organising Committee of the competition.
        </div>

        <!-- Signatures -->
        <div class="sig-area">
            <div class="sig-block"><div class="sig-line">Participant's Signature</div></div>
            <div class="sig-block"><div class="sig-line">Guardian's Signature</div></div>
            <div class="sig-block"><div class="sig-line">Approver's Signature</div></div>
        </div>

        <!-- Instructions -->
        <div class="instructions">
            <strong>Important Instructions:</strong>
            <ol>
                <li>A colour printout of this application is preferred, but black and white is acceptable.</li>
                <li>Please ensure all details are correct and signed before submission.</li>
                <li>Attach a photocopy of your Aadhaar card along with this application form.</li>
            </ol>
        </div>

        <div class="footer-note">This is a computer-generated application form.</div>
    </div>`;
}

function wrapFormsDocument(innerHtml: string, title: string = 'Application Form'): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
${PRINT_BASE_STYLES}

/* ── Page Layout ── */
.form-page { 
    padding: 10px 0; 
    max-width: 210mm; 
    margin: 0 auto; 
}
@media print {
    .form-page {
        max-width: none !important;
        width: 100% !important;
        margin: 0 !important;
    }
}

/* ── Top Banner ── */
.top-banner { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.top-left { flex: 1; }
.info-row { display: flex; align-items: baseline; margin-bottom: 2px; }
.info-label { width: 120px; font-size: 13.5px; font-weight: bold; flex-shrink: 0; }
.info-val { font-size: 13.5px; }
.top-center { display: flex; align-items: center; justify-content: center; gap: 10px; }
.top-right { flex-shrink: 0; }

/* ── Approval Stamp ── */
.approval-stamp { 
    border: 2.5px double #111; 
    border-radius: 5px; 
    padding: 5px 12px; 
    text-align: center; 
    transform: rotate(-1.5deg);
    min-width: 140px;
}
.stamp-badge { font-size: 16px; font-weight: 900; letter-spacing: 1.5px; border-bottom: 1.5px solid #111; padding-bottom: 2px; margin-bottom: 3px; line-height: 1; }
.stamp-name { font-size: 13px; font-weight: bold; line-height: 1.3; }
.stamp-contact { font-size: 11.5px; font-weight: bold; line-height: 1.3; }
.stamp-email { font-size: 10px; line-height: 1.25; color: #333; word-break: break-all; }

/* ── Allocation Stamp ── */
.allocation-stamp { 
    border: 2.5px double #059669; 
    border-radius: 5px; 
    padding: 5px 12px; 
    text-align: center; 
    transform: rotate(1.5deg);
    min-width: 140px;
    color: #059669;
}
.alloc-badge { font-size: 15px; font-weight: 900; letter-spacing: 1.5px; border-bottom: 1.5px solid #059669; padding-bottom: 2px; margin-bottom: 3px; line-height: 1; }
.alloc-venue { font-size: 13px; font-weight: bold; line-height: 1.3; }

/* ── Photo Box ── */
.photo-box { 
    width: 150px; height: 175px; 
    border: 1.5px solid #000; 
    display: flex; align-items: center; justify-content: center; 
    overflow: hidden; background: #fafafa; 
}
.photo-box img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
.photo-box span { font-size: 12px; color: #999; text-align: center; line-height: 1.3; }

/* ── Section Headers ── */
.section { margin-bottom: 10px; }
.section-title { 
    font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; 
    background: #e8e8e8; padding: 5px 10px; border-bottom: 2px solid #000; margin-bottom: 6px; 
}

/* ── Two-Column Grid ── */
.grid-2col { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 5px 28px; 
    padding: 0 10px; 
}
.grid-2col .full-width { grid-column: 1 / -1; }

/* ── Fields ── */
.field { display: flex; align-items: baseline; min-height: 24px; }
.fl { width: 155px; font-size: 15.5px; font-weight: bold; flex-shrink: 0; }
.fv { flex: 1; font-size: 15.5px; border-bottom: 1px dashed #aaa; padding-bottom: 2px; min-height: 20px; overflow: hidden; text-overflow: ellipsis; }
.fv.single-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Declaration ── */
.declaration { 
    margin-top: 16px; padding: 8px 12px; 
    border: 1px dashed #555; border-radius: 4px; 
    font-size: 12px; line-height: 1.45; text-align: justify; 
}

/* ── Signatures ── */
.sig-area { margin-top: 20px; display: flex; justify-content: space-between; padding: 0 15px; }
.sig-block { text-align: center; }
.sig-line { width: 180px; border-top: 1px solid #000; margin-top: 32px; padding-top: 5px; font-size: 13px; font-weight: bold; }

/* ── Instructions ── */
.instructions { margin-top: 16px; }
.instructions strong { font-size: 14px; text-transform: uppercase; margin-bottom: 4px; display: block; }
.instructions ol { font-size: 13px; margin-left: 20px; line-height: 1.5; color: #111; }
.instructions li { margin-bottom: 2px; }

/* ── Footer ── */
.footer-note { margin-top: 14px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 5px; }
</style></head><body>${innerHtml}</body></html>`;
}

export function replaceIndividualPlaceholders(html: string, record: ParticipantsApplicationResponse): string {
    const photoUrl = getPrintPhotoUrl(record, record.candidate_photo);
    const dob = formatDate(record.dob);
    const submitted = formatDate(record.created);
    const expand = (record as any).expand || {};
    const approver = expand.approved_by || {};
    const institution = expand.institution_ref || {};

    const map: Record<string, string> = {
        '{{id}}': record.id || '',
        '{{participant_id}}': record.participant_id || record.id || '',
        '{{full_name}}': record.full_name || '',
        '{{father_name}}': record.father_name || '',
        '{{father_number}}': record.father_number || '',
        '{{aadhaar_number}}': record.aadhaar_number || '',
        '{{dob}}': dob,
        '{{gender}}': record.gender || '',
        '{{category}}': getCategoryLabel(record.category),
        '{{selected_juz}}': cleanJuzLabelForPrint(record.juz_options ? getJuzLabel(record.juz_options) : (record.selected_juz || '')),
        '{{whatsapp_number}}': record.whatsapp_number || '',
        '{{email}}': record.email || '',
        '{{address}}': record.address || '',
        '{{guardian_name}}': record.guardian_name || '',
        '{{guardian_phone}}': record.guardian_phone || '',
        '{{requires_accommodation}}': record.requires_accommodation ? 'Yes' : 'No',
        '{{status}}': record.status ? record.status.toUpperCase() : '',
        '{{arrival_status}}': record.arrival_status === 'present' ? 'ARRIVED / PRESENT' : (record.arrival_status === 'absent' ? 'NOT ARRIVED / ABSENT' : 'NOT CHECKED-IN / NONE'),
        '{{allocated_venue}}': record.allocated_venue || 'N/A',
        '{{allocated_order}}': record.allocated_order ? String(record.allocated_order) : 'N/A',
        '{{photo_url}}': photoUrl,
        '{{candidate_photo}}': photoUrl,
        '{{created}}': submitted,
        '{{approved_by_name}}': approver.name || (record.status === 'approved' ? "Organising Committee" : "Pending"),
        '{{approved_by_mobile}}': approver.mobile || (record.status === 'approved' ? "Official Support" : "N/A"),
        '{{approved_by_email}}': approver.email || (record.status === 'approved' ? "support@competition.com" : ""),
        '{{institution_name}}': institution.name || 'N/A',
        '{{institution_id}}': institution.institution_id || 'N/A',
        '{{institution_email}}': institution.email || 'N/A',
        '{{institution_phone}}': institution.phone_number || institution.whatsapp_number || 'N/A',
        '{{institution_incharge}}': institution.contact_person || 'N/A',
        '{{institution_address}}': institution.address || 'N/A'
    };

    let output = html;
    Object.entries(map).forEach(([key, val]) => {
        output = output.split(key).join(val);
    });
    return output;
}

/** Generate printable HTML for a single individual application */
export function generateIndividualFormHTML(record: ParticipantsApplicationResponse, customTemplate?: string): string {
    if (record.status !== 'approved') {
        return wrapFormsDocument(`
            <div class="error-msg">
                <h2>Application is not approved</h2>
                <p>Forms can only be printed for candidates with an 'approved' status.</p>
            </div>
        `);
    }
    if (customTemplate) {
        return replaceIndividualPlaceholders(customTemplate, record);
    }
    return wrapFormsDocument(singleFormHTML(record, false), `application_${record.participant_id || record.id}`);
}

/** Generate printable HTML for ALL approved student forms under an institution */
export function generateAllFormsHTML(applications: ParticipantsApplicationResponse[], customTemplate?: string): string {
    const approvedApps = applications.filter(app => app.status === 'approved');

    if (approvedApps.length === 0) {
        return wrapFormsDocument(`
            <div class="error-msg">
                <h2>No applicant is approved</h2>
                <p>There are currently no approved candidates registered under this institution.</p>
            </div>
        `);
    }

    if (customTemplate) {
        const hasHtmlOrBody = customTemplate.toLowerCase().includes('<html') || customTemplate.toLowerCase().includes('<body');
        if (hasHtmlOrBody) {
            // Extract the style tags
            const styleMatch = customTemplate.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            const styleContent = styleMatch ? styleMatch[0] : '';

            // Extract the script tags
            const scriptMatch = customTemplate.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
            const scriptContent = scriptMatch ? scriptMatch[0] : '';

            // Extract contents inside body
            let bodyContent = customTemplate;
            const bodyMatch = customTemplate.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
                bodyContent = bodyMatch[1];
            } else {
                const headCloseIndex = customTemplate.toLowerCase().indexOf('</head>');
                if (headCloseIndex !== -1) {
                    bodyContent = customTemplate.substring(headCloseIndex + 7);
                }
            }

            // Map each student form, replacing placeholders
            const pagesMarkup = approvedApps.map((app) => {
                const replaced = replaceIndividualPlaceholders(bodyContent, app);
                return `<div class="print-page-wrapper" style="page-break-after: always; break-after: page; box-sizing: border-box;">${replaced}</div>`;
            }).join('\n');

            return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>All Application Forms</title>
    ${styleContent}
    ${scriptContent}
    <style>
        @media print {
            .print-page-wrapper {
                page-break-inside: avoid !important;
            }
            .print-page-wrapper:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
            }
        }
    </style>
</head>
<body>
    ${pagesMarkup}
</body>
</html>`;
        } else {
            return customTemplate.includes('page-break-after')
                ? approvedApps.map(app => replaceIndividualPlaceholders(customTemplate, app)).join('\n')
                : approvedApps.map(app => `<div style="page-break-after:always;">${replaceIndividualPlaceholders(customTemplate, app)}</div>`).join('\n');
        }
    }

    const sorted = [...approvedApps].sort((a, b) => a.category.localeCompare(b.category));
    const inner = sorted.map((app, i) => singleFormHTML(app, i < sorted.length - 1)).join('\n');
    return wrapFormsDocument(inner);
}

/** Generate printable attendance sheet HTML, grouped by Juz category */
export function generateAttendanceSheetHTML(
    institution: InstitutionsResponse,
    applications: ParticipantsApplicationResponse[],
    customTemplate?: string
): string {
    const approvedApps = applications.filter(a => a.status === 'approved');

    if (approvedApps.length === 0) {
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance Sheet</title>
            <style>${PRINT_BASE_STYLES}</style></head><body>
            <div class="error-msg">
                <h2>No applicant is approved</h2>
                <p>Attendance sheets are only generated for approved candidates.</p>
            </div>
            </body></html>`;
    }

    const categories = ['5_juz', '15_juz', '30_juz'] as const;
    const labels: Record<string, string> = { '30_juz': '30 Juzz', '15_juz': '15 Juzz', '5_juz': '5 Juzz' };

    const categoryTables = categories.map(cat => {
        const apps = approvedApps.filter(a => a.category === cat);
        if (apps.length === 0) return '';

        const rowsHtml = apps.map((app, idx) => {
            const venueOrder = app.allocated_venue ? `${app.allocated_venue} - ${app.allocated_order || ''}` : '—';
            return `<tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="text-align: center; font-family: monospace;">${app.participant_id || app.id}</td>
                <td style="text-align: center;">${venueOrder}</td>
                <td style="font-weight: bold;">${app.full_name}</td>
                <td></td>
            </tr>`;
        }).join('\n');

        return `
        <div class="category-block" style="margin-bottom: 15px;">
            <div class="category-header" style="font-size: 13px; font-weight: bold; text-align: center; margin-bottom: 5px; text-transform: uppercase;">${labels[cat]}</div>
            <table class="student-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="width: 8%; border: 2px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 11px;">S.No</th>
                        <th style="width: 20%; border: 2px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 11px;">Reg No</th>
                        <th style="width: 15%; border: 2px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 11px;">Stage</th>
                        <th style="width: 42%; border: 2px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 11px;">Name</th>
                        <th style="width: 15%; border: 2px solid #000; padding: 5px; background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 11px;">Sign</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>`;
    }).join('\n');
    const currentYear = new Date().getFullYear();
    const serialNum = institution.institution_id || 'INST-01';
    const muallimName = institution.contact_person || '—';
    const muallimPhone = institution.phone_number || institution.whatsapp_number || '—';
    const inchargeName = institution.incharge || '—';
    const inchargePhone = institution.incharge_number || '—';

    const renderPage = (copyType: 'Office Copy' | 'Madrasa Copy') => `
        <div class="page-break attendance-page">
            <div class="copy-label">${copyType}</div>
            
            <div class="main-border-box">
                <div class="org-title">AL JAMIUL AZHAR JUM'AH MASJID</div>
                <div class="event-title">STATE LEVEL HIFZ COMPETITION - ${currentYear}</div>
                <div class="reg-form-title">REGISTRATION FORM</div>
                
                <div class="inst-row">
                    <div class="inst-serial">${serialNum}</div>
                    <div class="inst-details">
                        <div class="inst-name">${institution.name}</div>
                        <div class="inst-address">${institution.address || '—'}</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-cell">DATE: <span class="dynamic-date">—</span></div>
                        <div class="info-cell">TIME: <span class="dynamic-time">—</span></div>
                        <div class="info-cell">NO OF STUDENTS: ${approvedApps.length}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-cell colspan-3">MUALLIM NAME: ${muallimName}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-cell colspan-3">MUALLIM PH NO: ${muallimPhone}</div>
                    </div>
                </div>
            </div>
            
            ${categoryTables}
            
            <div class="bottom-container">
                <div class="sig-section">
                    <div class="sig-block">Muallim Sign</div>
                    <div class="sig-block">Authorized Sign</div>
                </div>
                
                <div class="incharge-footer">
                    <div>INCHARGE NAME: ${inchargeName}</div>
                    <div>MOBILE: ${inchargePhone}</div>
                </div>
            </div>
        </div>
    `;

    const voucherPage = `
        <div class="page-break ta-voucher-page">
            <div class="main-border-box" style="margin-top: 20px;">
                <div class="org-title" style="font-size: 20px; padding: 6px 2px;">AL JAMIUL AZHAR JUM'AH MASJID</div>
                <div class="event-title" style="font-size: 15px; padding: 4px 2px;">STATE LEVEL HIFZ COMPETITION - 2026</div>
                <div class="reg-form-title" style="font-size: 15px; padding: 4px 2px;">TA VOUCHER</div>
                
                <div class="inst-row">
                    <div class="inst-serial">${serialNum}</div>
                    <div class="inst-details">
                        <div class="inst-name" style="font-size: 16px;">${institution.name}</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-cell" style="padding: 12px; font-size: 14px;">No of STUDENTS: </div>
                        <div class="info-cell" style="padding: 12px; font-size: 14px;">No of GUESTS: </div>
                    </div>
                </div>
            </div>
            
            <table class="voucher-table" style="margin-top: 25px;">
                <thead>
                    <tr>
                        <th>TRAVEL</th>
                        <th>NO</th>
                        <th>AMOUNT / PER</th>
                        <th>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="font-weight: bold; padding: 12px 10px;">1 - WAY</td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; padding: 12px 10px;">2 - WAY</td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-align: right; padding: 12px 10px;">TOTAL</td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            
            <table class="denomination-table" style="width: 50%; margin-top: 30px; margin-left: auto; margin-right: auto;">
                <tbody>
                    <tr>
                        <td style="font-weight: bold; text-align: center; padding: 6px;">500</td>
                        <td style="text-align: center; padding: 6px;">x</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-align: center; padding: 6px;">200</td>
                        <td style="text-align: center; padding: 6px;">x</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-align: center; padding: 6px;">100</td>
                        <td style="text-align: center; padding: 6px;">x</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-align: center; padding: 6px;">50</td>
                        <td style="text-align: center; padding: 6px;">x</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-align: center; padding: 6px;">20</td>
                        <td style="text-align: center; padding: 6px;">x</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-align: center; padding: 6px;">10</td>
                        <td style="text-align: center; padding: 6px;">x</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; text-align: center; padding: 6px;">TOTAL</td>
                        <td colspan="2"></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            
            <div class="bottom-container">
                <div style="display: flex; justify-content: space-between; padding: 0 40px; margin-bottom: 20px;">
                    <div style="font-weight: bold; font-size: 14px; text-align: center; border-top: 2px solid #000; padding-top: 8px; width: 200px;">Authorized By</div>
                    <div style="font-weight: bold; font-size: 14px; text-align: center; border-top: 2px solid #000; padding-top: 8px; width: 200px;">Received By</div>
                </div>
            </div>
        </div>
    `;

    const sheets = `
        ${renderPage('Office Copy')}
        ${renderPage('Madrasa Copy')}
        ${voucherPage}
    `;

    const scriptAndStyles = `
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Times New Roman', Times, serif; 
            color: #000; 
            background: #fff; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
        }
        @page { size: A4 portrait; margin: 10mm; }
        @media print { 
            .page-break { 
                page-break-after: always; 
                break-after: page; 
                display: block; 
                clear: both; 
                height: 270mm;
            }
            .page-break:last-child { 
                page-break-after: avoid; 
                break-after: avoid; 
            }
        }
        .attendance-page, .ta-voucher-page {
            width: 100%;
            height: 270mm;
            box-sizing: border-box;
            position: relative;
            padding: 5px;
        }
        .bottom-container {
            position: absolute;
            bottom: 10px;
            left: 5px;
            right: 5px;
        }
        .copy-label {
            text-align: right;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .main-border-box {
            border: 2px solid #000;
            width: 100%;
            margin-bottom: 12px;
        }
        .org-title {
            font-size: 22px;
            font-weight: bold;
            text-align: center;
            padding: 8px 2px;
            border-bottom: 2px solid #000;
        }
        .event-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            padding: 5px 2px;
            border-bottom: 2px solid #000;
        }
        .reg-form-title {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            padding: 5px 2px;
            background-color: #f2f2f2;
            border-bottom: 2px solid #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .inst-row {
            display: flex;
            border-bottom: 2px solid #000;
            align-items: stretch;
        }
        .inst-serial {
            width: 33.33%;
            font-size: 22px;
            font-weight: bold;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 2px solid #000;
            background-color: #f2f2f2;
            padding: 10px;
            white-space: nowrap;
        }
        .inst-details {
            width: 66.67%;
            padding: 8px 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .inst-name {
            font-size: 18px;
            font-weight: bold;
        }
        .inst-address {
            font-size: 13px;
            color: #000;
            margin-top: 3px;
        }
        .info-grid {
            display: flex;
            flex-direction: column;
        }
        .info-row {
            display: flex;
            border-bottom: 2px solid #000;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-cell {
            flex: 1;
            padding: 8px 12px;
            font-size: 14px;
            font-weight: bold;
            border-right: 2px solid #000;
        }
        .info-cell:last-child {
            border-right: none;
        }
        .info-cell.colspan-3 {
            flex: 3;
            border-right: none;
        }
        .category-block {
            margin-bottom: 15px;
        }
        .category-header {
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .student-table, .voucher-table, .denomination-table {
            width: 100%;
            border-collapse: collapse;
        }
        .student-table th, .student-table td,
        .voucher-table th, .voucher-table td,
        .denomination-table td {
            border: 2px solid #000;
            padding: 8px 10px;
            font-size: 14px;
            text-align: left;
            color: #000;
        }
        .student-table th, .voucher-table th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
            font-size: 13px;
            text-transform: uppercase;
        }
        .sig-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            padding: 0 30px;
        }
        .sig-block {
            font-weight: bold;
            font-size: 14px;
            text-align: center;
            border-top: 2px solid #000;
            padding-top: 8px;
            width: 200px;
        }
        .incharge-footer {
            border: 2px solid #000;
            padding: 10px;
            font-size: 14px;
            font-weight: bold;
            background-color: #f2f2f2;
            line-height: 1.6;
        }
    </style>
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const formattedDate = day + '/' + month + '/' + year;

            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const formattedTime = hours + ':' + minutes + ' ' + ampm;

            document.querySelectorAll('.dynamic-date').forEach(el => el.textContent = formattedDate);
            document.querySelectorAll('.dynamic-time').forEach(el => el.textContent = formattedTime);
        });
    </script>
    `;

    if (customTemplate) {
        const map: Record<string, string> = {
            '{{sheets}}': sheets + scriptAndStyles,
            '{{content}}': sheets + scriptAndStyles,
            '{{institution_name}}': institution.name || '',
            '{{institution_id}}': institution.institution_id || 'N/A',
            '{{contact_person}}': institution.contact_person || '',
            '{{in_charge}}': institution.contact_person || '',
            '{{in_charge_phone}}': institution.phone_number || institution.whatsapp_number || 'N/A',
            '{{email}}': institution.email || 'N/A',
            '{{address}}': institution.address || 'N/A'
        };
        let output = customTemplate;
        Object.entries(map).forEach(([key, val]) => {
            output = output.split(key).join(val);
        });
        return output;
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance Sheet</title>
    ${scriptAndStyles}
    </head><body>${sheets}</body></html>`;
}

export function generateFinalistsOrWinnersHTML(type: 'finalists' | 'winners', category: string, data: any[]): string {
    const title = type === 'winners' ? 'Winner List' : 'Finalists List';
    const catLabel = category.replace('_', ' ').toUpperCase();
    
    const announcementText = type === 'winners' 
        ? "Official announcement of the winners and final standings of the competition, as per the final round marks evaluated and locked by the panel of judges."
        : "The following candidates have successfully qualified and are selected to participate in the Final Round of the competition based on their preliminary round scores evaluated by the panel of judges.";

    const renderTable = (studentsList: any[], startIndex: number, sectionTitle?: string) => {
        let tableRows = '';
        
        if (type === 'winners') {
            studentsList.forEach((student, index) => {
                const rankOrSerial = student.final_ranking || startIndex + index + 1;
                tableRows += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 12px 8px; text-align: center; font-size: 16px; font-weight: bold; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${rankOrSerial}</td>
                        <td style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; line-height: 1.4; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">
                            <div style="font-size: 16px; font-weight: bold; margin-bottom: 2px;">${student.full_name || ''}</div>
                            <div style="color: #111; font-size: 13px;">S/o: ${student.father_name || 'N/A'}</div>
                            <div style="color: #444; font-size: 12px; margin-top: 4px;">Reg ID: ${student.participant_id || ''}</div>
                        </td>
                        <td style="border: 1px solid #000; padding: 12px 8px; font-size: 13px; line-height: 1.4; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">
                            <div style="font-weight: bold; margin-bottom: 2px;">${student.institution_name || 'Individual'}</div>
                            <div style="color: #333; font-size: 12px;">${student.address || student.village_name || 'N/A'}</div>
                        </td>
                        <td style="border: 1px solid #000; padding: 12px 8px; text-align: center; font-size: 18px; font-weight: bold; color: #000; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${student.final_marks || 0}</td>
                        <td style="border: 1px solid #000; padding: 12px 8px; vertical-align: middle; overflow: hidden; height: 55px;"></td>
                    </tr>
                `;
            });

            return `
                ${sectionTitle ? `<h3 style="font-size: 18px; font-weight: bold; margin: 25px 0 10px 0; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; color: #111; font-family: 'Times New Roman', Times, serif;">${sectionTitle}</h3>` : ''}
                <table style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 5px; border: 1px solid #000; font-family: 'Times New Roman', Times, serif; box-sizing: border-box;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 8%; text-align: center;">Rank</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 32%; text-align: left;">Participant Details</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 32%; text-align: left;">Institution & Full Address</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 10%; text-align: center;">Total Marks</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 18%; text-align: left;">Distributed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || `<tr><td colspan="5" style="text-align: center; padding: 20px; border: 1px solid #000;">No records found.</td></tr>`}
                    </tbody>
                </table>
            `;
        } else {
            studentsList.forEach((student, index) => {
                const serialNum = startIndex + index + 1;
                tableRows += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 10px 8px; text-align: center; font-size: 14px; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${serialNum}</td>
                        <td style="border: 1px solid #000; padding: 10px 8px; text-align: center; font-size: 14px; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${student.participant_id || ''}</td>
                        <td style="border: 1px solid #000; padding: 10px 8px; font-size: 14px; font-weight: bold; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${student.full_name || ''}</td>
                        <td style="border: 1px solid #000; padding: 10px 8px; font-size: 14px; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${student.father_name || ''}</td>
                        <td style="border: 1px solid #000; padding: 10px 8px; font-size: 14px; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${student.village_name || ''}</td>
                        <td style="border: 1px solid #000; padding: 10px 8px; font-size: 14px; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${student.institution_name || 'Individual'}</td>
                        <td style="border: 1px solid #000; padding: 10px 8px; text-align: center; font-size: 14px; font-weight: bold; font-family: 'Times New Roman', Times, serif; overflow: hidden; word-wrap: break-word;">${student.final_marks || 0}</td>
                    </tr>
                `;
            });

            return `
                <table style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 15px; border: 1px solid #000; font-family: 'Times New Roman', Times, serif; box-sizing: border-box;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 6%; text-align: center;">S.No</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 10%; text-align: center;">Reg ID</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 25%; text-align: left;">Name</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 20%; text-align: left;">Father's Name</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 15%; text-align: left;">Village</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 16%; text-align: left;">Institution</th>
                            <th style="border: 1px solid #000; padding: 12px 8px; font-size: 14px; text-transform: uppercase; background-color: #f2f2f2; width: 8%; text-align: center;">Total Marks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || `<tr><td colspan="7" style="text-align: center; padding: 20px; border: 1px solid #000;">No records found.</td></tr>`}
                    </tbody>
                </table>
            `;
        }
    };

    let tablesHtml = '';
    if (type === 'winners') {
        const topThree = data.slice(0, 3);
        const remaining = data.slice(3);
        
        tablesHtml += renderTable(topThree, 0, "🏆 Podium Winners (Top 3)");
        if (remaining.length > 0) {
            tablesHtml += `<div style="page-break-before: auto; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px;"></div>`;
            tablesHtml += renderTable(remaining, 3, "✨ Consolation Winners / Remaining Rankings");
        }
    } else {
        tablesHtml += renderTable(data, 0);
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
            ${PRINT_BASE_STYLES}
            .sheet { padding: 5px; }
            td { padding: 10px 8px; }
        </style>
    </head>
    <body>
        <div class="sheet">
            <div class="header" style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
                ${COMPETITION_TITLE}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
                    <div style="font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${title}</div>
                    <div style="font-size: 22px; font-weight: bold; color: #111;">Category: ${catLabel}</div>
                </div>
            </div>

            <div style="margin: 15px 0 25px 0; text-align: center; font-style: italic; font-size: 14px; color: #333; line-height: 1.5; font-family: 'Times New Roman', Times, serif; border: 1px dashed #000; padding: 10px; background-color: #fafafa;">
                ${announcementText}
            </div>

            ${tablesHtml}
        </div>
    </body>
    </html>
    `;
}


