// src/api/routes/metadata.api.ts
import { pb } from '../db';

export interface MetadataRecord {
    id: string;
    key: string;
    value: any;
    created: string;
    updated: string;
}

export const metadataApi = {
    // Fetches all metadata records and maps them to a key-value object
    getStats: async (): Promise<Record<string, any>> => {
        try {
            const records = await pb.collection('metadata').getFullList<MetadataRecord>({ requestKey: null });
            const stats: Record<string, any> = {};
            records.forEach((r) => {
                stats[r.key] = r.value;
            });
            return stats;
        } catch (e: any) {
            // Silence warning if it is an intentional abort/cancel, otherwise log
            if (e.isAbort) return {};
            console.error('[PocketBase] Failed to fetch metadata stats:', e);
            return {};
        }
    },

    // Subscribes to real-time database changes on the metadata collection
    subscribeStats: (callback: (data: { key: string; value: any }) => void) => {
        pb.collection('metadata').subscribe<MetadataRecord>('*', (e) => {
            if (e.action === 'update' || e.action === 'create') {
                callback({ key: e.record.key, value: e.record.value });
            }
        });

        // Return unsubscribe cleanup handler
        return () => {
            pb.collection('metadata').unsubscribe('*');
        };
    }
};
