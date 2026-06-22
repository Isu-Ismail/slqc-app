import { X, CheckCircle, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface SanityCheckerModalProps {
    isOpen: boolean;
    onClose: () => void;
    venues: any[];
    candidates: any[];
    loading: boolean;
    onRefresh: () => void;
}

export default function SanityCheckerModal({
    isOpen,
    onClose,
    venues,
    candidates,
    loading,
    onRefresh
}: SanityCheckerModalProps) {
    if (!isOpen) return null;

    // Helper to normalize strings for comparison
    const norm = (s: string) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");

    // Generate stats for each venue
    const generateVenueStats = () => {
        return venues.map(venue => {
            const isFinal = venue.round === 'final';
            const venueCandidates = candidates.filter(c => isFinal ? c.final_venue === venue.name : c.allocated_venue === venue.name)
                .sort((a, b) => {
                    const orderA = isFinal ? (a.final_order || 0) : (a.allocated_order || 0);
                    const orderB = isFinal ? (b.final_order || 0) : (b.allocated_order || 0);
                    return orderA - orderB;
                });

            // Parse judges
            let venueJudges: any[] = [];
            if (venue.judges) {
                if (Array.isArray(venue.judges)) {
                    venueJudges = venue.judges;
                } else if (typeof venue.judges === 'string') {
                    try {
                        venueJudges = JSON.parse(venue.judges);
                    } catch (_) {}
                }
            }

            // 1. Check Judge-Student Conflicts
            const judgeConflicts: any[] = [];
            if (venue.round !== 'final') {
                venueJudges.forEach(j => {
                    if (!j.institution) return;
                    const jInstNorm = norm(j.institution);

                    venueCandidates.forEach(c => {
                        const instId = c.institution_ref || '';
                        const instName = c.expand?.institution_ref?.name || '';
                        const sIdNorm = norm(instId);
                        const sNameNorm = norm(instName);

                        if (jInstNorm && (jInstNorm === sIdNorm || jInstNorm === sNameNorm || sNameNorm.indexOf(jInstNorm) !== -1 || jInstNorm.indexOf(sNameNorm) !== -1)) {
                            judgeConflicts.push({
                                candidateName: c.full_name,
                                registerId: c.participant_id || c.id,
                                candidateInst: instName || 'N/A',
                                judgeName: j.name,
                                judgeInst: j.institution
                            });
                        }
                    });
                });
            }

            // 2. Check Consecutive Institution Placements
            let maxConsecutive = 0;
            let currentConsecutive = 1;
            let lastInstId = '';
            let lastInstName = '';
            const consecutiveViolations: any[] = [];

            venueCandidates.forEach((c, idx) => {
                const instId = c.institution_ref || '';
                const instName = c.expand?.institution_ref?.name || '';
                
                // Skip if candidate has no institution (independent)
                if (!instId && !instName) {
                    lastInstId = '';
                    lastInstName = '';
                    currentConsecutive = 1;
                    return;
                }

                const currentInstName = instName || instId;

                if (idx > 0 && (instId === lastInstId || instName === lastInstName)) {
                    currentConsecutive++;
                    if (currentConsecutive > maxConsecutive) {
                        maxConsecutive = currentConsecutive;
                    }
                    if (currentConsecutive >= 2) {
                        consecutiveViolations.push({
                            index1: idx,
                            index2: idx + 1,
                            name1: venueCandidates[idx - 1].full_name,
                            name2: c.full_name,
                            institution: currentInstName,
                            runCount: currentConsecutive
                        });
                    }
                } else {
                    currentConsecutive = 1;
                }
                lastInstId = instId;
                lastInstName = instName;
            });

            if (maxConsecutive === 0 && venueCandidates.length > 0) {
                maxConsecutive = 1;
            }

            // 3. Institution counts/distribution
            const instDistribution: Record<string, number> = {};
            venueCandidates.forEach(c => {
                const instName = c.expand?.institution_ref?.name || 'Individual / Other';
                instDistribution[instName] = (instDistribution[instName] || 0) + 1;
            });

            const sortedDistribution = Object.entries(instDistribution)
                .sort((a, b) => b[1] - a[1]);

            return {
                name: venue.name,
                category: venue.category,
                capacity: venue.capacity,
                totalAllocated: venueCandidates.length,
                judges: venueJudges,
                judgeConflicts,
                maxConsecutive,
                consecutiveViolations,
                distribution: sortedDistribution
            };
        });
    };

    const stats = loading ? [] : generateVenueStats();
    const overallConflicts = stats.reduce((sum, s) => sum + s.judgeConflicts.length, 0);
    const overallConsecutiveWarnings = stats.reduce((sum, s) => sum + s.consecutiveViolations.filter(v => v.runCount >= 2).length, 0);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '85vh',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc'
                }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                            System Sanity &amp; Fairness Checker
                        </h2>
                        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                            Verifies judge-student conflicts and candidate randomness across all stages.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={loading}
                            style={{
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Re-scan
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px', color: '#64748b' }}>
                            <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite', color: '#0d9488' }} />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>Scanning allocations and checking constraints...</span>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div style={{
                                    backgroundColor: overallConflicts > 0 ? '#fef2f2' : '#f0fdf4',
                                    border: `1px solid ${overallConflicts > 0 ? '#fca5a5' : '#bbf7d0'}`,
                                    borderRadius: '10px',
                                    padding: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    {overallConflicts > 0 ? <AlertCircle size={28} style={{ color: '#ef4444' }} /> : <CheckCircle size={28} style={{ color: '#22c55e' }} />}
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>JUDGE CONFLICTS</div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: overallConflicts > 0 ? '#ef4444' : '#15803d' }}>
                                            {overallConflicts} Found
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    backgroundColor: overallConsecutiveWarnings > 0 ? '#fffbeb' : '#f0fdf4',
                                    border: `1px solid ${overallConsecutiveWarnings > 0 ? '#fde68a' : '#bbf7d0'}`,
                                    borderRadius: '10px',
                                    padding: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    {overallConsecutiveWarnings > 0 ? <AlertTriangle size={28} style={{ color: '#d97706' }} /> : <CheckCircle size={28} style={{ color: '#22c55e' }} />}
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>CONSECUTIVE RUNS</div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: overallConsecutiveWarnings > 0 ? '#b45309' : '#15803d' }}>
                                            {overallConsecutiveWarnings} Runs Flagged
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <CheckCircle size={28} style={{ color: '#0d9488' }} />
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TOTAL ALLOCATED</div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>
                                            {candidates.length} Students
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Venue Breakdown */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
                                    Stage / Venue Breakdown
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {stats.map(venue => {
                                        const hasWarnings = venue.judgeConflicts.length > 0 || venue.consecutiveViolations.length > 0;
                                        return (
                                            <div 
                                                key={venue.name} 
                                                style={{
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {/* Venue Summary Title Bar */}
                                                <div style={{
                                                    backgroundColor: hasWarnings ? '#fffbeb' : '#f8fafc',
                                                    borderBottom: '1px solid #cbd5e1',
                                                    padding: '12px 18px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{venue.name}</span>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            backgroundColor: '#e2e8f0',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            marginLeft: '8px',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {venue.category === '5_juz' ? '5 Juz' : venue.category === '15_juz' ? '15 Juz' : '30 Juz'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                                                        <span>Allocation: <strong>{venue.totalAllocated} / {venue.capacity}</strong></span>
                                                        <span>Max Consecutive Run: <strong style={{ color: venue.maxConsecutive > 1 ? '#d97706' : '#16a34a' }}>{venue.maxConsecutive}</strong></span>
                                                    </div>
                                                </div>

                                                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                    {/* Assigned Judges Row */}
                                                    <div style={{ fontSize: '13px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#64748b' }}>Stage Judges:</span>
                                                        {venue.judges.map((j: any) => (
                                                            <span key={j.id} style={{
                                                                backgroundColor: '#f1f5f9',
                                                                color: '#334155',
                                                                padding: '3px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: '500'
                                                            }}>
                                                                {j.name} <span style={{ opacity: 0.7, fontSize: '11px' }}>({j.institution || 'No Inst.'})</span>
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* Judge Conflict Section */}
                                                    {venue.judgeConflicts.length > 0 && (
                                                        <div style={{
                                                            backgroundColor: '#fef2f2',
                                                            border: '1px solid #fecaca',
                                                            borderRadius: '8px',
                                                            padding: '12px 16px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991b1b', fontWeight: 'bold', fontSize: '13.5px', marginBottom: '8px' }}>
                                                                <AlertCircle size={16} /> Judge &amp; Student Institution Conflict Detected!
                                                            </div>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: '1px solid #fee2e2', color: '#991b1b', fontWeight: 'bold' }}>
                                                                        <th style={{ padding: '4px' }}>Student Name</th>
                                                                        <th style={{ padding: '4px' }}>Reg ID</th>
                                                                        <th style={{ padding: '4px' }}>Judge Name</th>
                                                                        <th style={{ padding: '4px' }}>Shared Institution</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {venue.judgeConflicts.map((c, i) => (
                                                                        <tr key={i} style={{ borderBottom: '1px solid #fecaca', color: '#b91c1c' }}>
                                                                            <td style={{ padding: '6px 4px', fontWeight: 'bold' }}>{c.candidateName}</td>
                                                                            <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{c.registerId}</td>
                                                                            <td style={{ padding: '6px 4px' }}>{c.judgeName}</td>
                                                                            <td style={{ padding: '6px 4px', fontWeight: '600' }}>{c.candidateInst}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                    {/* Consecutive Violations */}
                                                    {venue.consecutiveViolations.length > 0 && (
                                                        <div style={{
                                                            backgroundColor: '#fffbeb',
                                                            border: '1px solid #fef3c7',
                                                            borderRadius: '8px',
                                                            padding: '12px 16px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontWeight: 'bold', fontSize: '13.5px', marginBottom: '8px' }}>
                                                                <AlertTriangle size={16} /> Consecutive Institution Placements Warning
                                                            </div>
                                                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12.5px', color: '#b45309', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {venue.consecutiveViolations.map((v, i) => (
                                                                    <li key={i}>
                                                                        <strong>{v.name1}</strong> and <strong>{v.name2}</strong> (both from <u>{v.institution}</u>) are placed consecutively in orders {v.index1} &amp; {v.index2}.
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Institution Distribution Chart/Breakdown */}
                                                    <div>
                                                        <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Institution Representation:</span>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {venue.distribution.map(([name, count]) => (
                                                                <span key={name} style={{
                                                                    fontSize: '11px',
                                                                    border: '1px solid #cbd5e1',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '20px',
                                                                    backgroundColor: '#f8fafc',
                                                                    color: '#475569'
                                                                }}>
                                                                    {name}: <strong>{count}</strong>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid #cbd5e1',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: '#f8fafc',
                    flexShrink: 0
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
