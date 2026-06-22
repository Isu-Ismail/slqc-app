import { useState, useEffect } from 'react';
import { pb } from '../../api/db';
import { venuesApi } from '../../api/venues';
import { marksApi } from '../../api/marks';
import { Users, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import VenueSettingsForm from '../control-panel/components/VenueSettingsForm';
import styles from './VenuePanelPage.module.css';
import PrintPreviewModal from '../track/components/PrintPreviewModal';
import { generateVenueListHTML, generateVenueMarksheetHTML } from './venuePrintTemplates';

// Sub-component imports
import VenueTabs from './components/VenueTabs';
import VenueHeaderActions from './components/VenueHeaderActions';
import ParticipantTable from './components/ParticipantTable';
import SanityCheckerModal from './components/SanityCheckerModal';

interface Venue {
    id: string;
    name: string;
    description: string;
    category: string;
    round: string;
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
    final_venue?: string;
    final_order?: number;
    whatsapp_number: string;
    guardian_phone: string;
    candidate_photo: string;
    expand?: { institution_ref?: { name: string } };
}

export default function VenuePanelPage() {
    const user = pb.authStore.model;
    const [venues, setVenues] = useState<Venue[]>([]);
    const [activeTab, setActiveTab] = useState<string>(user?.designation === 'coordinators' ? '' : 'settings');
    const [cache, setCache] = useState<Record<string, Participant[]>>({});
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [printPreview, setPrintPreview] = useState<string | null>(null);
    const [printTitle, setPrintTitle] = useState<string>('Print Preview');
    const [printing, setPrinting] = useState(false);
    const [editAllocations, setEditAllocations] = useState<Record<string, { venue: string; order: number }>>({});
    const [isVenueEditMode, setIsVenueEditMode] = useState(false);
    
    // Sanity checker states
    const [showSanityModal, setShowSanityModal] = useState(false);
    const [sanityCandidates, setSanityCandidates] = useState<any[]>([]);
    const [loadingSanity, setLoadingSanity] = useState(false);

    const handleRunSanityCheck = async () => {
        setLoadingSanity(true);
        setShowSanityModal(true);
        try {
            const res = await pb.collection('participants_application').getFullList({
                filter: 'status = "approved"',
                expand: 'institution_ref',
                sort: 'allocated_venue,allocated_order'
            });
            setSanityCandidates(res);
        } catch (err) {
            console.error('Failed to load sanity check data:', err);
            alert('Failed to scan candidates.');
            setShowSanityModal(false);
        } finally {
            setLoadingSanity(false);
        }
    };

    const handleFieldChange = (participantId: string, field: 'venue' | 'order', value: any) => {
        setEditAllocations(prev => {
            const list = cache[activeTab] || [];
            const candidate = list.find(x => x.id === participantId);
            const isFinal = currentVenue?.round === 'final';
            const currentVenueName = isFinal ? candidate?.final_venue : candidate?.allocated_venue;
            const currentOrderVal = isFinal ? candidate?.final_order : candidate?.allocated_order;
            const current = prev[participantId] || {
                venue: currentVenueName || '',
                order: currentOrderVal || 0
            };
            return { ...prev, [participantId]: { ...current, [field]: value } };
        });
    };

    const handleSaveInlineAllocation = async (participantId: string) => {
        const editInfo = editAllocations[participantId];
        if (!editInfo) return;
        setLoadingCandidates(true);
        try {
            const isFinal = currentVenue?.round === 'final';
            if (isFinal) {
                await venuesApi.updateFinalCandidateAllocation(participantId, editInfo.venue, Number(editInfo.order));
            } else {
                await venuesApi.updateCandidateAllocation(participantId, editInfo.venue, Number(editInfo.order));
            }
            setEditAllocations(prev => { const next = { ...prev }; delete next[participantId]; return next; });
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
            const res = await venuesApi.printVenueList(activeTab, currentVenue?.round || 'preliminary');
            let judgesList: any[] = [];
            if (currentVenue?.judges) {
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
            if (!hasObjects && currentVenue?.expand?.judges) {
                judgesList = Array.isArray(currentVenue.expand.judges) ? currentVenue.expand.judges : [currentVenue.expand.judges];
            }
            judgesList = judgesList.map(j => {
                if (j && typeof j === 'object') return j;
                return { id: j, name: j };
            });
            const html = generateVenueListHTML(activeTab, res, [], judgesList);
            setPrintTitle(`Venue Allocation List - ${activeTab}`);
            setPrintPreview(html);
        } catch (err) {
            alert('Failed to generate venue list.');
        } finally { setPrinting(false); }
    };



    const handleGenerateMarksheet = async () => {
        if (!currentVenue) return;
        setPrinting(true);
        try {
            const round = (currentVenue.round === 'final' ? 'final' : 'preliminary') as 'preliminary' | 'final';
            const res = await venuesApi.printVenueList(activeTab, round);
            if (!res || res.length === 0) { alert('No candidates found.'); return; }
            let judgesList: any[] = [];
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
                return { id: j, name: j };
            });
            const category = currentVenue.category || '30_juz';

            let criteriaList: any[] = [];
            try {
                const data = await marksApi.getTemplate(round, category);
                const cols = Array.isArray(data.columns) 
                    ? data.columns 
                    : (data.columns?.criteria || []);
                criteriaList = cols;
                if (!criteriaList || criteriaList.length === 0) {
                    throw new Error("Empty template criteria list returned.");
                }
            } catch (err) {
                console.warn('Failed to load mark template from db, using defaults:', err);
                criteriaList = [
                    { key: 'hifz', label: 'حفظ', numQuestions: 2, outOf: 20 },
                    { key: 'tajweed', label: 'تجويد', numQuestions: 2, outOf: 15 },
                    { key: 'juz_name', label: 'إسم السورة والجزء', numQuestions: 2, outOf: 5 },
                    { key: 'motashabihat', label: 'متشابهات', numQuestions: 2, outOf: 10 }
                ];
            }

            const html = generateVenueMarksheetHTML(activeTab, res, judgesList, round, category, criteriaList);
            setPrintTitle(`Marksheets — ${activeTab}`);
            setPrintPreview(html);
        } catch (err) {
            alert('Failed to generate marksheets.');
        } finally { setPrinting(false); }
    };

    const loadVenues = async () => {
        try {
            const venueRecords = await pb.collection('venue_detail').getFullList({ sort: 'name', expand: 'judges' });
            const students = await pb.collection('participants_application').getFullList({ fields: 'allocated_venue,final_venue,status', filter: 'status = "approved"' });
            const counts: Record<string, number> = {};
            students.forEach(s => { 
                if (s.allocated_venue) counts[s.allocated_venue] = (counts[s.allocated_venue] || 0) + 1; 
                if (s.final_venue) counts[s.final_venue] = (counts[s.final_venue] || 0) + 1; 
            });
            const formattedVenues: Venue[] = venueRecords.map(v => ({
                id: v.id,
                name: v.name,
                description: v.description,
                category: v.category,
                round: v.round || 'preliminary',
                capacity: v.capacity,
                slots: v.slots,
                allocatedCount: counts[v.name] || 0,
                judges: Array.isArray(v.judges) ? v.judges : (v.judges ? [v.judges] : []),
                expand: v.expand
            }));
            setVenues(formattedVenues);
            if (user?.designation === 'coordinators' && (activeTab === 'settings' || !activeTab) && formattedVenues.length > 0) {
                setActiveTab(formattedVenues[0].name);
            }
        } catch (err) { console.error(err); }
    };

    const handleAllocationComplete = () => {
        setCache({});
        loadVenues();
    };

    useEffect(() => { loadVenues(); }, [] );

    const loadCandidatesForVenue = async (venueName: string, forceRefresh: boolean = false) => {
        if (!forceRefresh && cache[venueName]) return;
        setLoadingCandidates(true);
        try {
            const targetVenue = venues.find(v => v.name === venueName);
            const isFinal = targetVenue?.round === 'final';
            const filter = isFinal
                ? `status = "approved" && final_venue = "${venueName.replace(/"/g, '\\"')}"`
                : `status = "approved" && allocated_venue = "${venueName.replace(/"/g, '\\"')}"`;
            const sort = isFinal ? 'final_order' : 'allocated_order';
            const res = await pb.collection('participants_application').getFullList<Participant>({ filter, expand: 'institution_ref', sort });
            setCache(prev => ({ ...prev, [venueName]: res }));
        } catch (err) { console.error(err); } finally { setLoadingCandidates(false); }
    };

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
        setLoadingCandidates(true);
        try {
            const isFinal = currentVenue?.round === 'final';
            if (isFinal) {
                await Promise.all([
                    venuesApi.updateFinalCandidateAllocation(candidateA.id, candidateA.final_venue || activeTab, candidateB.final_order || (targetIndex + 1)),
                    venuesApi.updateFinalCandidateAllocation(candidateB.id, candidateB.final_venue || activeTab, candidateA.final_order || (index + 1))
                ]);
            } else {
                await Promise.all([
                    venuesApi.updateCandidateAllocation(candidateA.id, candidateA.allocated_venue || activeTab, candidateB.allocated_order || (targetIndex + 1)),
                    venuesApi.updateCandidateAllocation(candidateB.id, candidateB.allocated_venue || activeTab, candidateA.allocated_order || (index + 1))
                ]);
            }
            await loadCandidatesForVenue(activeTab, true);
        } catch (err) { alert('Failed to reorder.'); } finally { setLoadingCandidates(false); }
    };

    if (user?.designation !== 'admin' && user?.designation !== 'coordinators') {
        return (
            <div className={styles.restricted}>
                <h2>Access Denied</h2>
            </div>
        );
    }

    const currentVenue = venues.find(v => v.name === activeTab);
    const candidatesList = cache[activeTab] || [];
    const filteredCandidates = candidatesList.filter(c => {
        const query = searchQuery.toLowerCase();
        return c.full_name.toLowerCase().includes(query) || (c.expand?.institution_ref?.name || '').toLowerCase().includes(query);
    });

    return (
        <div className={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Stage Venues &amp; Placements</h1>
                <button
                    onClick={handleRunSanityCheck}
                    style={{
                        backgroundColor: '#0d9488',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontWeight: '600',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(13, 148, 136, 0.15)'
                    }}
                >
                    <ShieldCheck size={16} /> Run Sanity &amp; Fairness Checker
                </button>
            </div>
            <VenueTabs
                venues={venues}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                showSettings={user?.designation === 'admin'}
                loadVenues={loadVenues}
            />

            <div style={{ marginTop: '20px' }}>
                {activeTab === 'settings' && user?.designation === 'admin' && (
                    <VenueSettingsForm onAllocationComplete={handleAllocationComplete} />
                )}

                {activeTab !== 'settings' && currentVenue && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <VenueHeaderActions
                            currentVenue={currentVenue}
                            printing={printing}
                            loadingCandidates={loadingCandidates}
                            onPrintList={handlePrintList}
                            onGenerateMarksheet={handleGenerateMarksheet}
                        />

                        <div className={styles.card} style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Allocated Participants</h4>
                                    <button onClick={() => loadCandidatesForVenue(activeTab, true)} disabled={loadingCandidates} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}>
                                        <RefreshCw size={14} style={{ animation: loadingCandidates ? 'spin 1s linear infinite' : 'none' }} /> Reload
                                    </button>
                                    {user?.designation === 'admin' && (
                                        <button onClick={() => setIsVenueEditMode(!isVenueEditMode)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: isVenueEditMode ? '#059669' : '#ffffff', border: '1px solid ' + (isVenueEditMode ? '#059669' : '#cbd5e1'), borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: isVenueEditMode ? '#ffffff' : '#475569', fontWeight: '600' }}>
                                            {isVenueEditMode ? 'Done Editing' : 'Edit Allocation'}
                                        </button>
                                    )}
                                </div>
                                <div style={{ position: 'relative', width: '280px' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="text" placeholder="Search by name or institution..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </div>

                            {loadingCandidates && filteredCandidates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
                            ) : filteredCandidates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}><Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} /><p>No candidates found.</p></div>
                            ) : (
                                <ParticipantTable
                                    filteredCandidates={filteredCandidates}
                                    isVenueEditMode={isVenueEditMode}
                                    isAdmin={user?.designation === 'admin'}
                                    loadingCandidates={loadingCandidates}
                                    editAllocations={editAllocations}
                                    venues={venues}
                                    handleMoveOrder={handleMoveOrder}
                                    handleFieldChange={handleFieldChange}
                                    handleSaveInlineAllocation={handleSaveInlineAllocation}
                                    isFinalRound={currentVenue?.round === 'final'}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            <PrintPreviewModal isOpen={!!printPreview} onClose={() => setPrintPreview(null)} title={printTitle} htmlContent={printPreview || ''} />
            <SanityCheckerModal
                isOpen={showSanityModal}
                onClose={() => setShowSanityModal(false)}
                venues={venues}
                candidates={sanityCandidates}
                loading={loadingSanity}
                onRefresh={handleRunSanityCheck}
            />
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}