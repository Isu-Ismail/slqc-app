import { useState } from 'react';
import { metadataApi } from '../../../api/metadata';
import type { MetadataRecord } from '../../../api/metadata';
import { pb } from '../../../api/db';
import styles from '../ControlPanelPage.module.css';

interface Props {
    metadata: Record<string, MetadataRecord>;
    onUpdate: () => void;
}

export default function RulesSettingsForm({ metadata, onUpdate }: Props) {
    const [indLoading, setIndLoading] = useState(false);
    const [instLoading, setInstLoading] = useState(false);
    const [dosLoading, setDosLoading] = useState(false);
    const [overallLoading, setOverallLoading] = useState(false);
    const [mapLoading, setMapLoading] = useState(false);

    const indRecord = metadata['individual_rules'];
    const instRecord = metadata['institution_rules'];
    const dosRecord = metadata['dos_and_donts'];
    const overallRecord = metadata['overall_rules'];
    const mapRecord = metadata['venue_map'];

    const handleFileUpload = (type: 'individual' | 'institution' | 'dos' | 'overall', file: File) => {
        const keyMap = {
            individual: 'individual_rules',
            institution: 'institution_rules',
            dos: 'dos_and_donts',
            overall: 'overall_rules'
        };
        const key = keyMap[type];

        const loadingSetters = {
            individual: setIndLoading,
            institution: setInstLoading,
            dos: setDosLoading,
            overall: setOverallLoading
        };
        const setLoading = loadingSetters[type];

        if (file.name.toLowerCase().endsWith('.pdf')) {
            setLoading(true);
            (async () => {
                try {
                    const record = await metadataApi.getMetadataByKey(key);
                    if (record) {
                        await metadataApi.updateMetadataDocument(record.id, file);
                    } else {
                        await metadataApi.createMetadataDocument(key, file);
                    }
                    onUpdate();
                    alert('Rules PDF uploaded successfully!');
                } catch (err) {
                    console.error(err);
                    alert('Failed to upload rules PDF.');
                } finally {
                    setLoading(false);
                }
            })();
            return;
        }

        if (!file.name.endsWith('.txt') && !file.name.endsWith('.html')) {
            alert('Please upload a plain text (.txt), HTML (.html), or PDF (.pdf) file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            setLoading(true);
            try {
                const record = await metadataApi.getMetadataByKey(key);
                if (record) {
                    await metadataApi.updateMetadata(record.id, text, true);
                } else {
                    await metadataApi.createMetadata(key, text);
                }
                onUpdate();
                alert('Rules updated successfully!');
            } catch (err) {
                console.error(err);
                alert('Failed to update rules.');
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleMapUpload = async (file: File) => {
        setMapLoading(true);
        try {
            const record = await metadataApi.getMetadataByKey('venue_map');
            if (record) {
                await metadataApi.updateMetadataDocument(record.id, file);
            } else {
                await metadataApi.createMetadataDocument('venue_map', file);
            }
            onUpdate();
            alert('Venue map uploaded successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to upload venue map.');
        } finally {
            setMapLoading(false);
        }
    };

    const downloadSample = (type: 'individual' | 'institution' | 'dos' | 'overall') => {
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

        const dosText = `State Level Quran Competition - Do's and Don'ts

Do's:
1. Do report at least 30 minutes before the scheduled time.
2. Do bring a printout of your registration confirmation card.
3. Do dress in formal, clean traditional attire.
4. Do ensure your mobile phone is completely switched off before entering the recitation area.

Don'ts:
1. Don't carry any copies of the Quran or sheets inside the verification hall.
2. Don't engage in loud conversations or disturbance in the waiting lounge.
3. Don't communicate with the judges outside the active recitation session.`;

        const overallText = `State Level Quran Competition - Overall Rules

1. Evaluation Criteria:
   - Hifz (Memorization): 50 Marks
   - Tajweed (Pronunciation & Rules): 35 Marks
   - Tarteel/Jammal-e-Saut (Melody & Tone): 15 Marks

2. Time limits and indicators will be set by the judges.
3. In case of ties, the judges' sub-scores in Memorization will act as tie-breakers.`;

        let text = '';
        if (type === 'individual') text = individualText;
        else if (type === 'institution') text = institutionText;
        else if (type === 'dos') text = dosText;
        else text = overallText;

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
                        Upload a plain text (.txt), HTML (.html), or PDF (.pdf) file with the rules for individual candidates.
                    </p>
                    <input 
                        type="file" 
                        accept=".txt,.html,.pdf" 
                        className={styles.formInput} 
                        disabled={indLoading}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('individual', e.target.files[0])}
                    />
                    {indRecord?.document ? (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ PDF Uploaded: {' '}
                            <a 
                                href={pb.files.getURL(indRecord, indRecord.document)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#0ea5e9', textDecoration: 'underline' }}
                            >
                                View PDF
                            </a>
                        </div>
                    ) : indRecord?.value ? (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ Current File Size: {String(indRecord.value).length} characters
                        </div>
                    ) : null}
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
                        Upload a plain text (.txt), HTML (.html), or PDF (.pdf) file with the rules for institutions/madrasas.
                    </p>
                    <input 
                        type="file" 
                        accept=".txt,.html,.pdf" 
                        className={styles.formInput} 
                        disabled={instLoading}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('institution', e.target.files[0])}
                    />
                    {instRecord?.document ? (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ PDF Uploaded: {' '}
                            <a 
                                href={pb.files.getURL(instRecord, instRecord.document)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#0ea5e9', textDecoration: 'underline' }}
                            >
                                View PDF
                            </a>
                        </div>
                    ) : instRecord?.value ? (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ Current File Size: {String(instRecord.value).length} characters
                        </div>
                    ) : null}
                </div>

                {/* Do's and Don'ts Widget */}
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Do's and Don'ts</span>
                        <button 
                            type="button" 
                            className={styles.btnOutline} 
                            onClick={() => downloadSample('dos')}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                            Download Sample
                        </button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                        Upload a plain text (.txt), HTML (.html), or PDF (.pdf) file with the Do's and Don'ts guidelines.
                    </p>
                    <input 
                        type="file" 
                        accept=".txt,.html,.pdf" 
                        className={styles.formInput} 
                        disabled={dosLoading}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('dos', e.target.files[0])}
                    />
                    {dosRecord?.document ? (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ PDF Uploaded: {' '}
                            <a 
                                href={pb.files.getURL(dosRecord, dosRecord.document)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#0ea5e9', textDecoration: 'underline' }}
                            >
                                View PDF
                            </a>
                        </div>
                    ) : dosRecord?.value ? (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ Current File Size: {String(dosRecord.value).length} characters
                        </div>
                    ) : null}
                </div>

                {/* Overall Rules Widget */}
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Overall Rules</span>
                        <button 
                            type="button" 
                            className={styles.btnOutline} 
                            onClick={() => downloadSample('overall')}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                            Download Sample
                        </button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                        Upload a plain text (.txt), HTML (.html), or PDF (.pdf) file with the overall competition rules.
                    </p>
                    <input 
                        type="file" 
                        accept=".txt,.html,.pdf" 
                        className={styles.formInput} 
                        disabled={overallLoading}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('overall', e.target.files[0])}
                    />
                    {overallRecord?.document ? (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ PDF Uploaded: {' '}
                            <a 
                                href={pb.files.getURL(overallRecord, overallRecord.document)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#0ea5e9', textDecoration: 'underline' }}
                            >
                                View PDF
                            </a>
                        </div>
                    ) : overallRecord?.value ? (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ Current File Size: {String(overallRecord.value).length} characters
                        </div>
                    ) : null}
                </div>

                {/* Venue Map Upload Widget */}
                <div style={{ paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Competition Venue Map</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                        Upload the location/venue map as an image or PDF.
                    </p>
                    <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        className={styles.formInput} 
                        disabled={mapLoading}
                        onChange={(e) => e.target.files?.[0] && handleMapUpload(e.target.files[0])}
                    />
                    {mapRecord?.document && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                            ✓ Map uploaded: {' '}
                            <a 
                                href={pb.files.getURL(mapRecord, mapRecord.document)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#0ea5e9', textDecoration: 'underline' }}
                            >
                                View File
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
