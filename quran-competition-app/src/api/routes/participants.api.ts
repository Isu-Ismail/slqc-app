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
    father_name?: string;
    father_number?: string;
    guardian_name: string;
    guardian_phone: string;
    requires_accommodation?: boolean;
    aadhaar_front?: File;
    birthcertificate_photo?: File;
    candidate_photo: File;
    selected_juz?: string;
    juz_options?: string;
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
        if (params.father_name) {
            formData.append('father_name', params.father_name);
        }
        if (params.father_number) {
            formData.append('father_number', params.father_number);
        }
        formData.append('guardian_name', params.guardian_name);
        formData.append('guardian_phone', params.guardian_phone);
        formData.append('requires_accommodation', String(params.requires_accommodation || false));
        if (params.selected_juz) {
            formData.append('selected_juz', params.selected_juz);
        }
        if (params.juz_options) {
            formData.append('juz_options', params.juz_options);
        }
        
        const safeName = params.full_name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        const photoExt = params.candidate_photo.name.split('.').pop() || 'jpg';
        const renamedPhoto = new File([params.candidate_photo], `${safeName}_passport.${photoExt}`, { type: params.candidate_photo.type });
        formData.append('candidate_photo', renamedPhoto);

        if (params.aadhaar_front) {
            const aadhaarExt = params.aadhaar_front.name.split('.').pop() || 'jpg';
            const renamedAadhaar = new File([params.aadhaar_front], `${safeName}_aadhaar.${aadhaarExt}`, { type: params.aadhaar_front.type });
            formData.append('aadhaar_front', renamedAadhaar);
        }

        if (params.birthcertificate_photo) {
            const birthCertExt = params.birthcertificate_photo.name.split('.').pop() || 'jpg';
            const renamedBirthCert = new File([params.birthcertificate_photo], `${safeName}_birthcertificate.${birthCertExt}`, { type: params.birthcertificate_photo.type });
            formData.append('birthcertificate_photo', renamedBirthCert);
        }

        formData.append('status', 'pending');

        return await pb.collection('participants_application').create<ParticipantsApplicationResponse>(formData);
    },

    updateApplication: async (id: string, payload: FormData | Record<string, any>): Promise<ParticipantsApplicationResponse> => {
        const headers: Record<string, string> = {};
        const cachedDob = localStorage.getItem('quran_competition_track_individual_dob');
        if (cachedDob) {
            headers['x-app-dob'] = cachedDob;
        }

        const record = await pb.collection('participants_application').getOne<ParticipantsApplicationResponse>(id, {
            headers: headers
        });

        if (record && record.is_locked) {
            throw new Error("This application is locked and cannot be modified.");
        }

        // Fallback: if cachedDob is not set, extract the date portion from the fetched record's dob
        if (!cachedDob && record && record.dob) {
            const extractedDob = record.dob.split(' ')[0]; // Extract YYYY-MM-DD
            headers['x-app-dob'] = extractedDob;
        }

        return await pb.collection('participants_application').update<ParticipantsApplicationResponse>(id, payload, {
            expand: 'approved_by,institution_ref',
            headers: headers
        });
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
