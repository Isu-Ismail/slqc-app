import { Lock, CheckCircle, Shield, ShieldAlert, AlertTriangle } from 'lucide-react';
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
}

interface PreliminaryTabContentProps {
    leaderboard: LeaderboardItem[];
    selectedCategory: string;
    isAdmin: boolean;
    hasTie: boolean;
    tiedCandidates: LeaderboardItem[];
    tiedAvg: number;
    tiedTotal: number;
    slotsAvailable: number;
    sortedLeaderboard: LeaderboardItem[];
    handleRevertClick: () => void;
    handlePromoteClick: () => void;
    onPrint: () => void;
}

export default function PreliminaryTabContent({
    leaderboard,
    selectedCategory,
    isAdmin,
    hasTie,
    tiedCandidates,
    tiedAvg,
    tiedTotal,
    slotsAvailable,
    sortedLeaderboard,
    handleRevertClick,
    handlePromoteClick,
    onPrint
}: PreliminaryTabContentProps) {
    const displayCategory = selectedCategory.replace('_', ' ');

    return (
        <div className={styles.viewContainer}>
            {leaderboard.length > 0 && leaderboard.some(item => !item.is_frozen) && !leaderboard.some(item => item.is_finalist) ? (
                /* GRADING IN PROGRESS WARNING */
                <div className={styles.warningContainer}>
                    <Lock size={48} className={styles.warningIcon} />
                    <h3 className={styles.warningHeading}>Preliminary Round Grading In Progress</h3>
                    <p className={styles.warningText}>
                        Leaderboard and finalist promotion will be available once the preliminary round scores for all present candidates in the <strong>{displayCategory}</strong> category are entered and locked.
                    </p>
 
                    <div className={styles.statusCheckList}>
                        <h4 className={styles.statusCheckHeader}>Grading Progress ({leaderboard.filter(item => item.is_frozen).length} / {leaderboard.length} Candidates Completed):</h4>
                        <div className={styles.finalistStatusGrid}>
                            {leaderboard.map(item => (
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
                </div>
            ) : (
                <>
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
                            <h3 className={styles.tableTitle}>Leaderboard: {displayCategory}</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {leaderboard.some(item => item.is_finalist) && (
                                    <button
                                        onClick={onPrint}
                                        className={styles.btnPromote}
                                        style={{ backgroundColor: '#4f46e5', borderColor: '#4338ca' }}
                                    >
                                        Print Finalists
                                    </button>
                                )}
                                {isAdmin && (
                                    <>
                                        {leaderboard.some(item => item.is_finalist) && (() => {
                                            const finalAllocationDone = leaderboard.some(item => item.is_finalist && item.final_venue && item.final_order && item.final_order > 0);
                                            return (
                                                <button
                                                    onClick={handleRevertClick}
                                                    disabled={finalAllocationDone}
                                                    className={styles.btnRevert}
                                                    title={finalAllocationDone ? "Cannot revert promotion after final round venue allocation has been completed." : undefined}
                                                >
                                                    <AlertTriangle size={14} /> Revert Promotion
                                                </button>
                                            );
                                        })()}
                                        <button
                                            onClick={handlePromoteClick}
                                            className={styles.btnPromote}
                                            disabled={leaderboard.length === 0 || leaderboard.some(item => item.is_finalist)}
                                        >
                                            <Lock size={14} /> Upload Finalist List
                                        </button>
                                    </>
                                )}
                            </div>
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
                </>
            )}
        </div>
    );
}
