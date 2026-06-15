import { useState, useEffect } from 'react';
import { pb } from '../../api/db';
import { Search, ChevronLeft, Check, X, ShieldAlert, CheckSquare } from 'lucide-react';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../api/track';
import styles from './ArrivalCheckingPage.module.css';

const JUZ_LABELS: Record<string, string> = { '5_juz': '5 Juz', '15_juz': '15 Juz', '30_juz': '30 Juz' };

export default function ArrivalCheckingPage() {
    const [institutions, setInstitutions] = useState<InstitutionsResponse[]>([]);
    const [loadingInsts, setLoadingInsts] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedInst, setSelectedInst] = useState<InstitutionsResponse | null>(null);
    const [students, setStudents] = useState<ParticipantsApplicationResponse[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    
    // Local state for tracking edited arrival status before saving
    // key: student.id, value: 'none' | 'present' | 'absent'
    const [localStatuses, setLocalStatuses] = useState<Record<string, 'none' | 'present' | 'absent'>>({});
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch all institutions on mount
    useEffect(() => {
        const fetchInsts = async () => {
            setLoadingInsts(true);
            try {
                // Fetch approved institutions
                const data = await pb.collection('institutions').getFullList<InstitutionsResponse>({
                    filter: 'status = "approved"',
                    sort: 'name',
                });
                setInstitutions(data);
            } catch (err) {
                console.error("Error fetching institutions:", err);
            } finally {
                setLoadingInsts(false);
            }
        };
        fetchInsts();
    }, []);

    // Fetch students of selected institution (approved only)
    const handleSelectInstitution = async (inst: InstitutionsResponse) => {
        setSelectedInst(inst);
        setLoadingStudents(true);
        setLocalStatuses({});
        setMessage(null);
        try {
            const data = await pb.collection('participants_application').getFullList<ParticipantsApplicationResponse>({
                filter: `institution_ref = "${inst.id}" && status = "approved"`,
                sort: 'full_name',
            });
            setStudents(data);
            
            // Populate initial statuses
            const initial: Record<string, 'none' | 'present' | 'absent'> = {};
            data.forEach(s => {
                initial[s.id] = (s as any).arrival_status || 'none';
            });
            setLocalStatuses(initial);
        } catch (err) {
            console.error("Error fetching students:", err);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleStatusChange = (studentId: string, status: 'present' | 'absent') => {
        setLocalStatuses(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleMarkAll = (status: 'present' | 'absent') => {
        const next: Record<string, 'none' | 'present' | 'absent'> = {};
        students.forEach(s => {
            next[s.id] = status;
        });
        setLocalStatuses(next);
    };

    const handleSubmit = async () => {
        setMessage(null);
        
        // 1. Validation check: ensure no student is left with 'none'
        const unselected = students.filter(s => !localStatuses[s.id] || localStatuses[s.id] === 'none');
        if (unselected.length > 0) {
            setMessage({
                type: 'error',
                text: `Validation failed: ${unselected.length} student(s) have not been marked as Present or Absent.`
            });
            return;
        }

        setSubmitting(true);
        try {
            const updates = Object.entries(localStatuses).map(([id, arrival_status]) => ({
                id,
                arrival_status
            }));

            const response = await pb.send<{ success: boolean }>('/api/admin/batch-arrival-status', {
                method: 'POST',
                body: { updates }
            });

            if (response.success) {
                setMessage({ type: 'success', text: 'Arrival statuses updated successfully.' });
                // Re-fetch or update students state
                setStudents(prev => prev.map(s => ({
                    ...s,
                    arrival_status: localStatuses[s.id]
                })));
            }
        } catch (err: any) {
            console.error("Failed to submit arrival status:", err);
            setMessage({
                type: 'error',
                text: err.data?.error || err.message || 'Failed to save updates.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Filter institutions locally
    const filteredInstitutions = institutions.filter(inst =>
        inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inst.institution_id && inst.institution_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Group students by category
    const categoriesList = ['5_juz', '15_juz', '30_juz'];
    const groupedStudents = categoriesList.reduce((acc, cat) => {
        acc[cat] = students.filter(s => s.category === cat);
        return acc;
    }, {} as Record<string, ParticipantsApplicationResponse[]>);

    return (
        <div className={styles.container}>
            {!selectedInst ? (
                // View 1: Institution Selector
                <div className={styles.card}>
                    <div className={styles.header}>
                        <div>
                            <h1 className={styles.title}>Arrival Checking</h1>
                            <p className={styles.subtitle}>Select an institution to verify student arrival status</p>
                        </div>
                    </div>

                    <div className={styles.searchBar}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search institutions by name or ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    {loadingInsts ? (
                        <div className={styles.loading}>Loading institutions...</div>
                    ) : filteredInstitutions.length === 0 ? (
                        <div className={styles.empty}>No approved institutions found matching search.</div>
                    ) : (
                        <div className={styles.instGrid}>
                            {filteredInstitutions.map(inst => (
                                <div
                                    key={inst.id}
                                    onClick={() => handleSelectInstitution(inst)}
                                    className={styles.instCard}
                                >
                                    <div className={styles.instName}>{inst.name}</div>
                                    <div className={styles.instId}>{inst.institution_id || inst.id}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // View 2: Student List
                <div className={styles.card}>
                    <div className={styles.backHeader}>
                        <button onClick={() => setSelectedInst(null)} className={styles.backBtn}>
                            <ChevronLeft size={16} /> Back to Institutions
                        </button>
                        <div className={styles.headerTitleWrap}>
                            <h2 className={styles.title}>{selectedInst.name}</h2>
                            <p className={styles.subtitle}>Institution ID: {selectedInst.institution_id}</p>
                        </div>
                    </div>

                    {message && (
                        <div className={`${styles.message} ${styles[message.type]}`}>
                            {message.type === 'error' ? <ShieldAlert size={18} /> : <CheckSquare size={18} />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    {loadingStudents ? (
                        <div className={styles.loading}>Loading participants...</div>
                    ) : students.length === 0 ? (
                        <div className={styles.empty}>No approved individual participants found for this institution.</div>
                    ) : (
                        <>
                            <div className={styles.bulkActions}>
                                <button onClick={() => handleMarkAll('present')} className={styles.bulkBtnPresent}>
                                    Mark All Present
                                </button>
                                <button onClick={() => handleMarkAll('absent')} className={styles.bulkBtnAbsent}>
                                    Mark All Absent
                                </button>
                            </div>

                            <div className={styles.studentSection}>
                                {categoriesList.map(cat => {
                                    const list = groupedStudents[cat] || [];
                                    if (list.length === 0) return null;
                                    return (
                                        <div key={cat} className={styles.categoryBlock}>
                                            <h3 className={styles.categoryTitle}>{JUZ_LABELS[cat]} Category ({list.length})</h3>
                                            <div className={styles.tableWrapper}>
                                                <table className={styles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th>Participant ID</th>
                                                            <th style={{ textAlign: 'center' }}>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {list.map(student => {
                                                            const currentVal = localStatuses[student.id] || 'none';
                                                            return (
                                                                <tr key={student.id} className={styles.tableRow}>
                                                                    <td className={styles.studentName}>{student.full_name}</td>
                                                                    <td className={styles.studentId}>{student.participant_id || student.id}</td>
                                                                    <td>
                                                                        <div className={styles.radioGroup}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleStatusChange(student.id, 'present')}
                                                                                className={`${styles.statusBtn} ${styles.presentBtn} ${currentVal === 'present' ? styles.activePresent : ''}`}
                                                                            >
                                                                                <Check size={14} /> Present
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleStatusChange(student.id, 'absent')}
                                                                                className={`${styles.statusBtn} ${styles.absentBtn} ${currentVal === 'absent' ? styles.activeAbsent : ''}`}
                                                                            >
                                                                                <X size={14} /> Absent
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={styles.actionsBar}>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className={styles.submitBtn}
                                >
                                    {submitting ? 'Submitting...' : 'Save & Submit All'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
