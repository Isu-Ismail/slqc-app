// src/api/track.ts
import { pb } from './db';
import type { RecordModel } from 'pocketbase';

// ── Result cache — avoids repeat DB round-trips for the same query ────────────
// Entries expire after 60 seconds. Max 50 entries (LRU-style eviction).
const TRACK_CACHE_TTL = 60_000;
const MAX_CACHE_SIZE = 50;

type CacheEntry<T> = { data: T; ts: number };
const indivCache = new Map<string, CacheEntry<any>>();
const instCache = new Map<string, CacheEntry<any>>();

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > TRACK_CACHE_TTL) { map.delete(key); return null; }
    return entry.data;
}
function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, data: T) {
    if (map.size >= MAX_CACHE_SIZE) {
        // evict oldest
        const oldest = map.keys().next().value;
        if (oldest) map.delete(oldest);
    }
    map.set(key, { data, ts: Date.now() });
}
/** Call this when a record is updated so stale cache is dropped immediately */
export function invalidateTrackCache(recordId?: string) {
    if (recordId) {
        indivCache.forEach((v, k) => {
            if (v.data && v.data.id === recordId) {
                indivCache.delete(k);
            }
        });
        instCache.forEach((v, k) => {
            if (v.data) {
                if (v.data.institution && v.data.institution.id === recordId) {
                    instCache.delete(k);
                } else if (v.data.applications && v.data.applications.some((app: any) => app.id === recordId)) {
                    instCache.delete(k);
                }
            }
        });
    } else {
        indivCache.clear();
        instCache.clear();
    }
}

export interface ParticipantsApplicationResponse extends RecordModel {
    registration_type: 'individual' | 'institution';
    institution_id?: string;
    institution_ref?: string;
    full_name: string;
    aadhaar_number: string;
    dob: string;
    category: '5_juz' | '15_juz' | '30_juz' | '';
    gender: 'male' | 'female';
    email?: string;
    whatsapp_number: string;
    father_name?: string;
    father_number?: string;
    guardian_name: string;
    guardian_phone: string;
    requires_accommodation?: boolean;
    aadhaar_front?: string;
    birthcertificate_photo?: string;
    candidate_photo: string;
    status: 'pending' | 'approved' | 'rejected' | 'reapplied';
    rejection_reason?: string;
    is_locked?: boolean;
    approved_by?: string;
    participant_id?: string;
    allocated_venue?: string;
    allocated_order?: number;
    allocated_slot?: string;
    selected_juz?: string;
    juz_options?: string;
    address?: string;
}

export interface InstitutionsResponse extends RecordModel {
    name: string;
    street_address: string
    pincode: string
    state_name: string
    district_name: string
    village_name: string
    contact_person: string;
    email: string;
    whatsapp_number: string;
    phone_number?: string;
    document: string;
    instituition_location?: string;
    instituition_building_proof?: string;
    status: 'pending' | 'approved' | 'rejected' | 'reapplied';
    is_locked?: boolean;
    approved_by?: string;
    institution_id?: string;
    passcode?: string;
    incharge?: string;
    incharge_number?: string;
}

/**
 * Classify a raw query string and return the precise PocketBase filter
 * to use for it — avoids full-table OR scans on every search.
 *
 * Rules (checked in order):
 *  1. starts with "INST-" (case-insensitive)  → institution_id exact match
 *  2. starts with "APL-"  (case-insensitive)  → participant_id exact match
 *  3. has "@" and a dot after it              → email exact match
 *  4. all digits, length > 10                 → aadhaar_number exact match
 *  5. all digits, length 6–10                 → whatsapp_number exact match
 *  6. all digits, other lengths               → id exact match (PocketBase internal)
 *  7. otherwise                               → full_name partial match (~)
 */
export const adminTrackApi = {
    // Smart search for Individual Application
    trackIndividual: async (queryStr: string): Promise<ParticipantsApplicationResponse | null> => {
        const key = `indiv:${queryStr.trim().toLowerCase()}`;
        const cached = cacheGet<ParticipantsApplicationResponse>(indivCache, key);
        if (cached) return cached;

        try {
            const record = await pb.send<ParticipantsApplicationResponse>('/api/admin/track-individual', {
                method: 'GET',
                query: { query: queryStr.trim() }
            });
            if (record) cacheSet(indivCache, key, record);
            return record;
        } catch (e) {
            console.error('Error tracking individual application:', e);
            return null;
        }
    },

    // Smart search for Institution
    trackInstitution: async (queryStr: string): Promise<{
        institution: InstitutionsResponse | null;
        applications: ParticipantsApplicationResponse[];
    }> => {
        const key = `inst:${queryStr.trim().toLowerCase()}`;
        const cached = cacheGet<{ institution: InstitutionsResponse; applications: ParticipantsApplicationResponse[] }>(instCache, key);
        if (cached) return cached;

        try {
            const result = await pb.send<{
                institution: InstitutionsResponse | null;
                applications: ParticipantsApplicationResponse[];
            }>('/api/admin/track-institution', {
                method: 'GET',
                query: { query: queryStr.trim() }
            });
            if (result) cacheSet(instCache, key, result);
            return result;
        } catch (e) {
            console.error('Error tracking institution applications:', e);
            return { institution: null, applications: [] };
        }
    },


    updateApplication: async (id: string, payload: FormData | Record<string, any>): Promise<ParticipantsApplicationResponse> => {
        const result = await pb.collection('participants_application').update<ParticipantsApplicationResponse>(id, payload, {
            expand: 'approved_by,institution_ref'
        });
        invalidateTrackCache(id);
        return result;
    },

    updateInstitution: async (id: string, formData: FormData): Promise<InstitutionsResponse> => {
        const result = await pb.collection('institutions').update<InstitutionsResponse>(id, formData);
        invalidateTrackCache(id);
        return result;
    },

    updateStatusAndLock: async (
        id: string,
        type: 'individual' | 'institution',
        status: string,
        isLocked: boolean,
        rejectionReason?: string
    ) => {
        let result: any;
        if (status === 'approved') {
            result = await pb.send('/api/admin/approve', {
                method: 'POST',
                body: { id, type }
            });
        } else if (status === 'rejected') {
            result = await pb.send('/api/admin/reject', {
                method: 'POST',
                body: { id, type, rejection_reason: rejectionReason || '' }
            });
        } else {
            const collection =
                type === 'individual'
                    ? 'participants_application'
                    : 'institutions';

            const data: any = {
                status,
                is_locked: isLocked,
                approved_by: pb.authStore.record?.id
            };

            if (status === 'approved') {
                data.rejection_reason = "";
            } else if (rejectionReason !== undefined) {
                data.rejection_reason = rejectionReason;
            }

            result = await pb
                .collection(collection)
                .update(id, data);
        }
        invalidateTrackCache(id);
        return result;
    },

    updateLockStatus: async (
        id: string,
        type: 'individual' | 'institution',
        isLocked: boolean
    ) => {
        const result = await pb.send('/api/admin/toggle-lock', {
            method: 'POST',
            body: { id, type, is_locked: isLocked }
        });
        invalidateTrackCache(id);
        return result;
    }
};