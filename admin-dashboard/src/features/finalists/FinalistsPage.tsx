// admin-dashboard/src/features/finalists/FinalistsPage.tsx
import { useState, useEffect } from 'react';
import { pb } from '../../api/db';
import { Award, Users } from 'lucide-react';
import MarksheetViewer from '../mark-entry/MarksheetViewer';
import styles from './FinalistsPage.module.css';

// Import newly created subcomponents
import PasswordConfirmModal from './components/PasswordConfirmModal';
import TieResolutionModal from './components/TieResolutionModal';
import FinalTieResolutionModal from './components/FinalTieResolutionModal';
import PreliminaryTabContent from './components/PreliminaryTabContent';
import WinnersTabContent from './components/WinnersTabContent';

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
    final_ranking?: number;
    final_venue?: string;
    final_order?: number;
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
            thirdPlace: LeaderboardItem;
        } | null;
    } | null>(null);

    // Modal password promotion states
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [passwordInput, setPasswordInput] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [submittingPromotion, setSubmittingPromotion] = useState<boolean>(false);

    // Tie-breaker states
    const [selectedTiedIds, setSelectedTiedIds] = useState<string[]>([]);
    const [templateCriteria, setTemplateCriteria] = useState<any[]>([]);
    const [tiedMarks, setTiedMarks] = useState<Record<string, any>>({});
    const [activeMarksheetParticipant, setActiveMarksheetParticipant] = useState<{ id: string; name: string; round: 'preliminary' | 'final' } | null>(null);
    const [loadingTieDetails, setLoadingTieDetails] = useState<boolean>(false);
    const [showTieResolutionModal, setShowTieResolutionModal] = useState<boolean>(false);
    const [aspectPriorities, setAspectPriorities] = useState<string[]>([]);
    const [manualRankOverrides, setManualRankOverrides] = useState<Record<string, number>>({});
    const [showFinalTieResolutionModal, setShowFinalTieResolutionModal] = useState<boolean>(false);
    const [modalAction, setModalAction] = useState<'promote' | 'revert' | 'issue_rankings' | 'revert_rankings'>('promote');

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'to_final') {
                const res = await pb.send<{ items: LeaderboardItem[] }>('/api/admin/finalist/preliminary-leaderboard', {
                    method: 'GET',
                    query: { category: selectedCategory }
                });
                setLeaderboard(res.items || []);

                // Load template & marks automatically for tie-breaker ranking fallback
                try {
                    const tpl = await pb.send<any>('/api/admin/marks/get-template', {
                        method: 'GET',
                        query: { round: 'preliminary', category: selectedCategory }
                    });
                    const criteriaList = tpl?.columns?.criteria || [];
                    setTemplateCriteria(criteriaList);
                    setAspectPriorities(criteriaList.map((c: any) => c.key));

                    const pIds = (res.items || []).map(item => item.participant_id);
                    let marksRecords: any[] = [];
                    if (pIds.length > 0) {
                        for (let i = 0; i < pIds.length; i += 50) {
                            const chunkIds = pIds.slice(i, i + 50);
                            const filterStr = chunkIds.map(id => `participant_ref = "${id}"`).join(' || ');
                            const chunkRecords = await pb.collection('preliminary_marks').getFullList({
                                filter: filterStr
                            });
                            marksRecords.push(...chunkRecords);
                        }
                    }
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
                } catch (tplErr) {
                    console.warn('Failed to pre-load templates/marks:', tplErr);
                }
            } else {
                const res = await pb.send<any>('/api/admin/finalist/final-leaderboard', {
                    method: 'GET',
                    query: { category: selectedCategory }
                });
                setWinnersData(res);

                // Load final round templates for aspect prioritization and card display
                try {
                    const tpl = await pb.send<any>('/api/admin/marks/get-template', {
                        method: 'GET',
                        query: { round: 'final', category: selectedCategory }
                    });
                    const criteriaList = tpl?.columns?.criteria || [];
                    setTemplateCriteria(criteriaList);
                    setAspectPriorities(criteriaList.map((c: any) => c.key));
                } catch (tplErr) {
                    console.warn('Failed to pre-load final templates:', tplErr);
                }
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

    useEffect(() => {
        setManualRankOverrides({});
    }, [selectedCategory, activeTab]);

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

    // How many slots are available for the tied candidates
    const slotsAvailable = hasTie ? 10 - firstTiedIndex : 0;

    // The candidates who are strictly above the tie and are auto-selected
    const autoSelectedCandidates = hasTie
        ? leaderboard.slice(0, firstTiedIndex)
        : leaderboard.slice(0, 10);

    // Helper to calculate the score for a specific participant and aspect key
    const getAspectScoreVal = (studentOrId: any, criterionKey: string) => {
        if (!studentOrId) return 0;
        let studentVals = null;
        if (typeof studentOrId === 'string') {
            studentVals = tiedMarks[studentOrId];
            if (!studentVals && winnersData?.items) {
                const found = winnersData.items.find(item => item.participant_id === studentOrId);
                if (found) {
                    studentVals = (found as any).values;
                }
            }
        } else {
            studentVals = studentOrId.values || tiedMarks[studentOrId.participant_id];
        }
        if (!studentVals || !studentVals.judges) return 0;

        let total = 0;
        let numJudges = 0;
        Object.values(studentVals.judges).forEach((judgeObj: any) => {
            if (judgeObj && judgeObj[criterionKey]) {
                numJudges++;
                Object.values(judgeObj[criterionKey]).forEach((val: any) => {
                    total += parseFloat(val) || 0;
                });
            }
        });

        return numJudges > 0 ? (total / numJudges) : 0;
    };

    // Helper to format average score per aspect across all judges
    const getAspectScoreFormatted = (student: any, criterion: any) => {
        if (!student) return '—';
        const studentVals = student.values || tiedMarks[student.participant_id];
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
        const avg = Number((total / numJudges).toFixed(2));
        return `${avg} / ${criterion.outOf}`;
    };

    // Sync selectedTiedIds based on priority ordering when priorities, leaderboard, or category changes
    useEffect(() => {
        if (hasTie && tiedCandidates.length > 0) {
            if (aspectPriorities.length > 0 && Object.keys(tiedMarks).length > 0) {
                const sorted = [...tiedCandidates].sort((a, b) => {
                    for (const key of aspectPriorities) {
                        const scoreA = getAspectScoreVal(a.participant_id, key);
                        const scoreB = getAspectScoreVal(b.participant_id, key);
                        if (scoreA !== scoreB) {
                            return scoreB - scoreA;
                        }
                    }
                    return 0;
                });
                const autoCheckedIds = sorted.slice(0, slotsAvailable).map(c => c.participant_id);
                setSelectedTiedIds(autoCheckedIds);
            } else {
                const initialSelection = tiedCandidates.slice(0, slotsAvailable).map(c => c.participant_id);
                setSelectedTiedIds(initialSelection);
            }
        } else {
            setSelectedTiedIds([]);
        }
    }, [leaderboard, selectedCategory, aspectPriorities, tiedMarks]);

    const getFinalPromotedIds = () => {
        if (hasTie) {
            const autoIds = autoSelectedCandidates.map(c => c.participant_id);
            return [...autoIds, ...selectedTiedIds];
        } else {
            return leaderboard.slice(0, 10).map(c => c.participant_id);
        }
    };

    const isSelectionValid = !hasTie || selectedTiedIds.length === slotsAvailable;

    const formatCriterionScore = (studentOrId: any, criterion: any) => {
        if (!studentOrId) return '—';

        let studentVals: any = null;
        if (typeof studentOrId === 'string') {
            studentVals = tiedMarks[studentOrId];
            if (!studentVals && winnersData?.items) {
                const found = winnersData.items.find(item => item.participant_id === studentOrId);
                if (found) {
                    studentVals = (found as any).values;
                }
            }
        } else {
            studentVals = studentOrId.values || tiedMarks[studentOrId.participant_id];
        }

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
        if (leaderboard.length === 0) {
            alert("No participants found in this category.");
            return;
        }

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
                const tpl = await pb.send<any>('/api/admin/marks/get-template', {
                    method: 'GET',
                    query: { round: 'preliminary', category: selectedCategory }
                });
                const criteriaList = tpl?.columns?.criteria || [];
                setTemplateCriteria(criteriaList);
                setAspectPriorities(criteriaList.map((c: any) => c.key));

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
                setShowTieResolutionModal(true);
            } catch (err) {
                console.error('Failed to load tie details:', err);
            } finally {
                setLoadingTieDetails(false);
            }
        } else {
            setShowConfirmModal(true);
        }
    };

    const handleRevertClick = () => {
        setModalAction('revert');
        setPasswordInput('');
        setPasswordError('');
        setShowConfirmModal(true);
    };

    const handleIssueRankingsClick = () => {
        setModalAction('issue_rankings');
        setPasswordInput('');
        setPasswordError('');
        setShowConfirmModal(true);
    };

    const handleRevertRankingsClick = () => {
        setModalAction('revert_rankings');
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
            const currentEmail = user?.email || user?.username || '';
            await pb.collection('users').authWithPassword(currentEmail, passwordInput);

            if (modalAction === 'promote') {
                await pb.send('/api/admin/finalist/promote-to-final', {
                    method: 'POST',
                    body: {
                        category: selectedCategory,
                        promoted_ids: getFinalPromotedIds()
                    }
                });
                alert('Top 10 finalists successfully updated and promoted!');
            } else if (modalAction === 'revert') {
                await pb.send('/api/admin/finalist/revert-promotion', {
                    method: 'POST',
                    body: {
                        category: selectedCategory
                    }
                });
                alert('Finalist promotion successfully reverted!');
            } else if (modalAction === 'issue_rankings') {
                const rankingsPayload = sortedFinalLeaderboard.map((item, idx) => ({
                    participant_id: item.participant_id,
                    rank: idx + 1
                }));
                await pb.send('/api/admin/finalist/issue-rankings', {
                    method: 'POST',
                    body: {
                        category: selectedCategory,
                        rankings: rankingsPayload
                    }
                });
                alert('Final round rankings successfully issued and locked!');
            } else if (modalAction === 'revert_rankings') {
                await pb.send('/api/admin/finalist/revert-rankings', {
                    method: 'POST',
                    body: {
                        category: selectedCategory
                    }
                });
                alert('Final round rankings successfully reverted and unlocked!');
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

    const finalSelectedList = leaderboard
        .filter(item => getFinalPromotedIds().includes(item.participant_id))
        .sort((a, b) => {
            if (b.grand_average !== a.grand_average) {
                return b.grand_average - a.grand_average;
            }
            if (b.grand_total !== a.grand_total) {
                return b.grand_total - a.grand_total;
            }
            for (const key of aspectPriorities) {
                const scoreA = getAspectScoreVal(a.participant_id, key);
                const scoreB = getAspectScoreVal(b.participant_id, key);
                if (scoreA !== scoreB) {
                    return scoreB - scoreA;
                }
            }
            return a.register_id.localeCompare(b.register_id);
        });

    const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        if (a.is_finalist && !b.is_finalist) return -1;
        if (!a.is_finalist && b.is_finalist) return 1;
        if (b.grand_average !== a.grand_average) {
            return b.grand_average - a.grand_average;
        }
        if (b.grand_total !== a.grand_total) {
            return b.grand_total - a.grand_total;
        }
        for (const key of aspectPriorities) {
            const scoreA = getAspectScoreVal(a.participant_id, key);
            const scoreB = getAspectScoreVal(b.participant_id, key);
            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }
        }
        return a.register_id.localeCompare(b.register_id);
    });

    const autoSortedFinalLeaderboard = winnersData?.items ? [...winnersData.items].sort((a, b) => {
        if (b.grand_average !== a.grand_average) {
            return b.grand_average - a.grand_average;
        }
        if (b.grand_total !== a.grand_total) {
            return b.grand_total - a.grand_total;
        }
        for (const key of aspectPriorities) {
            const scoreA = getAspectScoreVal(a, key);
            const scoreB = getAspectScoreVal(b, key);
            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }
        }
        return a.register_id.localeCompare(b.register_id);
    }) : [];

    const sortedFinalLeaderboard = [...autoSortedFinalLeaderboard].sort((a, b) => {
        const rankA = manualRankOverrides[a.participant_id] !== undefined ? manualRankOverrides[a.participant_id] : (autoSortedFinalLeaderboard.indexOf(a) + 1);
        const rankB = manualRankOverrides[b.participant_id] !== undefined ? manualRankOverrides[b.participant_id] : (autoSortedFinalLeaderboard.indexOf(b) + 1);

        if (rankA !== rankB) {
            return rankA - rankB;
        }
        return autoSortedFinalLeaderboard.indexOf(a) - autoSortedFinalLeaderboard.indexOf(b);
    });

    const rankingsIssued = !!winnersData?.items?.some(item => (item.final_ranking || 0) > 0);

    const getTieBreakerReason = (item: LeaderboardItem) => {
        const tiedGroup = autoSortedFinalLeaderboard.filter(
            x => x.grand_average === item.grand_average && x.grand_total === item.grand_total
        );
        if (tiedGroup.length <= 1) return null;

        for (const key of aspectPriorities) {
            const scores = tiedGroup.map(x => getAspectScoreVal(x, key));
            const minScore = Math.min(...scores);
            const maxScore = Math.max(...scores);

            if (maxScore !== minScore) {
                const myScore = getAspectScoreVal(item, key);
                const criterion = templateCriteria.find(c => c.key === key);
                const aspectLabel = criterion ? criterion.label : key;

                if (myScore === maxScore) {
                    return `Highest in ${aspectLabel}`;
                } else {
                    const sortedScoresDesc = [...scores].sort((a, b) => b - a);
                    const rankInAspect = sortedScoresDesc.indexOf(myScore) + 1;
                    const rankSuffix = rankInAspect === 2 ? '2nd' : rankInAspect === 3 ? '3rd' : `${rankInAspect}th`;
                    return `${rankSuffix} in ${aspectLabel}`;
                }
            }
        }
        return null;
    };

    const hasFinal1st2ndConflict = autoSortedFinalLeaderboard.length >= 2 &&
        autoSortedFinalLeaderboard[0].grand_average === autoSortedFinalLeaderboard[1].grand_average &&
        autoSortedFinalLeaderboard[0].grand_total === autoSortedFinalLeaderboard[1].grand_total;

    const hasFinal2nd3rdConflict = autoSortedFinalLeaderboard.length >= 3 &&
        autoSortedFinalLeaderboard[1].grand_average === autoSortedFinalLeaderboard[2].grand_average &&
        autoSortedFinalLeaderboard[1].grand_total === autoSortedFinalLeaderboard[2].grand_total;

    const hasFinal3rd4thConflict = autoSortedFinalLeaderboard.length >= 4 &&
        autoSortedFinalLeaderboard[2].grand_average === autoSortedFinalLeaderboard[3].grand_average &&
        autoSortedFinalLeaderboard[2].grand_total === autoSortedFinalLeaderboard[3].grand_total;

    const hasFinalConflict = hasFinal1st2ndConflict || hasFinal2nd3rdConflict || hasFinal3rd4thConflict;

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
                    <PreliminaryTabContent
                        leaderboard={leaderboard}
                        selectedCategory={selectedCategory}
                        isAdmin={isAdmin}
                        hasTie={hasTie}
                        tiedCandidates={tiedCandidates}
                        tiedAvg={tiedAvg}
                        tiedTotal={tiedTotal}
                        slotsAvailable={slotsAvailable}
                        sortedLeaderboard={sortedLeaderboard}
                        handleRevertClick={handleRevertClick}
                        handlePromoteClick={handlePromoteClick}
                    />
                ) : (
                    <WinnersTabContent
                        winnersData={winnersData}
                        selectedCategory={selectedCategory}
                        isAdmin={isAdmin}
                        rankingsIssued={rankingsIssued}
                        hasFinalConflict={hasFinalConflict}
                        sortedFinalLeaderboard={sortedFinalLeaderboard}
                        autoSortedFinalLeaderboard={autoSortedFinalLeaderboard}
                        templateCriteria={templateCriteria}
                        getAspectScoreFormatted={getAspectScoreFormatted}
                        getTieBreakerReason={getTieBreakerReason}
                        handleRevertRankingsClick={handleRevertRankingsClick}
                        handleIssueRankingsClick={handleIssueRankingsClick}
                        setShowFinalTieResolutionModal={setShowFinalTieResolutionModal}
                    />
                )}
            </div>

            {/* Tie Resolution Modal */}
            <TieResolutionModal
                isOpen={showTieResolutionModal}
                onClose={() => setShowTieResolutionModal(false)}
                slotsAvailable={slotsAvailable}
                templateCriteria={templateCriteria}
                aspectPriorities={aspectPriorities}
                setAspectPriorities={setAspectPriorities}
                rankingsIssued={rankingsIssued}
                tiedCandidates={tiedCandidates}
                selectedTiedIds={selectedTiedIds}
                setSelectedTiedIds={setSelectedTiedIds}
                loadingTieDetails={loadingTieDetails}
                onViewMarksheetPhotos={setActiveMarksheetParticipant}
                formatCriterionScore={formatCriterionScore}
                onSubmit={() => {
                    setShowTieResolutionModal(false);
                    setShowConfirmModal(true);
                }}
            />

            {/* Password verification & Double-Check finalist modal popup */}
            <PasswordConfirmModal
                isOpen={showConfirmModal}
                modalAction={modalAction}
                selectedCategory={selectedCategory}
                finalSelectedList={finalSelectedList}
                sortedFinalLeaderboard={sortedFinalLeaderboard}
                passwordInput={passwordInput}
                setPasswordInput={setPasswordInput}
                passwordError={passwordError}
                submittingPromotion={submittingPromotion}
                isSelectionValid={isSelectionValid}
                onClose={() => setShowConfirmModal(false)}
                onSubmit={handlePromoteConfirm}
            />

            {/* Marksheet Image Lightbox Viewer */}
            {activeMarksheetParticipant && (
                <MarksheetViewer
                    participantId={activeMarksheetParticipant.id}
                    participantName={activeMarksheetParticipant.name}
                    round={activeMarksheetParticipant.round}
                    onClose={() => setActiveMarksheetParticipant(null)}
                />
            )}

            {/* Final Tie Resolution & Custom Ranking Modal */}
            <FinalTieResolutionModal
                isOpen={showFinalTieResolutionModal}
                onClose={() => setShowFinalTieResolutionModal(false)}
                templateCriteria={templateCriteria}
                aspectPriorities={aspectPriorities}
                setAspectPriorities={setAspectPriorities}
                rankingsIssued={rankingsIssued}
                autoSortedFinalLeaderboard={autoSortedFinalLeaderboard}
                manualRankOverrides={manualRankOverrides}
                setManualRankOverrides={setManualRankOverrides}
                getTieBreakerReason={getTieBreakerReason}
                formatCriterionScore={formatCriterionScore}
                onViewMarksheets={setActiveMarksheetParticipant}
            />
        </div>
    );
}
