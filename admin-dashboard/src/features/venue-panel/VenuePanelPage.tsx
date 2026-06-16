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
    allocated_order: number;
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
    // Print Modal States
    const [printPreview, setPrintPreview] = useState<string | null>(null);
    const [printTitle, setPrintTitle] = useState<string>('Print Preview');
    const [printing, setPrinting] = useState(false);

    // Inline allocation modification states
    const [editAllocations, setEditAllocations] = useState<Record<string, { venue: string; order: number }>>({});
    const [isVenueEditMode, setIsVenueEditMode] = useState(false);

    const handleFieldChange = (participantId: string, field: 'venue' | 'order', value: any) => {
        setEditAllocations(prev => {
            const list = cache[activeTab] || [];
            const candidate = list.find(x => x.id === participantId);
            const current = prev[participantId] || {
                venue: candidate?.allocated_venue || '',
                order: candidate?.allocated_order || 0
            };
            return {
                ...prev,
                [participantId]: {
                    ...current,
                    [field]: value
                }
            };
        });
    };

    const handleSaveInlineAllocation = async (participantId: string) => {
        const editInfo = editAllocations[participantId];
        if (!editInfo) return;

        setLoadingCandidates(true);
        try {
            await pb.send('/api/admin/update-candidate-allocation', {
                method: 'POST',
                body: {
                    participantId,
                    allocated_venue: editInfo.venue,
                    allocated_order: Number(editInfo.order)
                }
            });
            
            setEditAllocations(prev => {
                const next = { ...prev };
                delete next[participantId];
                return next;
            });

            alert('Allocation updated successfully!');
            await loadVenues();
            await loadCandidatesForVenue(activeTab, true);
        } catch (e: any) {
            alert(e.message || 'Failed to update allocation.');
        } finally {
            setLoadingCandidates(false);
        }
    };
    const handlePrintList = async () => {
        setPrinting(true);
        try {
            const res = await pb.send<any[]>('/api/admin/print-venue-list', {
                method: 'GET',
                query: { venue: activeTab }
            });
            const html = generateVenueListHTML(activeTab, res, [], currentVenue?.expand?.judges || []);
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
                query: { venue: activeTab }
            });
            const html = generateIDCardsHTML(activeTab, res, []);
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
                query: { venue: activeTab }
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
            if (user?.designation === 'coordinators' && (activeTab === 'settings' || !activeTab) && formattedVenues.length > 0) {
                setActiveTab(formattedVenues[0].name);
            }
            setCache({});
        } catch (err) {
            console.error('Failed to load venues for panel:', err);
        }
    };

    useEffect(() => {
        loadVenues();
    }, []);

    const loadCandidatesForVenue = async (venueName: string, forceRefresh: boolean = false) => {
        if (!forceRefresh && cache[venueName]) {
            return;
        }

        setLoadingCandidates(true);
        try {
            const filter = `status = "approved" && allocated_venue = "${venueName.replace(/"/g, '\\"')}"`;
            
            const res = await pb.collection('participants_application').getFullList<Participant>({
                filter: filter,
                expand: 'institution_ref',
                sort: 'allocated_order'
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
        loadCandidatesForVenue(activeTab, false);
    }, [activeTab, venues]);

    const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
        const candidatesList = cache[activeTab] || [];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= candidatesList.length) return;

        const candidateA = candidatesList[index];
        const candidateB = candidatesList[targetIndex];

        // Swap allocated_orders
        const tempOrder = candidateA.allocated_order || (index + 1);
        const nextOrder = candidateB.allocated_order || (targetIndex + 1);

        setLoadingCandidates(true);
        try {
            await Promise.all([
                pb.send('/api/admin/update-candidate-allocation', {
                    method: 'POST',
                    body: {
                        participantId: candidateA.id,
                        allocated_venue: candidateA.allocated_venue || activeTab,
                        allocated_order: nextOrder
                    }
                }),
                pb.send('/api/admin/update-candidate-allocation', {
                    method: 'POST',
                    body: {
                        participantId: candidateB.id,
                        allocated_venue: candidateB.allocated_venue || activeTab,
                        allocated_order: tempOrder
                    }
                })
            ]);
            await loadCandidatesForVenue(activeTab, true);
        } catch (err) {
            console.error('Failed to swap orders:', err);
            alert('Failed to reorder candidates.');
        } finally {
            setLoadingCandidates(false);
        }
    };

    if (user?.designation !== 'admin' && user?.designation !== 'coordinators') {
        return (
            <div className={styles.restricted}>
                <h2>Access Denied</h2>
                <p>Only Administrators and Coordinators can access the Venue Panel.</p>
            </div>
        );
    }

    const currentVenue = venues.find(v => v.name === activeTab);
    const candidatesList = cache[activeTab] || [];

    // Filter candidates based on search query
    const filteredCandidates = candidatesList.filter(c => {
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
                        </div>

                        {/* Search and List Card */}
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
                                        title="Reload data"
                                    >
                                        <RefreshCw size={14} style={{ animation: loadingCandidates ? 'spin 1s linear infinite' : 'none' }} /> Reload
                                    </button>
                                    {user?.designation === 'admin' && (
                                        <button
                                            onClick={() => setIsVenueEditMode(!isVenueEditMode)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: isVenueEditMode ? '#0f766e' : '#ffffff',
                                                border: '1px solid ' + (isVenueEditMode ? '#0f766e' : '#cbd5e1'),
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                color: isVenueEditMode ? '#ffffff' : '#475569',
                                                fontWeight: '600',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                outline: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {isVenueEditMode ? 'Done Editing' : 'Edit Allocation'}
                                        </button>
                                    )}
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

                            {loadingCandidates && filteredCandidates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                    Loading allocated candidates...
                                </div>
                            ) : filteredCandidates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                                    <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                    <p>No candidates found matching the query or currently allocated to this venue.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Participant Name</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Register ID</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Institution</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Sequence Order</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Category</th>
                                                <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Juz Option</th>
                                                {user?.designation === 'admin' && isVenueEditMode && (
                                                    <>
                                                        <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Allocated Venue</th>
                                                        <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Actions</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCandidates.map((c, index) => {
                                                const isModified = editAllocations[c.id] && (
                                                    editAllocations[c.id].venue !== (c.allocated_venue || '') ||
                                                    editAllocations[c.id].order !== (c.allocated_order || 0)
                                                );
                                                const currentVenueVal = editAllocations[c.id]?.venue ?? (c.allocated_venue || '');
                                                const currentOrderVal = editAllocations[c.id]?.order ?? (c.allocated_order || 0);

                                                return (
                                                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                                        <td style={{ padding: '14px 20px', fontWeight: 'bold', color: '#1e293b' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {isVenueEditMode && user?.designation === 'admin' && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '6px' }}>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => handleMoveOrder(index, 'up')}
                                                                            disabled={index === 0 || loadingCandidates}
                                                                            style={{ padding: '2px 4px', fontSize: '8px', cursor: 'pointer', background: '#e2e8f0', border: 'none', borderRadius: '3px' }}
                                                                            title="Move Up"
                                                                        >
                                                                            ▲
                                                                        </button>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => handleMoveOrder(index, 'down')}
                                                                            disabled={index === filteredCandidates.length - 1 || loadingCandidates}
                                                                            style={{ padding: '2px 4px', fontSize: '8px', cursor: 'pointer', background: '#e2e8f0', border: 'none', borderRadius: '3px' }}
                                                                            title="Move Down"
                                                                        >
                                                                            ▼
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <span style={{ minWidth: '24px', textAlign: 'center', color: '#64748b' }}>{c.allocated_order || index + 1}.</span>
                                                                <span>{c.full_name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <span style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>
                                                                {c.participant_id || c.id}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', color: '#475569' }}>
                                                            {c.expand?.institution_ref?.name || <span style={{ color: '#94a3b8' }}>—</span>}
                                                        </td>
                                                        <td style={{ padding: '14px 20px', color: '#0f766e', fontWeight: 'bold' }}>
                                                            {isVenueEditMode && user?.designation === 'admin' ? (
                                                                <input
                                                                    type="number"
                                                                    value={currentOrderVal}
                                                                    onChange={(e) => handleFieldChange(c.id, 'order', Number(e.target.value))}
                                                                    style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                    min={0}
                                                                />
                                                            ) : (
                                                                c.allocated_order || index + 1
                                                            )}
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
                                                        {user?.designation === 'admin' && isVenueEditMode && (
                                                            <>
                                                                <td style={{ padding: '14px 20px' }}>
                                                                    <select
                                                                        value={currentVenueVal}
                                                                        onChange={(e) => handleFieldChange(c.id, 'venue', e.target.value)}
                                                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', maxWidth: '180px' }}
                                                                    >
                                                                        <option value="">No Venue / Unallocated</option>
                                                                        {venues.filter(v => v.category === c.category).map(v => (
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
                                                                                backgroundColor: '#0d9488',
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
