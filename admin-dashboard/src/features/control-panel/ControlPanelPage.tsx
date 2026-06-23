import { useState, useEffect } from 'react';
import { metadataApi } from '../../api/metadata';
import type { MetadataRecord } from '../../api/metadata';
import { Settings, Clock, Award, FileText, Sliders } from 'lucide-react';
import StatusToggles from './components/StatusToggles';
import TimeSettingsForm from './components/TimeSettingsForm';
import { EventDateForm, AgeEligibilityForm } from './components/EventSettingsForm';
import RulesSettingsForm from './components/RulesSettingsForm';
import PrintTemplatesForm from './components/PrintTemplatesForm';
import DynamicListEditor from './components/DynamicListEditor';
import StatsRecalculator from './components/StatsRecalculator';
import ArchiveManager from './components/ArchiveManager';
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
            console.log("ControlPanelPage - loadMetadata success. Records count:", records.length, records.map(r => r.key));
            const map: Record<string, MetadataRecord> = {};
            records.forEach(r => {
                map[r.key] = r;
            });
            setMetadata(map);
        } catch (err) {
            console.error("ControlPanelPage - loadMetadata failed with error:", err);
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

    const [activeTab, setActiveTab] = useState<'system' | 'timings' | 'rules' | 'prizes' | 'documents' | 'limits' | 'templates' | 'archiving'>('system');

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
                    <Clock size={16} /> Timings
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'rules' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('rules')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Award size={16} /> Date & Age Rules
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'prizes' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('prizes')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Award size={16} /> Prizes Settings
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'documents' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('documents')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <FileText size={16} /> Document Manager
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'limits' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('limits')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Sliders size={16} /> Institute Limits
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'templates' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('templates')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <FileText size={16} /> Print Templates
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'archiving' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('archiving')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Settings size={16} /> Archiving
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
                        <EventDateForm metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                        <AgeEligibilityForm metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                    </>
                )}

                {activeTab === 'prizes' && (
                    <>
                        <DynamicListEditor 
                            title="5 Juz Grand Prizes" 
                            metadataKey="prizes_5_juz"
                            metadata={metadata}
                            onUpdate={() => loadMetadata(false, true)}
                            template={{ rank: '🏅', title: '', value: '', highlight: false }}
                        />
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
                    </>
                )}

                {activeTab === 'documents' && (
                    <>
                        <RulesSettingsForm metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                    </>
                )}

                {activeTab === 'limits' && (
                    <>
                        <DynamicListEditor 
                            title="Applications Per Institution Limit" 
                            metadataKey="applications_per_institute"
                            metadata={metadata}
                            onUpdate={() => loadMetadata(false, true)}
                            template={{ cat: '5_juz', count: 3 }}
                        />
                    </>
                )}

                {activeTab === 'templates' && (
                    <>
                        <PrintTemplatesForm metadata={metadata} onUpdate={() => loadMetadata(false, true)} />
                    </>
                )}

                {activeTab === 'archiving' && (
                    <>
                        <ArchiveManager />
                    </>
                )}
            </div>
        </div>
    );
}
