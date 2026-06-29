import { useState, useEffect } from 'react';
import { metadataApi } from '../../../api/metadata';
import type { MetadataRecord } from '../../../api/metadata';
import styles from '../ControlPanelPage.module.css';

interface Props {
    metadata: Record<string, MetadataRecord>;
    onUpdate: () => void;
}

interface LimitItem {
    cat: string;
    count: number;
}

export default function InstituteLimitsForm({ metadata, onUpdate }: Props) {
    const dbRecord = metadata['applications_per_institute'];
    
    const [limit5, setLimit5] = useState(3);
    const [limit15, setLimit15] = useState(2);
    const [limit30, setLimit30] = useState(2);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (dbRecord?.value) {
            try {
                const parsed = JSON.parse(dbRecord.value) as LimitItem[];
                if (Array.isArray(parsed)) {
                    const item5 = parsed.find(i => i.cat === '5_juz');
                    const item15 = parsed.find(i => i.cat === '15_juz');
                    const item30 = parsed.find(i => i.cat === '30_juz');
                    if (item5) setLimit5(Number(item5.count));
                    if (item15) setLimit15(Number(item15.count));
                    if (item30) setLimit30(Number(item30.count));
                }
            } catch (err) {
                console.error("Failed to parse institution limits:", err);
            }
        }
    }, [dbRecord?.value]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: LimitItem[] = [
                { cat: '5_juz', count: limit5 },
                { cat: '15_juz', count: limit15 },
                { cat: '30_juz', count: limit30 }
            ];

            if (dbRecord) {
                await metadataApi.updateMetadata(dbRecord.id, payload);
            } else {
                await metadataApi.updateMetadata('applications_per_institute', payload);
            }
            alert('Institution application limits saved successfully!');
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to save limits.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Applications Per Institution Limit</h3>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    Configure the maximum number of candidates an institution can register for each category.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>5 Juz Category Limit</label>
                        <input
                            type="number"
                            min="1"
                            className={styles.formInput}
                            value={limit5}
                            onChange={(e) => setLimit5(Math.max(1, Number(e.target.value)))}
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>15 Juz Category Limit</label>
                        <input
                            type="number"
                            min="1"
                            className={styles.formInput}
                            value={limit15}
                            onChange={(e) => setLimit15(Math.max(1, Number(e.target.value)))}
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>30 Juz Category Limit</label>
                        <input
                            type="number"
                            min="1"
                            className={styles.formInput}
                            value={limit30}
                            onChange={(e) => setLimit30(Math.max(1, Number(e.target.value)))}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                    <button
                        type="submit"
                        className={styles.btnPrimary}
                        disabled={saving}
                        style={{ padding: '8px 24px', fontSize: '14px' }}
                    >
                        {saving ? 'Saving...' : 'Save Limits'}
                    </button>
                </div>
            </form>
        </div>
    );
}
