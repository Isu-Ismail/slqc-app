// src/api/routes/TracApplication.api.ts
import { pb } from '../db';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../types';
import { participantsApi } from './participants.api';
import { institutionsApi } from './institutions.api';

export const trackApplicationApi = {
    // Track a single application by either its ID, Aadhaar number, or participant_id AND Date of Birth (DOB)
    trackIndividual: async (idOrAadhaar: string, dob: string): Promise<ParticipantsApplicationResponse | null> => {
        try {
            const query = idOrAadhaar.trim();
            // 1. If it starts with APL-, search by participant_id
            if (query.startsWith('APL-')) {
                return await pb.collection('participants_application').getFirstListItem<ParticipantsApplicationResponse>(
                    `participant_id = "${query}" && dob ~ "${dob}%"`,
                    { 
                        expand: 'approved_by,institution_ref',
                        headers: { 'x-app-dob': dob }
                    }
                );
            }

            // 2. Try to fetch by record ID directly
            if (query.length === 15) {
                try {
                    const record = await pb.collection('participants_application').getOne<ParticipantsApplicationResponse>(
                        query,
                        { 
                            expand: 'approved_by,institution_ref',
                            headers: { 'x-app-dob': dob }
                        }
                    );
                    if (record && record.dob && record.dob.startsWith(dob)) {
                        return record;
                    }
                } catch {
                    // Fall through to search by Aadhaar + DOB
                }
            }

            // 3. Search by Aadhaar number and DOB prefix match
            return await pb.collection('participants_application').getFirstListItem<ParticipantsApplicationResponse>(
                `aadhaar_number = "${query}" && dob ~ "${dob}%"`,
                { 
                    expand: 'approved_by,institution_ref',
                    headers: { 'x-app-dob': dob }
                }
            );
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
            // Find the institution record first matching ID, auto ID, or Email and passcode
            const query = institutionIdOrEmail.trim();
            const filter = `(id = "${query}" || institution_id = "${query}" || email = "${query}") && passcode = "${passcode}"`;

            const institution = await pb.collection('institutions').getFirstListItem<InstitutionsResponse>(
                filter,
                { 
                    expand: 'approved_by',
                    headers: { 'x-inst-passcode': passcode }
                }
            );

            if (!institution) {
                return { institution: null, applications: [] };
            }

            // Find all applications referencing this institution
            const applications = await pb.collection('participants_application').getFullList<ParticipantsApplicationResponse>({
                filter: `institution_ref = "${institution.id}"`,
                sort: '-created',
                expand: 'approved_by,institution_ref'
            });

            return { institution, applications };
        } catch (e) {
            console.error('Error tracking institution applications:', e);
            return { institution: null, applications: [] };
        }
    },

    updateApplication: async (id: string, payload: FormData | Record<string, any>): Promise<ParticipantsApplicationResponse> => {
        return await participantsApi.updateApplication(id, payload);
    },

    // Update an institution (if not locked)
    updateInstitution: async (id: string, formData: FormData): Promise<InstitutionsResponse> => {
        return await institutionsApi.updateInstitution(id, formData);
    }
};