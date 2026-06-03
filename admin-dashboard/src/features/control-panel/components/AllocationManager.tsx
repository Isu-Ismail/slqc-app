// admin-dashboard/src/features/control-panel/components/AllocationManager.tsx

import { useState, useEffect } from 'react';
import { Users, UserCheck, AlertCircle, CheckCircle2, Wand2, Inbox } from 'lucide-react';
import { pb } from '../../../api/db';
import { adminTrackApi } from '../../../api/track';
import styles from '../ControlPanelPage.module.css';

export default function AllocationManager() {
    const [coordinators, setCoordinators] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // UPDATED: State to hold the full breakdown of unallocated applications
    const [unallocatedCounts, setUnallocatedCounts] = useState<{ total: number, individual: number, institution: number } | null>(null);

    // States for Manual Allocation
    const [selectedUser, setSelectedUser] = useState('');
    const [allocationCount, setAllocationCount] = useState<number | ''>('');
    const [allocationType, setAllocationType] = useState<'individual' | 'institution'>('individual');
    const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

    // States for Global Auto-Allocation
    const [globalAllocationType, setGlobalAllocationType] = useState<'individual' | 'institution'>('individual');
    const [globalResult, setGlobalResult] = useState<{ ok: boolean; msg: string } | null>(null);

    const fetchCoordinators = async () => {
        try {
            const records = await pb.collection('users').getFullList({
                sort: 'name',
            });

            setCoordinators(records);
            if (records.length > 0 && !selectedUser) {
                setSelectedUser(records[0].id);
            }

            // 1. Fetch pending counts for coordinators
            try {
                const pendingIndiv = await pb.collection('participants_application').getFullList({
                    filter: "status = 'pending'"
                });

                const pendingInst = await pb.collection('institutions').getFullList({
                    filter: "status = 'pending'"
                });

                const counts: Record<string, number> = {};
                for (const app of pendingIndiv) {
                    if (app.approved_by) {
                        counts[app.approved_by] = (counts[app.approved_by] || 0) + 1;
                    }
                }
                for (const app of pendingInst) {
                    if (app.approved_by) {
                        counts[app.approved_by] = (counts[app.approved_by] || 0) + 1;
                    }
                }

                const usersWithCounts = records.map(u => ({
                    ...u,
                    pendingCount: counts[u.id] || 0
                }));

                setCoordinators(usersWithCounts);
            } catch (statErr) {
                console.error("Failed to load pending stats", statErr);
            }

            // 2. Fetch the total AND breakdown unallocated count
            try {
                const countRes = await adminTrackApi.getUnallocatedCount();
                if (countRes && countRes.success) {
                    setUnallocatedCounts({
                        total: countRes.total,
                        individual: countRes.individual,
                        institution: countRes.institution
                    });
                }
            } catch (countErr) {
                console.error("Failed to fetch unallocated count", countErr);
            }

        } catch (err) {
            console.error('Failed to fetch coordinators', err);
        }
    };

    useEffect(() => {
        fetchCoordinators();
    }, []);

    // --- Specific Coordinator Allocation ---
    const handleAllocate = async () => {
        if (!selectedUser || !allocationCount || allocationCount <= 0) {
            setResult({ ok: false, msg: 'Please select a coordinator and enter a valid count.' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await adminTrackApi.allocateApplications(selectedUser, Number(allocationCount), allocationType);

            if (res.success) {
                setResult({
                    ok: true,
                    msg: res.allocated === 0
                        ? 'No pending applications found to allocate.'
                        : `Successfully allocated ${res.allocated} applications.`
                });
                setAllocationCount('');
                await fetchCoordinators(); // Refreshes stats and counts
            } else {
                setResult({ ok: false, msg: res.error || 'Allocation failed.' });
            }
        } catch (err: any) {
            setResult({ ok: false, msg: err?.message || 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleUnallocate = async () => {
        if (!selectedUser) {
            setResult({ ok: false, msg: 'Please select a coordinator.' });
            return;
        }

        const confirm = window.confirm('Are you sure you want to unallocate ALL pending applications assigned to this coordinator?');
        if (!confirm) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await adminTrackApi.unallocateApplications(selectedUser, allocationType);

            if (res.success) {
                setResult({
                    ok: true,
                    msg: res.unallocated === 0
                        ? 'No pending applications found to unallocate.'
                        : `Successfully unallocated ${res.unallocated} pending applications.`
                });
                await fetchCoordinators(); // Refreshes stats and counts
            } else {
                setResult({ ok: false, msg: res.error || 'Unallocation failed.' });
            }
        } catch (err: any) {
            setResult({ ok: false, msg: err?.message || 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    // --- Global Auto-Allocation ---
    const handleAutoAllocateAll = async () => {
        const confirm = window.confirm('Are you sure you want to evenly distribute ALL pending applications among all users?');
        if (!confirm) return;

        setLoading(true);
        setGlobalResult(null);

        try {
            const res = await adminTrackApi.autoAllocateAll(globalAllocationType);

            if (res.success) {
                setGlobalResult({
                    ok: true,
                    msg: res.allocated === 0
                        ? 'No pending applications available to auto-allocate.'
                        : res.message || `Successfully auto-allocated ${res.allocated} applications.`
                });
                await fetchCoordinators(); // Refreshes stats and counts
            } else {
                setGlobalResult({ ok: false, msg: res.error || 'Auto-allocation failed.' });
            }
        } catch (err: any) {
            setGlobalResult({ ok: false, msg: err?.message || 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* UPDATED: Unallocated Applications Banner with Breakdown */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        backgroundColor: '#e0f2fe',
                        padding: '10px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Inbox size={24} color="#0ea5e9" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>
                            Unallocated Applications Waiting in Queue
                        </span>
                        {unallocatedCounts && (
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                                {unallocatedCounts.individual} Individuals • {unallocatedCounts.institution} Institutions
                            </span>
                        )}
                    </div>
                </div>
                <div style={{
                    backgroundColor: '#0ea5e9',
                    color: '#ffffff',
                    padding: '8px 20px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '18px',
                    boxShadow: '0 2px 4px rgba(14, 165, 233, 0.2)'
                }}>
                    {unallocatedCounts ? unallocatedCounts.total : '...'}
                </div>
            </div>

            {/* PANEL 1: Specific Coordinator Allocation */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="#0f766e" />
                        Targeted Allocation
                    </h2>
                </div>

                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0', lineHeight: '1.55' }}>
                    Assign a specific number of unassigned pending applications to a single coordinator for review.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Coordinator</label>
                            <select
                                className={styles.formSelect}
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                            >
                                {coordinators.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name || c.email} ({c.designation}) — {c.pendingCount} pending
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Application Type</label>
                            <select
                                className={styles.formSelect}
                                value={allocationType}
                                onChange={(e) => setAllocationType(e.target.value as any)}
                            >
                                <option value="individual">Individual Candidates</option>
                                <option value="institution">Institutions / Madrasas</option>
                            </select>
                        </div>

                        <div style={{ width: '120px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Amount to Assign</label>
                            <input
                                type="number"
                                className={styles.formInput}
                                placeholder="e.g. 50"
                                value={allocationCount}
                                onChange={(e) => setAllocationCount(e.target.value ? Number(e.target.value) : '')}
                                min={1}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button
                            onClick={handleAllocate}
                            disabled={loading}
                            className={styles.btnPrimary}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            <UserCheck size={16} />
                            <span className={styles.btnText}>{loading ? 'Allocating...' : 'Allocate to User'}</span>
                        </button>

                        <button
                            onClick={handleUnallocate}
                            disabled={loading}
                            className={styles.btnSecondary}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#b91c1c', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
                        >
                            <Users size={16} /> <span className={styles.btnText}>Unallocate Pending</span>
                        </button>

                        {result && (
                            result.ok ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '13px', fontWeight: 500 }}>
                                    <CheckCircle2 size={16} /> {result.msg}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '13px' }}>
                                    <AlertCircle size={16} /> {result.msg}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* PANEL 2: Global Auto-Allocation */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wand2 size={18} color="#0f766e" />
                        Global Auto-Allocation
                    </h2>
                </div>

                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0', lineHeight: '1.55' }}>
                    Automatically and evenly distribute <strong>all</strong> unassigned pending applications across all available users. Coordinators are prioritized over Admins for any remainders.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, maxWidth: '300px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Application Type</label>
                            <select
                                className={styles.formSelect}
                                value={globalAllocationType}
                                onChange={(e) => setGlobalAllocationType(e.target.value as any)}
                            >
                                <option value="individual">Individual Candidates</option>
                                <option value="institution">Institutions / Madrasas</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button
                            onClick={handleAutoAllocateAll}
                            disabled={loading}
                            className={styles.btnPrimary}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Wand2 size={16} />
                            <span className={styles.btnText}>{loading ? 'Processing...' : 'Distribute Evenly'}</span>
                        </button>

                        {globalResult && (
                            globalResult.ok ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '13px', fontWeight: 500 }}>
                                    <CheckCircle2 size={16} /> {globalResult.msg}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '13px' }}>
                                    <AlertCircle size={16} /> {globalResult.msg}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}