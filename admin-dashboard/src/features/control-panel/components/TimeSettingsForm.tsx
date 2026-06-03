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
    const timeRecord = metadata['time'];
    const [formData, setFormData] = useState({
        startDate: timeRecord?.value?.startDate || '',
        endDate: timeRecord?.value?.endDate || '',
        startDescription: timeRecord?.value?.startDescription || '',
        endDescription: timeRecord?.value?.endDescription || ''
    });

    useEffect(() => {
        const timeRecord = metadata['time'];
        if (timeRecord && timeRecord.value) {
            Promise.resolve().then(() => {
                setFormData({
                    startDate: timeRecord.value.startDate || '',
                    endDate: timeRecord.value.endDate || '',
                    startDescription: timeRecord.value.startDescription || '',
                    endDescription: timeRecord.value.endDescription || ''
                });
            });
        }
    }, [metadata]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const timeRecord = metadata['time'];
            if (!timeRecord) throw new Error("Time record not found in metadata");
            
            await metadataApi.updateMetadata(timeRecord.id, formData);
            alert("Time settings updated successfully!");
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
                <h2 className={styles.cardTitle}>Global Time Settings</h2>
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
                    {loading ? 'Saving...' : 'Save Time Settings'}
                </button>
            </form>
        </div>
    );
}
