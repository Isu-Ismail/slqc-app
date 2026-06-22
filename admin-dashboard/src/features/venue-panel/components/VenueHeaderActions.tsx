import { Printer } from 'lucide-react';

interface VenueHeaderActionsProps {
    currentVenue: any;
    printing: boolean;
    loadingCandidates: boolean;
    onPrintList: () => void;
    onGenerateMarksheet: () => void;
}

export default function VenueHeaderActions({
    currentVenue,
    printing,
    loadingCandidates,
    onPrintList,
    onGenerateMarksheet
}: VenueHeaderActionsProps) {
    let judgesList: any[] = [];
    if (currentVenue) {
        if (currentVenue.judges) {
            if (Array.isArray(currentVenue.judges)) {
                judgesList = currentVenue.judges;
            } else if (typeof currentVenue.judges === 'string') {
                try {
                    judgesList = JSON.parse(currentVenue.judges);
                } catch (_) {
                    judgesList = [currentVenue.judges];
                }
            }
        }
        const hasObjects = judgesList.some(j => j && typeof j === 'object');
        if (!hasObjects && currentVenue.expand?.judges) {
            judgesList = Array.isArray(currentVenue.expand.judges) ? currentVenue.expand.judges : [currentVenue.expand.judges];
        }
        judgesList = judgesList.map(j => {
            if (j && typeof j === 'object') return j;
            return { id: j, name: j, phone_number: '' };
        });
    }

    return (
        <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
        }}>
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                    {currentVenue.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', margin: 0, padding: 0 }}>
                    {currentVenue.description || 'No description provided.'} • Category: <strong style={{ color: '#059669' }}>{currentVenue.category === '5_juz' ? '5 Juz' : currentVenue.category === '15_juz' ? '15 Juz' : '30 Juz'}</strong>
                </p>
                {judgesList.length > 0 ? (
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>Assigned Judges:</span>
                        {judgesList.map((j: any) => (
                            <span key={j.id} style={{
                                fontSize: '12px',
                                backgroundColor: '#059669',
                                color: '#ffffff',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: '500',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                {j.name} <span style={{ opacity: 0.85, fontSize: '11px' }}>({j.phone_number})</span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                        No judges assigned to this venue
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Capacity Utilization</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                        {currentVenue.allocatedCount || 0} / {currentVenue.capacity}
                    </div>
                </div>
                <button
                    onClick={onPrintList}
                    disabled={printing || loadingCandidates}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        backgroundColor: '#065f46',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '13px',
                        opacity: (printing || loadingCandidates) ? 0.7 : 1
                    }}
                >
                    <Printer size={15} /> Print List
                </button>
                <button
                    onClick={onGenerateMarksheet}
                    disabled={printing || loadingCandidates}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '13px',
                        opacity: (printing || loadingCandidates) ? 0.7 : 1
                    }}
                >
                    <Printer size={15} /> {printing ? 'Generating...' : 'Generate Marksheets'}
                </button>
            </div>
        </div>
    );
}