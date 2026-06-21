// admin-dashboard/src/features/finalists/FinalistsPage.tsx
import { useState, useEffect } from 'react';
import { pb } from '../../api/db';
import { Award, Users, ShieldAlert, CheckCircle, Lock, Shield, Images, AlertTriangle, Star } from 'lucide-react';
import MarksheetViewer from '../mark-entry/MarksheetViewer';
import styles from './FinalistsPage.module.css';

interface LeaderboardItem {
    participant_id: string;
    register_id: string;
    full_name: string;
    category: string;
    grand_total: number;
    grand_average: number;
    is_frozen: boolean;
    is_finalist: boolean;
    has_marks?: boolean;
}

export default function FinalistsPage() {
    const user = pb.authStore.model;
    const isAdmin = user?.designation === 'admin';

    const [activeTab, setActiveTab] = useState<'to_final' | 'winners'>('to_final');
    const [selectedCategory, setSelectedCategory] = useState<'5_juz' | '15_juz' | '30_juz'>('5_juz');

    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Winners view states
    const [winnersData, setWinnersData] = useState<{
        items: LeaderboardItem[];
        winners_declared: boolean;
        winners: {
            firstPlace: LeaderboardItem;
            secondPlace: LeaderboardItem;
        } | null;
    } | null>(null);

    // Modal password promotion states
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [passwordInput, setPasswordInput] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [submittingPromotion, setSubmittingPromotion] = useState<boolean>(false);
    const [modalAction, setModalAction] = useState<'promote' | 'revert'>('promote');

    // Tie-breaker states
    const [selectedTiedIds, setSelectedTiedIds] = useState<string[]>([]);
    const [templateCriteria, setTemplateCriteria] = useState<any[]>([]);
    const [tiedMarks, setTiedMarks] = useState<Record<string, any>>({});
    const [activeMarksheetParticipant, setActiveMarksheetParticipant] = useState<{ id: string; name: string } | null>(null);
    const [loadingTieDetails, setLoadingTieDetails] = useState<boolean>(false);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'to_final') {
                const res = await pb.send<{ items: LeaderboardItem[] }>('/api/admin/finalist/preliminary-leaderboard', {
                    method: 'GET',
                    query: { category: selectedCategory }
                });
                setLeaderboard(res.items || []);
            } else {
                const res = await pb.send<any>('/api/admin/finalist/final-leaderboard', {
                    method: 'GET',
                    query: { category: selectedCategory }
                });
                setWinnersData(res);
            }
        } catch (err) {
            console.error('Failed to load finalist selection data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab, selectedCategory]);

    // Determine if a tie exists at the 10th spot boundary
    const hasTie = leaderboard.length > 10 &&
        leaderboard[9].grand_average === leaderboard[10].grand_average &&
        leaderboard[9].grand_total === leaderboard[10].grand_total;

    // Get the tied score details
    const tiedAvg = hasTie ? leaderboard[9].grand_average : 0;
    const tiedTotal = hasTie ? leaderboard[9].grand_total : 0;

    // Find all participants with this exact tied score
    const tiedCandidates = hasTie
        ? leaderboard.filter(item => item.grand_average === tiedAvg && item.grand_total === tiedTotal)
        : [];

    // Find where the tied group begins in the sorted leaderboard
    const firstTiedIndex = hasTie
        ? leaderboard.findIndex(item => item.grand_average === tiedAvg && item.grand_total === tiedTotal)
        : -1;

    // How many slots are available for the tied candidates (e.g. if 8 candidates are strictly higher, we need to pick 2 from the tied group)
    const slotsAvailable = hasTie ? 10 - firstTiedIndex : 0;

    // The candidates who are strictly above the tie and are auto-selected
    const autoSelectedCandidates = hasTie
        ? leaderboard.slice(0, firstTiedIndex)
        : leaderboard.slice(0, 10);

    // Sync selectedTiedIds when leaderboard or category changes
    useEffect(() => {
        if (hasTie && tiedCandidates.length > 0) {
            const initialSelection = tiedCandidates.slice(0, slotsAvailable).map(c => c.participant_id);
            setSelectedTiedIds(initialSelection);
        } else {
            setSelectedTiedIds([]);
        }
    }, [leaderboard, selectedCategory]);

    const getFinalPromotedIds = () => {
        if (hasTie) {
            const autoIds = autoSelectedCandidates.map(c => c.participant_id);
            return [...autoIds, ...selectedTiedIds];
        } else {
            return leaderboard.slice(0, 10).map(c => c.participant_id);
        }
    };

    const isSelectionValid = !hasTie || selectedTiedIds.length === slotsAvailable;

    const formatCriterionScore = (participantId: string, criterion: any) => {
        const studentVals = tiedMarks[participantId];
        if (!studentVals || !studentVals.judges) return '—';

        let total = 0;
        let numJudges = 0;
        Object.values(studentVals.judges).forEach((judgeObj: any) => {
            if (judgeObj && judgeObj[criterion.key]) {
                numJudges++;
                Object.values(judgeObj[criterion.key]).forEach((val: any) => {
                    total += parseFloat(val) || 0;
                });
            }
        });

        if (numJudges === 0) return '—';
        const maxScore = numJudges * criterion.numQuestions * (criterion.outOf || 0);
        return `${total} / ${maxScore} (${numJudges} judges)`;
    };

    const handlePromoteClick = async () => {
        setModalAction('promote');
        // Validation: Ensure we have participants
        if (leaderboard.length === 0) {
            alert("No participants found in this category.");
            return;
        }

        // Check if any participant does not have frozen marks
        const unfrozen = leaderboard.filter(item => !item.is_frozen);
        if (unfrozen.length > 0) {
            alert(`Cannot promote finalists: ${unfrozen.length} present participants do not have frozen preliminary marks.`);
            return;
        }

        setPasswordInput('');
        setPasswordError('');

        if (hasTie) {
            setLoadingTieDetails(true);
            try {
                // 1. Fetch template
                const tpl = await pb.send<any>('/api/admin/marks/get-template', {
                    method: 'GET',
                    query: { round: 'preliminary', category: selectedCategory }
                });
                const criteriaList = tpl?.columns?.criteria || [];
                // Sort template criteria so that Tajweed is FIRST
                const tajweedCriteria = criteriaList.filter((c: any) => c.label?.toLowerCase().includes('tajweed') || c.key?.toLowerCase().includes('tajweed'));
                const otherCriteria = criteriaList.filter((c: any) => !c.label?.toLowerCase().includes('tajweed') && !c.key?.toLowerCase().includes('tajweed'));
                setTemplateCriteria([...tajweedCriteria, ...otherCriteria]);

                // 2. Fetch marks for tied candidates
                const filterStr = tiedCandidates.map(c => `participant_ref = "${c.participant_id}"`).join(' || ');
                const marksRecords = await pb.collection('preliminary_marks').getFullList({
                    filter: filterStr
                });
                const marksMap: Record<string, any> = {};
                marksRecords.forEach(rec => {
                    try {
                        const rawValues = rec.values || (typeof rec.get === 'function' ? rec.get('values') : undefined);
                        const participantRef = rec.participant_ref || (typeof rec.get === 'function' ? rec.get('participant_ref') : undefined);
                        const val = typeof rawValues === 'string' ? JSON.parse(rawValues) : rawValues;
                        if (val && participantRef) {
                            marksMap[participantRef] = val;
                        }
                    } catch (err) {
                        console.error('Error parsing values:', err);
                    }
                });
                setTiedMarks(marksMap);
            } catch (err) {
                console.error('Failed to load tie details:', err);
            } finally {
                setLoadingTieDetails(false);
            }
        }

        setShowConfirmModal(true);
    };

    const handleRevertClick = () => {
        setModalAction('revert');
        setPasswordInput('');
        setPasswordError('');
        setShowConfirmModal(true);
    };

    const handlePromoteConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput.trim()) {
            setPasswordError('Password is required.');
            return;
        }

        if (modalAction === 'promote' && !isSelectionValid) {
            setPasswordError(`Please resolve the tie by selecting exactly ${slotsAvailable} candidates.`);
            return;
        }

        setSubmittingPromotion(true);
        setPasswordError('');

        try {
            // Verify password using authWithPassword on current user
            const currentEmail = user?.email || user?.username || '';
            await pb.collection('users').authWithPassword(currentEmail, passwordInput);

            if (modalAction === 'promote') {
                // Trigger promotion
                await pb.send('/api/admin/finalist/promote-to-final', {
                    method: 'POST',
                    body: {
                        category: selectedCategory,
                        promoted_ids: getFinalPromotedIds()
                    }
                });
                alert('Top 10 finalists successfully updated and promoted!');
            } else {
                // Trigger reversion
                await pb.send('/api/admin/finalist/revert-promotion', {
                    method: 'POST',
                    body: {
                        category: selectedCategory
                    }
                });
                alert('Finalist promotion successfully reverted!');
            }

            setShowConfirmModal(false);
            loadData();
        } catch (err: any) {
            console.error('Action failed:', err);
            setPasswordError(err.message || 'Incorrect password. Please try again.');
        } finally {
            setSubmittingPromotion(false);
        }
    };

    // Final selected finalists list based on tie-breaker or auto top 10
    const finalSelectedList = leaderboard.filter(item => getFinalPromotedIds().includes(item.participant_id));

    // Sort leaderboard to ensure promoted finalists are placed at the top (rank 1-10)
    const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        if (a.is_finalist && !b.is_finalist) return -1;
        if (!a.is_finalist && b.is_finalist) return 1;
        if (b.grand_average !== a.grand_average) {
            return b.grand_average - a.grand_average;
        }
        if (b.grand_total !== a.grand_total) {
            return b.grand_total - a.grand_total;
        }
        return a.register_id.localeCompare(b.register_id);
    });

    return (
        <div className={styles.container}>
            {/* Header Card */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Finalist Selection & Podium Calculator</h1>

                </div>

                <div className={styles.headerControls}>
                    <div className={styles.tabsWrapper}>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'to_final' ? styles.tabBtnActive : ''}`}
                            onClick={() => setActiveTab('to_final')}
                        >
                            <Users size={16} /> To Final (Leaderboard)
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'winners' ? styles.tabBtnActive : ''}`}
                            onClick={() => setActiveTab('winners')}
                        >
                            <Award size={16} /> Winners Calculator
                        </button>
                    </div>

                    <div className={styles.categorySelectWrapper}>
                        <label className={styles.selectLabel}>Category:</label>
                        <select
                            className={styles.categorySelect}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as any)}
                        >
                            <option value="5_juz">5 Juz</option>
                            <option value="15_juz">15 Juz</option>
                            <option value="30_juz">30 Juz</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Segment */}
            <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease-in-out', pointerEvents: loading ? 'none' : 'auto' }}>
                {activeTab === 'to_final' ? (
                    /* TO FINAL VIEW */
                    <div className={styles.viewContainer}>
                        {hasTie && !leaderboard.some(x => x.is_finalist) && (
                            <div className={styles.tieWarningBanner}>
                                <div>
                                    <strong>Tie Detected at 10th Spot:</strong> {tiedCandidates.length} candidates are tied with average score {tiedAvg} and total score {tiedTotal}. There are only {slotsAvailable} finalist spot(s) remaining for them.
                                </div>
                                {isAdmin && (
                                    <button className={styles.btnResolveTie} onClick={handlePromoteClick}>
                                        Resolve & Promote
                                    </button>
                                )}
                            </div>
                        )}

                        <div className={styles.infoBanner}>
                            <ShieldAlert size={20} className={styles.bannerIcon} />
                            <div>
                                <strong>Preliminary Leaderboard Rules:</strong> The participants listed below are present candidates who have completed the preliminary round.
                                The top 10 candidates of this category will be promoted to the Final Round once finalized.
                            </div>
                        </div>

                        <div className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h3 className={styles.tableTitle}>Leaderboard: {selectedCategory.replace('_', ' ')}</h3>
                                {isAdmin && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {leaderboard.some(item => item.is_finalist) && (
                                            <button
                                                onClick={handleRevertClick}
                                                className={styles.btnRevert} /* uses style from module.css */
                                            >
                                                <AlertTriangle size={14} /> Revert Promotion
                                            </button>
                                        )}
                                        <button
                                            onClick={handlePromoteClick}
                                            className={styles.btnPromote}
                                            disabled={leaderboard.length === 0 || leaderboard.some(item => item.is_finalist)}
                                        >
                                            <Lock size={14} /> Upload Finalist List
                                        </button>
                                    </div>
                                )}
                            </div>

                            {leaderboard.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>No present participants are allocated or graded in this category yet.</p>
                                </div>
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                                                <th>Participant Name</th>
                                                <th>Reg ID</th>
                                                <th style={{ textAlign: 'center' }}>Total Score</th>
                                                <th style={{ textAlign: 'center' }}>Average Score</th>
                                                <th style={{ textAlign: 'center' }}>Grading Status</th>
                                                <th style={{ textAlign: 'center' }}>Finalist Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedLeaderboard.map((item, index) => {
                                                const hasPromoted = sortedLeaderboard.some(x => x.is_finalist);
                                                const shouldHighlight = hasPromoted ? item.is_finalist : (index < 10);
                                                return (
                                                    <tr
                                                        key={item.participant_id}
                                                        className={shouldHighlight ? styles.topRankRow : undefined}
                                                    >
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                            {index + 1}
                                                        </td>
                                                        <td style={{ fontWeight: '700' }}>
                                                            {item.full_name}
                                                        </td>
                                                        <td>{item.register_id}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: '800', color: '#0f766e' }}>
                                                            {item.grand_total}
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: '800', color: '#0d9488' }}>
                                                            {item.grand_average}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={item.is_frozen ? styles.badgeFrozen : styles.badgePending}>
                                                                {item.is_frozen ? 'Locked' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {item.is_finalist ? (
                                                                <span className={styles.badgeFinalist}>Finalist</span>
                                                            ) : (!hasPromoted && index < 10) ? (
                                                                <span className={styles.badgeEligible}>Top 10 (Eligible)</span>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8' }}>—</span>
                                                            )}
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
                ) : (
                    /* WINNERS CALCULATOR VIEW */
                    <div className={styles.viewContainer}>
                        {winnersData && winnersData.winners_declared ? (
                            /* WINNERS FOUND */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Winners Podiums */}
                                <div className={styles.winnersGrid}>
                                    <div className={`${styles.winnerCard} ${styles.firstPlaceCard}`}>
                                        <div className={styles.winnerPodiumRank}>🏆 1st Place Winner</div>
                                        <h2 className={styles.winnerName}>{winnersData.winners?.firstPlace.full_name}</h2>
                                        <div className={styles.winnerMeta}>
                                            <span><strong>Reg ID:</strong> {winnersData.winners?.firstPlace.register_id}</span>
                                            <span><strong>Score:</strong> {winnersData.winners?.firstPlace.grand_average} Points</span>
                                        </div>
                                    </div>

                                    <div className={`${styles.winnerCard} ${styles.secondPlaceCard}`}>
                                        <div className={styles.winnerPodiumRank}>🥈 2nd Place Winner</div>
                                        <h2 className={styles.winnerName}>{winnersData.winners?.secondPlace.full_name}</h2>
                                        <div className={styles.winnerMeta}>
                                            <span><strong>Reg ID:</strong> {winnersData.winners?.secondPlace.register_id}</span>
                                            <span><strong>Score:</strong> {winnersData.winners?.secondPlace.grand_average} Points</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Full finalist score listings */}
                                <div className={styles.tableCard}>
                                    <div className={styles.tableHeader}>
                                        <h3 className={styles.tableTitle}>Final Round Rankings: {selectedCategory.replace('_', ' ')}</h3>
                                    </div>
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                                                    <th>Finalist Name</th>
                                                    <th>Reg ID</th>
                                                    <th style={{ textAlign: 'center' }}>Grand Total</th>
                                                    <th style={{ textAlign: 'center' }}>Grand Average</th>
                                                    <th style={{ textAlign: 'center' }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {winnersData.items.map((item, index) => (
                                                    <tr key={item.participant_id} className={index < 2 ? styles.topRankRow : undefined}>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                                                        <td style={{ fontWeight: '700' }}>{item.full_name}</td>
                                                        <td>{item.register_id}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: '800' }}>{item.grand_total}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: '800', color: '#0d9488' }}>{item.grand_average}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={item.is_frozen ? styles.badgeFrozen : styles.badgePending}>
                                                                {item.is_frozen ? 'Locked' : 'Open'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* WINNERS CALCULATION IN PROGRESS */
                            <div className={styles.warningContainer}>
                                <ShieldAlert size={48} className={styles.warningIcon} />
                                <h3 className={styles.warningHeading}>Final Round Results Pending</h3>
                                <p className={styles.warningText}>
                                    Final round scores are still being entered or locked. Once the scores for all 10 finalists in the <strong>{selectedCategory.replace('_', ' ')}</strong> category are submitted and frozen, the 1st and 2nd place winners will be computed here automatically.
                                </p>

                                {/* Finalists Status Check List */}
                                {winnersData && winnersData.items && winnersData.items.length > 0 && (
                                    <div className={styles.statusCheckList}>
                                        <h4 className={styles.statusCheckHeader}>Finalists Status Check ({winnersData.items.filter(i => i.is_frozen).length} / {winnersData.items.length} Completed):</h4>
                                        <div className={styles.finalistStatusGrid}>
                                            {winnersData.items.map(item => (
                                                <div key={item.participant_id} className={styles.statusCheckCard}>
                                                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{item.full_name}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>Reg ID: {item.register_id}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', fontWeight: 'bold', color: item.is_frozen ? '#059669' : '#d97706' }}>
                                                        {item.is_frozen ? (
                                                            <>
                                                                <CheckCircle size={12} /> Graded & Locked ({item.grand_average} Pts)
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shield size={12} /> Grading Pending
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Password verification & Double-Check finalist modal popup */}
            {showConfirmModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>{modalAction === 'revert' ? 'Revert Finalist Promotion' : 'Double Check Finalist List'}</h2>
                            <button className={styles.closeBtn} onClick={() => setShowConfirmModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handlePromoteConfirm}>
                            <div className={styles.modalBody}>
                                {modalAction === 'revert' ? (
                                    <p style={{ fontSize: '14px', color: '#ef4444', margin: '0 0 16px 0', lineHeight: '1.4', fontWeight: 600 }}>
                                        Warning: This will clear all promoted finalists for the category "{selectedCategory.replace('_', ' ')}". This will allow you to resolve ties and promote them again.
                                    </p>
                                ) : (
                                    <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                                        Please cross-check the top 10 candidates below. By confirming, these candidates will be officially promoted as finalists for the <strong>{selectedCategory.replace('_', ' ')}</strong> category.
                                    </p>
                                )}

                                {modalAction === 'promote' && hasTie && (
                                    <div className={styles.tieResolutionSection}>
                                        <h4 className={styles.tieResolutionTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertTriangle size={16} /> Resolve Tie-Breaker
                                        </h4>
                                        <p className={styles.tieResolutionDesc}>
                                            Select exactly <strong>{slotsAvailable}</strong> candidate(s) from the <strong>{tiedCandidates.length}</strong> tied candidates to promote.
                                        </p>
                                        <div className={styles.tieResolutionList}>
                                            {tiedCandidates.map((item) => {
                                                const isChecked = selectedTiedIds.includes(item.participant_id);
                                                return (
                                                    <div
                                                        key={item.participant_id}
                                                        className={`${styles.tieResolutionItem} ${isChecked ? styles.tieResolutionItemChecked : ''}`}
                                                        style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}
                                                    >
                                                        {/* Header Row (toggles selection) */}
                                                        <div
                                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                                            onClick={() => {
                                                                if (isChecked) {
                                                                    setSelectedTiedIds(selectedTiedIds.filter(id => id !== item.participant_id));
                                                                } else {
                                                                    setSelectedTiedIds([...selectedTiedIds, item.participant_id]);
                                                                }
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className={styles.tieCheckbox}
                                                                checked={isChecked}
                                                                onChange={() => { }}
                                                            />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '700', fontSize: '13px' }}>{item.full_name}</div>
                                                                <div style={{ fontSize: '11px', color: '#64748b' }}>Reg ID: {item.register_id}</div>
                                                            </div>
                                                            <div style={{ fontWeight: '800', fontSize: '13px', color: '#ea580c' }}>
                                                                {item.grand_average} Pts
                                                            </div>
                                                        </div>

                                                        {/* Details Panel */}
                                                        <div className={styles.tieDetailPanel} onClick={(e) => e.stopPropagation()}>
                                                            <div className={styles.tieDetailHeader}>
                                                                <span>Aspect Breakdowns (Tajweed First)</span>
                                                                <button
                                                                    type="button"
                                                                    className={styles.btnViewPhotos}
                                                                    onClick={() => setActiveMarksheetParticipant({ id: item.participant_id, name: item.full_name })}
                                                                >
                                                                    <Images size={12} /> View Marksheet Photos
                                                                </button>
                                                            </div>
                                                            {loadingTieDetails ? (
                                                                <div style={{ fontSize: '11px', color: '#64748b' }}>Loading details...</div>
                                                            ) : templateCriteria.length === 0 ? (
                                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>No criteria template available</div>
                                                            ) : (
                                                                <div className={styles.tieDetailList}>
                                                                    {templateCriteria.map(crit => {
                                                                        const isTajweed = crit.label?.toLowerCase().includes('tajweed') || crit.key?.toLowerCase().includes('tajweed');
                                                                        return (
                                                                            <div
                                                                                key={crit.key}
                                                                                className={`${styles.tieDetailItem} ${isTajweed ? styles.tieDetailTajweed : ''}`}
                                                                            >
                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                                    {crit.label} {isTajweed && <Star size={11} fill="#ea580c" style={{ color: '#ea580c' }} />}
                                                                                </span>
                                                                                <strong>{formatCriterionScore(item.participant_id, crit)}</strong>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Cross-check List */}
                                {modalAction === 'promote' && (
                                    <div className={styles.crossCheckList}>
                                        {finalSelectedList.map((item, index) => (
                                            <div key={item.participant_id} className={styles.crossCheckItem}>
                                                <span className={styles.crossCheckRank}>#{index + 1}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{item.full_name}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>Reg ID: {item.register_id}</div>
                                                </div>
                                                <div style={{ textAlign: 'right', fontWeight: '800', fontSize: '13px', color: '#0d9488' }}>
                                                    {item.grand_average} Pts
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className={styles.formGroup} style={{ marginTop: '20px' }}>
                                    <label htmlFor="confirm-pass" style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>
                                        Confirm Admin Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirm-pass"
                                        placeholder="Enter administrator password..."
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        className={styles.modalInput}
                                        required
                                        autoFocus
                                    />
                                    {passwordError && (
                                        <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0', fontWeight: '500' }}>
                                            {passwordError}
                                        </p>
                                    )}
                                    {modalAction === 'promote' && hasTie && selectedTiedIds.length !== slotsAvailable && (
                                        <p style={{ color: '#ef4444', fontSize: '12px', margin: '8px 0 0 0', fontWeight: '700' }}>
                                            ⚠️ You must select exactly {slotsAvailable} tied candidates (selected: {selectedTiedIds.length}).
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={submittingPromotion}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={modalAction === 'revert' ? styles.btnRevert : styles.btnSubmit}
                                    disabled={submittingPromotion || (modalAction === 'promote' && !isSelectionValid)}
                                >
                                    {submittingPromotion
                                        ? (modalAction === 'revert' ? 'Reverting...' : 'Promoting...')
                                        : (modalAction === 'revert' ? 'Confirm Revert' : 'Confirm Promotion')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Marksheet Image Lightbox Viewer */}
            {activeMarksheetParticipant && (
                <MarksheetViewer
                    participantId={activeMarksheetParticipant.id}
                    participantName={activeMarksheetParticipant.name}
                    round="preliminary"
                    onClose={() => setActiveMarksheetParticipant(null)}
                />
            )}
        </div>
    );
}
