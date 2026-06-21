import { pb } from './db';

export const venuesApi = {
    updateCandidateAllocation: async (participantId: string, allocatedVenue: string, allocatedOrder: number) => {
        return pb.send('/api/admin/update-candidate-allocation', {
            method: 'POST',
            body: {
                participantId,
                allocated_venue: allocatedVenue,
                allocated_order: allocatedOrder
            }
        });
    },

    printVenueList: async (venue: string) => {
        return pb.send<any[]>('/api/admin/print-venue-list', {
            method: 'GET',
            query: { venue }
        });
    },

    generateIds: async (venue: string) => {
        return pb.send<any[]>('/api/admin/generate-ids', {
            method: 'GET',
            query: { venue }
        });
    }
};
