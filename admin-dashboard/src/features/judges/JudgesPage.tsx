import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pb } from '../../api/db';
import { Plus, Search, Edit, Trash2, X, ShieldAlert } from 'lucide-react';
import styles from './JudgesPage.module.css';

interface Judge {
    id: string;
    name: string;
    phone_number: string;
    institution: string;
    place_of_stay: string;
    pickup_incharge: string;
    contact_person_mobile?: string;
    final_judge?: boolean;
    allocated_venue?: string;
    created: string;
    updated: string;
}

interface Venue {
    id: string;
    name: string;
    judges?: any;
}

interface InstInfo {
    id: string;
    name: string;
    institution_id: string;
}

export default function JudgesPage() {
    const [judges, setJudges] = useState<Judge[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [institutions, setInstitutions] = useState<InstInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dropdown search states
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [instSearchQuery, setInstSearchQuery] = useState('');

    // Form inputs
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [institution, setInstitution] = useState('');
    const [placeOfStay, setPlaceOfStay] = useState('');
    const [pickupIncharge, setPickupIncharge] = useState('');
    const [contactPersonMobile, setContactPersonMobile] = useState('');
    const [finalJudge, setFinalJudge] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch judges using custom API
            const judgeRecords = await pb.send<Judge[]>('/api/admin/judges', {
                method: 'GET'
            });
            setJudges(judgeRecords);

            // Fetch venues
            const venueRecords = await pb.collection('venue_detail').getFullList<Venue>({
                sort: 'name'
            });
            setVenues(venueRecords);

            // Fetch institutions
            const instRecords = await pb.collection('institutions').getFullList({
                sort: 'name'
            });
            setInstitutions(instRecords.map((r: any) => ({
                id: r.id,
                name: r.name,
                institution_id: r.institution_id
            })));
        } catch (err) {
            console.error('Failed to load judges panel data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(`.${styles.searchableSelectContainer}`)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const openAddModal = () => {
        setEditingJudge(null);
        setName('');
        setPhoneNumber('');
        setInstitution('');
        setPlaceOfStay('');
        setPickupIncharge('');
        setContactPersonMobile('');
        setFinalJudge(false);
        setIsModalOpen(true);
    };

    const openEditModal = (judge: Judge) => {
        setEditingJudge(judge);
        setName(judge.name);
        setPhoneNumber(judge.phone_number);
        setInstitution(judge.institution || '');
        setPlaceOfStay(judge.place_of_stay || '');
        setPickupIncharge(judge.pickup_incharge || '');
        setContactPersonMobile(judge.contact_person_mobile || '');
        setFinalJudge(judge.final_judge || false);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingJudge(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phoneNumber.trim()) {
            alert('Name and Phone Number are required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = {
                name: name.trim(),
                phone_number: phoneNumber.trim(),
                institution: institution.trim(),
                place_of_stay: placeOfStay.trim(),
                pickup_incharge: pickupIncharge.trim(),
                contact_person_mobile: contactPersonMobile.trim(),
                final_judge: finalJudge
            };

            if (editingJudge) {
                await pb.send('/api/admin/judges/update', {
                    method: 'POST',
                    body: { id: editingJudge.id, ...data }
                });
            } else {
                await pb.send('/api/admin/judges/create', {
                    method: 'POST',
                    body: data
                });
            }

            handleCloseModal();
            loadData();
        } catch (err) {
            console.error('Failed to save judge:', err);
            alert('Failed to save judge. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this judge?')) {
            return;
        }

        try {
            await pb.send('/api/admin/judges/delete', {
                method: 'POST',
                body: { id }
            });
            loadData();
        } catch (err) {
            console.error('Failed to delete judge:', err);
            alert('Failed to delete judge. Please try again.');
        }
    };

    const getAssignedVenueName = (judge: Judge) => {
        if (judge.allocated_venue) {
            const assigned = venues.find(v => v.id === judge.allocated_venue);
            if (assigned) return assigned.name;
        }
        const assigned = venues.find(v => {
            if (!v.judges) return false;
            let judgeIds: string[] = [];
            if (Array.isArray(v.judges)) {
                judgeIds = v.judges.map((j: any) => (j && typeof j === 'object' ? j.id : j));
            } else if (typeof v.judges === 'string') {
                try {
                    const parsed = JSON.parse(v.judges);
                    if (Array.isArray(parsed)) {
                        judgeIds = parsed.map((j: any) => (j && typeof j === 'object' ? j.id : j));
                    }
                } catch (_) {
                    judgeIds = v.judges ? [v.judges] : [];
                }
            }
            return judgeIds.includes(judge.id);
        });
        return assigned ? assigned.name : null;
    };

    const filteredJudges = judges.filter(j => {
        const q = searchQuery.toLowerCase();
        const assignedVenue = getAssignedVenueName(j) || '';
        const instName = institutions.find(i => i.id === j.institution)?.name || j.institution || '';
        return (
            j.name.toLowerCase().includes(q) ||
            (j.phone_number || '').toLowerCase().includes(q) ||
            instName.toLowerCase().includes(q) ||
            assignedVenue.toLowerCase().includes(q)
        );
    });

    const filteredInstitutions = institutions.filter(inst =>
        inst.name.toLowerCase().includes(instSearchQuery.toLowerCase()) ||
        (inst.institution_id || '').toLowerCase().includes(instSearchQuery.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header} style={{ justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button className={styles.btnAdd} onClick={openAddModal}>
                    <Plus size={16} /> Add New Judge
                </button>
            </div>

            <div className={styles.controlsRow}>
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search judges by name, phone, institution..."
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableCard}>
                {loading && filteredJudges.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Loading judges list...
                    </div>
                ) : filteredJudges.length === 0 ? (
                    <div className={styles.emptyState}>
                        <ShieldAlert size={48} style={{ margin: '0 auto', opacity: 0.3 }} />
                        <p>No judges found matching your query or registered yet.</p>
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Judge Name</th>
                                    <th>Phone Number</th>
                                    <th>Institution</th>
                                    <th>Place of Stay</th>
                                    <th>Pickup In-Charge</th>
                                    <th>Allocated Venue</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredJudges.map((j) => {
                                    const venueName = getAssignedVenueName(j);
                                    return (
                                        <tr key={j.id}>
                                            <td className={styles.judgeName}>
                                                {j.name}
                                                {j.final_judge && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '10px',
                                                        backgroundColor: '#e0f2fe',
                                                        color: '#0369a1',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: 'bold',
                                                        display: 'inline-block',
                                                        verticalAlign: 'middle'
                                                    }}>
                                                        Final Judge
                                                    </span>
                                                )}
                                            </td>
                                            <td className={styles.phoneNum}>{j.phone_number}</td>
                                            <td>
                                                {j.institution ? (() => {
                                                    const instName = institutions.find(i => i.id === j.institution)?.name || j.institution;
                                                    return (
                                                        <Link to={`/track?type=institution&query=${encodeURIComponent(instName)}`} className={styles.instLink}>
                                                            {instName}
                                                        </Link>
                                                    );
                                                })() : (
                                                    <span style={{ color: '#94a3b8' }}>—</span>
                                                )}
                                            </td>
                                            <td>{j.place_of_stay || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                                            <td>
                                                {j.pickup_incharge ? (
                                                    j.contact_person_mobile ? (
                                                        <span>{j.pickup_incharge} <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>({j.contact_person_mobile})</span></span>
                                                    ) : (
                                                        j.pickup_incharge
                                                    )
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                {venueName ? (
                                                    <span className={styles.badgeVenue}>{venueName}</span>
                                                ) : (
                                                    <span className={styles.badgeUnassigned}>Unassigned</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button className={styles.btnEdit} onClick={() => openEditModal(j)} title="Edit Judge">
                                                        <Edit size={14} />
                                                    </button>
                                                    <button className={styles.btnDelete} onClick={() => handleDelete(j.id)} title="Delete Judge">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingJudge ? 'Edit Judge Details' : 'Add New Judge'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalBody}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="judge-name">Full Name <span className={styles.required}>*</span></label>
                                    <input
                                        type="text"
                                        id="judge-name"
                                        placeholder="e.g. Mufti Muhammad"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="judge-phone">Phone Number <span className={styles.required}>*</span></label>
                                    <input
                                        type="text"
                                        id="judge-phone"
                                        placeholder="e.g. +91 9876543210"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        required
                                    />
                                </div>
                                 <div className={styles.formGroup} style={{ position: 'relative' }}>
                                     <label htmlFor="judge-inst">Institution / Madrassa</label>
                                     <div className={styles.searchableSelectContainer}>
                                         <div 
                                             className={styles.selectTrigger} 
                                             onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                         >
                                             {institutions.find(i => i.id === institution)?.name || institution || 'Select an Institution / Madrassa'}
                                         </div>
                                         {isDropdownOpen && (
                                             <div className={styles.selectDropdown}>
                                                 <div className={styles.dropdownSearchWrapper}>
                                                     <Search size={14} className={styles.dropdownSearchIcon} />
                                                     <input
                                                         type="text"
                                                         placeholder="Search institution..."
                                                         className={styles.dropdownSearchInput}
                                                         value={instSearchQuery}
                                                         onChange={(e) => setInstSearchQuery(e.target.value)}
                                                         onClick={(e) => e.stopPropagation()}
                                                         autoFocus
                                                     />
                                                 </div>
                                                 <div className={styles.dropdownOptionsList}>
                                                     <div 
                                                         className={`${styles.dropdownOption} ${!institution ? styles.optionSelected : ''}`}
                                                         onClick={() => {
                                                             setInstitution('');
                                                             setIsDropdownOpen(false);
                                                             setInstSearchQuery('');
                                                         }}
                                                     >
                                                         — None / Custom text —
                                                     </div>
                                                     {filteredInstitutions.map((inst) => (
                                                         <div 
                                                             key={inst.id} 
                                                             className={`${styles.dropdownOption} ${institution === inst.id ? styles.optionSelected : ''}`}
                                                             onClick={() => {
                                                                 setInstitution(inst.id);
                                                                 setIsDropdownOpen(false);
                                                                 setInstSearchQuery('');
                                                             }}
                                                         >
                                                             {inst.name} ({inst.institution_id || inst.id})
                                                         </div>
                                                     ))}
                                                     {filteredInstitutions.length === 0 && instSearchQuery && (
                                                         <div 
                                                             className={styles.dropdownOptionCustom}
                                                             onClick={() => {
                                                                 setInstitution(instSearchQuery);
                                                                 setIsDropdownOpen(false);
                                                                 setInstSearchQuery('');
                                                             }}
                                                         >
                                                             Use custom name: "{instSearchQuery}"
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="judge-stay">Place of Stay</label>
                                        <input
                                            type="text"
                                            id="judge-stay"
                                            placeholder="Room / Hotel details"
                                            value={placeOfStay}
                                            onChange={(e) => setPlaceOfStay(e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="judge-pickup">Pickup In-Charge</label>
                                        <input
                                            type="text"
                                            id="judge-pickup"
                                            placeholder="Contact person name"
                                            value={pickupIncharge}
                                            onChange={(e) => setPickupIncharge(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="judge-contact-mobile">Contact Person Mobile</label>
                                        <input
                                            type="text"
                                            id="judge-contact-mobile"
                                            placeholder="Contact person phone number"
                                            value={contactPersonMobile}
                                            onChange={(e) => setContactPersonMobile(e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                                        <input
                                            type="checkbox"
                                            id="judge-final"
                                            checked={finalJudge}
                                            onChange={(e) => setFinalJudge(e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="judge-final" style={{ cursor: 'pointer', margin: 0, fontWeight: '600', userSelect: 'none' }}>Final Judge?</label>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Judge'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
