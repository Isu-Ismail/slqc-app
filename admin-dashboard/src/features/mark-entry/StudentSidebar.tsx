import { RefreshCw, Check } from 'lucide-react';
import styles from './MarkEntryPage.module.css';

interface StudentSidebarProps {
    sidebarTab: 'pending' | 'completed';
    setSidebarTab: (tab: 'pending' | 'completed') => void;
    pendingStudents: any[];
    completedStudents: any[];
    selectedStudent: any | null;
    onSelectStudent: (student: any) => void;
    loading: boolean;
    isModalMode?: boolean;
}

export default function StudentSidebar({
    sidebarTab,
    setSidebarTab,
    pendingStudents,
    completedStudents,
    selectedStudent,
    onSelectStudent,
    loading,
    isModalMode
}: StudentSidebarProps) {
    const hasCachedMarks = (participantId: string) => {
        const cached = localStorage.getItem(`quran_scoring_cache_${participantId}`);
        if (!cached) return false;
        try {
            const parsed = JSON.parse(cached);
            for (const judgeId in parsed) {
                for (const cKey in parsed[judgeId]) {
                    for (const i in parsed[judgeId][cKey]) {
                        const val = parsed[judgeId][cKey][i];
                        if (val !== '' && val !== null && val !== undefined) {
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            return false;
        }
        return false;
    };

    return (
        <div className={isModalMode ? '' : styles.sidebar} style={isModalMode ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined}>
            <div className={styles.sidebarTabs}>
                <button
                    onClick={() => setSidebarTab('pending')}
                    className={styles.tabBtn}
                    style={{
                        borderBottom: '3px solid ' + (sidebarTab === 'pending' ? '#059669' : 'transparent'),
                        color: sidebarTab === 'pending' ? '#059669' : '#64748b'
                    }}
                >
                    Pending ({pendingStudents.length})
                </button>
                <button
                    onClick={() => setSidebarTab('completed')}
                    className={styles.tabBtn}
                    style={{
                        borderBottom: '3px solid ' + (sidebarTab === 'completed' ? '#059669' : 'transparent'),
                        color: sidebarTab === 'completed' ? '#059669' : '#64748b'
                    }}
                >
                    Completed ({completedStudents.length})
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#059669' }} />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: isModalMode ? 'none' : '420px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    {sidebarTab === 'pending' ? (
                        pendingStudents.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>All students graded! Ready for final round validation.</p>
                        ) : (
                            pendingStudents.map(student => (
                                <div
                                    key={student.participant_id}
                                    onClick={() => onSelectStudent(student)}
                                    className={`${styles.studentCard} ${selectedStudent?.participant_id === student.participant_id ? styles.activeStudentCard : ''}`}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{student.full_name}</div>
                                        {hasCachedMarks(student.participant_id) && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                                Editing
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                        <span>ID: {student.register_id}</span>
                                        <span>Cat: {student.category}</span>
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        completedStudents.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>No students completed yet.</p>
                        ) : (
                            completedStudents.map(student => (
                                <div
                                    key={student.participant_id}
                                    onClick={() => onSelectStudent(student)}
                                    className={`${styles.studentCard} ${selectedStudent?.participant_id === student.participant_id ? styles.activeStudentCard : ''}`}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{student.full_name}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {hasCachedMarks(student.participant_id) && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                                    Editing
                                                </span>
                                            )}
                                            <Check size={14} style={{ color: '#059669' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                        <span>ID: {student.register_id}</span>
                                        <span>Score: {student.values?.totals?.grandAverage || 0}</span>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            )}
        </div>
    );
}
