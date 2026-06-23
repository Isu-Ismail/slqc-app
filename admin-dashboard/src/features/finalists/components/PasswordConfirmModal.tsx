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

interface PasswordConfirmModalProps {
    isOpen: boolean;
    modalAction: 'promote' | 'revert' | 'issue_rankings' | 'revert_rankings';
    selectedCategory: string;
    finalSelectedList: LeaderboardItem[];
    sortedFinalLeaderboard: LeaderboardItem[];
    passwordInput: string;
    setPasswordInput: (val: string) => void;
    passwordError: string;
    submittingPromotion: boolean;
    isSelectionValid: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function PasswordConfirmModal({
    isOpen,
    modalAction,
    selectedCategory,
    finalSelectedList,
    sortedFinalLeaderboard,
    passwordInput,
    setPasswordInput,
    passwordError,
    submittingPromotion,
    isSelectionValid,
    onClose,
    onSubmit
}: PasswordConfirmModalProps) {
    if (!isOpen) return null;

    const displayCategory = selectedCategory.replace('_', ' ');

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>
                        {modalAction === 'revert' && 'Revert Finalist Promotion'}
                        {modalAction === 'promote' && 'Double Check Finalist List'}
                        {modalAction === 'issue_rankings' && 'Confirm & Lock Rankings'}
                        {modalAction === 'revert_rankings' && 'Unlock Final Rankings'}
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <form onSubmit={onSubmit}>
                    <div className={styles.modalBody}>
                        {modalAction === 'revert' && (
                            <p style={{ fontSize: '14px', color: '#ef4444', margin: '0 0 16px 0', lineHeight: '1.4', fontWeight: 600 }}>
                                Warning: This will clear all promoted finalists for the category "{displayCategory}". This will allow you to resolve ties and promote them again.
                            </p>
                        )}
                        {modalAction === 'promote' && (
                            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                                Please cross-check the top 10 candidates below. By confirming, these candidates will be officially promoted as finalists for the <strong>{displayCategory}</strong> category.
                            </p>
                        )}
                        {modalAction === 'issue_rankings' && (
                            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                                Please confirm the final ranking list below. By confirming, the rankings for <strong>{displayCategory}</strong> will be issued, saved to the database, and locked.
                            </p>
                        )}
                        {modalAction === 'revert_rankings' && (
                            <p style={{ fontSize: '14px', color: '#ef4444', margin: '0 0 16px 0', lineHeight: '1.4', fontWeight: 600 }}>
                                Warning: This will unlock and clear the issued final round rankings for the category "{displayCategory}". This will allow you to re-rank them.
                            </p>
                        )}

                        {/* Cross-check List for Finalists promotion */}
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

                        {/* Cross-check List for Rankings issuing */}
                        {modalAction === 'issue_rankings' && (
                            <div className={styles.crossCheckList}>
                                {sortedFinalLeaderboard.map((item, index) => (
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
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={onClose}
                            disabled={submittingPromotion}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={(modalAction === 'revert' || modalAction === 'revert_rankings') ? styles.btnRevert : styles.btnSubmit}
                            disabled={submittingPromotion || (modalAction === 'promote' && !isSelectionValid)}
                        >
                            {submittingPromotion
                                ? ((modalAction === 'revert' || modalAction === 'revert_rankings') ? 'Reverting...' : 'Confirming...')
                                : ((modalAction === 'revert' || modalAction === 'revert_rankings') ? 'Confirm Revert' : 'Confirm & Save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
