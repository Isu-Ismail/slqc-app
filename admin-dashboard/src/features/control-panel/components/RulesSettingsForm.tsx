import { useState } from 'react';
import { metadataApi } from '../../../api/metadata';
import type { MetadataRecord } from '../../../api/metadata';
import styles from '../ControlPanelPage.module.css';

interface Props {
    metadata: Record<string, MetadataRecord>;
    onUpdate: () => void;
}

export default function RulesSettingsForm({ metadata, onUpdate }: Props) {
    const [indLoading, setIndLoading] = useState(false);
    const [instLoading, setInstLoading] = useState(false);
    const [tplLoading, setTplLoading] = useState(false);

    const indRecord = metadata['individual_rules'];
    const instRecord = metadata['institution_rules'];
    const tplRecord = metadata['print_template'];

    const handleFileUpload = (type: 'individual' | 'institution' | 'template', file: File) => {
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.html')) {
            alert('Please upload a plain text (.txt) or HTML (.html) file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            if (type === 'individual') {
                setIndLoading(true);
                try {
                    const record = await metadataApi.getMetadataByKey('individual_rules');
                    if (record) {
                        await metadataApi.updateMetadata(record.id, text);
                    } else {
                        await metadataApi.createMetadata('individual_rules', text);
                    }
                    onUpdate();
                    alert('Individual rules updated successfully!');
                } catch (err) {
                    console.error(err);
                    alert('Failed to update individual rules.');
                } finally {
                    setIndLoading(false);
                }
            } else if (type === 'institution') {
                setInstLoading(true);
                try {
                    const record = await metadataApi.getMetadataByKey('institution_rules');
                    if (record) {
                        await metadataApi.updateMetadata(record.id, text);
                    } else {
                        await metadataApi.createMetadata('institution_rules', text);
                    }
                    onUpdate();
                    alert('Institution rules updated successfully!');
                } catch (err) {
                    console.error(err);
                    alert('Failed to update institution rules.');
                } finally {
                    setInstLoading(false);
                }
            } else {
                setTplLoading(true);
                try {
                    const record = await metadataApi.getMetadataByKey('print_template');
                    if (record) {
                        await metadataApi.updateMetadata(record.id, text);
                    } else {
                        await metadataApi.createMetadata('print_template', text);
                    }
                    onUpdate();
                    alert('Print template updated successfully!');
                } catch (err) {
                    console.error(err);
                    alert('Failed to update print template.');
                } finally {
                    setTplLoading(false);
                }
            }
        };
        reader.readAsText(file);
    };

    const downloadSample = (type: 'individual' | 'institution' | 'template') => {
        const individualText = `State Level Quran Competition - Individual Participant Rules & Regulations

1. Eligibility & Registration:
   - Every candidate must register individually with correct personal information.
   - Date of Birth must match official documents (Birth Certificate, Aadhaar, or Passport).
   - Any discrepancy in DOB will result in disqualification.

2. Category Specifications & Age Limits:
   - 5 Juz Category: Maximum age allowed is 15 years.
   - 15 Juz Category: Maximum age allowed is 19 years.
   - 30 Juz Category: Maximum age allowed is 25 years.
   - Age calculation is based on the day of the competition (with configured tolerance buffer).

3. Code of Conduct:
   - Participants must dress in modest, formal traditional attire.
   - Reporting time at the venue must be strictly followed.
   - The decision of the judging panel is final and binding.`;

        const institutionText = `State Level Quran Competition - Institution Rules & Regulations

1. Registration & Verification:
   - Madrasas, Islamic Schools, and organizations must register as an Institution first.
   - The institution coordinator is responsible for registering candidates under their account.
   - Valid proof of institution registration or authorization letter must be uploaded.

2. Application Submission:
   - Group submissions of candidates must adhere to individual age and category criteria.
   - All details must be verified by the head of the institution prior to final submission.
   - The institution code/ID must be shared only with authorized candidates.

3. Coordination:
   - The coordinator must represent the candidates during venue verification and reporting.
   - Accommodation requests must be submitted in advance.`;

        const templateText = `<!-- Custom HTML Print Template Sample -->
<div class="form-page">
    <div class="header">
        <h1>{{COMPETITION_TITLE}}</h1>
        <h2>Candidate Application Form</h2>
    </div>

    <div class="top-row">
        <div class="top-info">
            <p><strong>Application ID:</strong> {{id}}</p>
            <p><strong>Status:</strong> {{status}}</p>
            <p><strong>Submitted On:</strong> {{submitted}}</p>
            <p><strong>Registration Type:</strong> {{registration_type}}</p>
        </div>
        
        <div class="approval-stamp">
            <div class="stamp-title">APPROVED</div>
            <div class="stamp-details">
                <span style="font-size: 11px;">{{approvedByName}}</span><br/>
                Ph: {{approverContact}}<br/>
                {{approverEmail}}
            </div>
        </div>

        <div class="photo-box">
            <img src="{{photoUrl}}" alt="Passport Photo" />
        </div>
    </div>

    <div class="section">
        <div class="section-title">Personal Details</div>
        <div class="fields">
            <div class="field"><span class="fl">Full Name</span><span class="fv">{{full_name}}</span></div>
            <div class="field"><span class="fl">Father's Name</span><span class="fv">{{father_name}}</span></div>
            <div class="field"><span class="fl">Father's Phone</span><span class="fv">{{father_number}}</span></div>
            <div class="field"><span class="fl">Gender</span><span class="fv">{{gender}}</span></div>
            <div class="field"><span class="fl">Date of Birth</span><span class="fv">{{dob}}</span></div>
            <div class="field"><span class="fl">Aadhaar Number</span><span class="fv">{{aadhaar_number}}</span></div>
            <div class="field"><span class="fl">Category</span><span class="fv">{{category}}</span></div>
            <div class="field"><span class="fl">Email</span><span class="fv">{{email}}</span></div>
            <div class="field"><span class="fl">WhatsApp Number</span><span class="fv">{{whatsapp_number}}</span></div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Guardian Details</div>
        <div class="fields">
            <div class="field"><span class="fl">Guardian Name</span><span class="fv">{{guardian_name}}</span></div>
            <div class="field"><span class="fl">Guardian Phone</span><span class="fv">{{guardian_phone}}</span></div>
        </div>
    </div>

    {{institution_details}}

    <div class="section">
        <div class="section-title">Additional Information</div>
        <div class="fields">
            <div class="field"><span class="fl">Requires Accommodation</span><span class="fv">{{requires_accommodation}}</span></div>
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
</div>`;

        const text = type === 'individual' ? individualText : type === 'institution' ? institutionText : templateText;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = type === 'template' ? `print_template_sample.txt` : `${type}_rules_sample.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Document & Template Manager</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Individual Rules Widget */}
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Individual Participant Rules</span>
                        <button 
                            type="button" 
                            className={styles.btnOutline} 
                            onClick={() => downloadSample('individual')}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                            Download Sample
                        </button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                        Upload a plain text (.txt) file with the rules for individual candidates.
                    </p>
                    <input 
                        type="file" 
                        accept=".txt" 
                        className={styles.formInput} 
                        disabled={indLoading}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('individual', e.target.files[0])}
                    />
                    {indRecord?.value && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ Current File Size: {String(indRecord.value).length} characters
                        </div>
                    )}
                </div>

                {/* Institution Rules Widget */}
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Institution/Madrasa Rules</span>
                        <button 
                            type="button" 
                            className={styles.btnOutline} 
                            onClick={() => downloadSample('institution')}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                            Download Sample
                        </button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                        Upload a plain text (.txt) file with the rules for institutions/madrasas.
                    </p>
                    <input 
                        type="file" 
                        accept=".txt" 
                        className={styles.formInput} 
                        disabled={instLoading}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('institution', e.target.files[0])}
                    />
                    {instRecord?.value && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ Current File Size: {String(instRecord.value).length} characters
                        </div>
                    )}
                </div>

                {/* Print Template Widget */}
                <div style={{ paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>A4 Print Template HTML</span>
                        <button 
                            type="button" 
                            className={styles.btnOutline} 
                            onClick={() => downloadSample('template')}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                            Download Sample
                        </button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                        Upload a custom HTML (.txt or .html) file containing template layouts with curly-brace placeholders.
                    </p>
                    <input 
                        type="file" 
                        accept=".txt,.html" 
                        className={styles.formInput} 
                        disabled={tplLoading}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('template', e.target.files[0])}
                    />
                    {tplRecord?.value && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ Current File Size: {String(tplRecord.value).length} characters
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
