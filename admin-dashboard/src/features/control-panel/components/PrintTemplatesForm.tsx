import { useState } from 'react';
import { metadataApi } from '../../../api/metadata';
import type { MetadataRecord } from '../../../api/metadata';
import { pb } from '../../../api/db';
import styles from '../ControlPanelPage.module.css';

interface Props {
    metadata: Record<string, MetadataRecord>;
    onUpdate: () => void;
}

export default function PrintTemplatesForm({ metadata, onUpdate }: Props) {
    const templates = [
        { key: 'application_print_template', label: 'Application Print Template (HTML)' },
        { key: 'institution_list_template', label: 'Institution List Print Template (HTML)' }
    ];

    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

    const handleFileChange = (key: string, file: File | null) => {
        setSelectedFiles(prev => ({ ...prev, [key]: file }));
    };

    const handleUpload = async (key: string) => {
        const file = selectedFiles[key];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.html')) {
            alert('Please select a valid HTML (.html) file.');
            return;
        }

        setUploadingKey(key);
        try {
            const record = await metadataApi.getMetadataByKey(key);
            if (record) {
                await metadataApi.updateMetadataDocument(record.id, file);
            } else {
                await metadataApi.createMetadataDocument(key, file);
            }
            setSelectedFiles(prev => ({ ...prev, [key]: null }));
            onUpdate();
            alert(`${file.name} uploaded successfully!`);
        } catch (err) {
            console.error(err);
            alert('Failed to upload template file.');
        } finally {
            setUploadingKey(null);
        }
    };

    const renderTemplateWidget = (tmpl: typeof templates[0]) => {
        const record = metadata[tmpl.key];
        const isUploading = uploadingKey === tmpl.key;
        const selectedFile = selectedFiles[tmpl.key] || null;

        return (
            <div key={tmpl.key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#334155' }}>{tmpl.label}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                    Upload an HTML format template containing layout and markup.
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="file"
                        accept=".html"
                        className={styles.formInput}
                        disabled={isUploading}
                        style={{ flex: 1 }}
                        onChange={(e) => handleFileChange(tmpl.key, e.target.files?.[0] || null)}
                    />
                    <button
                        type="button"
                        className={styles.btnPrimary}
                        style={{ whiteSpace: 'nowrap', padding: '10px 16px', height: '42px', fontSize: '13px' }}
                        disabled={isUploading || !selectedFile}
                        onClick={() => handleUpload(tmpl.key)}
                    >
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
                {record?.document && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#0d9488', fontWeight: '500' }}>
                        ✓ Template Uploaded: {' '}
                        <a
                            href={pb.files.getURL(record, record.document)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0ea5e9', textDecoration: 'underline' }}
                        >
                            View Template HTML
                        </a>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Print & Marksheet Templates</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {templates.map(renderTemplateWidget)}
            </div>
        </div>
    );
}
