import { getCompactJuzLabel } from '../venuePrintTemplates';

interface Participant {
    id: string;
    full_name: string;
    participant_id: string;
    category: string;
    selected_juz: string;
    juzz_options?: string;
    allocated_venue: string;
    allocated_order: number;
    final_venue?: string;
    final_order?: number;
    arrival_status?: string; // Explicitly defining field support matching backend response
    expand?: { institution_ref?: { name: string } };
}

interface ParticipantTableProps {
    filteredCandidates: Participant[];
    isVenueEditMode: boolean;
    isAdmin: boolean;
    loadingCandidates: boolean;
    editAllocations: Record<string, { venue: string; order: number }>;
    venues: any[];
    handleMoveOrder: (index: number, direction: 'up' | 'down') => void;
    handleFieldChange: (id: string, field: 'venue' | 'order', value: any) => void;
    handleSaveInlineAllocation: (id: string) => void;
    isFinalRound?: boolean;
}

export default function ParticipantTable({
    filteredCandidates,
    isVenueEditMode,
    isAdmin,
    loadingCandidates,
    editAllocations,
    venues,
    handleMoveOrder,
    handleFieldChange,
    handleSaveInlineAllocation,
    isFinalRound = false
}: ParticipantTableProps) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Participant Name</th>
                        <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Institution</th>
                        <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Sequence Order</th>
                        <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Category</th>
                        <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Juz Option</th>
                        {isAdmin && isVenueEditMode && (
                            <>
                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Allocated Venue</th>
                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Actions</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {filteredCandidates.map((c, index) => {
                        const venueVal = isFinalRound ? (c.final_venue || '') : (c.allocated_venue || '');
                        const orderVal = isFinalRound ? (c.final_order || 0) : (c.allocated_order || 0);

                        const isModified = editAllocations[c.id] && (
                            editAllocations[c.id].venue !== venueVal ||
                            editAllocations[c.id].order !== orderVal
                        );
                        const currentVenueVal = editAllocations[c.id]?.venue ?? venueVal;
                        const currentOrderVal = editAllocations[c.id]?.order ?? orderVal;

                        // Check if the current student candidate item has been checked in as absent
                        const isAbsent = c.arrival_status === 'absent';

                        return (
                            <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isAbsent ? '#fff5f5' : 'transparent' }}>
                                <td style={{ padding: '14px 20px', fontWeight: 'bold', color: isAbsent ? '#94a3b8' : '#1e293b' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {isVenueEditMode && isAdmin && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '6px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveOrder(index, 'up')}
                                                    disabled={index === 0 || loadingCandidates}
                                                    style={{ padding: '2px 4px', fontSize: '8px', cursor: 'pointer', background: '#e2e8f0', border: 'none', borderRadius: '3px' }}
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveOrder(index, 'down')}
                                                    disabled={index === filteredCandidates.length - 1 || loadingCandidates}
                                                    style={{ padding: '2px 4px', fontSize: '8px', cursor: 'pointer', background: '#e2e8f0', border: 'none', borderRadius: '3px' }}
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                        )}
                                        <span style={{ minWidth: '24px', color: '#64748b' }}>{orderVal || index + 1}.</span>
                                        <span style={{ textDecoration: isAbsent ? 'line-through' : 'none' }}>{c.full_name}</span>

                                        {/* Dynamic Inline Red Absent Badge Placement Row */}
                                        {isAbsent && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '2px 8px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                borderRadius: '9999px',
                                                backgroundColor: '#fee2e2',
                                                color: '#ef4444',
                                                border: '1px solid #fca5a5',
                                                marginLeft: '4px'
                                            }}>
                                                ABSENT
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '14px 20px', color: isAbsent ? '#cbd5e1' : '#475569' }}>
                                    {c.expand?.institution_ref?.name || <span style={{ color: '#94a3b8' }}>—</span>}
                                </td>
                                <td style={{ padding: '14px 20px', color: isAbsent ? '#cbd5e1' : '#059669', fontWeight: 'bold' }}>
                                    {isVenueEditMode && isAdmin ? (
                                        <input
                                            type="number"
                                            value={currentOrderVal}
                                            onChange={(e) => handleFieldChange(c.id, 'order', Number(e.target.value))}
                                            style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                            min={0}
                                        />
                                    ) : (
                                        orderVal || index + 1
                                    )}
                                </td>
                                <td style={{ padding: '14px 20px' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        backgroundColor: isAbsent ? '#f1f5f9' : '#e0f2fe',
                                        color: isAbsent ? '#94a3b8' : '#0369a1'
                                    }}>
                                        {c.category === '5_juz' ? '5 Juz' : c.category === '15_juz' ? '15 Juz' : '30 Juz'}
                                    </span>
                                </td>
                                <td style={{ padding: '14px 20px', color: isAbsent ? '#cbd5e1' : '#475569' }}>
                                    {c.juzz_options ? getCompactJuzLabel(c.juzz_options) : (c.selected_juz || <span style={{ color: '#94a3b8' }}>—</span>)}
                                </td>
                                {isAdmin && isVenueEditMode && (
                                    <>
                                        <td style={{ padding: '14px 20px' }}>
                                            <select
                                                value={currentVenueVal}
                                                onChange={(e) => handleFieldChange(c.id, 'venue', e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '180px' }}
                                            >
                                                <option value="">No Venue / Unallocated</option>
                                                <option value="none">Unallocated (Absent)</option>
                                                {venues.filter(v => v.category === c.category && (isFinalRound ? v.round === 'final' : v.round !== 'final')).map(v => (
                                                    <option key={v.id} value={v.name}>{v.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            {isModified && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveInlineAllocation(c.id)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        backgroundColor: '#059669',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Save
                                                </button>
                                            )}
                                        </td>
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}