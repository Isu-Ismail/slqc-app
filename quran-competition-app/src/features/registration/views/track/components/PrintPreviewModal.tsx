// src/features/registration/views/track/components/PrintPreviewModal.tsx
import { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { pb } from '../../../../../api/db';
import type { ParticipantsApplicationResponse } from '../../../../../api/types';
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




function cleanJuzLabelForPrint(label: string): string {
    if (!label) return '';
    return label.replace(/^Juz\s+[\d\-&,\s]+:\s*/i, '');
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
    const photoUrl = record.candidate_photo ? pb.files.getURL(record, record.candidate_photo) : '';
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
        '{{category}}': categoryLabel(record.category),
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
        return customTemplate.includes('page-break-after')
            ? approvedApps.map(app => replaceIndividualPlaceholders(customTemplate, app)).join('\n')
            : approvedApps.map(app => `<div style="page-break-after:always;">${replaceIndividualPlaceholders(customTemplate, app)}</div>`).join('\n');
    }

    const sorted = [...approvedApps].sort((a, b) => a.category.localeCompare(b.category));
    const inner = sorted.map((app, i) => singleFormHTML(app, i < sorted.length - 1)).join('\n');
    return wrapFormsDocument(inner);
}

/** Generate printable attendance sheet HTML, grouped by Juz category */


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
            const originalTitle = document.title;
            let tempTitle = 'application_form';
            try {
                const iframeTitle = iframe.contentDocument?.title;
                if (iframeTitle) {
                    tempTitle = iframeTitle;
                }
            } catch (e) {
                console.error("Could not read iframe title", e);
            }
            document.title = tempTitle;
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                document.title = originalTitle;
            }, 1000);
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