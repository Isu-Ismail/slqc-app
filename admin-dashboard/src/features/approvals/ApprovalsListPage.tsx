// admin-dashboard/src/features/approvals/ApprovalsListPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { pb } from '../../api/db';
import { RefreshCw, Lock, Mail, CheckCircle } from 'lucide-react';
import { approvalsApi } from '../../api/approvals';
import type { AllocatedItem } from '../../api/approvals';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../api/track';
import styles from './Approvals.module.css';

export default function ApprovalsListPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);

    const hasParams = params.has('type') || params.has('tab');

    // On first render with no params (e.g. sidebar click), redirect to the last saved selection
    const savedType = (sessionStorage.getItem('approvals_type') as 'individual' | 'institution') || 'individual';
    const savedTab  = (sessionStorage.getItem('approvals_tab')  as 'pending' | 'history')        || 'pending';

    const queryType = (params.get('type') as 'individual' | 'institution') || savedType;
    const queryTab  = (params.get('tab')  as 'pending' | 'history')        || savedTab;

    const activeTab = queryTab;
    const appType   = queryType;

    // Redirect bare /approvals to /approvals?type=...&tab=... so URL always has params
    useEffect(() => {
        if (!hasParams) {
            navigate(`/approvals?type=${savedType}&tab=${savedTab}`, { replace: true });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist selection to sessionStorage whenever URL params change
    useEffect(() => {
        if (hasParams) {
            sessionStorage.setItem('approvals_type', queryType);
            sessionStorage.setItem('approvals_tab',  queryTab);
        }
    }, [queryType, queryTab, hasParams]);

    const user = pb.authStore.model;

    const initialAppsCache = user ? approvalsApi.getCachedAllocatedApplications(user.id, activeTab === 'pending', appType) : null;
    const initialCountsCache = user ? approvalsApi.getCachedPendingCounts(user.id) : null;

    const [applications, setApplications] = useState<AllocatedItem[]>(initialAppsCache || []);
    const [counts, setCounts] = useState(initialCountsCache || { individual: 0, institution: 0 });
    const [loading, setLoading] = useState(!initialAppsCache);
    const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
    const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
    const [sendingMailId, setSendingMailId] = useState<string | null>(null);
    const [sentMailIds, setSentMailIds] = useState<Set<string>>(new Set());

    /** Update both type and tab in the URL, preserving the other param */
    const setActiveTab = (tab: 'pending' | 'history') =>
        navigate(`/approvals?type=${appType}&tab=${tab}`, { replace: true });

    const setAppType = (type: 'individual' | 'institution') =>
        navigate(`/approvals?type=${type}&tab=${activeTab}`, { replace: true });

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
                setLockedIds(new Set(locks.map(lock => lock.application_id)));
            } catch (err) {
                console.error(err);
            }
        };

        const setupRealtime = async () => {
            try {
                const handleRealtimeEvent = async (type: 'individual' | 'institution', e: any) => {
                    const record = e.record as AllocatedItem;

                    if (e.action === 'create') {
                        if (record.status === 'pending' && activeTab === 'pending' && appType === type) {
                            setApplications(prev => {
                                if (prev.some(x => x.id === record.id)) return prev;
                                return [record, ...prev];
                            });
                        }
                        const countsData = await approvalsApi.getPendingCounts(user!.id, true);
                        setCounts(countsData);
                    } else if (e.action === 'update') {
                        const isPendingNow = record.status === 'pending';

                        if (activeTab === 'pending') {
                            if (appType === type) {
                                if (isPendingNow) {
                                    setApplications(prev => {
                                        if (prev.some(x => x.id === record.id)) {
                                            return prev.map(x => x.id === record.id ? record : x);
                                        }
                                        return [record, ...prev];
                                    });
                                } else {
                                    setFadingOutIds(prev => {
                                        const next = new Set(prev);
                                        next.add(record.id);
                                        return next;
                                    });
                                    setTimeout(() => {
                                        setApplications(prev => prev.filter(x => x.id !== record.id));
                                        setFadingOutIds(prev => {
                                            const next = new Set(prev);
                                            next.delete(record.id);
                                            return next;
                                        });
                                    }, 300);
                                }
                            }
                        } else if (activeTab === 'history') {
                            if (appType === type) {
                                const isMyHistory = record.approved_by === user?.id && record.status !== 'pending';
                                if (isMyHistory) {
                                    setApplications(prev => {
                                        if (prev.some(x => x.id === record.id)) {
                                            return prev.map(x => x.id === record.id ? record : x);
                                        }
                                        return [record, ...prev];
                                    });
                                } else {
                                    setFadingOutIds(prev => {
                                        const next = new Set(prev);
                                        next.add(record.id);
                                        return next;
                                    });
                                    setTimeout(() => {
                                        setApplications(prev => prev.filter(x => x.id !== record.id));
                                        setFadingOutIds(prev => {
                                            const next = new Set(prev);
                                            next.delete(record.id);
                                            return next;
                                        });
                                    }, 300);
                                }
                            }
                        }

                        const countsData = await approvalsApi.getPendingCounts(user!.id, true);
                        setCounts(countsData);
                    } else if (e.action === 'delete') {
                        setFadingOutIds(prev => {
                            const next = new Set(prev);
                            next.add(record.id);
                            return next;
                        });
                        setTimeout(() => {
                            setApplications(prev => prev.filter(x => x.id !== record.id));
                            setFadingOutIds(prev => {
                                const next = new Set(prev);
                                next.delete(record.id);
                                return next;
                            });
                        }, 300);

                        const countsData = await approvalsApi.getPendingCounts(user!.id, true);
                        setCounts(countsData);
                    }
                };

                await pb.collection('participants_application').subscribe('*', (e) => {
                    handleRealtimeEvent('individual', e);
                });

                await pb.collection('institutions').subscribe('*', (e) => {
                    handleRealtimeEvent('institution', e);
                });

                await pb.collection('approval_locks').subscribe('*', (e) => {
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
            pb.collection('participants_application').unsubscribe('*').catch(() => {});
            pb.collection('institutions').unsubscribe('*').catch(() => {});
            pb.collection('approval_locks').unsubscribe('*').catch(() => {});
        };
    }, [appType, activeTab]);
    const handleRowSendMail = async (app: AllocatedItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (sendingMailId) return;
        const isApproved = app.status === 'approved';
        setSendingMailId(app.id);
        try {
            if (appType === 'institution') {
                const inst = app as InstitutionsResponse;
                if (!inst.email) { alert('No email on record for this institution.'); return; }
                if (isApproved) {
                    if (!inst.institution_id) { alert('No Institution ID yet — cannot send approval mail.'); return; }
                    await approvalsApi.sendInstitutionConfirmationMail(
                        app.id, inst.email, inst.name, inst.institution_id, inst.passcode || ''
                    );
                } else {
                    await approvalsApi.sendInstitutionRejectionMail(
                        app.id, inst.email, inst.name,
                        app.rejection_reason || 'Your application did not meet the eligibility criteria.'
                    );
                }
            } else {
                const indiv = app as ParticipantsApplicationResponse;
                if (!indiv.email) { alert('No email on record for this applicant.'); return; }
                if (isApproved) {
                    if (!indiv.participant_id) { alert('No Participant ID yet — cannot send approval mail.'); return; }
                    await approvalsApi.sendIndividualConfirmationMail(
                        app.id, indiv.email, indiv.full_name, indiv.participant_id, indiv.category
                    );
                } else {
                    await approvalsApi.sendIndividualRejectionMail(
                        app.id, indiv.email, indiv.full_name, indiv.category,
                        app.rejection_reason || 'Your application did not meet the eligibility criteria.'
                    );
                }
            }
            setSentMailIds(prev => { const n = new Set(prev); n.add(app.id); return n; });
            setTimeout(() => setSentMailIds(prev => { const n = new Set(prev); n.delete(app.id); return n; }), 4000);
        } catch (err) {
            console.error(err);
            alert('Failed to enqueue email. Please try again.');
        } finally {
            setSendingMailId(null);
        }
    };

    const handleRowAction = async (
        app: AllocatedItem,
        e: React.MouseEvent
    ) => {
        e.stopPropagation();

        if (activeTab === 'history') {
            navigate(`/approvals/${app.id}?type=${appType}&tab=${activeTab}`);
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
                `/approvals/${app.id}?type=${appType}&tab=${activeTab}`
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
                                    const isFading = fadingOutIds.has(app.id);

                                    return (
                                        <tr
                                            key={app.id}
                                            onClick={(e) => handleRowAction(app, e)}
                                            className={`${styles.tableRow} ${isFading ? styles.tableRowFadeOut : ''}`}
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
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                                                    {activeTab === 'history' && (() => {
                                                        const appEmail = appType === 'institution'
                                                            ? (app as InstitutionsResponse).email
                                                            : (app as ParticipantsApplicationResponse).email;
                                                        const isApproved = app.status === 'approved';
                                                        const isSent = sentMailIds.has(app.id);
                                                        const isSending = sendingMailId === app.id;
                                                        if (!appEmail) return null;
                                                        return (
                                                            <button
                                                                onClick={(e) => handleRowSendMail(app, e)}
                                                                disabled={!!sendingMailId}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '5px 10px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 600,
                                                                    borderRadius: '6px',
                                                                    border: isSent
                                                                        ? '1.5px solid #16a34a'
                                                                        : isApproved
                                                                            ? '1.5px solid #0891b2'
                                                                            : '1.5px solid #d97706',
                                                                    backgroundColor: isSent
                                                                        ? '#f0fdf4'
                                                                        : isApproved
                                                                            ? '#e0f2fe'
                                                                            : '#fef3c7',
                                                                    color: isSent
                                                                        ? '#16a34a'
                                                                        : isApproved
                                                                            ? '#0c4a6e'
                                                                            : '#92400e',
                                                                    cursor: sendingMailId ? 'wait' : 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                                title={`Send ${isApproved ? 'approval' : 'rejection'} email to ${appEmail}`}
                                                            >
                                                                {isSent ? (
                                                                    <><CheckCircle size={13} /> Queued ✓</>
                                                                ) : isSending ? (
                                                                    <><Mail size={13} /> Sending...</>
                                                                ) : (
                                                                    <><Mail size={13} /> {isApproved ? 'Approval' : 'Rejection'} Mail</>
                                                                )}
                                                            </button>
                                                        );
                                                    })()}
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