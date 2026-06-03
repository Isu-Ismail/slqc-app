import { useState, useEffect } from 'react';
import { metadataApi } from '../../api/metadata';
import type { MetadataRecord } from '../../api/metadata';
import StatusToggles from './components/StatusToggles';
import TimeSettingsForm from './components/TimeSettingsForm';
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
            <div className={styles.grid}>
                <StatusToggles metadata={metadata} onUpdate={() => {}} />
                <TimeSettingsForm metadata={metadata} onUpdate={() => {}} />
                <DynamicListEditor 
                    title="Timeline Events" 
                    metadataKey="events"
                    metadata={metadata}
                    onUpdate={() => {}}
                    template={{ date: '', title: '', desc: '', active: true }}
                />
                <DynamicListEditor 
                    title="Grand Prizes" 
                    metadataKey="prizes"
                    metadata={metadata}
                    onUpdate={() => {}}
                    template={{ rank: '🏅', title: '', value: '', highlight: false }}
                />
                <StatsRecalculator onUpdate={() => {}} />
            </div>
        </div>
    );
}
