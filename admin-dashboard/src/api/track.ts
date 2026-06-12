// src/api/track.ts
import { pb } from './db';
import type { RecordModel } from 'pocketbase';

// ── Result cache — avoids repeat DB round-trips for the same query ────────────
// Entries expire after 60 seconds. Max 50 entries (LRU-style eviction).
const TRACK_CACHE_TTL = 60_000;
const MAX_CACHE_SIZE  = 50;

type CacheEntry<T> = { data: T; ts: number };
const indivCache = new Map<string, CacheEntry<any>>();
const instCache  = new Map<string, CacheEntry<any>>();

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
    selected_juz?: string;
    juz_options?: string;
}

export interface InstitutionsResponse extends RecordModel {
    name: string;
    address: string;
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
type QueryType =
    | 'institution_id'
    | 'participant_id'
    | 'email'
    | 'aadhaar'
    | 'phone'
    | 'record_id'
    | 'name';

function classifyQuery(raw: string): { type: QueryType; filter: string } {
    const q = raw.trim().replace(/"/g, '\\"');
    const upper = q.toUpperCase();

    if (upper.startsWith('INST-')) {
        return { type: 'institution_id', filter: `institution_id = "${q}"` };
    }
    if (upper.startsWith('APL-')) {
        return { type: 'participant_id', filter: `participant_id = "${q}"` };
    }
    if (q.includes('@') && /\.[a-zA-Z]{2,}/.test(q.split('@')[1] || '')) {
        return { type: 'email', filter: `email = "${q}"` };
    }
    const digits = q.replace(/\D/g, '');
    if (digits === q) {
        // pure numeric string
        if (q.length > 10) {
            return { type: 'aadhaar', filter: `aadhaar_number = "${q}"` };
        }
        if (q.length >= 6) {
            return { type: 'phone', filter: `whatsapp_number = "${q}"` };
        }
        return { type: 'record_id', filter: `id = "${q}"` };
    }
    // Default: partial name match (also catches PocketBase 15-char record IDs with mixed chars)
    return { type: 'name', filter: `full_name ~ "${q}" || id = "${q}"` };
}

/** Same classifier but for institution-side fields */
function classifyInstitutionQuery(raw: string): { type: QueryType; filter: string } {
    const q = raw.trim().replace(/"/g, '\\"');
    const upper = q.toUpperCase();

    if (upper.startsWith('INST-')) {
        return { type: 'institution_id', filter: `institution_id = "${q}"` };
    }
    if (q.includes('@') && /\.[a-zA-Z]{2,}/.test(q.split('@')[1] || '')) {
        return { type: 'email', filter: `email = "${q}"` };
    }
    const digits = q.replace(/\D/g, '');
    if (digits === q) {
        if (q.length >= 6) {
            return { type: 'phone', filter: `whatsapp_number = "${q}" || phone_number = "${q}"` };
        }
        return { type: 'record_id', filter: `id = "${q}"` };
    }
    return { type: 'name', filter: `name ~ "${q}" || id = "${q}"` };
}

export const adminTrackApi = {
    // Smart search for Individual Application
    trackIndividual: async (queryStr: string): Promise<ParticipantsApplicationResponse | null> => {
        const key = `indiv:${queryStr.trim().toLowerCase()}`;
        const cached = cacheGet<ParticipantsApplicationResponse>(indivCache, key);
        if (cached) return cached;

        try {
            const { filter } = classifyQuery(queryStr.trim());
            const record = await pb.collection('participants_application').getFirstListItem<ParticipantsApplicationResponse>(filter, {
                expand: 'approved_by,institution_ref'
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
            const { filter } = classifyInstitutionQuery(queryStr.trim());

            const institution = await pb.collection('institutions').getFirstListItem<InstitutionsResponse>(filter, {
                expand: 'approved_by'
            });

            if (!institution) {
                return { institution: null, applications: [] };
            }

            // Find all applications referencing this institution
            const applications = await pb.collection('participants_application').getFullList<ParticipantsApplicationResponse>({
                filter: `institution_ref = "${institution.id}"`,
                sort: '-created',
                expand: 'approved_by,institution_ref'
            });

            const result = { institution, applications };
            cacheSet(instCache, key, result);
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

        const result = await pb
            .collection(collection)
            .update(id, data);
        invalidateTrackCache(id);
        return result;
    }
};