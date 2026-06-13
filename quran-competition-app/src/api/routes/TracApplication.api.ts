// src/api/routes/TracApplication.api.ts
import { pb } from '../db';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../types';
import { participantsApi } from './participants.api';
import { institutionsApi } from './institutions.api';

export const trackApplicationApi = {
    // Track a single application by either its ID, Aadhaar number, or participant_id AND Date of Birth (DOB)
    trackIndividual: async (idOrAadhaar: string, dob: string): Promise<ParticipantsApplicationResponse | null> => {
        try {
            return await pb.send<ParticipantsApplicationResponse>(`/api/public/track-individual`, {
                method: 'GET',
                query: { query: idOrAadhaar.trim(), dob }
            });
        } catch (e) {
            console.error('Error tracking individual application:', e);
            return null;
        }
    },

    // Track all applications through a specific Institution ID
    trackInstitution: async (institutionIdOrEmail: string, passcode: string): Promise<{
        institution: InstitutionsResponse | null;
        applications: ParticipantsApplicationResponse[];
    }> => {
        try {
            return await pb.send<{
                institution: InstitutionsResponse | null;
                applications: ParticipantsApplicationResponse[];
            }>(`/api/public/track-institution`, {
                method: 'GET',
                query: { query: institutionIdOrEmail.trim(), passcode }
            });
        } catch (e) {
            console.error('Error tracking institution applications:', e);
            return { institution: null, applications: [] };
        }
    },

    updateApplication: async (id: string, payload: FormData | Record<string, any>, dob?: string): Promise<ParticipantsApplicationResponse> => {
        return await participantsApi.updateApplication(id, payload, dob);
    },

    // Update an institution (if not locked)
    updateInstitution: async (id: string, formData: FormData): Promise<InstitutionsResponse> => {
        return await institutionsApi.updateInstitution(id, formData);
    }
};