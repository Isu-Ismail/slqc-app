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
    async updateMetadata(id: string, value: any): Promise<MetadataRecord> {
        return await pb.collection('metadata').update<MetadataRecord>(id, {
            value: value
        });
    },

    /**
     * Update metadata with a document file
     */
    async updateMetadataDocument(id: string, file: File): Promise<MetadataRecord> {
        const formData = new FormData();
        formData.append('document', file);
        return await pb.collection('metadata').update<MetadataRecord>(id, formData);
    },

    /**
     * Create a new metadata record
     */
    async createMetadata(key: string, value: any): Promise<MetadataRecord> {
        return await pb.collection('metadata').create<MetadataRecord>({
            key,
            value
        });
    },

    /**
     * Create metadata with a document file
     */
    async createMetadataDocument(key: string, file: File): Promise<MetadataRecord> {
        const formData = new FormData();
        formData.append('key', key);
        formData.append('document', file);
        return await pb.collection('metadata').create<MetadataRecord>(formData);
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
