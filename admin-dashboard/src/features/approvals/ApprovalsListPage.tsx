// admin-dashboard/src/features/approvals/ApprovalsListPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { pb } from '../../api/db';
import { RefreshCw, Lock } from 'lucide-react';
import { approvalsApi } from '../../api/approvals';
import type { AllocatedItem } from '../../api/approvals';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../api/track';
import styles from './Approvals.module.css';

export default function ApprovalsListPage() {
    const location = useLocation();
    const queryType = new URLSearchParams(location.search).get('type') as 'individual' | 'institution' || 'individual';

    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [appType, setAppType] = useState<'individual' | 'institution'>(queryType);
    const user = pb.authStore.model;

    const initialAppsCache = user ? approvalsApi.getCachedAllocatedApplications(user.id, activeTab === 'pending', appType) : null;
    const initialCountsCache = user ? approvalsApi.getCachedPendingCounts(user.id) : null;

    const [applications, setApplications] = useState<AllocatedItem[]>(initialAppsCache || []);
    const [counts, setCounts] = useState(initialCountsCache || { individual: 0, institution: 0 });
    const [loading, setLoading] = useState(!initialAppsCache);
    const navigate = useNavigate();
    const [lockedIds, setLockedIds] =
        useState<Set<string>>(new Set());

    const fetchApplications = async (force = false) => {
        if (!user) return;

        const cached = approvalsApi.getCachedAllocatedApplications(user.id, activeTab === 'pending', appType);
        if (force || !cached) setLoading(true);

        try {
            const data = await approvalsApi.getAllocatedApplications(user.id, activeTab === 'pending', appType, force);
            setApplications(data);

            const countsData = await approvalsApi.getPendingCounts(user.id, force);
            setCounts(countsData);
        } catch (e) {
            console.error("Error fetching applications list:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();

        const loadLocks = async () => {
            try {
                const locks = await approvalsApi.getLocks();

                setLockedIds(
                    new Set(
                        locks.map(lock => lock.application_id)
                    )
                );
            } catch (err) {
                console.error(err);
            }
        };

        const setupRealtime = async () => {
            try {
                const applicationCollection =
                    appType === 'individual'
                        ? 'participants_application'
                        : 'institutions';

                await pb
                    .collection(applicationCollection)
                    .subscribe('*', (e) => {

                        const record = e.record as AllocatedItem;

                        if (e.action === 'create') {

                            setApplications(prev => {

                                const exists =
                                    prev.some(
                                        x => x.id === record.id
                                    );

                                if (exists) {
                                    return prev;
                                }

                                return [record, ...prev];
                            });

                            setCounts(prev => ({
                                ...prev,
                                [appType]:
                                    prev[appType] + 1
                            }));
                        }
                    });

                await pb
                    .collection('approval_locks')
                    .subscribe('*', (e) => {

                        const lock = e.record as any;

                        if (e.action === 'create') {

                            setLockedIds(prev => {
                                const next = new Set(prev);
                                next.add(lock.application_id);
                                return next;
                            });
                        }

                        if (e.action === 'delete') {

                            setLockedIds(prev => {
                                const next = new Set(prev);
                                next.delete(lock.application_id);
                                return next;
                            });
                        }
                    });

            } catch (err) {
                console.error(err);
            }
        };

        loadLocks();
        setupRealtime();

        return () => {

            pb.collection(
                'participants_application'
            ).unsubscribe('*');

            pb.collection(
                'institutions'
            ).unsubscribe('*');

            pb.collection(
                'approval_locks'
            ).unsubscribe('*');
        };

    }, [appType, activeTab]);
    const handleRowAction = async (
        app: AllocatedItem,
        e: React.MouseEvent
    ) => {
        e.stopPropagation();

        if (activeTab === 'history') {
            navigate(`/approvals/${app.id}?type=${appType}`);
            return;
        }

        const isChecking =
            lockedIds.has(app.id);

        if (isChecking) {
            alert(
                "Another coordinator is currently reviewing this application."
            );
            return;
        }

        try {

            const existingLock =
                await approvalsApi.getLock(app.id);

            if (existingLock) {
                alert(
                    "Another coordinator is currently reviewing this application."
                );
                return;
            }

            await approvalsApi.createLock(
                app.id,
                appType,
                user!.id,
                user!.email || "Coordinator"
            );

            navigate(
                `/approvals/${app.id}?type=${appType}`
            );

        } catch (err) {
            console.error(err);

            alert(
                "Unable to lock application. Please try again."
            );
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.tabsContainer} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pending Review ({activeTab === 'pending' ? applications.length : '...'})
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        My Approvals / History
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => fetchApplications(true)}
                        title="Refresh data"
                        className={styles.tabBtn}
                        style={{ padding: '6px 10px', height: '36px', display: 'flex', alignItems: 'center' }}
                    >
                        <RefreshCw size={16} />
                    </button>
                    <select
                        value={appType}
                        onChange={(e) => setAppType(e.target.value as 'individual' | 'institution')}
                        className={styles.typeSelect}
                    >
                        <option value="individual">Individuals ({counts.individual} Pending)</option>
                        <option value="institution">Institutions ({counts.institution} Pending)</option>
                    </select>
                </div>
            </div>

            <div className={styles.listCard}>
                {loading ? (
                    <div className={styles.loading}>Loading applications...</div>
                ) : applications.length === 0 ? (
                    <div className={styles.emptyState}>
                        No applications found in this category.
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>ID</th>
                                    {appType === 'individual' && <th>Category</th>}
                                    <th>Submitted On</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map(app => {
                                    const isIndividual = appType === 'individual';
                                    const displayName = isIndividual ? (app as ParticipantsApplicationResponse).full_name : (app as InstitutionsResponse).name;
                                    const rawCat = isIndividual ? (app as ParticipantsApplicationResponse).category : null;
                                    const displayCategory = rawCat ? rawCat.replace('_', ' ') : 'N/A';
                                    const genId = isIndividual ? (app as ParticipantsApplicationResponse).participant_id : (app as InstitutionsResponse).institution_id;

                                    const isChecking = lockedIds.has(app.id);

                                    return (
                                        <tr
                                            key={app.id}
                                            onClick={(e) => handleRowAction(app, e)}
                                            className={styles.tableRow}
                                            style={isChecking && activeTab === 'pending' ? { backgroundColor: '#fef2f2', opacity: 0.8 } : {}}
                                        >
                                            <td className={styles.boldCell}>{displayName}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                                {app.status === 'approved' && genId ? genId : app.id}
                                            </td>
                                            {isIndividual && <td>{displayCategory}</td>}
                                            <td>{new Date(app.created).toLocaleDateString()}</td>
                                            <td>
                                                {isChecking && activeTab === 'pending' ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontSize: '11px', fontWeight: 700, padding: '4px 8px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
                                                        <Lock size={12} /> IN REVIEW
                                                    </span>
                                                ) : (
                                                    <span className={`${styles.statusBadge} ${styles[app.status]}`}>
                                                        {app.status.toUpperCase()}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className={styles.reviewBtn}
                                                        disabled={isChecking && activeTab === 'pending'}
                                                        style={isChecking && activeTab === 'pending' ? { backgroundColor: '#f3f4f6', color: '#9ca3af', borderColor: '#e5e7eb', cursor: 'not-allowed' } : {}}
                                                        onClick={(e) => handleRowAction(app, e)}
                                                    >
                                                        {activeTab === 'pending' ? (isChecking ? 'Locked' : 'Review') : 'View'}
                                                    </button>
                                                    {activeTab === 'history' && (
                                                        <button
                                                            className={styles.reviewBtn}
                                                            style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/track?type=${appType}&query=${genId || app.id}`);
                                                            }}
                                                        >
                                                            Track
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}