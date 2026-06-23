import { useState, useEffect } from 'react';
import { pb } from '../../api/db';
import styles from './HistoryPage.module.css';
import { Users, Home, MapPin, Award, ShieldAlert } from 'lucide-react';

export default function HistoryPage() {
    const [years, setYears] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [activeSubTab, setActiveSubTab] = useState<'participants' | 'institutions' | 'venues' | 'judges' | 'marks'>('participants');
    
    const [loadingYears, setLoadingYears] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    // Tab data states
    const [participants, setParticipants] = useState<any[]>([]);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [venues, setVenues] = useState<any[]>([]);
    const [judges, setJudges] = useState<any[]>([]);
    const [marks, setMarks] = useState<{ preliminary: any[]; final: any[] }>({ preliminary: [], final: [] });

    // Fetch archived years on mount
    useEffect(() => {
        const fetchYears = async () => {
            setLoadingYears(true);
            try {
                const res = await pb.send<string[]>('/api/admin/archive/years', { method: 'GET' });
                setYears(res);
                if (res.length > 0) {
                    setSelectedYear(res[0]);
                }
            } catch (err: any) {
                console.error('Failed to fetch archive years:', err);
                setError('Failed to fetch archive years.');
            } finally {
                setLoadingYears(false);
            }
        };

        fetchYears();
    }, []);

    // Fetch tab data when selected year or active sub-tab changes
    useEffect(() => {
        if (!selectedYear) return;

        const fetchData = async () => {
            setLoadingData(true);
            setError('');
            try {
                if (activeSubTab === 'participants') {
                    const res = await pb.send<any[]>('/api/admin/archive/participants', {
                        method: 'GET',
                        params: { year: selectedYear }
                    });
                    setParticipants(res);
                } else if (activeSubTab === 'institutions') {
                    const res = await pb.send<any[]>('/api/admin/archive/institutions', {
                        method: 'GET',
                        params: { year: selectedYear }
                    });
                    setInstitutions(res);
                } else if (activeSubTab === 'venues') {
                    const res = await pb.send<any[]>('/api/admin/archive/venues', {
                        method: 'GET',
                        params: { year: selectedYear }
                    });
                    setVenues(res);
                } else if (activeSubTab === 'judges') {
                    const res = await pb.send<any[]>('/api/admin/archive/judges', {
                        method: 'GET',
                        params: { year: selectedYear }
                    });
                    setJudges(res);
                } else if (activeSubTab === 'marks') {
                    const res = await pb.send<{ preliminary: any[]; final: any[] }>('/api/admin/archive/marks', {
                        method: 'GET',
                        params: { year: selectedYear }
                    });
                    setMarks(res);
                }
            } catch (err: any) {
                console.error(`Failed to fetch ${activeSubTab}:`, err);
                setError(`Failed to fetch archived data for ${activeSubTab}.`);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [selectedYear, activeSubTab]);

    return (
        <div className={styles.container}>
            {/* Top Banner Alerting read-only nature */}
            <div className={styles.warningBanner}>
                <ShieldAlert size={20} />
                <span>
                    <strong>Read-Only Archives:</strong> You are viewing historical record collections. 
                    Edits, deletes, and registrations are disabled for archived data.
                </span>
            </div>

            <div className={styles.header}>
                <div className={styles.headerTitleArea}>
                    <h1 className={styles.title}>Historical Competition Records</h1>
                    <p className={styles.subtitle}>Browse and review archived data from previous years</p>
                </div>
                
                {/* Year Selector */}
                <div className={styles.yearSelectorArea}>
                    <label className={styles.yearLabel}>Select Competition Year:</label>
                    {loadingYears ? (
                        <span className={styles.loadingText}>Loading years...</span>
                    ) : years.length === 0 ? (
                        <div className={styles.noArchiveBadge}>No archived years found</div>
                    ) : (
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className={styles.selectYear}
                        >
                            {years.map(yr => (
                                <option key={yr} value={yr}>{yr}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className={styles.tabs}>
                <button 
                    onClick={() => setActiveSubTab('participants')}
                    className={`${styles.tabBtn} ${activeSubTab === 'participants' ? styles.activeTab : ''}`}
                >
                    <Users size={16} /> Participants ({participants.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('institutions')}
                    className={`${styles.tabBtn} ${activeSubTab === 'institutions' ? styles.activeTab : ''}`}
                >
                    <Home size={16} /> Institutions ({institutions.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('venues')}
                    className={`${styles.tabBtn} ${activeSubTab === 'venues' ? styles.activeTab : ''}`}
                >
                    <MapPin size={16} /> Venues ({venues.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('judges')}
                    className={`${styles.tabBtn} ${activeSubTab === 'judges' ? styles.activeTab : ''}`}
                >
                    <Users size={16} /> Judges ({judges.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('marks')}
                    className={`${styles.tabBtn} ${activeSubTab === 'marks' ? styles.activeTab : ''}`}
                >
                    <Award size={16} /> Marks ({marks.preliminary.length + marks.final.length})
                </button>
            </div>

            {/* Content area */}
            <div className={styles.content}>
                {error && <div className={styles.errorMessage}>{error}</div>}
                
                {loadingData ? (
                    <div className={styles.loadingSpinner}>Loading archive data...</div>
                ) : !selectedYear ? (
                    <div className={styles.emptyState}>Please select or create an archived year to begin browsing history.</div>
                ) : (
                    <>
                        {/* ── PARTICIPANTS TAB ── */}
                        {activeSubTab === 'participants' && (
                            <div className={styles.tableCard}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Participant ID</th>
                                            <th>Full Name</th>
                                            <th>Father's Name</th>
                                            <th>Category</th>
                                            <th>Gender</th>
                                            <th>WhatsApp</th>
                                            <th>Status</th>
                                            <th>Is Finalist</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participants.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className={styles.noDataCell}>No participants archived for {selectedYear}</td>
                                            </tr>
                                        ) : (
                                            participants.map(p => (
                                                <tr key={p.id}>
                                                    <td className={styles.boldCell}>{p.participant_id || 'N/A'}</td>
                                                    <td>{p.full_name}</td>
                                                    <td>{p.father_name}</td>
                                                    <td>
                                                        <span className={styles.categoryBadge}>{p.category}</span>
                                                    </td>
                                                    <td>{p.gender}</td>
                                                    <td>{p.whatsapp_number}</td>
                                                    <td>
                                                        <span className={`${styles.statusBadge} ${styles[p.status]}`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td>{p.is_finalist ? '🏆 Yes' : 'No'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── INSTITUTIONS TAB ── */}
                        {activeSubTab === 'institutions' && (
                            <div className={styles.tableCard}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Institution ID</th>
                                            <th>Name</th>
                                            <th>Contact Person</th>
                                            <th>Email</th>
                                            <th>WhatsApp</th>
                                            <th>Address</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {institutions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className={styles.noDataCell}>No institutions archived for {selectedYear}</td>
                                            </tr>
                                        ) : (
                                            institutions.map(inst => (
                                                <tr key={inst.id}>
                                                    <td className={styles.boldCell}>{inst.institution_id || 'N/A'}</td>
                                                    <td>{inst.name}</td>
                                                    <td>{inst.contact_person}</td>
                                                    <td>{inst.email}</td>
                                                    <td>{inst.whatsapp_number}</td>
                                                    <td>{inst.address}</td>
                                                    <td>
                                                        <span className={`${styles.statusBadge} ${styles[inst.status]}`}>
                                                            {inst.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── VENUES TAB ── */}
                        {activeSubTab === 'venues' && (
                            <div className={styles.tableCard}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Venue Name</th>
                                            <th>Category</th>
                                            <th>Sittings</th>
                                            <th>Capacity</th>
                                            <th>Assigned Candidates</th>
                                            <th>Round</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {venues.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className={styles.noDataCell}>No venues archived for {selectedYear}</td>
                                            </tr>
                                        ) : (
                                            venues.map(v => (
                                                <tr key={v.id}>
                                                    <td className={styles.boldCell}>{v.name}</td>
                                                    <td>{v.category}</td>
                                                    <td>{v.sittings}</td>
                                                    <td>{v.capacity}</td>
                                                    <td>{v.allocated_count}</td>
                                                    <td>
                                                        <span className={styles.roundBadge}>
                                                            {v.round || (v.is_final ? 'final' : 'preliminary')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── JUDGES TAB ── */}
                        {activeSubTab === 'judges' && (
                            <div className={styles.tableCard}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone Number</th>
                                            <th>Institution</th>
                                            <th>Place of Stay</th>
                                            <th>Role</th>
                                            <th>Assigned Venue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {judges.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className={styles.noDataCell}>No judges archived for {selectedYear}</td>
                                            </tr>
                                        ) : (
                                            judges.map(j => (
                                                <tr key={j.id}>
                                                    <td className={styles.boldCell}>{j.name}</td>
                                                    <td>{j.phone_number}</td>
                                                    <td>{j.institution || 'N/A'}</td>
                                                    <td>{j.place_of_stay || 'N/A'}</td>
                                                    <td>{j.final_judge ? '🏆 Final Judge' : 'Preliminary Judge'}</td>
                                                    <td>{j.allocated_venue || j.final_venue || 'None'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── MARKS TAB ── */}
                        {activeSubTab === 'marks' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {/* Preliminary Marks */}
                                <div className={styles.tableCard}>
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Preliminary Round Marks</h3>
                                    </div>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Participant Ref</th>
                                                <th>Judge Ref</th>
                                                <th>Tajweed</th>
                                                <th>Hifz</th>
                                                <th>Mutashabihat</th>
                                                <th>Total</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {marks.preliminary.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className={styles.noDataCell}>No preliminary marks archived for {selectedYear}</td>
                                                </tr>
                                            ) : (
                                                marks.preliminary.map(m => (
                                                    <tr key={m.id}>
                                                        <td>{m.participant_ref}</td>
                                                        <td>{m.judge_ref}</td>
                                                        <td>{m.is_absent ? '-' : m.tajweed}</td>
                                                        <td>{m.is_absent ? '-' : m.hifz}</td>
                                                        <td>{m.is_absent ? '-' : m.mutashabihat}</td>
                                                        <td className={styles.boldCell}>{m.is_absent ? '-' : m.total}</td>
                                                        <td>
                                                            {m.is_absent ? (
                                                                <span className={styles.absentBadge}>Absent</span>
                                                            ) : (
                                                                <span className={styles.presentBadge}>Present</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Final Marks */}
                                <div className={styles.tableCard}>
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Final Round Marks</h3>
                                    </div>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Participant Ref</th>
                                                <th>Sitting</th>
                                                <th>Judge Ref</th>
                                                <th>Tajweed</th>
                                                <th>Hifz</th>
                                                <th>Mutashabihat</th>
                                                <th>Total</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {marks.final.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className={styles.noDataCell}>No final marks archived for {selectedYear}</td>
                                                </tr>
                                            ) : (
                                                marks.final.map(m => (
                                                    <tr key={m.id}>
                                                        <td>{m.participant_ref}</td>
                                                        <td>Sitting {m.sitting_number}</td>
                                                        <td>{m.judge_ref}</td>
                                                        <td>{m.is_absent ? '-' : m.tajweed}</td>
                                                        <td>{m.is_absent ? '-' : m.hifz}</td>
                                                        <td>{m.is_absent ? '-' : m.mutashabihat}</td>
                                                        <td className={styles.boldCell}>{m.is_absent ? '-' : m.total}</td>
                                                        <td>
                                                            {m.is_absent ? (
                                                                <span className={styles.absentBadge}>Absent</span>
                                                            ) : (
                                                                <span className={styles.presentBadge}>Present</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
