import { useState } from 'react';
import { metadataApi } from '../../../api/metadata';
import type { MetadataRecord } from '../../../api/metadata';
import styles from '../ControlPanelPage.module.css';

interface Props {
    metadata: Record<string, MetadataRecord>;
    onUpdate: () => void;
}

export default function StatusToggles({ metadata, onUpdate }: Props) {
    const [loading, setLoading] = useState(false);

    const setStatus = async (key: string, newStatus: 'waiting' | 'open' | 'closed') => {
        setLoading(true);
        try {
            const dbRecord = await metadataApi.getMetadataByKey(key);
            if (dbRecord) {
                await metadataApi.updateMetadata(dbRecord.id, { status: newStatus });
            } else {
                await metadataApi.createMetadata(key, { status: newStatus });
            }
            onUpdate();
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update status.');
        } finally {
            setLoading(false);
        }
    };

    const renderToggle = (title: string, key: string) => {
        const record = metadata[key];
        const currentStatus = record?.value?.status || 'closed';

        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                    <strong style={{ display: 'block', color: '#1e293b' }}>{title}</strong>
                    <span style={{ fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>
                        Currently: {currentStatus === 'waiting' ? 'Not yet open' : currentStatus}
                    </span>
                </div>
                
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                    <button 
                        onClick={() => setStatus(key, 'waiting')} 
                        disabled={loading}
                        style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                            backgroundColor: currentStatus === 'waiting' ? '#f59e0b' : 'transparent',
                            color: currentStatus === 'waiting' ? 'white' : '#64748b',
                            transition: '0.2s'
                        }}
                    >WAITING</button>
                    
                    <button 
                        onClick={() => setStatus(key, 'open')} 
                        disabled={loading}
                        style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                            backgroundColor: currentStatus === 'open' ? '#10b981' : 'transparent',
                            color: currentStatus === 'open' ? 'white' : '#64748b',
                            transition: '0.2s'
                        }}
                    >OPEN</button>
                    
                    <button 
                        onClick={() => setStatus(key, 'closed')} 
                        disabled={loading}
                        style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                            backgroundColor: currentStatus === 'closed' ? '#ef4444' : 'transparent',
                            color: currentStatus === 'closed' ? 'white' : '#64748b',
                            transition: '0.2s'
                        }}
                    >CLOSED</button>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Registration Toggles</h2>
            </div>
            <div>
                {renderToggle('Individual Registration', 'participant_application_status')}
                {renderToggle('Institution Registration', 'madrasa_application_status')}
            </div>
        </div>
    );
}
