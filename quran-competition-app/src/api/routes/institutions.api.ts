// src/api/routes/institutions.api.ts
import { pb } from '../db';
import type { InstitutionsResponse } from '../types';

export interface RegisterInstitutionParams {
    name: string;
    address: string;
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
        formData.append('address', params.address);
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
        
        // Append document proof if present
        if (params.document) {
            formData.append('document', params.document);
        }

        // Append new fields
        if (params.instituition_building_proof) {
            formData.append('instituition_building_proof', params.instituition_building_proof);
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
        const record = await pb.collection('institutions').getOne<InstitutionsResponse>(id);
        if (record && record.is_locked) {
            throw new Error("This institution is locked and cannot be modified.");
        }

        let formData: FormData;
        if (params instanceof FormData) {
            formData = params;
        } else {
            formData = new FormData();
            if (params.name !== undefined) formData.append('name', params.name);
            if (params.address !== undefined) formData.append('address', params.address);
            if (params.contact_person !== undefined) formData.append('contact_person', params.contact_person);
            if (params.email !== undefined) formData.append('email', params.email);
            formData.append('phone_number', params.phone_number || '');
            if (params.whatsapp_number !== undefined) formData.append('whatsapp_number', params.whatsapp_number);
            if (params.document) formData.append('document', params.document);
            if (params.instituition_building_proof) formData.append('instituition_building_proof', params.instituition_building_proof);
            if (params.instituition_location !== undefined) formData.append('instituition_location', params.instituition_location);
        }

        return await pb.collection('institutions').update<InstitutionsResponse>(id, formData);
    }
};
