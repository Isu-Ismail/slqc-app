import { pb } from './db';

export const marksApi = {
    getStudentsStatus: async (venue: string, round: string) => {
        return pb.send<{
            preliminary_complete?: boolean;
            pending: any[];
            completed: any[];
        }>('/api/admin/marks/get-students-status', {
            method: 'GET',
            query: { venue, round }
        });
    },

    getTemplate: async (round: string, category: string) => {
        return pb.send<{
            columns: { questions: any[]; criteria: any[] };
        }>('/api/admin/marks/get-template', {
            method: 'GET',
            query: { round, category }
        });
    },

    saveTemplate: async (round: string, category: string, columns: any) => {
        return pb.send<{ success: boolean; id: string }>('/api/admin/marks/save-template', {
            method: 'POST',
            body: { round, category, columns }
        });
    },

    saveStudentMarks: async (round: string, participantId: string, values: any, isFrozen: boolean = true) => {
        return pb.send<{ success: boolean }>('/api/admin/marks/save-student-marks', {
            method: 'POST',
            body: {
                round,
                participant_id: participantId,
                values,
                is_frozen: isFrozen
            }
        });
    },

    uploadMarksheets: async (participantId: string, round: string, files: File[]) => {
        // Use native PocketBase collection API — this is the ONLY reliable way
        // to upload files in PocketBase (custom hook routes cannot handle multipart).
        const formData = new FormData();
        formData.append('participant_ref', participantId);
        formData.append('round', round);
        formData.append('uploaded_by', pb.authStore.model?.id || '');
        files.forEach(f => formData.append('images', f));
        // Creates a new record per upload batch; getMarksheets aggregates all of them
        return pb.collection('marksheet_uploads').create(formData);
    },

    getMarksheets: async (participantId: string, round: string) => {
        // Fetch all upload records for this participant + round
        const records = await pb.collection('marksheet_uploads').getList(1, 100, {
            filter: `participant_ref = "${participantId}" && round = "${round}"`,
            sort: '-created',
        });

        // Build correct image URLs using the SDK — this always uses the right base URL
        const images: string[] = [];
        const filenames: string[] = [];
        const imageDetails: { url: string; filename: string; recordId: string }[] = [];

        for (const record of records.items) {
            const fileList: string[] = Array.isArray(record['images'])
                ? record['images']
                : record['images'] ? [record['images']] : [];

            for (const filename of fileList) {
                const url = pb.files.getURL(record, filename);
                images.push(url);
                filenames.push(filename);
                imageDetails.push({ url, filename, recordId: record.id });
            }
        }

        return { images, filenames, count: images.length, image_details: imageDetails };
    },

    deleteMarksheetImage: async (recordId: string, filename: string) => {
        return pb.send<{ success: boolean }>(
            '/api/admin/marks/delete-marksheet-image',
            { method: 'DELETE', query: { record_id: recordId, filename } }
        );
    }
};

