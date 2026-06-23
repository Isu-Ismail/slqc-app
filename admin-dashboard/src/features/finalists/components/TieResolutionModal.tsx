import { Star, Images } from 'lucide-react';
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

interface TieResolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    slotsAvailable: number;
    templateCriteria: any[];
    aspectPriorities: string[];
    setAspectPriorities: (priorities: string[]) => void;
    rankingsIssued: boolean;
    tiedCandidates: LeaderboardItem[];
    selectedTiedIds: string[];
    setSelectedTiedIds: (ids: string[]) => void;
    loadingTieDetails: boolean;
    onViewMarksheetPhotos: (participant: { id: string; name: string; round: 'preliminary' | 'final' }) => void;
    formatCriterionScore: (studentId: string, criterion: any) => string;
    onSubmit: () => void;
}

export default function TieResolutionModal({
    isOpen,
    onClose,
    slotsAvailable,
    templateCriteria,
    aspectPriorities,
    setAspectPriorities,
    rankingsIssued,
    tiedCandidates,
    selectedTiedIds,
    setSelectedTiedIds,
    loadingTieDetails,
    onViewMarksheetPhotos,
    formatCriterionScore,
    onSubmit
}: TieResolutionModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '640px' }}>
                <div className={styles.modalHeader}>
                    <h2>Resolve & Promote Tie-Breaker</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div className={styles.modalBody}>
                    <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                        A tie has been detected at the promotion boundary. Set the priority of scoring aspects to dynamically rank candidates and select exactly <strong>{slotsAvailable}</strong> candidate(s) to promote.
                    </p>

                    {/* Aspect Priority Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Aspect Priority Sorting Rules</h4>
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
                                                backgroundColor: '#ffffff',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                outline: 'none'
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

                    {/* Tied Candidates List */}
                    <div className={styles.tieResolutionList}>
                        {tiedCandidates.map((item) => {
                            const isChecked = selectedTiedIds.includes(item.participant_id);
                            return (
                                <div
                                    key={item.participant_id}
                                    className={`${styles.tieResolutionItem} ${isChecked ? styles.tieResolutionItemChecked : ''}`}
                                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}
                                >
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

                                    <div className={styles.tieDetailPanel} onClick={(e) => e.stopPropagation()}>
                                        <div className={styles.tieDetailHeader}>
                                            <span>Aspect Breakdowns (Averages)</span>
                                            <button
                                                type="button"
                                                className={styles.btnViewPhotos}
                                                onClick={() => onViewMarksheetPhotos({ id: item.participant_id, name: item.full_name, round: 'preliminary' })}
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
                                                    const isPriority = aspectPriorities[0] === crit.key;
                                                    return (
                                                        <div
                                                            key={crit.key}
                                                            className={`${styles.tieDetailItem} ${isPriority ? styles.tieDetailTajweed : ''}`}
                                                        >
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                {crit.label} {isPriority && <Star size={11} fill="#ea580c" style={{ color: '#ea580c' }} />}
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

                    {selectedTiedIds.length !== slotsAvailable && (
                        <p style={{ color: '#ef4444', fontSize: '13px', margin: '16px 0 0 0', fontWeight: '700', textAlign: 'center' }}>
                            You must select exactly {slotsAvailable} tied candidates to proceed (currently selected: {selectedTiedIds.length}).
                        </p>
                    )}
                </div>
                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.btnSubmit}
                        disabled={selectedTiedIds.length !== slotsAvailable}
                        onClick={onSubmit}
                    >
                        Proceed to Promotion
                    </button>
                </div>
            </div>
        </div>
    );
}
