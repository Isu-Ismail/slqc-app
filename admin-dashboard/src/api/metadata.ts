import { pb } from './db';

export interface MetadataRecord {
    id: string;
    key: string;
    value: any;
    document?: string;
    created: string;
    updated: string;
}

let metadataCache: { data: MetadataRecord[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const metadataApi = {
    /**
     * Synchronously get cached metadata
     */
    getCachedMetadata(): MetadataRecord[] | null {
        if (metadataCache && Date.now() - metadataCache.timestamp < CACHE_TTL) {
            return metadataCache.data;
        }
        return null;
    },

    /**
     * Fetch all metadata records
     */
    async getAllMetadata(forceRefresh = false): Promise<MetadataRecord[]> {
        if (!forceRefresh && metadataCache && Date.now() - metadataCache.timestamp < CACHE_TTL) {
            return metadataCache.data;
        }
        const data = await pb.collection('metadata').getFullList<MetadataRecord>({
            sort: 'key',
        });
        metadataCache = { data, timestamp: Date.now() };
        return data;
    },

    /**
     * Update a specific metadata record by ID
     */
    async updateMetadata(id: string, value: any, clearDocument = false): Promise<MetadataRecord> {
        const records = await this.getAllMetadata();
        const record = records.find(r => r.id === id);
        if (!record) throw new Error("Metadata record not found");

        const finalValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);

        const updated = await pb.send<MetadataRecord>('/api/admin/update-metadata', {
            method: 'POST',
            body: { key: record.key, value: finalValue, clear_document: String(clearDocument) }
        });
        metadataCache = null;
        return updated;
    },

    /**
     * Update metadata with a document file
     */
    async updateMetadataDocument(id: string, file: File): Promise<MetadataRecord> {
        const records = await this.getAllMetadata();
        const record = records.find(r => r.id === id);
        if (!record) throw new Error("Metadata record not found");

        const formData = new FormData();
        formData.append('key', record.key);
        formData.append('document', file);

        const updated = await pb.send<MetadataRecord>('/api/admin/update-metadata', {
            method: 'POST',
            body: formData
        });
        metadataCache = null;
        return updated;
    },

    /**
     * Create a new metadata record
     */
    async createMetadata(key: string, value: any): Promise<MetadataRecord> {
        const finalValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
        const created = await pb.send<MetadataRecord>('/api/admin/update-metadata', {
            method: 'POST',
            body: { key, value: finalValue }
        });
        metadataCache = null;
        return created;
    },

    /**
     * Create metadata with a document file
     */
    async createMetadataDocument(key: string, file: File): Promise<MetadataRecord> {
        const formData = new FormData();
        formData.append('key', key);
        formData.append('document', file);
        const created = await pb.send<MetadataRecord>('/api/admin/update-metadata', {
            method: 'POST',
            body: formData
        });
        metadataCache = null;
        return created;
    },

    /**
     * Helper to get a specific metadata record by key
     */
    async getMetadataByKey(key: string): Promise<MetadataRecord | null> {
        try {
            return await pb.collection('metadata').getFirstListItem<MetadataRecord>(`key="${key}"`);
        } catch (e) {
            return null; // Not found
        }
    }
};
