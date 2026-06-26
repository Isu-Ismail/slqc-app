import { useState, type KeyboardEvent, useEffect } from 'react';
import { Search, FileText, User, Shield, AlertTriangle, CheckCircle, Images } from 'lucide-react';
import { pb } from '../../api/db';
import styles from './MarkEntryPage.module.css';
import MarksheetViewer from './MarksheetViewer';

interface GradingWorkspaceProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredSearchStudents: any[];
    selectedStudent: any | null;
    onSelectStudent: (student: any) => void;
    selectedVenue: string;
    currentRound: 'preliminary' | 'final';
    templateColumns: any; // Configured criteria list: Array<{ key, label, numQuestions, outOf }>
    judges: any[];
    scoringValues: any;
    setScoringValues: any;
    totals: any;
    isSaving: boolean;
    onSaveMarks: () => void;
    user: any;
    onBack?: () => void;
}

export default function GradingWorkspace({
    searchQuery,
    setSearchQuery,
    filteredSearchStudents,
    selectedStudent,
    onSelectStudent,
    currentRound,
    templateColumns,
    judges,
    scoringValues,
    setScoringValues,
    totals,
    isSaving,
    onSaveMarks,
    user,
    onBack
}: GradingWorkspaceProps) {

    // Safely extract criteria list
    const criteria: any[] = Array.isArray(templateColumns)
        ? templateColumns
        : (templateColumns.criteria || []);

    const calculateTotalTemplateMarks = () => {
        return criteria.reduce((sum, c) => sum + (c.numQuestions * (c.outOf || 0)), 0);
    };

    const getCategoryAccumulation = (criterionKey: string) => {
        let total = 0;
        Object.keys(scoringValues || {}).forEach((judgeId) => {
            const judgeMarks = scoringValues[judgeId]?.[criterionKey];
            if (judgeMarks) {
                Object.values(judgeMarks).forEach((val: any) => {
                    const score = parseFloat(val);
                    if (!isNaN(score)) {
                        total += score;
                    }
                });
            }
        });
        return total;
    };

    const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
    const [passwordInput, setPasswordInput] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [verifyingPassword, setVerifyingPassword] = useState<boolean>(false);
    const [showMarksheetViewer, setShowMarksheetViewer] = useState<boolean>(false);

    useEffect(() => {
        setIsUnlocked(false);
        if (selectedStudent) {
            const timer = setTimeout(() => {
                const summaryBoard = document.getElementById('grand-summary-board');
                if (summaryBoard) {
                    summaryBoard.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedStudent]);

    const handleUnlockConfirm = async () => {
        if (!passwordInput.trim()) {
            setPasswordError('Password cannot be blank.');
            return;
        }
        setVerifyingPassword(true);
        setPasswordError('');
        try {
            const currentEmail = user?.email || user?.username || '';
            if (!currentEmail) {
                throw new Error("No active user session found.");
            }
            await pb.collection('users').authWithPassword(currentEmail, passwordInput);
            setIsUnlocked(true);
            setShowPasswordPrompt(false);
            setPasswordInput('');
        } catch (err: any) {
            console.error('Password verification failed:', err);
            setPasswordError('Incorrect password. Please try again.');
        } finally {
            setVerifyingPassword(false);
        }
    };

    const handleUnlockCancel = () => {
        setShowPasswordPrompt(false);
        setPasswordInput('');
        setPasswordError('');
    };

    const handleCancelEdit = () => {
        setIsUnlocked(false);
        let originalScoring: any = {};
        if (selectedStudent && selectedStudent.values && selectedStudent.values.judges) {
            originalScoring = JSON.parse(JSON.stringify(selectedStudent.values.judges));
        } else {
            judges.forEach((j: any) => {
                originalScoring[j.id] = {};
                criteria.forEach((c: any) => {
                    originalScoring[j.id][c.key] = {};
                    for (let i = 0; i < c.numQuestions; i++) {
                        originalScoring[j.id][c.key][i] = '';
                    }
                });
            });
        }
        setScoringValues(originalScoring);
    };

    const hasAnyError = () => {
        for (const judge of judges) {
            for (const c of criteria) {
                for (let i = 0; i < c.numQuestions; i++) {
                    const val = scoringValues[judge.id]?.[c.key]?.[i] ?? '';
                    if (val === '' || Number(val) > Number(c.outOf)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const finalistsPromoted = selectedStudent?.finalists_promoted && currentRound === 'preliminary';
    const isAdmin = user?.designation === 'admin';
    const isEditable = !finalistsPromoted && (
        isAdmin
            ? (!selectedStudent?.is_frozen || isUnlocked)
            : (!selectedStudent?.is_frozen && !selectedStudent?.entered_by)
    );
    const disableSave = isSaving || hasAnyError() || !isEditable;

    const totalCols = criteria.reduce((sum, c) => sum + c.numQuestions, 0);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, judgeIdx: number, colIdx: number) => {
        let nextJudgeIdx = judgeIdx;
        let nextColIdx = colIdx;

        if (e.key === 'ArrowRight') {
            nextColIdx = colIdx + 1;
            if (nextColIdx >= totalCols) {
                nextColIdx = 0;
                nextJudgeIdx = judgeIdx + 1;
            }
        } else if (e.key === 'ArrowLeft') {
            nextColIdx = colIdx - 1;
            if (nextColIdx < 0) {
                nextJudgeIdx = judgeIdx - 1;
                nextColIdx = totalCols - 1;
            }
        } else if (e.key === 'ArrowDown') {
            nextJudgeIdx = judgeIdx + 1;
        } else if (e.key === 'ArrowUp') {
            nextJudgeIdx = judgeIdx - 1;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            nextColIdx = colIdx + 1;
            if (nextColIdx >= totalCols) {
                nextColIdx = 0;
                nextJudgeIdx = judgeIdx + 1;
            }
        } else {
            return;
        }

        if (nextJudgeIdx >= 0 && nextJudgeIdx < judges.length && nextColIdx >= 0 && nextColIdx < totalCols) {
            const nextInput = document.querySelector(
                `input[data-judge-idx="${nextJudgeIdx}"][data-col-idx="${nextColIdx}"]`
            ) as HTMLInputElement;
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
            }
        }
    };

    return (
        <div className={styles.workspace} style={{ display: 'flex', flexDirection: 'column', boxSizing: 'border-box', maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Search bar autocomplete section */}
            <div className={styles.searchBox}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Select Student to Grade:</label>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Type Registration ID or Participant Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && filteredSearchStudents.length > 0) {
                                onSelectStudent(filteredSearchStudents[0]);
                            }
                        }}
                    />
                </div>

                {/* Autocomplete Dropdown List */}
                {searchQuery.trim() !== '' && (
                    <div className={styles.autocompleteList}>
                        {filteredSearchStudents.length === 0 ? (
                            <div style={{ padding: '12px 16px', color: '#64748b', fontSize: '14px' }}>No matches found in this venue</div>
                        ) : (
                            filteredSearchStudents.map(student => (
                                <div
                                    key={student.participant_id}
                                    onClick={() => onSelectStudent(student)}
                                    className={styles.autocompleteItem}
                                >
                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{student.full_name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                        <span>ID: {student.register_id}</span>
                                        <span>Category: {student.category}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Active Grading Sheet Grid */}
            {selectedStudent ? (
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
                    {/* Student details header card */}
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={18} style={{ color: '#059669' }} />
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{selectedStudent.full_name}</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                                <span><strong>Reg ID:</strong> {selectedStudent.register_id}</span>
                                <span><strong>Category:</strong> {selectedStudent.category}</span>
                                <span><strong>Venue:</strong> {selectedStudent.allocated_venue || 'Unassigned'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#475569', fontWeight: '700', transition: 'all 0.2s' }}
                                >
                                    ← Back to Student List
                                </button>
                            )}
                            {/* View Marksheet button — admin only */}
                            {user?.designation === 'admin' && (
                                <button
                                    onClick={() => setShowMarksheetViewer(true)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#ffffff', fontWeight: '700', transition: 'all 0.2s' }}
                                >
                                    <Images size={15} /> View Marksheet
                                </button>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: selectedStudent.is_frozen ? '#fee2e2' : '#e0f2fe', color: selectedStudent.is_frozen ? '#991b1b' : '#0369a1', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                <Shield size={14} /> {selectedStudent.is_frozen ? 'Locked / Frozen' : 'Open for Grading'}
                            </span>
                        </div>
                    </div>
                    {/* Lock notifications */}
                    {finalistsPromoted && (
                        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', color: '#991b1b', fontSize: '14px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <Shield size={16} /> Preliminary marks are permanently locked because finalists have already been promoted for this category.
                        </div>
                    )}
                    {!finalistsPromoted && !isAdmin && (selectedStudent.is_frozen || selectedStudent.entered_by) && (
                        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', color: '#b45309', fontSize: '14px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <Shield size={16} /> This marksheet has been submitted and is locked. Only an Administrator can unlock and edit it.
                        </div>
                    )}

                    {/* Warnings if Template unconfigured */}
                    {criteria.length === 0 ? (
                        <div style={{ border: '1px dashed #ef4444', backgroundColor: '#fef2f2', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#991b1b', marginBottom: '24px', flexShrink: 0 }}>
                            <AlertTriangle size={32} style={{ margin: '0 auto 12px' }} />
                            <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>Template Unconfigured</h4>
                            <p style={{ margin: 0, fontSize: '13px' }}>Please go to "Configure Templates" first to setup dynamic scoring aspects for this round and category ({selectedStudent.category}).</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
                            {/* Scrollable middle container */}
                            <div style={{ overflowX: 'auto', marginBottom: '16px', paddingRight: '8px', maxWidth: '100%' }}>
                                {judges.length === 0 ? (
                                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                                        No judges assigned to this venue yet. Assign judges in Venue configuration first.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                        {judges.map((judge, judgeIdx) => (
                                            <div key={judge.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                                {/* Judge header */}
                                                <div style={{ backgroundColor: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <User size={16} style={{ color: '#0d9488' }} /> Judge: {judge.name}
                                                    </h4>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#059669' }}>
                                                        Judge Total: {totals.judgeTotals[judge.id] || 0} / {calculateTotalTemplateMarks()} Points
                                                    </span>
                                                </div>

                                                {/* Excel-like scoring table grid */}
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '14px', minWidth: '600px' }}>
                                                        <thead>
                                                            {/* Row 1: Spanning Aspect Labels */}
                                                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                                <th style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0', fontWeight: '800', color: '#1e293b', width: '80px' }} rowSpan={2}>Total</th>
                                                                {criteria.map(c => (
                                                                    <th key={c.key} style={{ padding: '10px 16px', borderRight: '1px solid #e2e8f0', fontWeight: '800', color: '#1e293b' }} colSpan={c.numQuestions}>
                                                                        {c.label}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                            {/* Row 2: Sub-column / Max Marks */}
                                                            <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1' }}>
                                                                {criteria.map(c => {
                                                                    const cols = [];
                                                                    for (let i = 0; i < c.numQuestions; i++) {
                                                                        cols.push(
                                                                            <th key={`${c.key}-${i}`} style={{ padding: '6px 12px', borderRight: '1px solid #cbd5e1', color: '#059669', fontWeight: '700', fontSize: '12px' }}>
                                                                                Max {c.outOf}
                                                                            </th>
                                                                        );
                                                                    }
                                                                    return cols;
                                                                })}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {/* Row 3: Score Inputs */}
                                                            <tr>
                                                                <td style={{ padding: '14px', borderRight: '1px solid #cbd5e1', fontWeight: '800', backgroundColor: '#f0fdf4', color: '#15803d' }}>
                                                                    {totals.judgeTotals[judge.id] || 0}
                                                                </td>
                                                                {(() => {
                                                                    let colIdx = 0;
                                                                    return criteria.map(c => {
                                                                        const cols = [];
                                                                        for (let i = 0; i < c.numQuestions; i++) {
                                                                            const currentColIdx = colIdx;
                                                                            colIdx++;
                                                                            const currentVal = scoringValues[judge.id]?.[c.key]?.[i] ?? '';
                                                                            const isEmpty = currentVal === '';
                                                                            const isExceeded = currentVal !== '' && Number(currentVal) > Number(c.outOf);
                                                                            const hasError = isEmpty || isExceeded;

                                                                            cols.push(
                                                                                <td key={`${c.key}-${i}`} style={{ padding: '10px', borderRight: '1px solid #e2e8f0' }}>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        max={c.outOf}
                                                                                        step="1"
                                                                                        placeholder="0"
                                                                                        value={currentVal}
                                                                                        title={isExceeded ? `Score cannot exceed Max ${c.outOf}` : ''}
                                                                                        disabled={!isEditable}
                                                                                        data-judge-idx={judgeIdx}
                                                                                        data-col-idx={currentColIdx}
                                                                                        onFocus={(e) => {
                                                                                            e.target.select();
                                                                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                                                                                        }}
                                                                                        onKeyDown={(e) => handleKeyDown(e, judgeIdx, currentColIdx)}
                                                                                        onChange={(e) => {
                                                                                            // Enforce integer-only values
                                                                                            const rawVal = e.target.value;
                                                                                            const val = rawVal === '' ? '' : Math.max(0, parseInt(rawVal) || 0);
                                                                                            setScoringValues((prev: any) => ({
                                                                                                ...prev,
                                                                                                [judge.id]: {
                                                                                                    ...prev[judge.id],
                                                                                                    [c.key]: {
                                                                                                        ...prev[judge.id]?.[c.key],
                                                                                                        [i]: val
                                                                                                    }
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                        style={{
                                                                                            width: '60px',
                                                                                            padding: '6px 8px',
                                                                                            border: hasError ? '2px solid #ef4444' : '1px solid #cbd5e1',
                                                                                            backgroundColor: hasError ? '#fef2f2' : '#ffffff',
                                                                                            borderRadius: '4px',
                                                                                            textAlign: 'center',
                                                                                            fontWeight: '700',
                                                                                            outline: 'none',
                                                                                            transition: 'all 0.2s'
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            );
                                                                        }
                                                                        return cols;
                                                                    });
                                                                })()}
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Grand Summary Board */}
                            <div id="grand-summary-board" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, marginRight: '24px' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '14px', color: '#166534', fontWeight: '700' }}>COMPUTED GRAND SUMMARY</h4>
                                        <div style={{ display: 'flex', gap: '24px', marginTop: '6px' }}>
                                            <span style={{ fontSize: '13px', color: '#166534' }}>
                                                <strong>Total Accumulation:</strong> {totals.grandTotal} Score
                                            </span>
                                            <span style={{ fontSize: '13px', color: '#166534' }}>
                                                <strong>Average Score:</strong> {totals.grandAverage} Score
                                            </span>
                                        </div>
                                    </div>

                                    {/* Criteria Accumulations */}
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', borderTop: '1px dashed #bbf7d0', paddingTop: '10px' }}>
                                        {criteria.map((c) => {
                                            const total = getCategoryAccumulation(c.key);
                                            const maxScore = (judges?.length || 0) * c.numQuestions * (c.outOf || 0);
                                            return (
                                                <span
                                                    key={c.key}
                                                    style={{
                                                        fontSize: '12px',
                                                        color: '#166534',
                                                        backgroundColor: '#dcfce7',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #bbf7d0',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    <strong>{c.label}:</strong> {total} / {maxScore}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    {((selectedStudent.is_frozen || selectedStudent.entered_by) && !isUnlocked) ? (
                                        isAdmin && !finalistsPromoted ? (
                                            <button
                                                onClick={() => setShowPasswordPrompt(true)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', backgroundColor: '#d97706', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: '800', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 10px -2px rgba(217, 119, 6, 0.3)', transition: 'all 0.2s' }}
                                            >
                                                <Shield size={18} /> Edit Marks (Unlock)
                                            </button>
                                        ) : null
                                    ) : (
                                        <>
                                            {selectedStudent.is_frozen && isUnlocked && (
                                                <button
                                                    onClick={handleCancelEdit}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' }}
                                                >
                                                    Cancel Edit
                                                </button>
                                            )}
                                            {isEditable && (
                                                <button
                                                    onClick={onSaveMarks}
                                                    disabled={disableSave}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '12px 28px',
                                                        backgroundColor: disableSave ? '#a7f3d0' : '#059669',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        color: '#ffffff',
                                                        fontWeight: '800',
                                                        cursor: disableSave ? 'not-allowed' : 'pointer',
                                                        fontSize: '15px',
                                                        boxShadow: disableSave ? 'none' : '0 4px 10px -2px rgba(5, 150, 105, 0.3)',
                                                        transition: 'all 0.2s',
                                                        opacity: disableSave ? 0.7 : 1
                                                    }}
                                                >
                                                    <CheckCircle size={18} /> {isSaving ? 'Submitting...' : 'Save & Freeze Marks'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#94a3b8', flex: 1 }}>
                    <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#64748b' }}>No Student Selected</h4>
                    <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>Use the search box above or select from the side tabs to start scoring.</p>
                </div>
            )}
            {/* Marksheet Viewer Modal */}
            {showMarksheetViewer && selectedStudent && (
                <MarksheetViewer
                    participantId={selectedStudent.participant_id}
                    round={currentRound}
                    participantName={selectedStudent.full_name}
                    onClose={() => setShowMarksheetViewer(false)}
                />
            )}

            {/* Password Prompt Modal */}
            {showPasswordPrompt && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '400px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={20} style={{ color: '#d97706' }} /> Unlock Sheet for Editing
                        </h3>
                        <p style={{ fontSize: '14px', color: '#475569', marginTop: '8px', lineHeight: '1.5' }}>
                            This marksheet is frozen. Please enter your account password to unlock it for editing.
                        </p>

                        <div style={{ marginTop: '16px' }}>
                            <input
                                type="password"
                                placeholder="Enter password..."
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUnlockConfirm();
                                }}
                                autoFocus
                            />
                            {passwordError && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', fontWeight: '600' }}>
                                    {passwordError}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button
                                onClick={handleUnlockCancel}
                                disabled={verifyingPassword}
                                style={{ padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUnlockConfirm}
                                disabled={verifyingPassword}
                                style={{ padding: '8px 20px', backgroundColor: '#d97706', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: verifyingPassword ? 0.7 : 1 }}
                            >
                                {verifyingPassword ? 'Verifying...' : 'Unlock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
