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
                ? `(status = 'pending' || status = 'reapplied') && (approved_by = '' || approved_by = null)`
                : `approved_by = "${userId}" && status != 'pending' && status != 'reapplied'`;

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
                `(status = 'pending' || status = 'reapplied') && (approved_by = '' || approved_by = null)`;

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

    /**
     * Manually enqueue a confirmation e-mail for an approved institution.
     * The mail_queue cron job picks it up every 3 minutes.
     */
    sendInstitutionConfirmationMail: async (
        recordId: string,
        toEmail: string,
        institutionName: string,
        institutionId: string,
        passcode: string
    ): Promise<void> => {
        const appUrl = 'https://al-azhar.duckdns.org/slqc';
        const trackUrl = `${appUrl}/track?type=institution&query=${recordId}`;

        const htmlBody = `
            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <h2>Institution Approved – SLQC 2026</h2>
                <p>Dear ${institutionName},</p>
                <p>Congratulations! Your institution's registration for the SLQC Quran Competition has been <strong>approved</strong>.</p>
                <p><strong>Institution ID:</strong> ${institutionId}</p>
                <p><strong>Your Passcode:</strong> ${passcode}</p>
                <p>Please keep this passcode secure. You will need it to track your status, submit candidates, and manage your registration.</p>
                <p>You can track the status of your registration using the link below:</p>
                <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px;">Track Institution Status</a></p>
                <p>Thank you,<br/>SLQC 2026 Team</p>
            </div>
        `;

        await pb.collection('mail_queue').create({
            to_email: toEmail,
            to_name: institutionName,
            subject: `Institution Approved – SLQC 2026 | ID: ${institutionId}`,
            body_html: htmlBody,
            type: 'institution_confirmation',
            status: 'pending',
            attempts: 0,
            record_id: recordId,
        });
    },

    /**
     * Manually enqueue a confirmation e-mail for an approved individual participant.
     * The mail_queue cron job picks it up every 3 minutes.
     */
    sendIndividualConfirmationMail: async (
        recordId: string,
        toEmail: string,
        fullName: string,
        participantId: string,
        category: string
    ): Promise<void> => {
        const appUrl = 'https://al-azhar.duckdns.org/slqc';
        const trackUrl = `${appUrl}/track?type=individual&query=${recordId}`;

        const htmlBody = `
            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <h2>Application Approved – SLQC 2026</h2>
                <p>Dear ${fullName},</p>
                <p>Congratulations! Your application for the SLQC Quran Competition (Category: ${category}) has been <strong>approved</strong>.</p>
                <p><strong>Your Participant ID:</strong> ${participantId}</p>
                <p>You can track the status of your application using the link below (you will also need your Date of Birth):</p>
                <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px;">Track Application Status</a></p>
                <p>Thank you,<br/>SLQC 2026 Team</p>
            </div>
        `;

        await pb.collection('mail_queue').create({
            to_email: toEmail,
            to_name: fullName,
            subject: `Application Approved – SLQC 2026 | ID: ${participantId}`,
            body_html: htmlBody,
            type: 'individual_confirmation',
            status: 'pending',
            attempts: 0,
            record_id: recordId,
        });
    },

    /**
     * Manually enqueue a rejection e-mail for an individual participant.
     * Apologetic in tone, includes the rejection reason.
     */
    sendIndividualRejectionMail: async (
        recordId: string,
        toEmail: string,
        fullName: string,
        category: string,
        rejectionReason: string
    ): Promise<void> => {
        const appUrl = 'https://al-azhar.duckdns.org/slqc';
        const trackUrl = `${appUrl}/track?type=individual&query=${recordId}`;

        const htmlBody = `
            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <h2>Application Status Update – SLQC 2026</h2>
                <p>Dear ${fullName},</p>
                <p>Thank you sincerely for taking the time to apply for the SLQC 2026 Quran Competition (Category: ${category}).</p>
                <p>We regret to inform you that, after careful review, we are <strong>unable to approve</strong> your application at this time.</p>
                <p><strong>Reason:</strong> ${rejectionReason}</p>
                <p>We understand this may be disappointing, and we truly appreciate your enthusiasm and dedication. We encourage you to address the above concern and consider reapplying in a future registration window.</p>
                <p>You can still check the status of your application using the link below:</p>
                <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #6b7280; color: white; text-decoration: none; border-radius: 5px;">View Application Status</a></p>
                <p>If you have any questions, please do not hesitate to reach out to us.</p>
                <p>Warm regards,<br/>SLQC 2026 Team</p>
            </div>
        `;

        await pb.collection('mail_queue').create({
            to_email: toEmail,
            to_name: fullName,
            subject: `Regarding Your SLQC 2026 Application – Important Update`,
            body_html: htmlBody,
            type: 'individual_rejection',
            status: 'pending',
            attempts: 0,
            record_id: recordId,
        });
    },

    /**
     * Manually enqueue a rejection e-mail for an institution.
     * Apologetic in tone, includes the rejection reason.
     */
    sendInstitutionRejectionMail: async (
        recordId: string,
        toEmail: string,
        institutionName: string,
        rejectionReason: string
    ): Promise<void> => {
        const appUrl = 'https://al-azhar.duckdns.org/slqc';
        const trackUrl = `${appUrl}/track?type=institution&query=${recordId}`;

        const htmlBody = `
            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                <h2>Institution Registration Status Update – SLQC 2026</h2>
                <p>Dear ${institutionName},</p>
                <p>Thank you for submitting your institution's registration for the SLQC 2026 Quran Competition.</p>
                <p>After careful review by our team, we regret to inform you that we are <strong>unable to approve</strong> your registration at this time.</p>
                <p><strong>Reason:</strong> ${rejectionReason}</p>
                <p>We sincerely appreciate your interest and the effort put into this application. We encourage you to address the concern noted above and consider reapplying during the next registration period.</p>
                <p>You may check the current status of your registration using the link below:</p>
                <p><a href="${trackUrl}" style="display: inline-block; padding: 10px 15px; background-color: #6b7280; color: white; text-decoration: none; border-radius: 5px;">View Registration Status</a></p>
                <p>Should you have any questions or require clarification, please feel free to contact us.</p>
                <p>Warm regards,<br/>SLQC 2026 Team</p>
            </div>
        `;

        await pb.collection('mail_queue').create({
            to_email: toEmail,
            to_name: institutionName,
            subject: `Regarding Your SLQC 2026 Institution Registration – Important Update`,
            body_html: htmlBody,
            type: 'institution_rejection',
            status: 'pending',
            attempts: 0,
            record_id: recordId,
        });
    },
};