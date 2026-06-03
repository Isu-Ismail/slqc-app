// src/api/routes/participants.api.ts
import { pb } from '../db';
import type { ParticipantsApplicationResponse } from '../types';

export interface CreateApplicationParams {
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
    aadhaar_front: File;
    candidate_photo: File;
}

export const participantsApi = {
    createApplication: async (params: CreateApplicationParams): Promise<ParticipantsApplicationResponse> => {
        const formData = new FormData();
        formData.append('registration_type', params.registration_type);
        if (params.institution_id) {
            formData.append('institution_id', params.institution_id);
        }
        if (params.institution_ref) {
            formData.append('institution_ref', params.institution_ref);
        }
        formData.append('full_name', params.full_name);
        formData.append('aadhaar_number', params.aadhaar_number);
        formData.append('dob', params.dob);
        formData.append('category', params.category);
        formData.append('gender', params.gender);
        if (params.email) {
            formData.append('email', params.email);
        }
        formData.append('whatsapp_number', params.whatsapp_number);
        formData.append('guardian_name', params.guardian_name);
        formData.append('guardian_phone', params.guardian_phone);
        formData.append('requires_accommodation', String(params.requires_accommodation || false));
        formData.append('aadhaar_front', params.aadhaar_front);
        formData.append('candidate_photo', params.candidate_photo);
        formData.append('status', 'pending');

        return await pb.collection('participants_application').create<ParticipantsApplicationResponse>(formData);
    },

    updateApplication: async (id: string, formData: FormData): Promise<ParticipantsApplicationResponse> => {
        const record = await pb.collection('participants_application').getOne<ParticipantsApplicationResponse>(id);
        if (record && record.is_locked) {
            throw new Error("This application is locked and cannot be modified.");
        }
        return await pb.collection('participants_application').update<ParticipantsApplicationResponse>(id, formData);
    },

    getApplicationByAadhaar: async (aadhaar: string): Promise<ParticipantsApplicationResponse | null> => {
        try {
            return await pb.collection('participants_application').getFirstListItem<ParticipantsApplicationResponse>(
                `aadhaar_number = "${aadhaar}"`
            );
        } catch (e) {
            return null;
        }
    }
};
