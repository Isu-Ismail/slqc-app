import { useEffect, useRef } from 'react';
import { pb } from '../api/db';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../api/track';

/**
 * Hook to subscribe to real-time updates for a single individual participant application.
 */
export function useIndividualRealtime(
    recordId: string | undefined,
    onUpdate: (record: ParticipantsApplicationResponse) => void,
    onDelete: () => void
) {
    const onUpdateRef = useRef(onUpdate);
    const onDeleteRef = useRef(onDelete);

    useEffect(() => {
        onUpdateRef.current = onUpdate;
        onDeleteRef.current = onDelete;
    });

    useEffect(() => {
        if (!recordId) {
            console.log('[useIndividualRealtime] No recordId provided, skipping subscription.');
            return;
        }

        console.log(`[useIndividualRealtime] Subscribing to participants_application updates for ID: ${recordId}`);

        pb.collection('participants_application').subscribe<ParticipantsApplicationResponse>(recordId, (e) => {
            console.log(`[useIndividualRealtime] Event received for ID: ${recordId}. Action: ${e.action}`);
            if (e.record) {
                if (e.action === 'update') {
                    onUpdateRef.current(e.record);
                } else if (e.action === 'delete') {
                    onDeleteRef.current();
                }
            }
        }).catch((err) => {
            console.error(`[useIndividualRealtime] Failed to subscribe to participants_application for ID ${recordId}:`, err);
        });

        return () => {
            console.log(`[useIndividualRealtime] Unsubscribing from participants_application updates for ID: ${recordId}`);
            pb.collection('participants_application').unsubscribe(recordId).catch((err) => {
                console.error(`[useIndividualRealtime] Failed to unsubscribe for ID ${recordId}:`, err);
            });
        };
    }, [recordId]);
}

/**
 * Hook to subscribe to real-time updates for an institution and its associated participant applications.
 */
export function useInstitutionRealtime(
    institutionId: string | undefined,
    onInstitutionUpdate: (record: InstitutionsResponse) => void,
    onApplicationsChange: (action: 'create' | 'update' | 'delete', record: ParticipantsApplicationResponse) => void
) {
    const onInstitutionUpdateRef = useRef(onInstitutionUpdate);
    const onApplicationsChangeRef = useRef(onApplicationsChange);

    useEffect(() => {
        onInstitutionUpdateRef.current = onInstitutionUpdate;
        onApplicationsChangeRef.current = onApplicationsChange;
    });

    useEffect(() => {
        if (!institutionId) {
            console.log('[useInstitutionRealtime] No institutionId provided, skipping subscription.');
            return;
        }

        console.log(`[useInstitutionRealtime] Subscribing to updates for institution ID: ${institutionId}`);

        // 1. Subscribe to changes for the Institution record itself
        pb.collection('institutions').subscribe<InstitutionsResponse>(institutionId, (e) => {
            console.log(`[useInstitutionRealtime] Received institution event:`, e.action, e.record);
            if (e.action === 'update' && e.record) {
                onInstitutionUpdateRef.current(e.record);
            }
        }).catch((err) => {
            console.error(`[useInstitutionRealtime] Failed to subscribe to institution ${institutionId}:`, err);
        });

        // 2. Subscribe to changes for all applications, filtering locally for this institution
        console.log(`[useInstitutionRealtime] Subscribing to all participants_application updates`);
        pb.collection('participants_application').subscribe<ParticipantsApplicationResponse>('*', (e) => {
            if (e.record && e.record.institution_ref === institutionId) {
                console.log(`[useInstitutionRealtime] Received application event for matching institution:`, e.action, e.record);
                onApplicationsChangeRef.current(e.action as 'create' | 'update' | 'delete', e.record);
            }
        }).catch((err) => {
            console.error(`[useInstitutionRealtime] Failed to subscribe to all participants_application:`, err);
        });

        return () => {
            console.log(`[useInstitutionRealtime] Unsubscribing from institution ${institutionId} and wildcard applications`);
            pb.collection('institutions').unsubscribe(institutionId).catch((err) => {
                console.error(`[useInstitutionRealtime] Failed to unsubscribe from institution ${institutionId}:`, err);
            });
            pb.collection('participants_application').unsubscribe('*').catch((err) => {
                console.error(`[useInstitutionRealtime] Failed to unsubscribe from wildcard applications:`, err);
            });
        };
    }, [institutionId]);
}

/**
 * Hook to subscribe to real-time updates for approvals list (applications, institutions, and locks).
 */
export function useApprovalsRealtime(
    appType: 'individual' | 'institution',
    onApplicationChange: (action: string, record: any) => void,
    onLockChange: (action: string, record: any) => void
) {
    const onApplicationChangeRef = useRef(onApplicationChange);
    const onLockChangeRef = useRef(onLockChange);

    useEffect(() => {
        onApplicationChangeRef.current = onApplicationChange;
        onLockChangeRef.current = onLockChange;
    });

    useEffect(() => {
        console.log(`[useApprovalsRealtime] Subscribing to approvals realtime updates for type: ${appType}`);

        const handleAppEvent = (e: any) => {
            if (e.record) {
                onApplicationChangeRef.current(e.action, e.record);
            }
        };

        const handleLockEvent = (e: any) => {
            if (e.record) {
                onLockChangeRef.current(e.action, e.record);
            }
        };

        const appCollection = appType === 'individual' ? 'participants_application' : 'institutions';

        pb.collection(appCollection).subscribe('*', handleAppEvent).catch((err) => {
            console.error(`[useApprovalsRealtime] Failed to subscribe to ${appCollection}:`, err);
        });

        pb.collection('approval_locks').subscribe('*', handleLockEvent).catch((err) => {
            console.error(`[useApprovalsRealtime] Failed to subscribe to approval_locks:`, err);
        });

        return () => {
            console.log(`[useApprovalsRealtime] Unsubscribing from ${appCollection} and approval_locks`);
            pb.collection(appCollection).unsubscribe('*').catch(() => {});
            pb.collection('approval_locks').unsubscribe('*').catch(() => {});
        };
    }, [appType]);
}

/**
 * Hook to subscribe to real-time updates for all participant applications and institutions.
 */
export function useApplicationsListRealtime(
    onIndividualChange: (action: string, record: ParticipantsApplicationResponse) => void,
    onInstitutionChange: (action: string, record: InstitutionsResponse) => void
) {
    const onIndividualChangeRef = useRef(onIndividualChange);
    const onInstitutionChangeRef = useRef(onInstitutionChange);

    useEffect(() => {
        onIndividualChangeRef.current = onIndividualChange;
        onInstitutionChangeRef.current = onInstitutionChange;
    });

    useEffect(() => {
        console.log(`[useApplicationsListRealtime] Subscribing to all applications and institutions`);

        pb.collection('participants_application').subscribe<ParticipantsApplicationResponse>('*', (e) => {
            if (e.record) {
                onIndividualChangeRef.current(e.action, e.record);
            }
        }).catch((err) => {
            console.error('[useApplicationsListRealtime] Failed to subscribe to participants_application:', err);
        });

        pb.collection('institutions').subscribe<InstitutionsResponse>('*', (e) => {
            if (e.record) {
                onInstitutionChangeRef.current(e.action, e.record);
            }
        }).catch((err) => {
            console.error('[useApplicationsListRealtime] Failed to subscribe to institutions:', err);
        });

        return () => {
            console.log(`[useApplicationsListRealtime] Unsubscribing from applications and institutions`);
            pb.collection('participants_application').unsubscribe('*').catch(() => {});
            pb.collection('institutions').unsubscribe('*').catch(() => {});
        };
    }, []);
}
