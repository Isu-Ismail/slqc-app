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

    const indRecord = metadata['individual_rules'];
    const instRecord = metadata['institution_rules'];

    const handleFileUpload = (type: 'individual' | 'institution', file: File) => {
        if (!file.name.endsWith('.txt')) {
            alert('Please upload a plain text (.txt) file.');
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
            } else {
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
            }
        };
        reader.readAsText(file);
    };

    const downloadSample = (type: 'individual' | 'institution') => {
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

        const text = type === 'individual' ? individualText : institutionText;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_rules_sample.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Rules & Regulations Manager</h3>
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
                <div style={{ paddingBottom: '8px' }}>
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
            </div>
        </div>
    );
}
