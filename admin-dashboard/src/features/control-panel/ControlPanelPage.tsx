import { useState, useEffect } from 'react';
import { metadataApi } from '../../api/metadata';
import type { MetadataRecord } from '../../api/metadata';
import { Settings, Clock, Award } from 'lucide-react';
import StatusToggles from './components/StatusToggles';
import TimeSettingsForm from './components/TimeSettingsForm';
import { EventDateForm, AgeEligibilityForm } from './components/EventSettingsForm';
import RulesSettingsForm from './components/RulesSettingsForm';
import DynamicListEditor from './components/DynamicListEditor';
import StatsRecalculator from './components/StatsRecalculator';
import styles from './ControlPanelPage.module.css';
import { pb } from '../../api/db';

export default function ControlPanelPage() {
    const user = pb.authStore.model;
    
    const initialCache = metadataApi.getCachedMetadata();
    const initialMap: Record<string, MetadataRecord> = {};
    if (initialCache) {
        initialCache.forEach(r => initialMap[r.key] = r);
    }

    const [metadata, setMetadata] = useState<Record<string, MetadataRecord>>(initialMap);
    const [loading, setLoading] = useState(!initialCache);

    const loadMetadata = async (showLoading = true, forceRefresh = false) => {
        if (showLoading && !metadataApi.getCachedMetadata()) {
            setLoading(true);
        }
        try {
            const records = await metadataApi.getAllMetadata(forceRefresh);
            const map: Record<string, MetadataRecord> = {};
            records.forEach(r => {
                map[r.key] = r;
            });
            setMetadata(map);
        } catch (err) {
            console.error("Failed to load metadata", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        Promise.resolve().then(() => loadMetadata());

        // Subscribe to realtime updates
        pb.collection('metadata').subscribe('*', function (e) {
            setMetadata(prev => {
                const newMap = { ...prev };
                if (e.action === 'delete') {
                    delete newMap[e.record.key];
                } else {
                    newMap[e.record.key] = e.record as unknown as MetadataRecord;
                }
                return newMap;
            });
        });

        return () => {
            pb.collection('metadata').unsubscribe('*');
        };
    }, []);

    const [activeTab, setActiveTab] = useState<'system' | 'timings' | 'rules'>('system');

    if (user?.designation !== 'admin') {
        return (
            <div className={styles.restricted}>
                <h2>Access Denied</h2>
                <p>Only Administrators can access the Control Panel.</p>
            </div>
        );
    }

    if (loading) {
        return <div className={styles.loading}>Loading Control Panel...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.tabsContainer}>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'system' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('system')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Settings size={16} /> System & Controls
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'timings' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('timings')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Clock size={16} /> Competition Timings
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'rules' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('rules')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Award size={16} /> Event Rules & Prizes
                </button>
            </div>

            <div className={styles.grid}>
                {activeTab === 'system' && (
                    <>
                        <StatusToggles metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                        <StatsRecalculator onUpdate={() => {}} />
                    </>
                )}

                {activeTab === 'timings' && (
                    <>
                        <TimeSettingsForm metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                        <DynamicListEditor 
                            title="Timeline Events" 
                            metadataKey="events"
                            metadata={metadata}
                            onUpdate={() => loadMetadata(false, true)}
                            template={{ date: '', title: '', desc: '', active: true }}
                        />
                    </>
                )}

                {activeTab === 'rules' && (
                    <>
                        {/* Row 1: Competition Date (Left) & 5 Juz Prizes (Right) */}
                        <EventDateForm metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                        <DynamicListEditor 
                            title="5 Juz Grand Prizes" 
                            metadataKey="prizes_5_juz"
                            metadata={metadata}
                            onUpdate={() => loadMetadata(false, true)}
                            template={{ rank: '🏅', title: '', value: '', highlight: false }}
                        />
                        
                        {/* Row 2: 15 Juz Prizes (Left) & 30 Juz Prizes (Right) */}
                        <DynamicListEditor 
                            title="15 Juz Grand Prizes" 
                            metadataKey="prizes_15_juz"
                            metadata={metadata}
                            onUpdate={() => loadMetadata(false, true)}
                            template={{ rank: '🏅', title: '', value: '', highlight: false }}
                        />
                        <DynamicListEditor 
                            title="30 Juz Grand Prizes" 
                            metadataKey="prizes_30_juz"
                            metadata={metadata}
                            onUpdate={() => loadMetadata(false, true)}
                            template={{ rank: '🏅', title: '', value: '', highlight: false }}
                        />

                        {/* Row 3: Age Eligibility Criteria (Left) & Document/Template Manager (Right) */}
                        <AgeEligibilityForm metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                        <RulesSettingsForm metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                    </>
                )}
            </div>
        </div>
    );
}
