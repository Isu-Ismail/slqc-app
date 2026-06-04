import { useState, useEffect } from 'react';
import { metadataApi } from '../../../api/metadata';
import type { MetadataRecord } from '../../../api/metadata';
import styles from '../ControlPanelPage.module.css';

interface Props {
    metadata: Record<string, MetadataRecord>;
    onUpdate: () => void;
}

interface AgeRule {
    min: number;
    max: number;
}

interface AgeCriteria {
    '5_juz': AgeRule;
    '15_juz': AgeRule;
    '30_juz': AgeRule;
}

export default function EventSettingsForm({ metadata, onUpdate }: Props) {
    const [dateLoading, setDateLoading] = useState(false);
    const [ageLoading, setAgeLoading] = useState(false);

    // Event Date State
    const dateRecord = metadata['event_date'];
    const [eventDate, setEventDate] = useState(dateRecord?.value || '');

    // Event Age Criteria State
    const [ageCriteria, setAgeCriteria] = useState<AgeCriteria>({
        '5_juz': { min: 0, max: 15 },
        '15_juz': { min: 0, max: 19 },
        '30_juz': { min: 0, max: 25 }
    });

    // Buffer state (default to 3 months)
    const bufferRecord = metadata['age_buffer_months'];
    const [bufferMonths, setBufferMonths] = useState<string>(
        bufferRecord?.value !== undefined ? String(bufferRecord.value) : '3'
    );

    useEffect(() => {
        const dateRecord = metadata['event_date'];
        if (dateRecord) {
            setEventDate(dateRecord.value || '');
        }

        const bufferRecord = metadata['age_buffer_months'];
        if (bufferRecord) {
            setBufferMonths(String(bufferRecord.value));
        }

        const ageRecord = metadata['event_age_criteria'];
        if (ageRecord && ageRecord.value) {
            setAgeCriteria({
                '5_juz': {
                    min: typeof ageRecord.value['5_juz']?.min === 'number' ? ageRecord.value['5_juz'].min : 0,
                    max: typeof ageRecord.value['5_juz']?.max === 'number' ? ageRecord.value['5_juz'].max : 15
                },
                '15_juz': {
                    min: typeof ageRecord.value['15_juz']?.min === 'number' ? ageRecord.value['15_juz'].min : 0,
                    max: typeof ageRecord.value['15_juz']?.max === 'number' ? ageRecord.value['15_juz'].max : 19
                },
                '30_juz': {
                    min: typeof ageRecord.value['30_juz']?.min === 'number' ? ageRecord.value['30_juz'].min : 0,
                    max: typeof ageRecord.value['30_juz']?.max === 'number' ? ageRecord.value['30_juz'].max : 25
                }
            });
        }
    }, [metadata]);

    const handleDateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDateLoading(true);
        try {
            const dbRecord = await metadataApi.getMetadataByKey('event_date');
            if (dbRecord) {
                await metadataApi.updateMetadata(dbRecord.id, eventDate);
            } else {
                await metadataApi.createMetadata('event_date', eventDate);
            }
            alert("Competition event date updated successfully!");
            onUpdate();
        } catch (err) {
            console.error("Failed to update event date", err);
            alert("Failed to update event date.");
        } finally {
            setDateLoading(false);
        }
    };

    const handleAgeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAgeLoading(true);
        try {
            // Update Event Age Criteria
            const dbAgeRecord = await metadataApi.getMetadataByKey('event_age_criteria');
            if (dbAgeRecord) {
                await metadataApi.updateMetadata(dbAgeRecord.id, ageCriteria);
            } else {
                await metadataApi.createMetadata('event_age_criteria', ageCriteria);
            }

            // Update Buffer months
            const bufferVal = parseFloat(bufferMonths);
            const finalBuffer = isNaN(bufferVal) ? 0 : bufferVal;
            const dbBufferRecord = await metadataApi.getMetadataByKey('age_buffer_months');
            if (dbBufferRecord) {
                await metadataApi.updateMetadata(dbBufferRecord.id, finalBuffer);
            } else {
                await metadataApi.createMetadata('age_buffer_months', finalBuffer);
            }

            alert("Age criteria and buffer updated successfully!");
            onUpdate();
        } catch (err) {
            console.error("Failed to update age eligibility", err);
            alert("Failed to update age eligibility.");
        } finally {
            setAgeLoading(false);
        }
    };

    const updateAgeRule = (category: keyof AgeCriteria, bound: 'min' | 'max', val: string) => {
        const parsed = parseInt(val, 10);
        const finalVal = isNaN(parsed) ? 0 : parsed;
        setAgeCriteria(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [bound]: finalVal
            }
        }));
    };

    return (
        <>
            {/* Widget 1: Competition Date */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Competition Date Settings</h2>
                </div>
                <form onSubmit={handleDateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Event Date &amp; Time</label>
                        <input 
                            type="datetime-local"
                            value={eventDate ? eventDate.substring(0, 16) : ''}
                            onChange={(e) => setEventDate(e.target.value ? e.target.value + ':00' : '')}
                            className={styles.formInput}
                            required
                        />
                    </div>
                    <button type="submit" className={styles.btnPrimary} disabled={dateLoading} style={{ alignSelf: 'flex-start' }}>
                        {dateLoading ? 'Saving...' : 'Save Competition Date'}
                    </button>
                </form>
            </div>

            {/* Widget 2: Age Criteria Rules */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Age Eligibility Criteria</h2>
                </div>
                <form onSubmit={handleAgeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(['5_juz', '15_juz', '30_juz'] as const).map((cat) => {
                            const label = cat === '5_juz' ? '5 Juz Category' : cat === '15_juz' ? '15 Juz Category' : '30 Juz Category';
                            return (
                                <div key={cat} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{label}</span>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Min Age</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={ageCriteria[cat].min}
                                            onChange={(e) => updateAgeRule(cat, 'min', e.target.value)}
                                            className={styles.formInput}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Max Age</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={ageCriteria[cat].max}
                                            onChange={(e) => updateAgeRule(cat, 'max', e.target.value)}
                                            className={styles.formInput}
                                            required
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '16px', marginTop: '4px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Age Tolerance Buffer (Months)</label>
                        <input 
                            type="number" 
                            step="0.1"
                            min="0"
                            value={bufferMonths} 
                            onChange={(e) => setBufferMonths(e.target.value)}
                            className={styles.formInput}
                            placeholder="e.g. 3"
                            required
                        />
                        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                            Tolerance range added to age criteria eligibility checks.
                        </span>
                    </div>
                    <button type="submit" className={styles.btnPrimary} disabled={ageLoading} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                        {ageLoading ? 'Saving...' : 'Save Age Criteria'}
                    </button>
                </form>
            </div>
        </>
    );
}
