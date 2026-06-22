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

    updateFinalCandidateAllocation: async (participantId: string, finalVenue: string, finalOrder: number) => {
        return pb.send('/api/admin/update-final-candidate-allocation', {
            method: 'POST',
            body: {
                participantId,
                final_venue: finalVenue,
                final_order: finalOrder
            }
        });
    },

    allocateFinalVenues: async (category: string) => {
        return pb.send('/api/admin/allocate-final-venues', {
            method: 'POST',
            body: { category }
        });
    },

    unallocateFinalVenues: async (category: string) => {
        return pb.send('/api/admin/unallocate-final-venues', {
            method: 'POST',
            body: { category }
        });
    },

    printVenueList: async (venue: string, round: string = 'preliminary') => {
        return pb.send<any[]>('/api/admin/print-venue-list', {
            method: 'GET',
            query: { venue, round }
        });
    }
};
