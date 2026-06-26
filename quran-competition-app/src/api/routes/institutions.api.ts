// src/api/routes/institutions.api.ts
import { pb } from '../db';
import type { InstitutionsResponse } from '../types';

export interface RegisterInstitutionParams {
    name: string;
    // --- NEW STRUCTURED ADDRESS FIELDS ---
    street_address: string;
    pincode: string;
    state_name: string;
    district_name: string;
    village_name: string;
    // -------------------------------------
    contact_person: string;
    email: string;
    phone_number?: string;
    whatsapp_number: string;
    document?: File; // Proof of authenticity (bonafide/id card/etc.)
    instituition_building_proof?: File; // Building proof photo
    instituition_location?: string; // Geolocation coordinates "lat,lng"
    password?: string;
}

export const institutionsApi = {
    // Register a new institution
    registerInstitution: async (params: RegisterInstitutionParams): Promise<InstitutionsResponse> => {
        const formData = new FormData();
        formData.append('name', params.name);

        // Append structured address
        formData.append('street_address', params.street_address);
        formData.append('pincode', params.pincode);
        formData.append('state_name', params.state_name);
        formData.append('district_name', params.district_name);
        formData.append('village_name', params.village_name);

        formData.append('contact_person', params.contact_person);
        formData.append('email', params.email);
        if (params.phone_number) {
            formData.append('phone_number', params.phone_number);
        }
        formData.append('whatsapp_number', params.whatsapp_number);
        if (params.password) {
            formData.append('passcode', params.password);
        }
        formData.append('status', 'pending'); // Defaults to pending approval

        const safeName = params.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

        // Append document proof if present
        if (params.document) {
            const ext = params.document.name.split('.').pop() || 'jpg';
            const renamed = new File([params.document], `${safeName}_id.${ext}`, { type: params.document.type });
            formData.append('document', renamed);
        }

        // Append building proof and location
        if (params.instituition_building_proof) {
            const ext = params.instituition_building_proof.name.split('.').pop() || 'jpg';
            const renamed = new File([params.instituition_building_proof], `${safeName}_building.${ext}`, { type: params.instituition_building_proof.type });
            formData.append('instituition_building_proof', renamed);
        }
        if (params.instituition_location) {
            formData.append('instituition_location', params.instituition_location);
        }

        return await pb.collection('institutions').create<InstitutionsResponse>(formData);
    },

    // Track an institution status
    trackInstitutionStatus: async (idOrEmail: string, passcode?: string): Promise<InstitutionsResponse | null> => {
        try {
            const query = idOrEmail.trim();
            let filter = query.includes('@') ? `email = "${query}"` : `(id = "${query}" || institution_id = "${query}")`;
            if (passcode) {
                filter = `(${filter}) && passcode = "${passcode}"`;
            }
            return await pb.collection('institutions').getFirstListItem<InstitutionsResponse>(filter);
        } catch (e) {
            console.error('Error tracking institution:', e);
            return null;
        }
    },

    // Update an existing institution record
    updateInstitution: async (id: string, params: Partial<RegisterInstitutionParams> | FormData): Promise<InstitutionsResponse> => {
        let formData: FormData;

        if (params instanceof FormData) {
            formData = params;
        } else {
            formData = new FormData();
            if (params.name !== undefined) formData.append('name', params.name);

            // Append structured address for updates
            if (params.street_address !== undefined) formData.append('street_address', params.street_address);
            if (params.pincode !== undefined) formData.append('pincode', params.pincode);
            if (params.state_name !== undefined) formData.append('state_name', params.state_name);
            if (params.district_name !== undefined) formData.append('district_name', params.district_name);
            if (params.village_name !== undefined) formData.append('village_name', params.village_name);

            if (params.contact_person !== undefined) formData.append('contact_person', params.contact_person);
            if (params.email !== undefined) formData.append('email', params.email);
            formData.append('phone_number', params.phone_number || '');
            if (params.whatsapp_number !== undefined) formData.append('whatsapp_number', params.whatsapp_number);

            const nameToUse = params.name || 'institution';
            const safeName = nameToUse.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

            if (params.document) {
                const ext = params.document.name.split('.').pop() || 'jpg';
                const renamed = new File([params.document], `${safeName}_id.${ext}`, { type: params.document.type });
                formData.append('document', renamed);
            }
            if (params.instituition_building_proof) {
                const ext = params.instituition_building_proof.name.split('.').pop() || 'jpg';
                const renamed = new File([params.instituition_building_proof], `${safeName}_building.${ext}`, { type: params.instituition_building_proof.type });
                formData.append('instituition_building_proof', renamed);
            }
            if (params.instituition_location !== undefined) formData.append('instituition_location', params.instituition_location);
        }

        formData.set('id', id);
        const cachedPasscode = sessionStorage.getItem('quran_competition_track_institution_passcode') || '';
        formData.set('passcode', cachedPasscode);

        return await pb.send<InstitutionsResponse>(`/api/public/update-institution`, {
            method: 'POST',
            body: formData
        });
    },

    // Verify an institution credentials
    verifyInstitution: async (institutionId: string, passcode: string): Promise<any> => {
        return await pb.send<any>('/api/public/verify-institution', {
            method: 'GET',
            query: {
                institution_id: institutionId.trim(),
                passcode: passcode.trim()
            }
        });
    }
};