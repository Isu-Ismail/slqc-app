import { pb } from '../../../api/db';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../../api/track';

// ─── Template Generators ───────────────────────────────────────

const COMPETITION_TITLE = 'Quran Hifz Competition 2026';

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

    .header { text-align: center; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1.5px solid #000; }
    .header h1 { font-size: 18px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px; }
    .header h2 { font-size: 13px; font-weight: bold; color: #333; margin-bottom: 2px; }
    
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

function categoryLabel(cat: string): string {
    return cat.replace('_', ' ').toUpperCase();
}

function parseCustomTemplate(
    templateStr: string,
    record: ParticipantsApplicationResponse,
    institution: any,
    dob: string,
    submitted: string,
    approvedByName: string,
    approverContact: string,
    approverEmail: string,
    photoUrl: string
): string {
    const instHtml = institution ? `
    <div class="section">
        <div class="section-title">Institution Details</div>
        <div class="fields">
            <div class="field-row">
                <div class="field half"><span class="fl">Institution Name</span><span class="fv">${institution.name || 'N/A'}</span></div>
                <div class="field half"><span class="fl">Institution ID</span><span class="fv">${institution.institution_id || 'N/A'}</span></div>
            </div>
            <div class="field-row">
                <div class="field half"><span class="fl">Institution Email</span><span class="fv">${institution.email || 'N/A'}</span></div>
                <div class="field half"><span class="fl">Phone Number</span><span class="fv">${institution.phone_number || institution.whatsapp_number || 'N/A'}</span></div>
            </div>
            <div class="field"><span class="fl">Institution Address</span><span class="fv">${institution.address || 'N/A'}</span></div>
        </div>
    </div>
    ` : '';

    return templateStr
        .replace(/\{\{COMPETITION_TITLE\}\}/g, COMPETITION_TITLE)
        .replace(/\{\{id\}\}/g, record.participant_id || record.id)
        .replace(/\{\{status\}\}/g, record.status.toUpperCase())
        .replace(/\{\{submitted\}\}/g, submitted)
        .replace(/\{\{registration_type\}\}/g, record.registration_type.charAt(0).toUpperCase() + record.registration_type.slice(1))
        .replace(/\{\{approvedByName\}\}/g, approvedByName)
        .replace(/\{\{approverContact\}\}/g, approverContact)
        .replace(/\{\{approverEmail\}\}/g, approverEmail)
        .replace(/\{\{photoUrl\}\}/g, photoUrl)
        .replace(/\{\{full_name\}\}/g, record.full_name)
        .replace(/\{\{father_name\}\}/g, record.father_name || 'N/A')
        .replace(/\{\{father_number\}\}/g, record.father_number || 'N/A')
        .replace(/\{\{gender\}\}/g, record.gender.charAt(0).toUpperCase() + record.gender.slice(1))
        .replace(/\{\{dob\}\}/g, dob)
        .replace(/\{\{aadhaar_number\}\}/g, record.aadhaar_number)
        .replace(/\{\{category\}\}/g, categoryLabel(record.category))
        .replace(/\{\{email\}\}/g, record.email || 'N/A')
        .replace(/\{\{whatsapp_number\}\}/g, record.whatsapp_number)
        .replace(/\{\{guardian_name\}\}/g, record.guardian_name || 'N/A')
        .replace(/\{\{guardian_phone\}\}/g, record.guardian_phone || 'N/A')
        .replace(/\{\{requires_accommodation\}\}/g, record.requires_accommodation ? 'Yes' : 'No')
        .replace(/\{\{allocated_venue\}\}/g, record.allocated_venue || 'N/A')
        .replace(/\{\{institution_details\}\}/g, instHtml);
}

/** Generate a single application form HTML page */
function singleFormHTML(record: ParticipantsApplicationResponse, pageBreak: boolean, customTemplate?: string): string {
    const photoUrl = record.candidate_photo
        ? pb.files.getURL(record, record.candidate_photo)
        : '';
    const dob = formatDate(record.dob);
    const submitted = formatDate(record.created);

    // Extract real data from the relation field (Note: matches your schema spelling 'approved_by')
    const expandData = (record as { expand?: { approved_by?: { name?: string, mobile?: string, email?: string }, institution_ref?: any } }).expand;
    const approver = expandData?.approved_by;
    const institution = expandData?.institution_ref;

    const approvedByName = approver?.name || (record.status === 'approved' ? "Organising Committee" : "Pending");
    const approverContact = approver?.mobile || (record.status === 'approved' ? "Official Support" : "N/A");
    const approverEmail = approver?.email || (record.status === 'approved' ? "support@competition.com" : "");

    if (customTemplate && customTemplate.trim().length > 0) {
        const parsed = parseCustomTemplate(customTemplate, record, institution, dob, submitted, approvedByName, approverContact, approverEmail, photoUrl);
        return `<div class="form-page" style="${pageBreak ? 'page-break-after:always;' : ''}">${parsed}</div>`;
    }

    return `
    <div class="form-page" style="${pageBreak ? 'page-break-after:always;' : ''}">
        <div class="header">
            <h1>${COMPETITION_TITLE}</h1>
            <h2>Candidate Application Form</h2>
        </div>

        <div class="top-row">
            <div class="top-info">
                <p><strong>Candidate ID:</strong> ${record.participant_id || record.id}</p>
                <p><strong>Status:</strong> ${record.status.toUpperCase()}</p>
                <p><strong>Submitted On:</strong> ${submitted}</p>
                <p><strong>Registration Type:</strong> ${record.registration_type.charAt(0).toUpperCase() + record.registration_type.slice(1)}</p>
            </div>
            
            <div class="approval-stamp">
                <div class="stamp-title">APPROVED</div>
                <div class="stamp-details">
                    <span style="font-size: 11px;">${approvedByName}</span><br/>
                    Ph: ${approverContact}<br/>
                    ${approverEmail ? `<span style="font-size: 8px; font-weight: normal;">${approverEmail}</span>` : ''}
                </div>
            </div>

            <div class="photo-box">
                ${photoUrl
            ? `<img src="${photoUrl}" alt="Candidate Passport Photo" />`
            : '<span>Passport<br/>Size<br/>Photo</span>'}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Personal Details</div>
            <div class="fields">
                <div class="field"><span class="fl">Full Name</span><span class="fv">${record.full_name}</span></div>
                <div class="field"><span class="fl">Father's Name</span><span class="fv">${record.father_name || 'N/A'}</span></div>
                <div class="field"><span class="fl">Father's Phone</span><span class="fv">${record.father_number || 'N/A'}</span></div>
                <div class="field"><span class="fl">Gender</span><span class="fv">${record.gender.charAt(0).toUpperCase() + record.gender.slice(1)}</span></div>
                <div class="field"><span class="fl">Date of Birth</span><span class="fv">${dob}</span></div>
                <div class="field"><span class="fl">Aadhaar Number</span><span class="fv">${record.aadhaar_number}</span></div>
                <div class="field"><span class="fl">Category</span><span class="fv">${categoryLabel(record.category)}</span></div>
                <div class="field"><span class="fl">Email</span><span class="fv">${record.email || 'N/A'}</span></div>
                <div class="field"><span class="fl">WhatsApp Number</span><span class="fv">${record.whatsapp_number}</span></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Guardian Details</div>
            <div class="fields">
                <div class="field"><span class="fl">Guardian Name</span><span class="fv">${record.guardian_name}</span></div>
                <div class="field"><span class="fl">Guardian Phone</span><span class="fv">${record.guardian_phone}</span></div>
            </div>
        </div>

        ${institution ? `
        <div class="section">
            <div class="section-title">Institution Details</div>
            <div class="fields">
                <div class="field-row">
                    <div class="field half"><span class="fl">Institution Name</span><span class="fv">${institution.name || 'N/A'}</span></div>
                    <div class="field half"><span class="fl">Institution ID</span><span class="fv">${institution.institution_id || 'N/A'}</span></div>
                </div>
                <div class="field-row">
                    <div class="field half"><span class="fl">Institution Email</span><span class="fv">${institution.email || 'N/A'}</span></div>
                    <div class="field half"><span class="fl">Phone Number</span><span class="fv">${institution.phone_number || institution.whatsapp_number || 'N/A'}</span></div>
                </div>
                <div class="field"><span class="fl">Institution Address</span><span class="fv">${institution.address || 'N/A'}</span></div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <div class="section-title">Additional Information</div>
            <div class="fields">
                <div class="field"><span class="fl">Requires Accommodation</span><span class="fv">${record.requires_accommodation ? 'Yes' : 'No'}</span></div>
            </div>
        </div>

        <div class="declaration-block" style="margin-top: 10px; padding: 6px; border: 1px dashed #555; border-radius: 4px; font-size: 10px; line-height: 1.3; text-align: justify; margin-bottom: 6px;">
            <strong>Declaration & Consent:</strong> By signing this application, I hereby declare that all the information provided is true and accurate. I state that I have read, understood, and solemnly agree to obey and follow the rules, regulations, and guidelines laid down by the Organising Committee of the competition.
        </div>

        <div class="sig-area">
            <div class="sig-block"><div class="sig-line">Participant's Signature</div></div>
            <div class="sig-block"><div class="sig-line">Guardian's Signature</div></div>
            <div class="sig-block"><div class="sig-line">Approver's Signature</div></div>
        </div>
        
        <div class="instructions-block">
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

function wrapFormsDocument(innerHtml: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Application Form</title>
<style>
${PRINT_BASE_STYLES}
.form-page { 
    padding: 0; 
    max-width: 190mm; 
    margin: 0 auto; 
}
@media print {
    .form-page {
        max-width: none !important;
        width: 89.2% !important;
        transform: scale(1.12) !important;
        transform-origin: top left !important;
        margin: 0 !important;
    }
}
.top-row { display: flex; justify-content: space-between; align-items: stretch; margin-bottom: 10px; }
.top-info { flex: 1; }
.top-info p { font-size: 13.5px; margin-bottom: 4px; }

/* Approval Stamp CSS */
.approval-stamp { 
    border: 2px double #222; 
    border-radius: 4px; 
    padding: 4px 8px; 
    text-align: center; 
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
    margin: 0 10px; 
    align-self: center;
    transform: rotate(-1deg);
}
.stamp-title { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; border-bottom: 1px solid #222; padding-bottom: 2px; margin-bottom: 2px; line-height: 1; color: #111; }
.stamp-details { font-size: 11px; font-weight: bold; line-height: 1.3; color: #222; }

.photo-box { width: 100px; height: 125px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; background-color: #f9f9f9; }
.photo-box img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
.photo-box span { font-size: 10px; color: #888; text-align: center; line-height: 1.3; }
.section { margin-bottom: 6px; }
.section-title { font-size: 13.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; background: #eee; padding: 2px 6px; border-bottom: 1px solid #000; margin-bottom: 4px; }
.fields { padding: 0 4px; }
.field { display: flex; align-items: flex-end; margin-bottom: 3.5px; }
.fl { width: 180px; font-size: 13.5px; font-weight: bold; flex-shrink: 0; }
.fv { flex: 1; font-size: 13.5px; border-bottom: 1px dashed #999; padding-bottom: 1px; min-height: 16px; }
.field-row { display: flex; gap: 15px; margin-bottom: 3.5px; }
.field.half { flex: 1; margin-bottom: 0; display: flex; align-items: flex-end; }
.field.half .fl { width: 120px; }
.sig-area { margin-top: 15px; display: flex; justify-content: space-between; padding: 0 10px; }
.sig-block { text-align: center; }
.sig-line { width: 160px; border-top: 1px solid #000; margin-top: 24px; padding-top: 4px; font-size: 11.5px; font-weight: bold; }
.instructions-block { margin-top: 10px; padding: 4px 0; border: none; background: none; }
.instructions-block strong { font-size: 12px; text-transform: uppercase; margin-bottom: 4px; display: block; }
.instructions-block ol { font-size: 11px; margin-left: 15px; line-height: 1.4; color: #111; }
.instructions-block li { margin-bottom: 2px; }
.footer-note { margin-top: 10px; text-align: center; font-size: 9.5px; color: #888; border-top: 1px solid #ddd; padding-top: 4px; }
</style></head><body>${innerHtml}</body></html>`;
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
    return wrapFormsDocument(singleFormHTML(record, false, customTemplate));
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

    const sorted = [...approvedApps].sort((a, b) => a.category.localeCompare(b.category));
    const inner = sorted.map((app, i) => singleFormHTML(app, i < sorted.length - 1, customTemplate)).join('\n');
    return wrapFormsDocument(inner);
}

/** Generate printable attendance sheet HTML, grouped by Juz category */
export function generateAttendanceSheetHTML(
    institution: InstitutionsResponse,
    applications: ParticipantsApplicationResponse[]
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
    const labels: Record<string, string> = { '5_juz': '5 Juz', '15_juz': '15 Juz', '30_juz': '30 Juz' };

    let sheets = '';
    const activeCats = categories.filter(c => approvedApps.some(a => a.category === c));

    activeCats.forEach((cat, catIdx) => {
        const apps = approvedApps.filter(a => a.category === cat);
        const isLast = catIdx === activeCats.length - 1;

        let rows = '';
        apps.forEach((app, i) => {
            rows += `<tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="font-weight:bold;">${app.full_name}</td>
                <td>${app.whatsapp_number}</td>
                <td>${app.aadhaar_number}</td>
                <td style="font-family:monospace;font-size:12px;">${app.participant_id || app.id}</td>
                <td style="height:38px;"></td>
            </tr>`;
        });

        sheets += `
        <div class="sheet" style="${isLast ? '' : 'page-break-after:always;'}">
            <div class="header">
                <h1>${COMPETITION_TITLE}</h1>
                <h2>Attendance Sheet &mdash; ${labels[cat]} Category</h2>
            </div>
            
            <div class="inst-info">
                <div class="inst-info-col">
                    <p><strong>Institution:</strong> ${institution.name}</p>
                    <p><strong>Institution ID:</strong> ${institution.institution_id || 'N/A'}</p>
                    <p><strong>Total Candidates (${labels[cat]}):</strong> ${apps.length}</p>
                </div>
                <div class="inst-info-col">
                    <p><strong>In-Charge:</strong> ${institution.contact_person} ${institution.phone_number ? `| Ph: ${institution.phone_number}` : ''}</p>
                    <p><strong>Email:</strong> ${institution.email || 'N/A'}</p>
                    <p><strong>Address:</strong> ${institution.address || 'N/A'}</p>
                </div>
            </div>

            <table>
                <thead><tr>
                    <th style="width:40px;">S.No</th>
                    <th>Applicant Name</th>
                    <th style="width:125px;">Phone Number</th>
                    <th style="width:135px;">Aadhaar Number</th>
                    <th style="width:135px;">Participant ID</th>
                    <th style="width:105px;">Signature</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="sheet-footer">
                <div class="sig-block"><div class="sig-line">Coordinator's Signature &amp; Stamp</div></div>
                <div class="sig-block"><div class="sig-line">Date</div></div>
            </div>
        </div>`;
    });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Attendance Sheet</title>
<style>
${PRINT_BASE_STYLES}
/* Force Landscape for Attendance Sheets */
@page { size: A4 landscape; margin: 15mm; }
.sheet { padding: 20px; max-width: 297mm; margin: 0 auto; }

/* Flex layout for header information */
.inst-info { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; font-size: 13px; text-align: left; }
.inst-info-col { flex: 1; }
.inst-info-col p { margin-bottom: 5px; }

table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 6px 10px; font-size: 13px; text-align: left; }
th { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
.sheet-footer { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 20px; }
.sig-block { text-align: center; }
.sig-line { width: 240px; border-top: 1px solid #000; margin-top: 44px; padding-top: 6px; font-size: 12px; font-weight: bold; }
</style></head><body>${sheets}</body></html>`;
}
