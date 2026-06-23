import { Images } from 'lucide-react';
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

interface FinalTieResolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateCriteria: any[];
    aspectPriorities: string[];
    setAspectPriorities: (priorities: string[]) => void;
    rankingsIssued: boolean;
    autoSortedFinalLeaderboard: LeaderboardItem[];
    manualRankOverrides: Record<string, number>;
    setManualRankOverrides: (overrides: Record<string, number>) => void;
    getTieBreakerReason: (item: LeaderboardItem) => string | null;
    formatCriterionScore: (item: LeaderboardItem, criterion: any) => string;
    onViewMarksheets: (participant: { id: string; name: string; round: 'preliminary' | 'final' }) => void;
}

export default function FinalTieResolutionModal({
    isOpen,
    onClose,
    templateCriteria,
    aspectPriorities,
    setAspectPriorities,
    rankingsIssued,
    autoSortedFinalLeaderboard,
    manualRankOverrides,
    setManualRankOverrides,
    getTieBreakerReason,
    formatCriterionScore,
    onViewMarksheets
}: FinalTieResolutionModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }}>
                <div className={styles.modalHeader}>
                    <h2>Resolve Final Podium Rankings & Conflicts</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ fontSize: '13px', color: '#475569', margin: '0', lineHeight: '1.4' }}>
                        Use the aspect priorities or manual rank dropdowns below to customize the final rankings. Overrides will update the podium and rankings in real time.
                    </p>

                    {/* Aspect Priority Selection for Winners */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Aspect Priority Rules (Rank Tie-Breaker)</h4>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {templateCriteria.map((_, pIdx) => {
                                const currentSelectedKey = aspectPriorities[pIdx] || '';
                                return (
                                    <div key={pIdx} style={{ flex: '1', minWidth: '120px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                                            {pIdx + 1}st Priority
                                        </label>
                                        <select
                                            value={currentSelectedKey}
                                            disabled={rankingsIssued}
                                            onChange={(e) => {
                                                const newKey = e.target.value;
                                                const newPriorities = [...aspectPriorities];
                                                const existingIdx = newPriorities.indexOf(newKey);
                                                if (existingIdx !== -1) {
                                                    newPriorities[existingIdx] = newPriorities[pIdx];
                                                }
                                                newPriorities[pIdx] = newKey;
                                                setAspectPriorities(newPriorities);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                backgroundColor: rankingsIssued ? '#f1f5f9' : '#ffffff',
                                                color: rankingsIssued ? '#64748b' : '#0f172a',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                outline: 'none',
                                                cursor: rankingsIssued ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {templateCriteria.map(crit => (
                                                <option key={crit.key} value={crit.key}>
                                                    {crit.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Manual Conflict / Sorting Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Manual Rank Overrides & Tie Resolution</h4>
                            <button
                                onClick={() => setManualRankOverrides({})}
                                disabled={rankingsIssued}
                                style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: rankingsIssued ? '#94a3b8' : '#ef4444',
                                    background: 'none',
                                    border: 'none',
                                    cursor: rankingsIssued ? 'not-allowed' : 'pointer',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}
                                onMouseEnter={(e) => { if (!rankingsIssued) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                onMouseLeave={(e) => { if (!rankingsIssued) e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                Reset Overrides
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {autoSortedFinalLeaderboard.map((item, index) => {
                                const currentOverride = manualRankOverrides[item.participant_id];
                                const isTied = (index > 0 && item.grand_average === autoSortedFinalLeaderboard[index - 1].grand_average && item.grand_total === autoSortedFinalLeaderboard[index - 1].grand_total) ||
                                    (index < autoSortedFinalLeaderboard.length - 1 && item.grand_average === autoSortedFinalLeaderboard[index + 1].grand_average && item.grand_total === autoSortedFinalLeaderboard[index + 1].grand_total);

                                return (
                                    <div
                                        key={item.participant_id}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            backgroundColor: '#ffffff',
                                            border: isTied ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            padding: '12px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Rank Override</label>
                                                    <select
                                                        value={currentOverride || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const newOverrides = { ...manualRankOverrides };
                                                            if (val === '') {
                                                                delete newOverrides[item.participant_id];
                                                            } else {
                                                                newOverrides[item.participant_id] = parseInt(val, 10);
                                                            }
                                                            setManualRankOverrides(newOverrides);
                                                        }}
                                                        disabled={rankingsIssued}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1',
                                                            backgroundColor: rankingsIssued ? '#f1f5f9' : (currentOverride ? '#f0fdf4' : '#ffffff'),
                                                            color: rankingsIssued ? '#64748b' : (currentOverride ? '#166534' : '#0f172a'),
                                                            fontWeight: '700',
                                                            fontSize: '12px',
                                                            outline: 'none',
                                                            cursor: rankingsIssued ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        <option value="">Auto (Rank #{autoSortedFinalLeaderboard.indexOf(item) + 1})</option>
                                                        <option value="1">1st Place</option>
                                                        <option value="2">2nd Place</option>
                                                        <option value="3">3rd Place</option>
                                                        <option value="4">4th Place</option>
                                                        <option value="5">5th Place</option>
                                                        <option value="6">6th Place</option>
                                                        <option value="7">7th Place</option>
                                                        <option value="8">8th Place</option>
                                                        <option value="9">9th Place</option>
                                                        <option value="10">10th Place</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        {item.full_name}
                                                        {isTied && (
                                                            <>
                                                                <span style={{ backgroundColor: '#ffedd5', color: '#c2410c', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>Tied</span>
                                                                {getTieBreakerReason(item) && (
                                                                    <span style={{ backgroundColor: '#f0fdf4', color: '#166534', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', border: '1px solid #bbf7d0' }}>
                                                                        {getTieBreakerReason(item)}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>Reg ID: {item.register_id}</div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f766e' }}>{item.grand_average} Pts</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>Total: {item.grand_total}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.btnViewPhotos}
                                                    onClick={() => onViewMarksheets({ id: item.participant_id, name: item.full_name, round: 'final' })}
                                                    style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                                                >
                                                    <Images size={13} /> View Marksheets
                                                </button>
                                            </div>
                                        </div>

                                        {/* Aspect breakdown inline */}
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {templateCriteria.map(crit => (
                                                <div
                                                    key={crit.key}
                                                    style={{
                                                        fontSize: '11px',
                                                        color: '#475569',
                                                        backgroundColor: '#f1f5f9',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    {crit.label}: <strong>{formatCriterionScore(item, crit)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        className={styles.btnSubmit}
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
