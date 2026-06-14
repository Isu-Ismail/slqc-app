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
    capacity: number;
    slots?: any;
    allocatedCount?: number;
}

interface VenueSettingsFormProps {
    onAllocationComplete?: () => void;
}

interface Slot {
    name: string;
    startTime: string;
    endTime: string;
    capacity: number;
}

const format12Hour = (time24: string) => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = hours < 10 ? '0' + hours : hours;
    return `${strHours}:${minutes} ${ampm}`;
};

const parse12HourTo24Hour = (time12: string) => {
    if (!time12) return '09:00';
    const clean = time12.trim().toUpperCase();
    const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)$/);
    if (!match) return '09:00';
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = match[3];
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const strHours = hours < 10 ? '0' + hours : hours;
    return `${strHours}:${minutes}`;
};

const parseTimeRange = (timeRangeStr: string) => {
    if (!timeRangeStr) return { startTime: '09:00', endTime: '12:00' };
    const parts = timeRangeStr.split('-');
    if (parts.length < 2) return { startTime: '09:00', endTime: '12:00' };
    return {
        startTime: parse12HourTo24Hour(parts[0]),
        endTime: parse12HourTo24Hour(parts[1])
    };
};

export default function VenueSettingsForm({ onAllocationComplete }: VenueSettingsFormProps) {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(false);
    const [allocating, setAllocating] = useState(false);
    const [allocationSummary, setAllocationSummary] = useState<any | null>(null);
    const [allocationProgress, setAllocationProgress] = useState<number>(0);
    const [allocationStep, setAllocationStep] = useState<string>('');

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
    const [slots, setSlots] = useState<Slot[]>([]);

    const loadVenuesAndAllocations = async () => {
        setLoading(true);
        try {
            // Fetch venues
            const venueRecords = await pb.collection('venue_detail').getFullList({
                sort: 'name'
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

            const formattedVenues: Venue[] = venueRecords.map(v => ({
                id: v.id,
                name: v.name,
                description: v.description,
                category: v.category,
                capacity: v.capacity,
                slots: v.slots,
                allocatedCount: counts[v.name] || 0
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
        setSlots([{ name: 'Slot 1', startTime: '09:00', endTime: '12:00', capacity: 18 }]);
        setShowModal(true);
    };

    const handleOpenEdit = (v: Venue) => {
        setEditingVenue(v);
        setVenueName(v.name);
        setVenueDesc(v.description);
        setVenueCategory(v.category);
        
        let loadedSlots = [];
        try {
            if (v.slots) {
                loadedSlots = typeof v.slots === 'string' ? JSON.parse(v.slots) : v.slots;
            }
        } catch (_) {}
        
        if (!Array.isArray(loadedSlots) || loadedSlots.length === 0) {
            loadedSlots = [{ name: 'Slot 1', startTime: '09:00', endTime: '12:00', capacity: v.capacity || 18 }];
        } else {
            // Map slots to make sure startTime and endTime are populated
            loadedSlots = loadedSlots.map((s, idx) => {
                if (s.startTime && s.endTime) {
                    return {
                        ...s,
                        name: s.name || `Slot ${idx + 1}`
                    };
                }
                const parsed = parseTimeRange(s.time);
                return {
                    name: s.name || `Slot ${idx + 1}`,
                    startTime: parsed.startTime,
                    endTime: parsed.endTime,
                    capacity: s.capacity
                };
            });
        }
        
        setSlots(loadedSlots);
        setShowModal(true);
    };

    const handleAddSlot = () => {
        setSlots(prev => [...prev, { name: `Slot ${prev.length + 1}`, startTime: '09:00', endTime: '12:00', capacity: 18 }]);
    };

    const handleUpdateSlot = (idx: number, field: keyof Slot, val: any) => {
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    };

    const handleRemoveSlot = (idx: number) => {
        if (slots.length <= 1) {
            showDialog('alert', 'Action Prevented', 'A venue must have at least one slot.');
            return;
        }
        setSlots(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSaveVenue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!venueName.trim()) return;

        setLoading(true);
        try {
            const totalCapacity = slots.reduce((sum, s) => sum + (parseInt(String(s.capacity), 10) || 0), 0);
            
            // Format time range for backwards compatibility
            const slotsWithFormattedTime = slots.map((s, idx) => ({
                name: s.name || `Slot ${idx + 1}`,
                startTime: s.startTime,
                endTime: s.endTime,
                time: `${format12Hour(s.startTime)} - ${format12Hour(s.endTime)}`,
                capacity: parseInt(String(s.capacity), 10) || 0
            }));

            const data = {
                name: venueName.trim(),
                description: venueDesc.trim(),
                category: venueCategory,
                capacity: totalCapacity,
                slots: slotsWithFormattedTime
            };

            if (editingVenue) {
                await pb.collection('venue_detail').update(editingVenue.id, data);
            } else {
                await pb.collection('venue_detail').create(data);
            }

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
                await pb.collection('venue_detail').delete(v.id);
                await loadVenuesAndAllocations();
                onAllocationComplete?.();
            } catch (err: any) {
                showDialog('error', 'Error Deleting Venue', err.message || 'Failed to delete venue.');
            } finally {
                setLoading(false);
            }
        }, closeDialog);
    };

    const handleOpenAllocateModal = async () => {
        setLoading(true);
        try {
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
            } catch (_) {}
            
            try {
                if (madrasaStatusRec) {
                    const val = typeof madrasaStatusRec.value === 'string' ? JSON.parse(madrasaStatusRec.value) : madrasaStatusRec.value;
                    madrasaClosed = val?.status === 'closed';
                }
            } catch (_) {}

            if (!participantClosed || !madrasaClosed) {
                // Do NOT show checkboxes. Show error dialog directly!
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

    const handleOpenUnallocateModal = () => {
        setUnallocateChecked({
            '5_juz': false,
            '15_juz': false,
            '30_juz': false
        });
        setShowUnallocateSelectModal(true);
    };

    const handleRunAllocationSelected = async () => {
        const selectedCats = Object.keys(allocateChecked).filter(k => allocateChecked[k]);
        if (selectedCats.length === 0) {
            showDialog('alert', 'Selection Required', 'Please select at least one category to allocate.');
            return;
        }

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

                const res = await pb.send<any>('/api/admin/allocate-venues', {
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

        setShowUnallocateSelectModal(false);

        showDialog('confirm', 'Confirm Clear', `Are you sure you want to clear venue allocations for: ${selectedCats.map(c => getCategoryBadge(c)).join(', ')}? This will remove all allocated venues and slots for students in these categories.`, async () => {
            closeDialog();
            setLoading(true);

            try {
                for (let i = 0; i < selectedCats.length; i++) {
                    const cat = selectedCats[i];
                    await pb.send<any>('/api/admin/unallocate-venues', {
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
        }, closeDialog);
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
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={24} style={{ color: '#0d9488' }} /> Venue Detail & Allocation
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                        Define competition venues and automatically assign approved candidates ensuring institution diversity.
                    </p>
                </div>
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
                        onClick={handleOpenUnallocateModal}
                        className={styles.btnSecondary}
                        disabled={allocating || loading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', borderColor: '#ef4444', color: '#ef4444', backgroundColor: '#fff' }}
                    >
                        <Trash2 size={16} /> Cancel Allocation
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenAllocateModal}
                        className={styles.btnPrimary}
                        disabled={allocating || venues.length === 0}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', backgroundColor: '#0d9488' }}
                    >
                        <Play size={16} /> {allocating ? 'Allocating...' : 'Run Allocation'}
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
                        <form onSubmit={handleSaveVenue} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
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
                            </div>

                            {/* Slots Section */}
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Venue Slots ({slots.reduce((sum, s) => sum + (parseInt(String(s.capacity), 10) || 0), 0)} Total Capacity)</label>
                                    <button
                                        type="button"
                                        onClick={handleAddSlot}
                                        style={{
                                            fontSize: '12px',
                                            padding: '4px 8px',
                                            backgroundColor: '#e2e8f0',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            color: '#475569'
                                        }}
                                    >
                                        + Add Slot
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {slots.map((slot, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.2fr 3.5fr 1.3fr auto', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder="e.g. Slot 1"
                                                value={slot.name}
                                                onChange={(e) => handleUpdateSlot(idx, 'name', e.target.value)}
                                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none', height: '38px' }}
                                                required
                                            />
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <input
                                                    type="time"
                                                    value={slot.startTime || '09:00'}
                                                    onChange={(e) => handleUpdateSlot(idx, 'startTime', e.target.value)}
                                                    style={{ padding: '8px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none', height: '38px' }}
                                                    required
                                                />
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>-</span>
                                                <input
                                                    type="time"
                                                    value={slot.endTime || '12:00'}
                                                    onChange={(e) => handleUpdateSlot(idx, 'endTime', e.target.value)}
                                                    style={{ padding: '8px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none', height: '38px' }}
                                                    required
                                                />
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Cap"
                                                value={slot.capacity}
                                                onChange={(e) => handleUpdateSlot(idx, 'capacity', parseInt(e.target.value, 10) || '')}
                                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none', height: '38px' }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSlot(idx)}
                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px 4px', fontSize: '20px', lineHeight: '1' }}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
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
