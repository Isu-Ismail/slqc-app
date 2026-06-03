// src/api/track.ts
import { pb } from './db';
import type { RecordModel } from 'pocketbase';

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
    guardian_name: string;
    guardian_phone: string;
    requires_accommodation?: boolean;
    aadhaar_front: string;
    candidate_photo: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;
    is_locked?: boolean;
    approved_by?: string;
    participant_id?: string;
    allocated_venue?: string;
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
    status: 'pending' | 'approved' | 'rejected';
    is_locked?: boolean;
    approved_by?: string;
    institution_id?: string;
    passcode?: string;
}

export const adminTrackApi = {
    // Permissive search for Individual Application
    trackIndividual: async (queryStr: string): Promise<ParticipantsApplicationResponse | null> => {
        try {
            const q = queryStr.trim().replace(/"/g, '\\"');

            // Highly permissive search: exact match for ID, Participant ID, Aadhaar, Phone, Email OR partial match for name
            const filter = `id = "${q}" || participant_id = "${q}" || aadhaar_number = "${q}" || whatsapp_number = "${q}" || email = "${q}" || full_name ~ "${q}"`;

            // ADDED institution_ref TO EXPAND
            return await pb.collection('participants_application').getFirstListItem<ParticipantsApplicationResponse>(filter, {
                expand: 'approved_by,institution_ref'
            });
        } catch (e) {
            console.error('Error tracking individual application:', e);
            return null;
        }
    },

    // Permissive search for Institution
    trackInstitution: async (queryStr: string): Promise<{
        institution: InstitutionsResponse | null;
        applications: ParticipantsApplicationResponse[];
    }> => {
        try {
            const q = queryStr.trim().replace(/"/g, '\\"');

            // Permissive search for institution: ID, Institution ID, Email, Phone, WhatsApp OR partial match for name
            const filter = `id = "${q}" || institution_id = "${q}" || email = "${q}" || phone_number = "${q}" || whatsapp_number = "${q}" || name ~ "${q}"`;

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
                expand: 'approved_by'
            });

            return { institution, applications };
        } catch (e) {
            console.error('Error tracking institution applications:', e);
            return { institution: null, applications: [] };
        }
    },

    updateApplication: async (id: string, formData: FormData): Promise<ParticipantsApplicationResponse> => {
        return await pb.collection('participants_application').update<ParticipantsApplicationResponse>(id, formData);
    },

    updateInstitution: async (id: string, formData: FormData): Promise<InstitutionsResponse> => {
        return await pb.collection('institutions').update<InstitutionsResponse>(id, formData);
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

        return await pb
            .collection(collection)
            .update(id, data);
    },

    allocateApplications: async (userId: string, count: number, type: 'individual' | 'institution') => {
        return await pb.send('/api/admin-allocate', {
            method: 'POST',
            body: { coordinator_id: userId, count, type }
        });
    },

    unallocateApplications: async (userId: string, type: 'individual' | 'institution') => {
        return await pb.send('/api/admin-unallocate', {
            method: 'POST',
            body: { coordinator_id: userId, type }
        });
    },

    autoAllocateAll: async (type: 'individual' | 'institution') => {
        return await pb.send('/api/auto-allocate', {
            method: 'POST',
            body: { type }
        });
    },

    getUnallocatedCount: async (type?: 'individual' | 'institution') => {
        try {
            let url = '/api/unallocated-count';
            if (type) {
                url += `?type=${type}`;
            }
            return await pb.send(url, {
                method: 'GET'
            });
        } catch (err) {
            console.error('Error fetching unallocated count:', err);
            return { success: false, error: 'Network error' };
        }
    }
};