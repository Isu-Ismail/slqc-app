import { useEffect, useRef } from 'react';
import { pb } from '../api/db';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../api/types';
import { trackApplicationApi } from '../api/routes/TracApplication.api';

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

        console.log(`[useIndividualRealtime] Subscribing to trigger_collection updates for ID: ${recordId}`);

        const handleTriggerUpdate = async () => {
            const dob = localStorage.getItem('quran_competition_track_individual_dob') || '';
            if (!dob) {
                console.warn('[useIndividualRealtime] No DOB found in localStorage, cannot refetch.');
                return;
            }
            try {
                console.log(`[useIndividualRealtime] Refetching record details for ID: ${recordId}`);
                const updated = await trackApplicationApi.trackIndividual(recordId, dob);
                if (updated) {
                    console.log('[useIndividualRealtime] Refetch successful. Calling onUpdate.');
                    onUpdateRef.current(updated);
                } else {
                    console.warn('[useIndividualRealtime] Record not found (deleted). Calling onDelete.');
                    onDeleteRef.current();
                }
            } catch (err) {
                console.error('[useIndividualRealtime] Error during background refetch:', err);
            }
        };

        pb.collection('trigger_collection').subscribe('*', (e) => {
            console.log('[useIndividualRealtime] Realtime event received from trigger_collection:', e);
            if (e.record && e.record.column_name === 'participants_application') {
                console.log('[useIndividualRealtime] Match found: participants_application. Triggering refetch...');
                handleTriggerUpdate();
            }
        }).catch((err) => {
            console.error(`[useIndividualRealtime] Failed to subscribe to trigger_collection:`, err);
        });

        return () => {
            console.log(`[useIndividualRealtime] Unsubscribing from trigger_collection`);
            pb.collection('trigger_collection').unsubscribe('*').catch(() => {});
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

        let previousAppsMap = new Map<string, ParticipantsApplicationResponse>();
        const query = localStorage.getItem('quran_competition_track_institution_query') || '';
        const passcode = sessionStorage.getItem('quran_competition_track_institution_passcode') || '';

        const handleTriggerUpdate = async () => {
            if (!query || !passcode) {
                console.warn('[useInstitutionRealtime] Missing query or passcode, cannot refetch.', { query, passcode });
                return;
            }
            try {
                console.log(`[useInstitutionRealtime] Refetching institution details for query: ${query}`);
                const data = await trackApplicationApi.trackInstitution(query, passcode);
                if (data.institution) {
                    onInstitutionUpdateRef.current(data.institution);
                }
                
                const currentApps = data.applications || [];
                const currentIds = new Set(currentApps.map(a => a.id));

                // 1. Detect deletes
                for (const [id, oldApp] of previousAppsMap.entries()) {
                    if (!currentIds.has(id)) {
                        console.log(`[useInstitutionRealtime] Application deletion detected for ID: ${id}`);
                        onApplicationsChangeRef.current('delete', oldApp);
                    }
                }

                // 2. Detect creates and updates
                for (const app of currentApps) {
                    const oldApp = previousAppsMap.get(app.id);
                    if (!oldApp) {
                        console.log(`[useInstitutionRealtime] New application creation detected for ID: ${app.id}`);
                        onApplicationsChangeRef.current('create', app);
                    } else if (JSON.stringify(oldApp) !== JSON.stringify(app)) {
                        console.log(`[useInstitutionRealtime] Application update detected for ID: ${app.id}`);
                        onApplicationsChangeRef.current('update', app);
                    }
                }

                // Update previous map
                const nextMap = new Map<string, ParticipantsApplicationResponse>();
                for (const app of currentApps) {
                    nextMap.set(app.id, app);
                }
                previousAppsMap = nextMap;

            } catch (err) {
                console.error('[useInstitutionRealtime] Error during background refetch:', err);
            }
        };

        // Populate initial map
        if (query && passcode) {
            trackApplicationApi.trackInstitution(query, passcode).then(data => {
                const nextMap = new Map<string, ParticipantsApplicationResponse>();
                for (const app of (data.applications || [])) {
                    nextMap.set(app.id, app);
                }
                previousAppsMap = nextMap;
            }).catch(() => {});
        }

        pb.collection('trigger_collection').subscribe('*', (e) => {
            console.log('[useInstitutionRealtime] Realtime event received from trigger_collection:', e);
            if (e.record && (e.record.column_name === 'participants_application' || e.record.column_name === 'institutions')) {
                console.log(`[useInstitutionRealtime] Match found: ${e.record.column_name}. Triggering refetch...`);
                handleTriggerUpdate();
            }
        }).catch((err) => {
            console.error(`[useInstitutionRealtime] Failed to subscribe to trigger_collection:`, err);
        });

        return () => {
            console.log(`[useInstitutionRealtime] Unsubscribing from trigger_collection`);
            pb.collection('trigger_collection').unsubscribe('*').catch(() => {});
        };
    }, [institutionId]);
}
