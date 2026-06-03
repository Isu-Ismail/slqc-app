// admin-dashboard/src/api/approvals.ts

import { pb } from './db';
import type {
    ParticipantsApplicationResponse,
    InstitutionsResponse
} from './track';

export type AllocatedItem =
    | ParticipantsApplicationResponse
    | InstitutionsResponse;

export type ApprovalLock = {
    id: string;
    application_id: string;
    application_type: 'individual' | 'institution';
    locked_by: string;
    locked_by_name?: string;
    created: string;
    updated: string;
};

const CACHE_TTL = 5 * 60 * 1000;

const allocationsCache: Record<
    string,
    {
        data: AllocatedItem[];
        timestamp: number;
    }
> = {};

const countsCache: Record<
    string,
    {
        data: {
            individual: number;
            institution: number;
        };
        timestamp: number;
    }
> = {};


export const approvalsApi = {
    getCachedAllocatedApplications: (
        userId: string,
        isPending: boolean,
        type: 'individual' | 'institution'
    ): AllocatedItem[] | null => {
        const cacheKey =
            `${userId}_${isPending}_${type}`;

        if (
            allocationsCache[cacheKey] &&
            Date.now() - allocationsCache[cacheKey].timestamp < CACHE_TTL
        ) {
            return allocationsCache[cacheKey].data;
        }

        return null;
    },

    getCachedPendingCounts: (
        userId: string
    ): {
        individual: number;
        institution: number;
    } | null => {
        const cacheKey =
            `${userId}_counts`;

        if (
            countsCache[cacheKey] &&
            Date.now() - countsCache[cacheKey].timestamp < CACHE_TTL
        ) {
            return countsCache[cacheKey].data;
        }

        return null;
    },

    getAllocatedApplications: async (
        userId: string,
        isPending: boolean,
        type: 'individual' | 'institution',
        forceRefresh = false
    ): Promise<AllocatedItem[]> => {
        const cacheKey = `shared_${isPending}_${type}`;

        if (
            !forceRefresh &&
            allocationsCache[cacheKey] &&
            Date.now() - allocationsCache[cacheKey].timestamp < CACHE_TTL
        ) {
            return allocationsCache[cacheKey].data;
        }

        try {
            const filter = isPending
                ? `status = 'pending' && (approved_by = '' || approved_by = null)`
                : `approved_by = "${userId}" && status != 'pending'`;

            const collectionName =
                type === 'individual'
                    ? 'participants_application'
                    : 'institutions';

            const data =
                await pb.collection(collectionName).getFullList<AllocatedItem>({
                    filter,
                    sort: '-created',
                    requestKey: null
                });

            allocationsCache[cacheKey] = {
                data,
                timestamp: Date.now()
            };

            return data;
        } catch (e) {
            console.error(`Error fetching allocated ${type}s:`, e);
            return [];
        }
    },

    getApplicationDetails: async (
        id: string,
        type: 'individual' | 'institution'
    ): Promise<AllocatedItem | null> => {
        try {
            const collectionName =
                type === 'individual'
                    ? 'participants_application'
                    : 'institutions';

            return await pb
                .collection(collectionName)
                .getOne<AllocatedItem>(id, {
                    requestKey: null
                });
        } catch (e) {
            console.error(`Error fetching ${type} details:`, e);
            return null;
        }
    },

    getPendingCounts: async (
        userId: string,
        forceRefresh = false
    ): Promise<{
        individual: number;
        institution: number;
    }> => {
        const cacheKey =
            `${userId}_counts`;

        if (
            !forceRefresh &&
            countsCache[cacheKey] &&
            Date.now() - countsCache[cacheKey].timestamp < CACHE_TTL
        ) {
            return countsCache[cacheKey].data;
        }

        try {
            const filter =
                `status = 'pending' && (approved_by = '' || approved_by = null)`;

            const indReq =
                pb.collection('participants_application').getList(
                    1,
                    1,
                    {
                        filter,
                        requestKey: null
                    }
                );

            const instReq =
                pb.collection('institutions').getList(
                    1,
                    1,
                    {
                        filter,
                        requestKey: null
                    }
                );

            const [indRes, instRes] =
                await Promise.all([indReq, instReq]);

            const data = {
                individual: indRes.totalItems,
                institution: instRes.totalItems
            };

            countsCache[cacheKey] = {
                data,
                timestamp: Date.now()
            };

            return data;
        } catch (e) {
            console.error('Error fetching counts:', e);

            return {
                individual: 0,
                institution: 0
            };
        }
    },

    getLocks: async (): Promise<ApprovalLock[]> => {
        try {
            return await pb
                .collection('approval_locks')
                .getFullList<ApprovalLock>({
                    requestKey: null
                });
        } catch (e) {
            console.error('Error fetching locks:', e);
            return [];
        }
    },

    getLock: async (
        applicationId: string
    ): Promise<ApprovalLock | null> => {
        try {
            return await pb
                .collection('approval_locks')
                .getFirstListItem(
                    `application_id="${applicationId}"`,
                    {
                        requestKey: null
                    }
                );
        } catch {
            return null;
        }
    },

    createLock: async (
        applicationId: string,
        applicationType: 'individual' | 'institution',
        userId: string,
        userName: string
    ): Promise<ApprovalLock> => {
        return await pb
            .collection('approval_locks')
            .create({
                application_id: applicationId,
                application_type: applicationType,
                locked_by: userId,
                locked_by_name: userName
            });
    },

    releaseLock: async (
        applicationId: string
    ): Promise<void> => {
        const lock = await approvalsApi.getLock(applicationId);

        if (!lock) {
            return;
        }

        await pb
            .collection('approval_locks')
            .delete(lock.id);
    },
    removeApplicationFromCache: (
        applicationId: string
    ) => {

        Object.keys(allocationsCache)
            .forEach(key => {

                allocationsCache[key].data =
                    allocationsCache[key].data
                        .filter(
                            x => x.id !== applicationId
                        );
            });
    },
};