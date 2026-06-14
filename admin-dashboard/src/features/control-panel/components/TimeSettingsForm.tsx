import { useState, useEffect } from 'react';
import { metadataApi } from '../../../api/metadata';
import type { MetadataRecord } from '../../../api/metadata';
import styles from '../ControlPanelPage.module.css';

interface Props {
    metadata: Record<string, MetadataRecord>;
    onUpdate: () => void;
}

export default function TimeSettingsForm({ metadata, onUpdate }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        startDescription: 'Registration Opens In',
        endDescription: 'Registration Closes In'
    });

    useEffect(() => {
        const timeRecord = metadata['time'];
        if (timeRecord && timeRecord.value) {
            Promise.resolve().then(() => {
                let val = timeRecord.value;
                if (typeof val === 'string') {
                    try {
                        val = JSON.parse(val);
                    } catch (e) {
                        console.error('Failed to parse timeRecord value', e);
                    }
                }
                setFormData({
                    startDate: val?.startDate || val?.date || '',
                    endDate: val?.endDate || val?.date || '',
                    startDescription: val?.startDescription || 'Registration Opens In',
                    endDescription: val?.endDescription || 'Registration Closes In'
                });
            });
        } else {
            setFormData({
                startDate: '',
                endDate: '',
                startDescription: 'Registration Opens In',
                endDescription: 'Registration Closes In'
            });
        }
    }, [metadata]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const timeKey = 'time';
        try {
            const dbRecord = await metadataApi.getMetadataByKey(timeKey);
            const payload = JSON.stringify(formData);
            if (dbRecord) {
                await metadataApi.updateMetadata(dbRecord.id, payload);
            } else {
                await metadataApi.createMetadata(timeKey, payload);
            }
            alert(`Registration time settings updated successfully!`);
            onUpdate();
        } catch (err) {
            console.error("Failed to update time settings", err);
            alert("Failed to update time settings.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Registration Time Settings</h2>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Start Date/Time</label>
                        <input 
                            type="datetime-local" 
                            value={formData.startDate.substring(0, 16)} 
                            onChange={(e) => setFormData({...formData, startDate: e.target.value + ':00'})}
                            className={styles.formInput}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>End Date/Time</label>
                        <input 
                            type="datetime-local" 
                            value={formData.endDate.substring(0, 16)} 
                            onChange={(e) => setFormData({...formData, endDate: e.target.value + ':00'})}
                            className={styles.formInput}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Start Description (Shown when waiting)</label>
                    <input 
                        type="text" 
                        value={formData.startDescription} 
                        onChange={(e) => setFormData({...formData, startDescription: e.target.value})}
                        className={styles.formInput}
                        placeholder="e.g. Registration Opens In"
                        required
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>End Description (Shown when active)</label>
                    <input 
                        type="text" 
                        value={formData.endDescription} 
                        onChange={(e) => setFormData({...formData, endDescription: e.target.value})}
                        className={styles.formInput}
                        placeholder="e.g. Registration Closes In"
                        required
                    />
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={loading} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                    {loading ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </div>
    );
}
