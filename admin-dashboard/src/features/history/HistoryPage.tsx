import { useState, useEffect } from 'react';
import { pb } from '../../api/db';
import styles from './HistoryPage.module.css';
import { Users, Home, MapPin, Award, ShieldAlert } from 'lucide-react';

export default function HistoryPage() {
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [activeSubTab, setActiveSubTab] = useState<'participants' | 'institutions' | 'venues' | 'judges' | 'marks'>('participants');
    
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    // Tab data states
    const [participants, setParticipants] = useState<any[]>([]);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [venues, setVenues] = useState<any[]>([]);
    const [judges, setJudges] = useState<any[]>([]);
    const [marks, setMarks] = useState<{ preliminary: any[]; final: any[] }>({ preliminary: [], final: [] });

    // Client-side filtering states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFinalist, setFilterFinalist] = useState('');
    const [filterRound, setFilterRound] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Reset filters on tab switch
    useEffect(() => {
        setSearchQuery('');
        setFilterCategory('');
        setFilterGender('');
        setFilterStatus('');
        setFilterFinalist('');
        setFilterRound('');
        setFilterRole('');
    }, [activeSubTab]);

    // Fetch tab data when selected year or active sub-tab changes
    useEffect(() => {
        if (!selectedYear) {
            setParticipants([]);
            setInstitutions([]);
            setVenues([]);
            setJudges([]);
            setMarks({ preliminary: [], final: [] });
            return;
        }

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
                setParticipants([]);
                setInstitutions([]);
                setVenues([]);
                setJudges([]);
                setMarks({ preliminary: [], final: [] });
            } finally {
                setLoadingData(false);
            }
        };

        const handler = setTimeout(() => {
            fetchData();
        }, 300);

        return () => clearTimeout(handler);
    }, [selectedYear, activeSubTab]);

    // Apply filters client-side
    const filteredParticipants = participants.filter(p => {
        const matchesSearch = searchQuery.trim() === '' || 
            (p.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.participant_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.father_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.institution_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.institution_id || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === '' || p.category === filterCategory;
        const matchesGender = filterGender === '' || p.gender === filterGender;
        const matchesStatus = filterStatus === '' || p.status === filterStatus;
        const matchesFinalist = filterFinalist === '' || 
            (filterFinalist === 'yes' && p.is_finalist) || 
            (filterFinalist === 'no' && !p.is_finalist);
        return matchesSearch && matchesCategory && matchesGender && matchesStatus && matchesFinalist;
    });

    const filteredInstitutions = institutions.filter(inst => {
        const matchesSearch = searchQuery.trim() === '' || 
            (inst.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inst.institution_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inst.contact_person || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === '' || inst.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const filteredVenues = venues.filter(v => {
        const matchesSearch = searchQuery.trim() === '' || 
            (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.category || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRound = filterRound === '' || 
            (filterRound === 'preliminary' && (!v.round || v.round === 'preliminary')) ||
            (filterRound === 'final' && v.round === 'final');
        return matchesSearch && matchesRound;
    });

    const filteredJudges = judges.filter(j => {
        const matchesSearch = searchQuery.trim() === '' || 
            (j.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (j.phone_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (j.institution || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === '' || 
            (filterRole === 'final' && j.final_judge) ||
            (filterRole === 'preliminary' && !j.final_judge);
        return matchesSearch && matchesRole;
    });

    const filteredPreliminaryMarks = marks.preliminary.filter(m => {
        const matchesSearch = searchQuery.trim() === '' || 
            (m.participant_ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.judge_ref || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const filteredFinalMarks = marks.final.filter(m => {
        const matchesSearch = searchQuery.trim() === '' || 
            (m.participant_ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.judge_ref || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    // Helper to check if any filters are active
    const isFilterActive = searchQuery || filterCategory || filterGender || filterStatus || filterFinalist || filterRound || filterRole;

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
                    <label className={styles.yearLabel}>Competition Year:</label>
                    <input 
                        type="text"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value.trim())}
                        className={styles.selectYear}
                        style={{ width: '150px' }}
                        placeholder="Enter year..."
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className={styles.tabs}>
                <button 
                    onClick={() => setActiveSubTab('participants')}
                    className={`${styles.tabBtn} ${activeSubTab === 'participants' ? styles.activeTab : ''}`}
                >
                    <Users size={16} /> Participants ({isFilterActive && activeSubTab === 'participants' ? `${filteredParticipants.length} of ` : ''}{participants.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('institutions')}
                    className={`${styles.tabBtn} ${activeSubTab === 'institutions' ? styles.activeTab : ''}`}
                >
                    <Home size={16} /> Institutions ({isFilterActive && activeSubTab === 'institutions' ? `${filteredInstitutions.length} of ` : ''}{institutions.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('venues')}
                    className={`${styles.tabBtn} ${activeSubTab === 'venues' ? styles.activeTab : ''}`}
                >
                    <MapPin size={16} /> Venues ({isFilterActive && activeSubTab === 'venues' ? `${filteredVenues.length} of ` : ''}{venues.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('judges')}
                    className={`${styles.tabBtn} ${activeSubTab === 'judges' ? styles.activeTab : ''}`}
                >
                    <Users size={16} /> Judges ({isFilterActive && activeSubTab === 'judges' ? `${filteredJudges.length} of ` : ''}{judges.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('marks')}
                    className={`${styles.tabBtn} ${activeSubTab === 'marks' ? styles.activeTab : ''}`}
                >
                    <Award size={16} /> Marks ({isFilterActive && activeSubTab === 'marks' ? `${filteredPreliminaryMarks.length + filteredFinalMarks.length} of ` : ''}{marks.preliminary.length + marks.final.length})
                </button>
            </div>

            {/* Controls Bar for Filtering & Searching */}
            {selectedYear && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '24px',
                    padding: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    alignItems: 'center'
                }}>
                    <div style={{ flex: '1 1 250px' }}>
                        <input 
                            type="text"
                            placeholder={
                                activeSubTab === 'participants' ? "Search name, ID, father, institution..." :
                                activeSubTab === 'institutions' ? "Search name, ID, contact person..." :
                                activeSubTab === 'venues' ? "Search name, category..." :
                                activeSubTab === 'judges' ? "Search name, phone, institution..." :
                                "Search participant ID or judge ID..."
                            }
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.selectYear}
                            style={{ width: '100%', boxSizing: 'border-box', height: '40px' }}
                        />
                    </div>

                    {activeSubTab === 'participants' && (
                        <>
                            <select 
                                value={filterCategory} 
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className={styles.selectYear}
                                style={{ flex: '1 1 150px', height: '40px' }}
                            >
                                <option value="">All Categories</option>
                                <option value="5_juz">5 Juz</option>
                                <option value="15_juz">15 Juz</option>
                                <option value="30_juz">30 Juz</option>
                            </select>

                            <select 
                                value={filterGender} 
                                onChange={(e) => setFilterGender(e.target.value)}
                                className={styles.selectYear}
                                style={{ flex: '1 1 150px', height: '40px' }}
                            >
                                <option value="">All Genders</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>

                            <select 
                                value={filterStatus} 
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className={styles.selectYear}
                                style={{ flex: '1 1 150px', height: '40px' }}
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="reapplied">Reapplied</option>
                            </select>

                            <select 
                                value={filterFinalist} 
                                onChange={(e) => setFilterFinalist(e.target.value)}
                                className={styles.selectYear}
                                style={{ flex: '1 1 150px', height: '40px' }}
                            >
                                <option value="">Finalist Status</option>
                                <option value="yes">Finalists Only</option>
                                <option value="no">Non-Finalists Only</option>
                            </select>
                        </>
                    )}

                    {activeSubTab === 'institutions' && (
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={styles.selectYear}
                            style={{ flex: '1 1 150px', height: '40px' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="reapplied">Reapplied</option>
                        </select>
                    )}

                    {activeSubTab === 'venues' && (
                        <select 
                            value={filterRound} 
                            onChange={(e) => setFilterRound(e.target.value)}
                            className={styles.selectYear}
                            style={{ flex: '1 1 150px', height: '40px' }}
                        >
                            <option value="">All Rounds</option>
                            <option value="preliminary">Preliminary</option>
                            <option value="final">Final</option>
                        </select>
                    )}

                    {activeSubTab === 'judges' && (
                        <select 
                            value={filterRole} 
                            onChange={(e) => setFilterRole(e.target.value)}
                            className={styles.selectYear}
                            style={{ flex: '1 1 150px', height: '40px' }}
                        >
                            <option value="">All Roles</option>
                            <option value="preliminary">Preliminary Judges</option>
                            <option value="final">Final Judges</option>
                        </select>
                    )}
                </div>
            )}

            {/* Content area */}
            <div className={styles.content}>
                {error && <div className={styles.errorMessage}>{error}</div>}
                
                {loadingData ? (
                    <div className={styles.loadingSpinner}>Loading archive data...</div>
                ) : !selectedYear ? (
                    <div className={styles.emptyState}>Please enter an archived year above to browse historical records.</div>
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
                                            <th>Institution</th>
                                            <th>Category</th>
                                            <th>Gender</th>
                                            <th>WhatsApp</th>
                                            <th>Status</th>
                                            <th>Is Finalist</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredParticipants.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className={styles.noDataCell}>No matching participants found for {selectedYear}</td>
                                            </tr>
                                        ) : (
                                            filteredParticipants.map(p => (
                                                <tr key={p.id}>
                                                    <td className={styles.boldCell}>{p.participant_id || 'N/A'}</td>
                                                    <td>{p.full_name}</td>
                                                    <td>{p.father_name}</td>
                                                    <td>{p.institution_name || p.institution_id || <span style={{ color: '#94a3b8' }}>—</span>}</td>
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
                                        {filteredInstitutions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className={styles.noDataCell}>No matching institutions found for {selectedYear}</td>
                                            </tr>
                                        ) : (
                                            filteredInstitutions.map(inst => (
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
                                        {filteredVenues.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className={styles.noDataCell}>No matching venues found for {selectedYear}</td>
                                            </tr>
                                        ) : (
                                            filteredVenues.map(v => (
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
                                        {filteredJudges.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className={styles.noDataCell}>No matching judges found for {selectedYear}</td>
                                            </tr>
                                        ) : (
                                            filteredJudges.map(j => (
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
                                            {filteredPreliminaryMarks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className={styles.noDataCell}>No matching preliminary marks found for {selectedYear}</td>
                                                </tr>
                                            ) : (
                                                filteredPreliminaryMarks.map(m => (
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
                                            {filteredFinalMarks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className={styles.noDataCell}>No matching final marks found for {selectedYear}</td>
                                                </tr>
                                            ) : (
                                                filteredFinalMarks.map(m => (
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
