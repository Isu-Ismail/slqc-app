import { useState } from 'react';
import { pb } from '../../api/db';
import { ArrowLeft, Save, Plus, Trash2, RefreshCw, Lock } from 'lucide-react';
import styles from './MarkEntryPage.module.css';

interface TemplateEditorProps {
    editRound: 'preliminary' | 'final';
    setEditRound: (round: 'preliminary' | 'final') => void;
    editCategory: '5_juz' | '15_juz' | '30_juz';
    setEditCategory: (cat: '5_juz' | '15_juz' | '30_juz') => void;
    tplCriteria: any[]; // Array of criteria: { key, label, numQuestions, outOf }
    tplLoading: boolean;
    tplSaving: boolean;
    onSave: () => void;
    onBack: () => void;
    addCriterion: () => void;
    updateCriterion: (index: number, field: string, value: any) => void;
    removeCriterion: (index: number) => void;
    hasExistingMarks: boolean;
    isLocked: boolean;
    setIsLocked: (locked: boolean) => void;
    onPasteAspectNames?: (startIndex: number, names: string[]) => void;
}

export default function TemplateEditor({
    editRound,
    setEditRound,
    editCategory,
    setEditCategory,
    tplCriteria,
    tplLoading,
    tplSaving,
    onSave,
    onBack,
    addCriterion,
    updateCriterion,
    removeCriterion,
    hasExistingMarks,
    isLocked,
    setIsLocked,
    onPasteAspectNames
}: TemplateEditorProps) {

    // Unlock modal states
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [password, setPassword] = useState('');
    const [phrase, setPhrase] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [modalError, setModalError] = useState('');

    const handleUnlockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phrase !== 'I WANT TO EDIT') {
            setModalError("Please type 'I WANT TO EDIT' exactly (all caps).");
            return;
        }

        setVerifying(true);
        setModalError('');
        try {
            await pb.send('/api/admin/verify-password', {
                method: 'POST',
                body: { password }
            });
            setIsLocked(false);
            setShowUnlockModal(false);
            setPassword('');
            setPhrase('');
        } catch (err: any) {
            console.error('Verify password failed:', err);
            setModalError(err.message || 'Incorrect password.');
        } finally {
            setVerifying(false);
        }
    };

    // Helper to calculate total template marks
    const calculateTotalMarks = () => {
        return tplCriteria.reduce((sum, c) => sum + ((c.numQuestions || 0) * (c.outOf || 0)), 0);
    };

    return (
        <div className={styles.card}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <button onClick={onBack} className={styles.btnSec}>
                        <ArrowLeft size={16} /> Back to Mark Entry
                    </button>
                    <h2 className={styles.title}>Template Configuration</h2>
                </div>

                {isLocked ? (
                    <button
                        onClick={() => setShowUnlockModal(true)}
                        className={styles.btnPrim}
                        style={{ backgroundColor: '#d97706', borderColor: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Lock size={18} /> Edit Template (Locked)
                    </button>
                ) : (
                    <button
                        onClick={onSave}
                        disabled={tplSaving || tplLoading}
                        className={styles.btnPrim}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Save size={18} /> {tplSaving ? 'Saving...' : 'Save Template Configuration'}
                    </button>
                )}
            </div>

            {/* Warning Banner */}
            {(hasExistingMarks || (tplCriteria.length > 0 && isLocked) || !isLocked) && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: hasExistingMarks ? '#fee2e2' : isLocked ? '#fef3c7' : '#fee2e2',
                    borderLeft: '4px solid ' + (hasExistingMarks ? '#ef4444' : isLocked ? '#d97706' : '#ef4444'),
                    color: hasExistingMarks ? '#991b1b' : isLocked ? '#92400e' : '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    fontWeight: '600'
                }}>
                    <Lock size={16} />
                    {hasExistingMarks ? (
                        isLocked ? (
                            <span> Marks exist. Template is locked. Click "Edit Template" to unlock. You will only be allowed to edit Aspect Names.</span>
                        ) : (
                            <span> Template unlocked. You can ONLY modify Aspect Names because marks exist. Adding, removing, or changing column count/max score is disabled.</span>
                        )
                    ) : isLocked ? (
                        <span> Template is locked to prevent accidental changes. Click "Edit Template" to unlock.</span>
                    ) : (
                        <span> Template unlocked. Modify aspects with extreme caution, as changes may affect calculation of existing marks.</span>
                    )}
                </div>
            )}

            {/* Filter Segment */}
            <div className={styles.filterBar}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Select Competition Round</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setEditRound('preliminary')}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid ' + (editRound === 'preliminary' ? '#059669' : '#cbd5e1'), backgroundColor: editRound === 'preliminary' ? '#f0fdf4' : '#ffffff', color: editRound === 'preliminary' ? '#065f46' : '#475569', fontWeight: '600', cursor: 'pointer' }}
                        >
                            Preliminary Round
                        </button>
                        <button
                            onClick={() => setEditRound('final')}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid ' + (editRound === 'final' ? '#059669' : '#cbd5e1'), backgroundColor: editRound === 'final' ? '#f0fdf4' : '#ffffff', color: editRound === 'final' ? '#065f46' : '#475569', fontWeight: '600', cursor: 'pointer' }}
                        >
                            Final Round
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Select Category</label>
                    <select
                        value={editCategory}
                        onChange={(e: any) => setEditCategory(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '14px', fontWeight: '600', outline: 'none' }}
                    >
                        <option value="5_juz">5 Juz</option>
                        <option value="15_juz">15 Juz</option>
                        <option value="30_juz">30 Juz</option>
                    </select>
                </div>
            </div>

            {tplLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite', color: '#059669' }} />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Horizontal Excel-like Grid Configurator using HTML Table for Perfect Row Alignment */}
                    <div className={styles.editorSection} style={{ padding: '20px', overflowX: 'auto' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                            Excel-like Template Configurator (Horizontal Grid)
                        </h3>

                        <table style={{ borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff', width: 'auto' }}>
                            <tbody>
                                {/* Row 1: Aspect Label */}
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ width: '180px', padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '13px', backgroundColor: '#f8fafc', borderRight: '2px solid #cbd5e1', whiteSpace: 'normal' }}>
                                        Aspect Label (e.g. Hifz / تجويد)
                                    </td>
                                    {tplCriteria.map((c, idx) => (
                                        <td key={c.key || idx} style={{ width: '150px', padding: '6px', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                                            {isLocked ? (
                                                <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '14px', padding: '8px 0', color: '#1e293b' }}>{c.label || ''}</div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={c.label || ''}
                                                    onChange={(e) => updateCriterion(idx, 'label', e.target.value)}
                                                    onPaste={(e) => {
                                                        const pastedText = e.clipboardData.getData('text');
                                                        if (pastedText && pastedText.includes(',')) {
                                                            e.preventDefault();
                                                            const names = pastedText.split(',').map(p => p.trim()).filter(Boolean);
                                                            onPasteAspectNames?.(idx, names);
                                                        }
                                                    }}
                                                    placeholder="Aspect Name"
                                                    style={{ width: '100%', height: '36px', border: '1px solid transparent', borderRadius: '4px', padding: '0 8px', fontSize: '14px', fontWeight: '700', textAlign: 'center', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                                                    onFocus={(e) => e.target.style.border = '1px solid #10b981'}
                                                    onBlur={(e) => e.target.style.border = '1px solid transparent'}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    {/* Add Aspect Button Cell spanning all rows */}
                                    {!isLocked && !hasExistingMarks && (
                                        <td style={{ width: '140px', backgroundColor: '#fafafa', borderLeft: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', verticalAlign: 'middle' }} rowSpan={5}>
                                            <button
                                                onClick={addCriterion}
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '20px 10px', width: '100%', minHeight: '190px', color: '#475569', cursor: 'pointer', backgroundColor: '#ffffff', transition: 'all 0.2s', outline: 'none', boxSizing: 'border-box' }}
                                                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                                            >
                                                <Plus size={20} />
                                                <span style={{ fontSize: '12px', fontWeight: '700' }}>Add Aspect</span>
                                            </button>
                                        </td>
                                    )}
                                </tr>

                                {/* Row 2: Number of Columns */}
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '13px', backgroundColor: '#f8fafc', borderRight: '2px solid #cbd5e1' }}>
                                        Number of Columns
                                    </td>
                                    {tplCriteria.map((c, idx) => {
                                        const val = c.numQuestions ?? '';
                                        const isInvalid = val === '' || parseInt(val.toString()) <= 0;
                                        return (
                                            <td key={c.key || idx} style={{ padding: '6px', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                                                {(isLocked || hasExistingMarks) ? (
                                                    <div style={{ textAlign: 'center', fontWeight: '600', fontSize: '14px', padding: '8px 0', color: '#1e293b' }}>{val}</div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        onChange={(e) => {
                                                            const clean = e.target.value.replace(/[^0-9]/g, '');
                                                            updateCriterion(idx, 'numQuestions', clean === '' ? '' : parseInt(clean));
                                                        }}
                                                        placeholder="e.g. 2"
                                                        style={{
                                                            width: '100%',
                                                            height: '36px',
                                                            border: isInvalid ? '1px solid #ef4444' : '1px solid transparent',
                                                            borderRadius: '4px',
                                                            padding: '0 8px',
                                                            fontSize: '14px',
                                                            fontWeight: '600',
                                                            textAlign: 'center',
                                                            backgroundColor: isInvalid ? '#fef2f2' : '#ffffff',
                                                            outline: 'none',
                                                            boxSizing: 'border-box',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onFocus={(e) => { if (!isInvalid) e.target.style.border = '1px solid #10b981'; }}
                                                        onBlur={(e) => { if (!isInvalid) e.target.style.border = '1px solid transparent'; }}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Row 3: Out of per Column */}
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', fontSize: '13px', backgroundColor: '#f8fafc', borderRight: '2px solid #cbd5e1' }}>
                                        Out of (per Column)
                                    </td>
                                    {tplCriteria.map((c, idx) => {
                                        const val = c.outOf ?? '';
                                        const isInvalid = val === '' || parseFloat(val.toString()) <= 0;
                                        return (
                                            <td key={c.key || idx} style={{ padding: '6px', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                                                {(isLocked || hasExistingMarks) ? (
                                                    <div style={{ textAlign: 'center', fontWeight: '600', fontSize: '14px', padding: '8px 0', color: '#1e293b' }}>{val}</div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        onChange={(e) => {
                                                            let clean = e.target.value.replace(/[^0-9.]/g, '');
                                                            const parts = clean.split('.');
                                                            if (parts.length > 2) {
                                                                clean = parts[0] + '.' + parts.slice(1).join('');
                                                            }
                                                            updateCriterion(idx, 'outOf', clean === '' ? '' : clean);
                                                        }}
                                                        placeholder="e.g. 10"
                                                        style={{
                                                            width: '100%',
                                                            height: '36px',
                                                            border: isInvalid ? '1px solid #ef4444' : '1px solid transparent',
                                                            borderRadius: '4px',
                                                            padding: '0 8px',
                                                            fontSize: '14px',
                                                            fontWeight: '600',
                                                            textAlign: 'center',
                                                            backgroundColor: isInvalid ? '#fef2f2' : '#ffffff',
                                                            outline: 'none',
                                                            boxSizing: 'border-box',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onFocus={(e) => { if (!isInvalid) e.target.style.border = '1px solid #10b981'; }}
                                                        onBlur={(e) => { if (!isInvalid) e.target.style.border = '1px solid transparent'; }}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Row 4: Total Aspect Marks */}
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1e293b', fontSize: '13px', backgroundColor: '#f0fdf4', borderRight: '2px solid #cbd5e1' }}>
                                        Total Aspect Marks
                                    </td>
                                    {tplCriteria.map((c, idx) => {
                                        const totalAspect = (c.numQuestions || 0) * (c.outOf || 0);
                                        return (
                                            <td key={c.key || idx} style={{ padding: '12px', borderRight: '1px solid #e2e8f0', fontWeight: '800', color: '#166534', backgroundColor: '#f0fdf4', fontSize: '14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                {totalAspect}
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Row 5: Action */}
                                {!isLocked && !hasExistingMarks && (
                                    <tr>
                                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#e11d48', fontSize: '13px', backgroundColor: '#f8fafc', borderRight: '2px solid #cbd5e1' }}>
                                            Action
                                        </td>
                                        {tplCriteria.map((c, idx) => (
                                            <td key={c.key || idx} style={{ padding: '8px', borderRight: '1px solid #e2e8f0', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <button
                                                    onClick={() => removeCriterion(idx)}
                                                    className={styles.deleteBtn}
                                                    style={{ padding: '6px 12px', borderRadius: '6px', margin: '0 auto' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Live Sheet Preview Generator */}
                    <div className={styles.editorSection} style={{ backgroundColor: '#fafafa', border: '1px dashed #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: '#334155' }}>
                            Generated Marksheet Layout Preview (Total: {calculateTotalMarks()} Marks)
                        </h4>

                        {tplCriteria.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Setup aspects to preview layout.</p>
                        ) : (
                            <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'center', fontSize: '14px', minWidth: '600px' }}>
                                    <colgroup>
                                        <col style={{ width: '80px' }} />
                                        {tplCriteria.map((c, idx) => {
                                            const cols = [];
                                            const numQ = c.numQuestions || 1;
                                            for (let i = 0; i < numQ; i++) {
                                                cols.push(<col key={`${c.key || idx}-${i}`} />);
                                            }
                                            return cols;
                                        })}
                                    </colgroup>
                                    <thead>
                                        {/* Spanning Labels Row */}
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                                            <th style={{ padding: '10px 16px', borderRight: '1px solid #cbd5e1', fontWeight: '800', color: '#1e293b' }} rowSpan={2}>Total</th>
                                            {tplCriteria.map((c, idx) => (
                                                <th key={c.key || idx} style={{ padding: '10px 16px', borderRight: '1px solid #cbd5e1', fontWeight: '800', color: '#1e293b' }} colSpan={c.numQuestions || 1}>
                                                    {c.label || 'Aspect'}
                                                </th>
                                            ))}
                                        </tr>
                                        {/* Max Marks Row */}
                                        <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #cbd5e1' }}>
                                            {tplCriteria.map((c, idx) => {
                                                const cols = [];
                                                const numQ = c.numQuestions || 1;
                                                for (let i = 0; i < numQ; i++) {
                                                    cols.push(
                                                        <th key={`${c.key || idx}-${i}`} style={{ padding: '6px 12px', borderRight: '1px solid #e2e8f0', color: '#059669', fontWeight: '700', fontSize: '12px' }}>
                                                            {c.outOf || 0}
                                                        </th>
                                                    );
                                                }
                                                return cols;
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Sample Data Entry Row */}
                                        <tr>
                                            <td style={{ padding: '14px', borderRight: '1px solid #cbd5e1', fontWeight: '800', backgroundColor: '#f0fdf4', color: '#15803d' }}>
                                                {calculateTotalMarks()}
                                            </td>
                                            {tplCriteria.map((c, idx) => {
                                                const cols = [];
                                                const numQ = c.numQuestions || 1;
                                                for (let i = 0; i < numQ; i++) {
                                                    cols.push(
                                                        <td key={`${c.key || idx}-${i}`} style={{ padding: '10px', borderRight: '1px solid #e2e8f0', backgroundColor: '#ffffff', height: '42px' }}>
                                                            {/* Empty cell */}
                                                        </td>
                                                    );
                                                }
                                                return cols;
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Unlock Modal */}
            {showUnlockModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '440px',
                        padding: '24px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                            Unlock Template Editor
                        </h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                            Marks are already entered for this category. Modifying this template requires administrator authentication and confirmation.
                        </p>

                        <form onSubmit={handleUnlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                                    Admin Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter administrator password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        outline: 'none',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                                    Type <strong style={{ color: '#ef4444' }}>I WANT TO EDIT</strong> to confirm
                                </label>
                                <input
                                    type="text"
                                    value={phrase}
                                    onChange={(e) => setPhrase(e.target.value)}
                                    placeholder="I WANT TO EDIT"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        outline: 'none',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {modalError && (
                                <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                                    {modalError}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUnlockModal(false);
                                        setPassword('');
                                        setPhrase('');
                                        setModalError('');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#ffffff',
                                        color: '#475569',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={verifying}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#ef4444',
                                        color: '#ffffff',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {verifying ? 'Verifying...' : 'Unlock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
