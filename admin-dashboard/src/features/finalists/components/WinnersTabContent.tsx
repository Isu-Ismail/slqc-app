import { CheckCircle, AlertTriangle, Lock, Award, ShieldAlert, Shield } from 'lucide-react';
import styles from '../FinalistsPage.module.css';

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
    values?: any;
}

interface WinnersTabContentProps {
    winnersData: {
        items: LeaderboardItem[];
        winners_declared: boolean;
        winners: {
            firstPlace: LeaderboardItem;
            secondPlace: LeaderboardItem;
            thirdPlace: LeaderboardItem;
        } | null;
    } | null;
    selectedCategory: string;
    isAdmin: boolean;
    rankingsIssued: boolean;
    hasFinalConflict: boolean;
    sortedFinalLeaderboard: LeaderboardItem[];
    autoSortedFinalLeaderboard: LeaderboardItem[];
    templateCriteria: any[];
    getAspectScoreFormatted: (student: LeaderboardItem, criterion: any) => string;
    getTieBreakerReason: (item: LeaderboardItem) => string | null;
    handleRevertRankingsClick: () => void;
    handleIssueRankingsClick: () => void;
    setShowFinalTieResolutionModal: (show: boolean) => void;
    onPrint: () => void;
}

export default function WinnersTabContent({
    winnersData,
    selectedCategory,
    isAdmin,
    rankingsIssued,
    hasFinalConflict,
    sortedFinalLeaderboard,
    autoSortedFinalLeaderboard,
    templateCriteria,
    getAspectScoreFormatted,
    getTieBreakerReason,
    handleRevertRankingsClick,
    handleIssueRankingsClick,
    setShowFinalTieResolutionModal,
    onPrint
}: WinnersTabContentProps) {
    const displayCategory = selectedCategory.replace('_', ' ');

    return (
        <div className={styles.viewContainer}>
            {winnersData && winnersData.winners_declared ? (
                /* WINNERS FOUND */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Rankings Issued Status Banner */}
                    {rankingsIssued && (
                        <div className={styles.tieWarningBanner} style={{ backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', color: '#065f46', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CheckCircle size={20} style={{ color: '#059669', flexShrink: 0 }} />
                                <div>
                                    <strong> Final Round Rankings Issued & Locked:</strong> The rankings for this category have been officially announced and locked. To change the ranking or resolve ties again, unlock them using the button in the rankings table.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tie Warning Banner for Finals */}
                    {hasFinalConflict && !rankingsIssued && (
                        <div className={styles.tieWarningBanner} style={{ backgroundColor: '#fff5f5', border: '1px solid #fee2e2', color: '#c53030', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <AlertTriangle size={20} style={{ color: '#e53e3e', flexShrink: 0 }} />
                                    <div>
                                        <strong> Podium Tie Conflict Detected:</strong> There are identical scores at podium boundaries (1st/2nd, 2nd/3rd, or 3rd/4th place). Please resolve these rankings.
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowFinalTieResolutionModal(true)}
                                    className={styles.btnResolveTie}
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                >
                                    Resolve Conflict
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Winners Podiums */}
                    <div className={styles.winnersGrid}>
                        {sortedFinalLeaderboard[0] && (
                            <div className={`${styles.winnerCard} ${styles.firstPlaceCard}`}>
                                <div>
                                    <div className={styles.winnerPodiumRank}>🏆 1st Place Winner</div>
                                    <h2 className={styles.winnerName}>{sortedFinalLeaderboard[0].full_name}</h2>
                                    <div className={styles.winnerMeta}>
                                        <span><strong>Reg ID:</strong> {sortedFinalLeaderboard[0].register_id}</span>
                                        <span><strong>Score:</strong> {sortedFinalLeaderboard[0].grand_average} Pts (Total: {sortedFinalLeaderboard[0].grand_total})</span>
                                    </div>
                                </div>
                                <div className={styles.winnerAspectList}>
                                    {templateCriteria.map(crit => (
                                        <span key={crit.key} className={styles.winnerAspectBadge}>
                                            {crit.label}: {getAspectScoreFormatted(sortedFinalLeaderboard[0], crit)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {sortedFinalLeaderboard[1] && (
                            <div className={`${styles.winnerCard} ${styles.secondPlaceCard}`}>
                                <div>
                                    <div className={styles.winnerPodiumRank}>🥈 2nd Place Winner</div>
                                    <h2 className={styles.winnerName}>{sortedFinalLeaderboard[1].full_name}</h2>
                                    <div className={styles.winnerMeta}>
                                        <span><strong>Reg ID:</strong> {sortedFinalLeaderboard[1].register_id}</span>
                                        <span><strong>Score:</strong> {sortedFinalLeaderboard[1].grand_average} Pts (Total: {sortedFinalLeaderboard[1].grand_total})</span>
                                    </div>
                                </div>
                                <div className={styles.winnerAspectList}>
                                    {templateCriteria.map(crit => (
                                        <span key={crit.key} className={styles.winnerAspectBadge}>
                                            {crit.label}: {getAspectScoreFormatted(sortedFinalLeaderboard[1], crit)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {sortedFinalLeaderboard[2] && (
                            <div className={`${styles.winnerCard} ${styles.thirdPlaceCard}`}>
                                <div>
                                    <div className={styles.winnerPodiumRank}>🥉 3rd Place Winner</div>
                                    <h2 className={styles.winnerName}>{sortedFinalLeaderboard[2].full_name}</h2>
                                    <div className={styles.winnerMeta}>
                                        <span><strong>Reg ID:</strong> {sortedFinalLeaderboard[2].register_id}</span>
                                        <span><strong>Score:</strong> {sortedFinalLeaderboard[2].grand_average} Pts (Total: {sortedFinalLeaderboard[2].grand_total})</span>
                                    </div>
                                </div>
                                <div className={styles.winnerAspectList}>
                                    {templateCriteria.map(crit => (
                                        <span key={crit.key} className={styles.winnerAspectBadge}>
                                            {crit.label}: {getAspectScoreFormatted(sortedFinalLeaderboard[2], crit)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Full finalist score listings */}
                    <div className={styles.tableCard}>
                        <div className={styles.tableHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <h3 className={styles.tableTitle} style={{ margin: 0 }}>Final Round Rankings: {displayCategory}</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {rankingsIssued && (
                                    <button
                                        onClick={onPrint}
                                        className={styles.btnPromote}
                                        style={{ backgroundColor: '#4f46e5', borderColor: '#4338ca' }}
                                    >
                                        Print Winners
                                    </button>
                                )}
                                {isAdmin && (
                                    <>
                                        {rankingsIssued ? (
                                            <button
                                                onClick={handleRevertRankingsClick}
                                                className={styles.btnRevert}
                                            >
                                                <Lock size={14} style={{ marginRight: '6px' }} /> Revert Rankings
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setShowFinalTieResolutionModal(true)}
                                                    className={styles.btnResolveTie}
                                                    style={{ backgroundColor: '#0d9488' }}
                                                >
                                                    <Award size={14} style={{ marginRight: '6px' }} /> Manual Rank Adjustment
                                                </button>
                                                <button
                                                    onClick={handleIssueRankingsClick}
                                                    className={styles.btnPromote}
                                                    disabled={sortedFinalLeaderboard.length === 0}
                                                >
                                                    <Lock size={14} style={{ marginRight: '6px' }} /> Issue Final Rankings
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '85px', textAlign: 'center' }}>Rank</th>
                                        <th>Finalist Name</th>
                                        <th>Reg ID</th>
                                        <th style={{ textAlign: 'center' }}>Grand Total</th>
                                        <th style={{ textAlign: 'center' }}>Grand Average</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedFinalLeaderboard.map((item, index) => {
                                        const autoIdx = autoSortedFinalLeaderboard.findIndex(x => x.participant_id === item.participant_id);
                                        const isTied = autoIdx !== -1 && (
                                            (autoIdx > 0 && autoSortedFinalLeaderboard[autoIdx].grand_average === autoSortedFinalLeaderboard[autoIdx - 1].grand_average && autoSortedFinalLeaderboard[autoIdx].grand_total === autoSortedFinalLeaderboard[autoIdx - 1].grand_total) ||
                                            (autoIdx < autoSortedFinalLeaderboard.length - 1 && autoSortedFinalLeaderboard[autoIdx].grand_average === autoSortedFinalLeaderboard[autoIdx + 1].grand_average && autoSortedFinalLeaderboard[autoIdx].grand_total === autoSortedFinalLeaderboard[autoIdx + 1].grand_total)
                                        );
                                        return (
                                            <tr key={item.participant_id} className={index < 3 ? styles.topRankRow : undefined}>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                    {index + 1}
                                                    {isTied && (
                                                        <>
                                                            <span style={{ color: '#c2410c', fontSize: '10px', display: 'block', fontWeight: '700' }}>Tied</span>
                                                            {getTieBreakerReason(item) && (
                                                                <span style={{ color: '#166534', fontSize: '9px', display: 'block', fontWeight: '700', marginTop: '2px' }}>
                                                                    ({getTieBreakerReason(item)})
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
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
                                        );
                                    })}
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
                        Final round scores are still being entered or locked. Once the scores for all 10 finalists in the <strong>{displayCategory}</strong> category are submitted and frozen, the 1st and 2nd place winners will be computed here automatically.
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
    );
}
