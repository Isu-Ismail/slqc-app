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

    const [indFile, setIndFile] = useState<File | null>(null);
    const [instFile, setInstFile] = useState<File | null>(null);
    const [dosFile, setDosFile] = useState<File | null>(null);
    const [overallFile, setOverallFile] = useState<File | null>(null);
    const [mapFile, setMapFile] = useState<File | null>(null);

    const [viewContent, setViewContent] = useState<{ title: string; body: string } | null>(null);

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

        const fileSetters = {
            individual: setIndFile,
            institution: setInstFile,
            dos: setDosFile,
            overall: setOverallFile
        };
        const setFile = fileSetters[type];

        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.pdf') || lowerName.endsWith('.html')) {
            setLoading(true);
            (async () => {
                try {
                    const record = await metadataApi.getMetadataByKey(key);
                    if (record) {
                        await metadataApi.updateMetadataDocument(record.id, file);
                    } else {
                        await metadataApi.createMetadataDocument(key, file);
                    }
                    setFile(null);
                    onUpdate();
                    alert('Document uploaded successfully!');
                } catch (err) {
                    console.error(err);
                    alert('Failed to upload document.');
                } finally {
                    setLoading(false);
                }
            })();
            return;
        }

        if (!lowerName.endsWith('.txt')) {
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
                setFile(null);
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
            setMapFile(null);
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

    const renderFileStatus = (record: MetadataRecord | undefined, title: string) => {
        if (record?.document) {
            const lowerDoc = record.document.toLowerCase();
            const typeLabel = lowerDoc.endsWith('.pdf') ? 'PDF' : lowerDoc.endsWith('.html') ? 'HTML' : 'File';
            return (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                    ✓ {typeLabel} Uploaded: {' '}
                    <a 
                        href={pb.files.getURL(record, record.document)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#0ea5e9', textDecoration: 'underline' }}
                    >
                        View {typeLabel}
                    </a>
                </div>
            );
        } else if (record?.value) {
            return (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                    ✓ Text Rules Saved ({String(record.value).length} chars)
                    {' | '}
                    <button
                        type="button"
                        onClick={() => setViewContent({ title, body: record.value })}
                        style={{ background: 'none', border: 'none', color: '#0ea5e9', textDecoration: 'underline', padding: 0, cursor: 'pointer', fontSize: '12px' }}
                    >
                        View Content
                    </button>
                </div>
            );
        }
        return null;
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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="file" 
                            accept=".txt,.html,.pdf" 
                            className={styles.formInput} 
                            disabled={indLoading}
                            style={{ flex: 1 }}
                            onChange={(e) => setIndFile(e.target.files?.[0] || null)}
                        />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            style={{ whiteSpace: 'nowrap', padding: '10px 16px', height: '42px', fontSize: '13px' }}
                            disabled={indLoading || !indFile}
                            onClick={() => indFile && handleFileUpload('individual', indFile)}
                        >
                            {indLoading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                    {renderFileStatus(indRecord, 'Individual Participant Rules')}
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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="file" 
                            accept=".txt,.html,.pdf" 
                            className={styles.formInput} 
                            disabled={instLoading}
                            style={{ flex: 1 }}
                            onChange={(e) => setInstFile(e.target.files?.[0] || null)}
                        />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            style={{ whiteSpace: 'nowrap', padding: '10px 16px', height: '42px', fontSize: '13px' }}
                            disabled={instLoading || !instFile}
                            onClick={() => instFile && handleFileUpload('institution', instFile)}
                        >
                            {instLoading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                    {renderFileStatus(instRecord, 'Institution/Madrasa Rules')}
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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="file" 
                            accept=".txt,.html,.pdf" 
                            className={styles.formInput} 
                            disabled={dosLoading}
                            style={{ flex: 1 }}
                            onChange={(e) => setDosFile(e.target.files?.[0] || null)}
                        />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            style={{ whiteSpace: 'nowrap', padding: '10px 16px', height: '42px', fontSize: '13px' }}
                            disabled={dosLoading || !dosFile}
                            onClick={() => dosFile && handleFileUpload('dos', dosFile)}
                        >
                            {dosLoading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                    {renderFileStatus(dosRecord, "Do's and Don'ts")}
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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="file" 
                            accept=".txt,.html,.pdf" 
                            className={styles.formInput} 
                            disabled={overallLoading}
                            style={{ flex: 1 }}
                            onChange={(e) => setOverallFile(e.target.files?.[0] || null)}
                        />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            style={{ whiteSpace: 'nowrap', padding: '10px 16px', height: '42px', fontSize: '13px' }}
                            disabled={overallLoading || !overallFile}
                            onClick={() => overallFile && handleFileUpload('overall', overallFile)}
                        >
                            {overallLoading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                    {renderFileStatus(overallRecord, 'Overall Rules')}
                </div>

                {/* Venue Map Upload Widget */}
                <div style={{ paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>Competition Venue Map</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                        Upload the location/venue map as an image or PDF.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            className={styles.formInput} 
                            disabled={mapLoading}
                            style={{ flex: 1 }}
                            onChange={(e) => setMapFile(e.target.files?.[0] || null)}
                        />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            style={{ whiteSpace: 'nowrap', padding: '10px 16px', height: '42px', fontSize: '13px' }}
                            disabled={mapLoading || !mapFile}
                            onClick={() => mapFile && handleMapUpload(mapFile)}
                        >
                            {mapLoading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
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

            {viewContent && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }} onClick={() => setViewContent(null)}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '640px',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{viewContent.title}</h3>
                            <button
                                onClick={() => setViewContent(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                    padding: 0
                                }}
                            >×</button>
                        </div>
                        <div style={{
                            padding: '24px',
                            overflowY: 'auto',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#334155',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {/<[a-z][\s\S]*>/i.test(viewContent.body) ? (
                                <div dangerouslySetInnerHTML={{ __html: viewContent.body }} />
                            ) : (
                                <div>{viewContent.body}</div>
                            )}
                        </div>
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                type="button"
                                className={styles.btnSecondary}
                                style={{ background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: '600', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', width: 'auto' }}
                                onClick={() => setViewContent(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
