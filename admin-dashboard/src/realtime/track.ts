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
