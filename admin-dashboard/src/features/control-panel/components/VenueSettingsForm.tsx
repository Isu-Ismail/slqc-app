import { useState, useEffect } from 'react';
import { pb } from '../../../api/db';
import { metadataApi } from '../../../api/metadata';
import { MapPin, Plus, Trash2, Edit2, Play, Users, CheckCircle, AlertTriangle, HelpCircle, RefreshCw } from 'lucide-react';
import styles from '../ControlPanelPage.module.css';

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

interface VenueSettingsFormProps {
    onAllocationComplete?: () => void;
}


export default function VenueSettingsForm({ onAllocationComplete }: VenueSettingsFormProps) {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(false);
    const [allocating, setAllocating] = useState(false);
    const [allocationSummary, setAllocationSummary] = useState<any | null>(null);
    const [allocationProgress, setAllocationProgress] = useState<number>(0);
    const [allocationStep, setAllocationStep] = useState<string>('');
    const [allJudges, setAllJudges] = useState<any[]>([]);
    const [selectedJudges, setSelectedJudges] = useState<string[]>([]);
    const [allocationRound, setAllocationRound] = useState<'preliminary' | 'final'>('preliminary');

    const parseJudgesObjects = (judgesVal: any, judgesList: any[] = allJudges): any[] => {
        if (!judgesVal) return [];
        let rawList: any[] = [];
        if (Array.isArray(judgesVal)) {
            rawList = judgesVal;
        } else if (typeof judgesVal === 'string') {
            try {
                const parsed = JSON.parse(judgesVal);
                if (Array.isArray(parsed)) rawList = parsed;
                else rawList = judgesVal ? [judgesVal] : [];
            } catch (_) {
                rawList = judgesVal ? [judgesVal] : [];
            }
        }
        return rawList.map((j: any) => {
            if (j && typeof j === 'object') return j;
            const found = judgesList.find(aj => aj.id === j);
            if (found) {
                return {
                    id: found.id,
                    name: found.name,
                    phone_number: found.phone_number,
                    institution: found.institution
                };
            }
            return { id: j, name: j, phone_number: '', institution: '' };
        });
    };

    const parseJudgesField = (judgesVal: any, judgesList: any[] = allJudges): string[] => {
        const objects = parseJudgesObjects(judgesVal, judgesList);
        return objects.map(o => o.id);
    };

    const isJudgeAssignedElsewhere = (judgeId: string) => {
        return venues.some(v => {
            if (v.id === editingVenue?.id) return false;
            if (v.round !== venueRound) return false;
            const vJudges = Array.isArray(v.judges) ? v.judges : [];
            return vJudges.some((j: any) => (j && typeof j === 'object' ? j.id : j) === judgeId);
        });
    };

    const getAssignedVenueNameForJudge = (judgeId: string) => {
        const assigned = venues.find(v => {
            if (v.id === editingVenue?.id) return false;
            if (v.round !== venueRound) return false;
            const vJudges = Array.isArray(v.judges) ? v.judges : [];
            return vJudges.some((j: any) => (j && typeof j === 'object' ? j.id : j) === judgeId);
        });
        return assigned ? assigned.name : null;
    };

    const getVenueJudgesDisplay = (venue: Venue) => {
        const list = Array.isArray(venue.judges) ? venue.judges : [];
        if (list.length === 0) return <span style={{ color: '#94a3b8' }}>No Judges Assigned</span>;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {list.map((j: any) => (
                    <div key={j.id} style={{ fontSize: '13px', fontWeight: '500' }}>
                        {j.name} <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>({j.phone_number})</span>
                    </div>
                ))}
            </div>
        );
    };

    // Allocate / Unallocate Selection Modal States
    const [showAllocateSelectModal, setShowAllocateSelectModal] = useState(false);
    const [showUnallocateSelectModal, setShowUnallocateSelectModal] = useState(false);
    const [allocateChecked, setAllocateChecked] = useState<Record<string, boolean>>({
        '5_juz': false,
        '15_juz': false,
        '30_juz': false
    });
    const [unallocateChecked, setUnallocateChecked] = useState<Record<string, boolean>>({
        '5_juz': false,
        '15_juz': false,
        '30_juz': false
    });

    // Custom Modal Dialog States & Handlers
    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        type: 'confirm' | 'alert' | 'error' | 'success';
        title: string;
        message: string;
        onConfirm?: () => void;
        onCancel?: () => void;
    }>({
        isOpen: false,
        type: 'confirm',
        title: '',
        message: ''
    });

    const showDialog = (type: 'confirm' | 'alert' | 'error' | 'success', title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => {
        setDialogConfig({
            isOpen: true,
            type,
            title,
            message,
            onConfirm,
            onCancel
        });
    };

    const closeDialog = () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
    };

    // Edit/Add Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
    const [venueName, setVenueName] = useState('');
    const [venueDesc, setVenueDesc] = useState('');
    const [venueCategory, setVenueCategory] = useState('5_juz');
    const [venueRound, setVenueRound] = useState('preliminary');
    const [venueCapacityField, setVenueCapacityField] = useState<string>('18');

    const loadVenuesAndAllocations = async () => {
        setLoading(true);
        try {
            // Fetch venues
            const venueRecords = await pb.collection('venue_detail').getFullList({
                sort: 'name',
                expand: 'judges'
            });

            // Fetch approved student counts per venue
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

            // Fetch judges list
            const judgesRecords = await pb.collection('judges').getFullList({
                sort: 'name'
            });
            setAllJudges(judgesRecords);

            const formattedVenues: Venue[] = venueRecords.map(v => ({
                id: v.id,
                name: v.name,
                description: v.description,
                category: v.category,
                round: v.round || 'preliminary',
                capacity: v.capacity,
                slots: v.slots,
                allocatedCount: counts[v.name] || 0,
                judges: parseJudgesObjects(v.judges, judgesRecords),
                expand: v.expand
            }));

            setVenues(formattedVenues);
        } catch (err) {
            console.error('Failed to load venues:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVenuesAndAllocations();
    }, []);

    const handleOpenAdd = () => {
        setEditingVenue(null);
        setVenueName('');
        setVenueDesc('');
        setVenueCategory('5_juz');
        setVenueRound('preliminary');
        setVenueCapacityField('18');
        setSelectedJudges([]);
        setShowModal(true);
    };

    const handleOpenEdit = (v: Venue) => {
        setEditingVenue(v);
        setVenueName(v.name);
        setVenueDesc(v.description);
        setVenueCategory(v.category);
        setVenueRound(v.round || 'preliminary');
        setSelectedJudges(parseJudgesField(v.judges));
        setVenueCapacityField(String(v.capacity || 18));
        setShowModal(true);
    };

    const syncJudgesAllocatedVenueFrontend = async () => {
        try {
            const [venuesList, judgesList] = await Promise.all([
                pb.collection('venue_detail').getFullList(),
                pb.collection('judges').getFullList()
            ]);

            const judgeToPrelimVenueMap: Record<string, string> = {};
            const judgeToFinalVenueMap: Record<string, string> = {};

            venuesList.forEach(v => {
                const judgeIds = parseJudgesField(v.judges);
                judgeIds.forEach(id => {
                    if (v.round === 'final') {
                        judgeToFinalVenueMap[id] = v.id;
                    } else {
                        judgeToPrelimVenueMap[id] = v.id;
                    }
                });
            });

            for (const j of judgesList) {
                const expectedPrelim = judgeToPrelimVenueMap[j.id] || "";
                const currentPrelim = j.allocated_venue || "";
                const expectedFinal = judgeToFinalVenueMap[j.id] || "";
                const currentFinal = j.final_venue || "";

                const updateData: Record<string, any> = {};
                let needsUpdate = false;

                if (expectedPrelim !== currentPrelim) {
                    updateData.allocated_venue = expectedPrelim;
                    needsUpdate = true;
                }

                if (expectedFinal !== currentFinal) {
                    updateData.final_venue = expectedFinal;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await pb.collection('judges').update(j.id, updateData);
                }
            }
        } catch (err) {
            console.error("Failed to sync judges allocated venue frontend:", err);
        }
    };

    const handleSaveVenue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!venueName.trim()) return;

        setLoading(true);
        try {
            const totalCapacity = parseInt(venueCapacityField, 10) || 18;

            const judgesDetails = selectedJudges.map(jId => {
                const j = allJudges.find(aj => aj.id === jId);
                return {
                    id: jId,
                    name: j?.name || '',
                    phone_number: j?.phone_number || '',
                    institution: j?.institution || ''
                };
            });

            const data = {
                name: venueName.trim(),
                description: venueDesc.trim(),
                category: venueCategory,
                round: venueRound,
                capacity: totalCapacity,
                slots: [],
                judges: judgesDetails
            };

            let savedVenue;
            if (editingVenue) {
                savedVenue = await pb.collection('venue_detail').update(editingVenue.id, data);
            } else {
                savedVenue = await pb.collection('venue_detail').create(data);
            }

            const venueId = savedVenue.id;

            // Manually update selected judges' allocated_venue or final_venue to the venue ID
            for (const judgeId of selectedJudges) {
                try {
                    const updateData: Record<string, any> = {};
                    if (venueRound === 'final') {
                        updateData.final_venue = venueId;
                    } else {
                        updateData.allocated_venue = venueId;
                    }
                    await pb.collection('judges').update(judgeId, updateData);
                } catch (err) {
                    console.error(`Failed to update judge ${judgeId} to venue:`, err);
                }
            }

            // Manually clear allocated_venue or final_venue for removed judges
            const previousJudges = editingVenue ? parseJudgesField(editingVenue.judges) : [];
            const removedJudges = previousJudges.filter(id => !selectedJudges.includes(id));
            for (const judgeId of removedJudges) {
                try {
                    const updateData: Record<string, any> = {};
                    if (venueRound === 'final') {
                        updateData.final_venue = "";
                    } else {
                        updateData.allocated_venue = "";
                    }
                    await pb.collection('judges').update(judgeId, updateData);
                } catch (err) {
                    console.error(`Failed to clear judge ${judgeId} venue allocation:`, err);
                }
            }

            // Fallback: Sync allocated venue to judges collection records
            await syncJudgesAllocatedVenueFrontend();

            setShowModal(false);
            await loadVenuesAndAllocations();
            onAllocationComplete?.();
        } catch (err: any) {
            showDialog('error', 'Error Saving Venue', err.message || 'Failed to save venue.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVenue = async (v: Venue) => {
        if (v.allocatedCount && v.allocatedCount > 0) {
            showDialog('alert', 'Cannot Delete Venue', `Cannot delete "${v.name}" because it currently has ${v.allocatedCount} students allocated to it. Please run allocation reset first.`);
            return;
        }

        showDialog('confirm', 'Confirm Delete', `Are you sure you want to delete venue "${v.name}"?`, async () => {
            closeDialog();
            setLoading(true);
            try {
                // Clear allocated_venue / final_venue for all judges assigned to this venue before deleting
                const assignedJudges = parseJudgesField(v.judges);
                for (const judgeId of assignedJudges) {
                    try {
                        const updateData: Record<string, any> = {};
                        if (v.round === 'final') {
                            updateData.final_venue = "";
                        } else {
                            updateData.allocated_venue = "";
                        }
                        await pb.collection('judges').update(judgeId, updateData);
                    } catch (err) {
                        console.error(`Failed to clear judge ${judgeId} venue assignment:`, err);
                    }
                }

                await pb.collection('venue_detail').delete(v.id);
                // Fallback: Sync allocated venue to judges collection records
                await syncJudgesAllocatedVenueFrontend();
                await loadVenuesAndAllocations();
                onAllocationComplete?.();
            } catch (err: any) {
                showDialog('error', 'Error Deleting Venue', err.message || 'Failed to delete venue.');
            } finally {
                setLoading(false);
            }
        }, closeDialog);
    };

    const handleOpenAllocateModal = async (round: 'preliminary' | 'final') => {
        setAllocationRound(round);
        setLoading(true);
        try {
            const finalMarksCountRes = await pb.collection('final_marks').getList(1, 1, { fields: 'id' });

            if (round === 'preliminary') {
                const marksCountRes = await pb.collection('preliminary_marks').getList(1, 1, { fields: 'id' });
                const finalistCountRes = await pb.collection('participants_application').getList(1, 1, {
                    filter: 'is_finalist = true',
                    fields: 'id'
                });
                if (marksCountRes.totalItems > 0 || finalMarksCountRes.totalItems > 0 || finalistCountRes.totalItems > 0) {
                    showDialog(
                        'error',
                        'Cannot Run Allocation',
                        'Cannot run preliminary allocation because grading marks have already been entered or finalists have already been selected.'
                    );
                    return;
                }
            } else {
                if (finalMarksCountRes.totalItems > 0) {
                    showDialog(
                        'error',
                        'Cannot Run Allocation',
                        'Cannot run final allocation because final round marks have already been entered.'
                    );
                    return;
                }
                const finalistCountRes = await pb.collection('participants_application').getList(1, 1, {
                    filter: 'is_finalist = true',
                    fields: 'id'
                });
                if (finalistCountRes.totalItems === 0) {
                    showDialog(
                        'error',
                        'Cannot Run Allocation',
                        'No promoted finalists found. Please promote finalists first.'
                    );
                    return;
                }
            }

            const metaList = await metadataApi.getAllMetadata(true); // Force refresh
            const participantStatusRec = metaList.find(r => r.key === 'participant_application_status');
            const madrasaStatusRec = metaList.find(r => r.key === 'madrasa_application_status');

            let participantClosed = false;
            let madrasaClosed = false;

            try {
                if (participantStatusRec) {
                    const val = typeof participantStatusRec.value === 'string' ? JSON.parse(participantStatusRec.value) : participantStatusRec.value;
                    participantClosed = val?.status === 'closed';
                }
            } catch (_) { }

            try {
                if (madrasaStatusRec) {
                    const val = typeof madrasaStatusRec.value === 'string' ? JSON.parse(madrasaStatusRec.value) : madrasaStatusRec.value;
                    madrasaClosed = val?.status === 'closed';
                }
            } catch (_) { }

            if (!participantClosed || !madrasaClosed) {
                showDialog('error', 'Cannot Run Allocation', 'Cannot run allocation while registration is open. Both individual and institution registration statuses must be closed first.');
                return;
            }

            setAllocateChecked({
                '5_juz': false,
                '15_juz': false,
                '30_juz': false
            });
            setShowAllocateSelectModal(true);
        } catch (err: any) {
            showDialog('error', 'Status Check Failed', err.message || 'Failed to verify registration status.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenUnallocateModal = async (round: 'preliminary' | 'final') => {
        setAllocationRound(round);
        setLoading(true);
        try {
            const finalMarksCountRes = await pb.collection('final_marks').getList(1, 1, { fields: 'id' });

            if (round === 'preliminary') {
                const marksCountRes = await pb.collection('preliminary_marks').getList(1, 1, { fields: 'id' });
                const finalistCountRes = await pb.collection('participants_application').getList(1, 1, {
                    filter: 'is_finalist = true',
                    fields: 'id'
                });
                if (marksCountRes.totalItems > 0 || finalMarksCountRes.totalItems > 0 || finalistCountRes.totalItems > 0) {
                    showDialog(
                        'error',
                        'Cannot Cancel Allocation',
                        'Cannot cancel or reset preliminary allocations because grading marks have already been entered or finalists have already been selected.'
                    );
                    return;
                }
            } else {
                if (finalMarksCountRes.totalItems > 0) {
                    showDialog(
                        'error',
                        'Cannot Cancel Allocation',
                        'Cannot cancel or reset final allocations because final round marks have already been entered.'
                    );
                    return;
                }
            }

            setUnallocateChecked({
                '5_juz': false,
                '15_juz': false,
                '30_juz': false
            });
            setShowUnallocateSelectModal(true);
        } catch (err: any) {
            showDialog('error', 'Check Failed', err.message || 'Failed to verify database status.');
        } finally {
            setLoading(false);
        }
    };

    const verifyAdminPassword = async (actionLabel: string): Promise<boolean> => {
        const password = window.prompt(`Enter administrator password to authorize: ${actionLabel}`);
        if (password === null) return false;
        if (!password.trim()) {
            alert('Password cannot be blank.');
            return false;
        }

        try {
            const user = pb.authStore.model;
            const email = user?.email || user?.username || '';
            if (!email) {
                alert('No active admin session found.');
                return false;
            }
            await pb.collection('users').authWithPassword(email, password);
            return true;
        } catch (err: any) {
            alert('Incorrect password. Action denied.');
            return false;
        }
    };

    const handleRunAllocationSelected = async () => {
        const selectedCats = Object.keys(allocateChecked).filter(k => allocateChecked[k]);
        if (selectedCats.length === 0) {
            showDialog('alert', 'Selection Required', 'Please select at least one category to allocate.');
            return;
        }

        const actionName = allocationRound === 'final' ? 'Run Final Venue Allocation' : 'Run Automatic Venue Allocation';
        const verified = await verifyAdminPassword(actionName);
        if (!verified) return;

        setShowAllocateSelectModal(false);
        setAllocating(true);
        setAllocationSummary(null);

        let combinedSummary: Record<string, any> = {};

        try {
            for (let i = 0; i < selectedCats.length; i++) {
                const cat = selectedCats[i];
                const catLabel = getCategoryBadge(cat);

                // Calculate progress values per step
                const baseProgress = Math.floor((i / selectedCats.length) * 100);
                const stepProgress = Math.floor(100 / selectedCats.length);

                setAllocationProgress(baseProgress + Math.floor(stepProgress * 0.1));
                setAllocationStep(`[${catLabel}] Validating registration status...`);
                await new Promise(r => setTimeout(r, 450));

                setAllocationProgress(baseProgress + Math.floor(stepProgress * 0.35));
                setAllocationStep(`[${catLabel}] Checking pending applications...`);
                await new Promise(r => setTimeout(r, 450));

                setAllocationProgress(baseProgress + Math.floor(stepProgress * 0.55));
                setAllocationStep(`[${catLabel}] Resetting existing allocations...`);
                await new Promise(r => setTimeout(r, 450));

                setAllocationProgress(baseProgress + Math.floor(stepProgress * 0.75));
                setAllocationStep(`[${catLabel}] Performing diversity-aware slot allocation...`);
                await new Promise(r => setTimeout(r, 450));

                const apiPath = allocationRound === 'final' ? '/api/admin/allocate-final-venues' : '/api/admin/allocate-venues';
                const res = await pb.send<any>(apiPath, {
                    method: 'POST',
                    body: { category: cat }
                });

                if (res && res.success) {
                    if (res.summary) {
                        combinedSummary = { ...combinedSummary, ...res.summary };
                    }
                }
            }

            setAllocationProgress(100);
            setAllocationStep("All allocations complete!");
            await new Promise(r => setTimeout(r, 500));

            setAllocationSummary(combinedSummary);
            showDialog('success', 'Allocation Completed', 'Automatic venue allocation completed successfully for all selected categories!');
            await loadVenuesAndAllocations();
            onAllocationComplete?.();
        } catch (err: any) {
            const errMsg = err.data?.error || err.message || 'Failed to allocate venues.';
            showDialog('error', 'Allocation Failed', errMsg);
        } finally {
            setAllocating(false);
            setAllocationProgress(0);
            setAllocationStep("");
        }
    };

    const handleRunUnallocateSelected = async () => {
        const selectedCats = Object.keys(unallocateChecked).filter(k => unallocateChecked[k]);
        if (selectedCats.length === 0) {
            showDialog('alert', 'Selection Required', 'Please select at least one category to unallocate.');
            return;
        }

        const actionName = allocationRound === 'final' ? 'Clear Final Venue Allocations' : 'Clear Venue Allocations';
        const verified = await verifyAdminPassword(actionName);
        if (!verified) return;

        setShowUnallocateSelectModal(false);
        setLoading(true);

        try {
            for (let i = 0; i < selectedCats.length; i++) {
                const cat = selectedCats[i];
                const apiPath = allocationRound === 'final' ? '/api/admin/unallocate-final-venues' : '/api/admin/unallocate-venues';
                await pb.send<any>(apiPath, {
                    method: 'POST',
                    body: { category: cat }
                });
            }

            showDialog('success', 'Allocations Cleared', 'Venue allocations cleared successfully for all selected categories!');
            await loadVenuesAndAllocations();
            onAllocationComplete?.();
        } catch (err: any) {
            const errMsg = err.data?.error || err.message || 'Failed to unallocate venues.';
            showDialog('error', 'Unallocation Failed', errMsg);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryBadge = (cat: string) => {
        const labels: Record<string, string> = {
            '5_juz': '5 Juz',
            '15_juz': '15 Juz',
            '30_juz': '30 Juz'
        };
        return labels[cat] || cat;
    };

    return (
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={loadVenuesAndAllocations}
                        className={styles.btnSecondary}
                        disabled={allocating || loading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px' }}
                        title="Reload venues and allocations data"
                    >
                        <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Reload
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className={styles.btnSecondary}
                        disabled={allocating}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px' }}
                    >
                        <Plus size={16} /> Add Venue
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenUnallocateModal('preliminary')}
                        className={styles.btnSecondary}
                        disabled={allocating || loading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', borderColor: '#ef4444', color: '#ef4444', backgroundColor: '#fff' }}
                    >
                        <Trash2 size={16} /> Cancel Allocation
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenAllocateModal('preliminary')}
                        className={styles.btnPrimary}
                        disabled={allocating || venues.length === 0}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', backgroundColor: '#0d9488' }}
                    >
                        <Play size={16} /> {allocating && allocationRound === 'preliminary' ? 'Allocating...' : 'Run Allocation'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenUnallocateModal('final')}
                        className={styles.btnSecondary}
                        disabled={allocating || loading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', borderColor: '#f59e0b', color: '#f59e0b', backgroundColor: '#fff' }}
                    >
                        <Trash2 size={16} /> Cancel Final Allocation
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenAllocateModal('final')}
                        className={styles.btnPrimary}
                        disabled={allocating || venues.length === 0}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', backgroundColor: '#059669', borderColor: '#059669' }}
                    >
                        <Play size={16} /> {allocating && allocationRound === 'final' ? 'Allocating...' : 'Allocate Final Venue'}
                    </button>
                </div>
            </div>

            {/* Allocation Progress Bar */}
            {allocating && (
                <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0369a1', fontWeight: 'bold', marginBottom: '8px' }}>
                        <span>{allocationStep}</span>
                        <span>{allocationProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${allocationProgress}%`, height: '100%', backgroundColor: '#0284c7', transition: 'width 0.4s ease' }} />
                    </div>
                </div>
            )}

            {/* Allocation Result Summary */}
            {allocationSummary && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 'bold', marginBottom: '8px' }}>
                        <CheckCircle size={18} /> Allocation Complete Summary
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
                        {Object.entries(allocationSummary).filter(([_, stat]: any) => stat.allocated > 0).length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: '12px', color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>
                                No candidates were allocated to slots in this run.
                            </div>
                        ) : (
                            Object.entries(allocationSummary)
                                .filter(([_, stat]: any) => stat.allocated > 0)
                                .map(([name, stat]: any) => (
                                    <div key={name} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Category: {getCategoryBadge(stat.category)}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px' }}>
                                            <span>Allocated:</span>
                                            <span style={{ fontWeight: 'bold' }}>{stat.allocated} / {stat.capacity}</span>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            )}

            {/* Venues Grid / List */}
            <div className={styles.card} style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
                <div className={styles.cardHeader} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 className={styles.cardTitle} style={{ margin: '0' }}>Configured Venues</h3>
                </div>
                {loading && venues.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                        <RefreshCw size={40} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                        <p>Loading venues and allocations...</p>
                    </div>
                ) : venues.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                        <MapPin size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <p>No venues configured yet. Click "Add Venue" above to get started.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s', pointerEvents: loading ? 'none' : 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Venue Name</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Category</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Capacity</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Allocated Candidates</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569' }}>Assigned Judges</th>
                                    <th style={{ padding: '12px 20px', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {venues.map((v) => (
                                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.name}</div>
                                            {v.description && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{v.description}</div>}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                backgroundColor: '#f1f5f9',
                                                color: '#475569'
                                            }}>
                                                {getCategoryBadge(v.category)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                                            {v.capacity}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Users size={16} style={{ color: '#64748b' }} />
                                                <span style={{ fontWeight: 'bold', color: (v.allocatedCount || 0) > v.capacity ? '#ef4444' : '#0f766e' }}>
                                                    {v.allocatedCount || 0}
                                                </span>
                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>/ {v.capacity}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            {getVenueJudgesDisplay(v)}
                                        </td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(v)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#475569', padding: '4px' }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteVenue(v)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                                {editingVenue ? 'Edit Venue' : 'Add New Venue'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSaveVenue} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Venue Name *</label>
                                <input
                                    type="text"
                                    value={venueName}
                                    onChange={(e) => setVenueName(e.target.value)}
                                    placeholder="e.g. Hall A, Auditorium"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Description</label>
                                <input
                                    type="text"
                                    value={venueDesc}
                                    onChange={(e) => setVenueDesc(e.target.value)}
                                    placeholder="e.g. First floor, block B"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Category *</label>
                                <select
                                    value={venueCategory}
                                    onChange={(e) => setVenueCategory(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' }}
                                    required
                                >
                                    <option value="5_juz">5 Juz</option>
                                    <option value="15_juz">15 Juz</option>
                                    <option value="30_juz">30 Juz</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Round *</label>
                                <select
                                    value={venueRound}
                                    onChange={(e) => setVenueRound(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' }}
                                    required
                                >
                                    <option value="preliminary">Preliminary Round</option>
                                    <option value="final">Final Round</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Assign Judges (can select multiple)</label>

                                {/* Selected Judges Badges / Tickets */}
                                {selectedJudges.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                        {selectedJudges.map(jId => {
                                            const j = allJudges.find(aj => aj.id === jId);
                                            if (!j) return null;
                                            return (
                                                <span key={jId} style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 10px',
                                                    backgroundColor: '#ccfbf1',
                                                    color: '#0f766e',
                                                    borderRadius: '16px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    border: '1px solid #99f6e4'
                                                }}>
                                                    {j.name}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedJudges(prev => prev.filter(id => id !== jId))}
                                                        style={{
                                                            border: 'none',
                                                            background: 'none',
                                                            cursor: 'pointer',
                                                            color: '#0f766e',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            padding: 0,
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            lineHeight: '1'
                                                        }}
                                                        title="Remove judge assignment"
                                                    >
                                                        &times;
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                <div style={{
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    maxHeight: '140px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    backgroundColor: '#fff'
                                }}>
                                    {allJudges.length === 0 ? (
                                        <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No judges registered in the system.</div>
                                    ) : (
                                        allJudges
                                            .filter(j => venueRound === 'final' ? j.final_judge === true : j.final_judge !== true)
                                            .map(j => {
                                                const assignedElsewhere = isJudgeAssignedElsewhere(j.id);
                                                const assignedVenueName = getAssignedVenueNameForJudge(j.id);
                                                const isChecked = selectedJudges.includes(j.id);

                                                return (
                                                    <label key={j.id} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        fontSize: '13px',
                                                        color: assignedElsewhere ? '#94a3b8' : '#1e293b',
                                                        cursor: assignedElsewhere ? 'not-allowed' : 'pointer',
                                                        userSelect: 'none'
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            disabled={assignedElsewhere}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedJudges(prev => [...prev, j.id]);
                                                                } else {
                                                                    setSelectedJudges(prev => prev.filter(id => id !== j.id));
                                                                }
                                                            }}
                                                            style={{ cursor: assignedElsewhere ? 'not-allowed' : 'pointer' }}
                                                        />
                                                        <span style={{ fontWeight: '600' }}>{j.name}</span>
                                                        <span style={{ fontSize: '12px', color: '#64748b' }}>({j.phone_number})</span>
                                                        {assignedElsewhere && (
                                                            <span style={{ fontSize: '11px', color: '#ef4444', fontStyle: 'italic' }}>
                                                                - Assigned to {assignedVenueName}
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })
                                    )}
                                </div>
                            </div>

                            {/* Capacity Section */}
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Venue Capacity (Max Students) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 18"
                                    value={venueCapacityField}
                                    onChange={(e) => setVenueCapacityField(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className={styles.btnSecondary}
                                    style={{ padding: '8px 16px', fontSize: '14px', height: '38px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnPrimary}
                                    disabled={loading}
                                    style={{ padding: '8px 16px', fontSize: '14px', height: '38px', backgroundColor: '#0d9488' }}
                                >
                                    {loading ? 'Saving...' : 'Save Venue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Allocate Selection Modal */}
            {showAllocateSelectModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '400px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Run Venue Allocation</h3>
                            <button
                                type="button"
                                onClick={() => setShowAllocateSelectModal(false)}
                                style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                                Select the categories you want to allocate. This will automatically assign approved candidates in the selected categories.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>
                                    <input
                                        type="checkbox"
                                        checked={Object.values(allocateChecked).every(v => v)}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            setAllocateChecked({
                                                '5_juz': val,
                                                '15_juz': val,
                                                '30_juz': val
                                            });
                                        }}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    Select All Categories
                                </label>
                                <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                                {Object.keys(allocateChecked).map((cat) => (
                                    <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                        <input
                                            type="checkbox"
                                            checked={allocateChecked[cat]}
                                            onChange={(e) => {
                                                setAllocateChecked(prev => ({
                                                    ...prev,
                                                    [cat]: e.target.checked
                                                }));
                                            }}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        {getCategoryBadge(cat)} Category
                                    </label>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAllocateSelectModal(false)}
                                    className={styles.btnSecondary}
                                    style={{ padding: '8px 16px', fontSize: '14px', height: '38px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRunAllocationSelected}
                                    className={styles.btnPrimary}
                                    disabled={!Object.values(allocateChecked).some(v => v)}
                                    style={{ padding: '8px 16px', fontSize: '14px', height: '38px', backgroundColor: '#0d9488' }}
                                >
                                    Allocate Selected
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unallocate Selection Modal */}
            {showUnallocateSelectModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '400px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>Cancel / Clear Allocation</h3>
                            <button
                                type="button"
                                onClick={() => setShowUnallocateSelectModal(false)}
                                style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                                Select the categories you want to unallocate. This will clear the venue and slot allocations for all students in the selected categories.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#fdf2f2', padding: '16px', borderRadius: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>
                                    <input
                                        type="checkbox"
                                        checked={Object.values(unallocateChecked).every(v => v)}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            setUnallocateChecked({
                                                '5_juz': val,
                                                '15_juz': val,
                                                '30_juz': val
                                            });
                                        }}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    Select All Categories
                                </label>
                                <hr style={{ border: 0, borderTop: '1px solid #fecaca', margin: '4px 0' }} />
                                {Object.keys(unallocateChecked).map((cat) => (
                                    <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                        <input
                                            type="checkbox"
                                            checked={unallocateChecked[cat]}
                                            onChange={(e) => {
                                                setUnallocateChecked(prev => ({
                                                    ...prev,
                                                    [cat]: e.target.checked
                                                }));
                                            }}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        {getCategoryBadge(cat)} Category
                                    </label>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowUnallocateSelectModal(false)}
                                    className={styles.btnSecondary}
                                    style={{ padding: '8px 16px', fontSize: '14px', height: '38px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRunUnallocateSelected}
                                    className={styles.btnPrimary}
                                    disabled={!Object.values(unallocateChecked).some(v => v)}
                                    style={{ padding: '8px 16px', fontSize: '14px', height: '38px', backgroundColor: '#ef4444' }}
                                >
                                    Unallocate Selected
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Modal Dialog (Alert/Confirm/Success/Error) */}
            {dialogConfig.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '420px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            {dialogConfig.type === 'error' && <AlertTriangle style={{ color: '#ef4444' }} size={22} />}
                            {dialogConfig.type === 'alert' && <AlertTriangle style={{ color: '#f59e0b' }} size={22} />}
                            {dialogConfig.type === 'success' && <CheckCircle style={{ color: '#10b981' }} size={22} />}
                            {dialogConfig.type === 'confirm' && <HelpCircle style={{ color: '#3b82f6' }} size={22} />}
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                                {dialogConfig.title}
                            </h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                                {dialogConfig.message}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                {dialogConfig.type === 'confirm' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={dialogConfig.onCancel || closeDialog}
                                            className={styles.btnSecondary}
                                            style={{ padding: '8px 16px', fontSize: '14px', height: '36px' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={dialogConfig.onConfirm}
                                            className={styles.btnPrimary}
                                            style={{
                                                padding: '8px 16px',
                                                fontSize: '14px',
                                                height: '36px',
                                                backgroundColor: dialogConfig.title.toLowerCase().includes('delete') || dialogConfig.title.toLowerCase().includes('clear') ? '#ef4444' : '#0d9488'
                                            }}
                                        >
                                            Confirm
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={closeDialog}
                                        className={styles.btnPrimary}
                                        style={{ padding: '8px 20px', fontSize: '14px', height: '36px', backgroundColor: '#0d9488' }}
                                    >
                                        OK
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
