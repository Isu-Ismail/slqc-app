// src/features/registration/views/track/components/PrintPreviewModal.tsx
import { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { pb } from '../../../../../api/db';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../../../../api/types';
import styles from './PrintPreviewModal.module.css';
import { getJuzLabel } from '../../../../../config/fieldsConfig';

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

function categoryLabel(cat: string): string {
    return cat.replace('_', ' ').toUpperCase();
}



/** Generate a single application form HTML page */
function singleFormHTML(record: ParticipantsApplicationResponse, pageBreak: boolean): string {
    const photoUrl = record.candidate_photo
        ? pb.files.getURL(record, record.candidate_photo)
        : '';
    const dob = formatDate(record.dob);
    const submitted = formatDate(record.created);

    const expandData = (record as any).expand;
    const approver = expandData?.approved_by;
    const institution = expandData?.institution_ref;

    const approvedByName = approver?.name || (record.status === 'approved' ? "Organising Committee" : "Pending");
    const approverContact = approver?.mobile || (record.status === 'approved' ? "Official Support" : "N/A");
    const approverEmail = approver?.email || (record.status === 'approved' ? "support@competition.com" : "");

    const juzDisplay = record.juz_options ? getJuzLabel(record.juz_options) : (record.selected_juz || 'N/A');

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
                <div class="info-row"><span class="info-label">Reg. Type</span><span class="info-val">${record.registration_type.charAt(0).toUpperCase() + record.registration_type.slice(1)}</span></div>
            </div>
            <div class="top-center">
                <div class="approval-stamp">
                    <div class="stamp-badge">APPROVED</div>
                    <div class="stamp-name">${approvedByName}</div>
                    <div class="stamp-contact">Ph: ${approverContact}</div>
                    ${approverEmail ? `<div class="stamp-email">${approverEmail}</div>` : ''}
                </div>
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
                <div class="field"><span class="fl">Gender</span><span class="fv">${record.gender.charAt(0).toUpperCase() + record.gender.slice(1)}</span></div>
                <div class="field"><span class="fl">Date of Birth</span><span class="fv">${dob}</span></div>
                <div class="field"><span class="fl">Aadhaar Number</span><span class="fv">${record.aadhaar_number}</span></div>
                <div class="field"><span class="fl">Email</span><span class="fv single-line">${record.email || 'N/A'}</span></div>
                <div class="field"><span class="fl">WhatsApp</span><span class="fv">${record.whatsapp_number}</span></div>
            </div>
        </div>

        <!-- Juz Details — separate section -->
        <div class="section">
            <div class="section-title">Juz Details</div>
            <div class="grid-2col">
                <div class="field"><span class="fl">Category</span><span class="fv">${categoryLabel(record.category)}</span></div>
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

/** Wrap individual form(s) in a full HTML document */
function wrapFormsDocument(innerHtml: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Application Form</title>
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
.top-center { display: flex; align-items: center; justify-content: center; }
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

/** Generate printable HTML for a single individual application */
export function generateIndividualFormHTML(record: ParticipantsApplicationResponse, _customTemplate?: string): string {
    if (record.status !== 'approved') {
        return wrapFormsDocument(`
            <div class="error-msg">
                <h2>Application is not approved</h2>
                <p>Forms can only be printed for candidates with an 'approved' status.</p>
            </div>
        `);
    }
    return wrapFormsDocument(singleFormHTML(record, false));
}

/** Generate printable HTML for ALL approved student forms under an institution */
export function generateAllFormsHTML(applications: ParticipantsApplicationResponse[], _customTemplate?: string): string {
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
    const inner = sorted.map((app, i) => singleFormHTML(app, i < sorted.length - 1)).join('\n');
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

// ─── Modal Component ───────────────────────────────────────────

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
}

export default function PrintPreviewModal({ isOpen, onClose, title, htmlContent }: PrintPreviewModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <span className={styles.modalTitle}>{title}</span>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <iframe
                    ref={iframeRef}
                    className={styles.previewFrame}
                    srcDoc={htmlContent}
                    title="Print Preview"
                />

                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={onClose}>Close</button>
                    <button className={styles.printBtn} onClick={handlePrint}>
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>
        </div>
    );
}