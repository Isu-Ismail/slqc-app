import { useState, useEffect } from 'react';
import { pb } from '../../api/db';
import { MapPin, Users, Settings, Search, Printer, RefreshCw, CreditCard } from 'lucide-react';
import VenueSettingsForm from '../control-panel/components/VenueSettingsForm';
import styles from './VenuePanelPage.module.css';
import PrintPreviewModal from '../track/components/PrintPreviewModal';
import { generateVenueListHTML, generateIDCardsHTML, generateMarksheetHTML, getCompactJuzLabel } from './venuePrintTemplates';

interface Venue {
    id: string;
    name: string;
    description: string;
    category: string;
    capacity: number;
    slots?: any;
    allocatedCount?: number;
    judges?: string[];
    expand?: any;
}

interface Participant {
    id: string;
    full_name: string;
    participant_id: string;
    category: string;
    selected_juz: string;
    juz_options: string;
    juzz_options?: string;
    allocated_venue: string;
    allocated_slot: string;
    whatsapp_number: string;
    guardian_phone: string;
    candidate_photo: string;
    expand?: {
        institution_ref?: {
            name: string;
        }
    };
}

export default function VenuePanelPage() {
    const user = pb.authStore.model;
    const [venues, setVenues] = useState<Venue[]>([]);
    const [activeTab, setActiveTab] = useState<string>(
        user?.designation === 'coordinators' ? '' : 'settings'
    );
    
    // Cache for loaded candidates per venue name. Key: "venueName", Value: Participant[]
    const [cache, setCache] = useState<Record<string, Participant[]>>({});
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<string>('all');

    // Print Modal States
    const [printPreview, setPrintPreview] = useState<string | null>(null);
    const [printTitle, setPrintTitle] = useState<string>('Print Preview');
    const [printing, setPrinting] = useState(false);

    const handlePrintList = async () => {
        setPrinting(true);
        try {
            const res = await pb.send<any[]>('/api/admin/print-venue-list', {
                method: 'GET',
                query: { venue: activeTab, slot: 'all' } // Always fetch all slots for full list split by pages
            });
            const html = generateVenueListHTML(activeTab, res, currentVenueSlots, currentVenue?.expand?.judges || []);
            setPrintTitle(`Venue Allocation List - ${activeTab}`);
            setPrintPreview(html);
        } catch (err) {
            console.error('Failed to generate venue list:', err);
            alert('Failed to generate venue list. Please try again.');
        } finally {
            setPrinting(false);
        }
    };

    const handleGenerateIDs = async () => {
        setPrinting(true);
        try {
            const res = await pb.send<any[]>('/api/admin/generate-ids', {
                method: 'GET',
                query: { venue: activeTab, slot: selectedSlot }
            });
            const html = generateIDCardsHTML(activeTab, res, currentVenueSlots);
            setPrintTitle(`ID Cards - ${activeTab}`);
            setPrintPreview(html);
        } catch (err) {
            console.error('Failed to generate ID cards:', err);
            alert('Failed to generate ID cards. Please try again.');
        } finally {
            setPrinting(false);
        }
    };

    const handleGenerateMarksheet = async () => {
        setPrinting(true);
        try {
            const res = await pb.send<any[]>('/api/admin/print-venue-list', {
                method: 'GET',
                query: { venue: activeTab, slot: 'all' }
            });
            const html = generateMarksheetHTML(activeTab, res, currentVenue?.expand?.judges || []);
            setPrintTitle(`Judges Marksheet - ${activeTab}`);
            setPrintPreview(html);
        } catch (err) {
            console.error('Failed to generate marksheet:', err);
            alert('Failed to generate marksheet. Please try again.');
        } finally {
            setPrinting(false);
        }
    };

    // Load all venues to populate tabs
    const loadVenues = async () => {
        try {
            const venueRecords = await pb.collection('venue_detail').getFullList({
                sort: 'name',
                expand: 'judges'
            });

            // Fetch approved student counts per venue to show on tabs
            const students = await pb.collection('participants_application').getFullList({
                fields: 'allocated_venue,status',
                filter: 'status = "approved"'
            });

            const counts: Record<string, number> = {};
            students.forEach(s => {
                if (s.allocated_venue) {
                    counts[s.allocated_venue] = (counts[s.allocated_venue] || 0) + 1;
                }
            });

            const formattedVenues: Venue[] = venueRecords.map(v => ({
                id: v.id,
                name: v.name,
                description: v.description,
                category: v.category,
                capacity: v.capacity,
                slots: v.slots,
                allocatedCount: counts[v.name] || 0,
                judges: Array.isArray(v.judges) ? v.judges : [],
                expand: v.expand
            }));

            setVenues(formattedVenues);
            // If coordinator and currently on settings or no active tab, auto-select first venue
            if (user?.designation === 'coordinators' && (activeTab === 'settings' || !activeTab) && formattedVenues.length > 0) {
                setActiveTab(formattedVenues[0].name);
            }
            // Clear the candidates cache when venue configuration is reloaded/saved
            setCache({});
        } catch (err) {
            console.error('Failed to load venues for panel:', err);
        }
    };

    useEffect(() => {
        loadVenues();
    }, []);

    const loadCandidatesForVenue = async (venueName: string, forceRefresh: boolean = false) => {
        // Return if already cached and not forcing reload
        if (!forceRefresh && cache[venueName]) {
            return;
        }

        setLoadingCandidates(true);
        try {
            const filter = `status = "approved" && allocated_venue = "${venueName.replace(/"/g, '\\"')}"`;
            
            const res = await pb.collection('participants_application').getFullList<Participant>({
                filter: filter,
                expand: 'institution_ref',
                sort: 'full_name'
            });

            setCache(prev => ({
                ...prev,
                [venueName]: res
            }));
        } catch (err) {
            console.error('Failed to fetch candidates:', err);
        } finally {
            setLoadingCandidates(false);
        }
    };

    // Load candidates when active venue tab changes
    useEffect(() => {
        if (activeTab === 'settings' || venues.length === 0) return;
        setSelectedSlot('all');
        loadCandidatesForVenue(activeTab, false);
    }, [activeTab, venues]);

    if (user?.designation !== 'admin' && user?.designation !== 'coordinators') {
        return (
            <div className={styles.restricted}>
                <h2>Access Denied</h2>
                <p>Only Administrators and Coordinators can access the Venue Panel.</p>
            </div>
        );
    }

    const currentVenue = venues.find(v => v.name === activeTab);

    // Parse slots for current venue
    let currentVenueSlots: { name: string; time: string; capacity: number }[] = [];
    if (currentVenue) {
        try {
            if (currentVenue.slots) {
                currentVenueSlots = typeof currentVenue.slots === 'string' 
                    ? JSON.parse(currentVenue.slots) 
                    : currentVenue.slots;
            }
        } catch (_) {}
    }

    // Get current cache entry
    const candidatesList = cache[activeTab] || [];

    // Filter candidates based on selected slot
    const slotFilteredCandidates = selectedSlot === 'all'
        ? candidatesList
        : candidatesList.filter(c => {
            if (!c.allocated_slot) return false;
            const cleanAlloc = c.allocated_slot.split(' - ')[0].split(' (')[0].trim().toLowerCase();
            const cleanSelected = selectedSlot.split(' - ')[0].split(' (')[0].trim().toLowerCase();
            return cleanAlloc === cleanSelected;
        });

    // Filter candidates based on search query
    const filteredCandidates = slotFilteredCandidates.filter(c => {
        const query = searchQuery.toLowerCase();
        return (
            c.full_name.toLowerCase().includes(query) ||
            (c.participant_id || '').toLowerCase().includes(query) ||
            (c.expand?.institution_ref?.name || '').toLowerCase().includes(query)
        );
    });



    return (
        <div className={styles.container}>

            {/* Navigation Tabs */}
            <div className={styles.tabsContainer} style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
                {user?.designation === 'admin' && (
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTab : ''}`}
                        onClick={() => { setActiveTab('settings'); loadVenues(); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 16px',
                            borderRadius: '8px 8px 0 0',
                            borderBottom: activeTab === 'settings' ? '3px solid #0d9488' : '3px solid transparent'
                        }}
                    >
                        <Settings size={16} /> Venue Settings & Allocator
                    </button>
                )}

                {venues.map(v => (
                    <button
                        key={v.id}
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === v.name ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(v.name)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 16px',
                            borderRadius: '8px 8px 0 0',
                            borderBottom: activeTab === v.name ? '3px solid #0d9488' : '3px solid transparent'
                        }}
                    >
                        <MapPin size={15} /> {v.name}
                        <span style={{
                            fontSize: '11px',
                            backgroundColor: activeTab === v.name ? '#0d9488' : '#e2e8f0',
                            color: activeTab === v.name ? '#ffffff' : '#475569',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontWeight: 'bold'
                        }}>
                            {v.allocatedCount || 0}/{v.capacity}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div style={{ marginTop: '20px' }}>
                {activeTab === 'settings' && user?.designation === 'admin' && (
                    <VenueSettingsForm onAllocationComplete={loadVenues} />
                )}

                {activeTab !== 'settings' && currentVenue && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Info Banner */}
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
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{currentVenue.name}</h3>
                                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                    {currentVenue.description || 'No description provided.'} • Category: <strong style={{ color: '#0f766e' }}>{currentVenue.category === '5_juz' ? '5 Juz' : currentVenue.category === '15_juz' ? '15 Juz' : '30 Juz'}</strong>
                                </p>
                                {(() => {
                                    const judgesList = currentVenue.expand?.judges 
                                        ? (Array.isArray(currentVenue.expand.judges) ? currentVenue.expand.judges : [currentVenue.expand.judges]) 
                                        : [];
                                    if (judgesList.length > 0) {
                                        return (
                                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>Assigned Judges:</span>
                                                {judgesList.map((j: any) => (
                                                    <span key={j.id} style={{
                                                        fontSize: '12px',
                                                        backgroundColor: '#0d9488',
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
                                        );
                                    }
                                    return (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                            No judges assigned to this venue
                                        </div>
                                    );
                                })()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Capacity Utilization</div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0d9488' }}>
                                        {currentVenue.allocatedCount || 0} / {currentVenue.capacity}
                                    </div>
                                </div>
                                <button
                                    onClick={handlePrintList}
                                    disabled={printing || loadingCandidates}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        backgroundColor: '#0f766e',
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
                                    onClick={handleGenerateIDs}
                                    disabled={printing || loadingCandidates}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        backgroundColor: '#0d9488',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        opacity: (printing || loadingCandidates) ? 0.7 : 1
                                    }}
                                >
                                    <CreditCard size={15} /> Generate IDs
                                </button>
                                <button
                                    onClick={handleGenerateMarksheet}
                                    disabled={printing || loadingCandidates}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        backgroundColor: '#0284c7',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        opacity: (printing || loadingCandidates) ? 0.7 : 1
                                    }}
                                >
                                    <Printer size={15} /> Generate Marksheet
                                </button>
                            </div>
                        </div>                        {/* Search and List Card */}
                        <div className={styles.card} style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Allocated Participants</h4>
                                    <button
                                        onClick={() => loadCandidatesForVenue(activeTab, true)}
                                        disabled={loadingCandidates}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            color: '#475569',
                                            fontWeight: '600',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Reload current slot data"
                                    >
                                        <RefreshCw size={14} style={{ animation: loadingCandidates ? 'spin 1s linear infinite' : 'none' }} /> Reload
                                    </button>
                                </div>
                                <div style={{ position: 'relative', width: '280px' }} className="search-box">
                                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by name, ID or institution..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px 8px 32px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Slot Mini Tabs (Sub-Navigation) */}
                            {currentVenueSlots.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    padding: '8px 20px',
                                    backgroundColor: '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0',
                                    overflowX: 'auto'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSlot('all')}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            border: 'none',
                                            borderRadius: '16px',
                                            cursor: 'pointer',
                                            backgroundColor: selectedSlot === 'all' ? '#0d9488' : '#e2e8f0',
                                            color: selectedSlot === 'all' ? '#ffffff' : '#475569',
                                            transition: '0.2s',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        All Slots
                                    </button>
                                    {currentVenueSlots.map(s => {
                                        const slotKey = s.name + (s.time ? " (" + s.time + ")" : "");
                                        const isActive = selectedSlot === slotKey;
                                        return (
                                            <button
                                                key={slotKey}
                                                type="button"
                                                onClick={() => setSelectedSlot(slotKey)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    border: 'none',
                                                    borderRadius: '16px',
                                                    cursor: 'pointer',
                                                    backgroundColor: isActive ? '#0d9488' : '#e2e8f0',
                                                    color: isActive ? '#ffffff' : '#475569',
                                                    transition: '0.2s',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {s.name} {s.time ? `(${s.time})` : ''}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {loadingCandidates && filteredCandidates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    Loading allocated candidates...
                                </div>
                            ) : filteredCandidates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                                    <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                    <p>No candidates found matching the query or currently allocated to this slot/venue.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Participant Name</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Register ID</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Institution</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Allocated Slot</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Category</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Juz Option</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCandidates.map((c, index) => (
                                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                                    <td style={{ padding: '14px 20px', fontWeight: 'bold', color: '#1e293b' }}>
                                                        {index + 1}. {c.full_name}
                                                    </td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <span style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>
                                                            {c.participant_id || c.id}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: '#475569' }}>
                                                        {c.expand?.institution_ref?.name || <span style={{ color: '#94a3b8' }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: '#0f766e', fontWeight: '500' }}>
                                                        {c.allocated_slot || <span style={{ color: '#94a3b8' }}>General Slot</span>}
                                                    </td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                            backgroundColor: '#e0f2fe',
                                                            color: '#0369a1'
                                                        }}>
                                                            {c.category === '5_juz' ? '5 Juz' : c.category === '15_juz' ? '15 Juz' : '30 Juz'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: '#475569' }}>
                                                        {c.juzz_options ? getCompactJuzLabel(c.juzz_options) : (c.selected_juz || <span style={{ color: '#94a3b8' }}>—</span>)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <PrintPreviewModal
                isOpen={!!printPreview}
                onClose={() => setPrintPreview(null)}
                title={printTitle}
                htmlContent={printPreview || ''}
            />

            {/* Custom Embedded CSS Styles for animations and responsiveness */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 768px) {
                    .mobile-stack {
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    .search-box {
                        width: 100% !important;
                        margin-top: 8px;
                    }
                }
            `}</style>
        </div>
    );
}
