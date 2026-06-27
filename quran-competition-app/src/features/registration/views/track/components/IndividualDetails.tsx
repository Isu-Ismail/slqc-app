import { useRef, useState, useEffect } from 'react';
import { Lock, Edit, Printer } from 'lucide-react';
import { pb } from '../../../../../api/db';
import type { ParticipantsApplicationResponse } from '../../../../../api/types';
import { useRegistrationStatus } from '../../../../../shared/context/StatusContext';
import styles from '../TrackPage.module.css';
import { CATEGORIES_CONFIG, getJuzCodesForCategory, getJuzLabel, getCategoryLabel, FORM_FIELDS_CONFIG } from '../../../../../config/fieldsConfig';
import PrintPreviewModal, { generateIndividualFormHTML } from './PrintPreviewModal';
import { validateCategorySelection } from '../../../../../utils/categoryValidator';
import AlertModal from '../../../../../shared/components/Modal/AlertModal';

interface IndividualDetailsProps {
    individualRecord: ParticipantsApplicationResponse;
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    editData: Record<string, any>;
    updateEditField: (key: string, value: any) => void;
    editAadhaarFile: File | null;
    setEditAadhaarFile: (val: File | null) => void;
    editBirthCertificateFile: File | null;
    setEditBirthCertificateFile: (val: File | null) => void;
    editCandidatePhotoFile: File | null;
    setEditCandidatePhotoFile: (val: File | null) => void;
    handleSaveIndividualChanges: () => void; // Passed via props, but can also be handled locally
    loading: boolean;
    getStatusClass: (status: string) => string;
    getAadhaarUrl: (record: ParticipantsApplicationResponse) => string;
    getBirthCertificateUrl: (record: ParticipantsApplicationResponse) => string;
    getCandidatePhotoUrl: (record: ParticipantsApplicationResponse) => string;
    onRefresh?: () => Promise<boolean>;
}

export default function IndividualDetails({
    individualRecord,
    isEditMode,
    setIsEditMode,
    editData,
    updateEditField,
    editAadhaarFile,
    setEditAadhaarFile,
    editBirthCertificateFile,
    setEditBirthCertificateFile,
    editCandidatePhotoFile,
    setEditCandidatePhotoFile,
    loading: parentLoading,
    getStatusClass,
    getAadhaarUrl,
    getBirthCertificateUrl,
    getCandidatePhotoUrl,
    onRefresh
}: Omit<IndividualDetailsProps, 'handleSaveIndividualChanges'>) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const birthCertFileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const localityRef = useRef<HTMLDivElement | null>(null);

    const [printPreview, setPrintPreview] = useState<string | null>(null);
    const [isPrintLoading, setIsPrintLoading] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);
    const { metadata } = useRegistrationStatus();

    const [isRefetching, setIsRefetching] = useState(false);
    const [refetchSuccess, setRefetchSuccess] = useState(false);

    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'warning' }>({
        isOpen: false, title: '', message: '', type: 'warning'
    });
    const triggerAlert = (message: string, title = 'Attention Required', type: 'success' | 'warning' = 'warning') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    const handleRefetch = async () => {
        if (!onRefresh) return;
        setIsRefetching(true);
        setRefetchSuccess(false);
        try {
            await onRefresh();
            setRefetchSuccess(true);
            setTimeout(() => setRefetchSuccess(false), 3000);
        } finally {
            setIsRefetching(false);
        }
    };

    // --- SEPARATE ADDRESS SUB-STATES FOR SPLIT POSTAL LOGIC ---
    const [street, setStreet] = useState('');
    const [pincodeLocal, setPincodeLocal] = useState('');
    const [districtLocal, setDistrictLocal] = useState('');
    const [villageLocal, setVillageNameLocal] = useState('');
    const [stateLocal, setStateNameLocal] = useState('');

    const [availableVillages, setAvailableVillages] = useState<string[]>([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const [isLocalityOpen, setIsLocalityOpen] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageObj, setCropImageObj] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const isLoading = parentLoading || localLoading;

    // Handle clicks outside the custom locality list wrapper
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (localityRef.current && !localityRef.current.contains(event.target as Node)) {
                setIsLocalityOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const prevEditModeRef = useRef(isEditMode);

    // Initialize address segments upon edit activation
    useEffect(() => {
        if (isEditMode && !prevEditModeRef.current) {
            const rawAddress = editData.address || individualRecord.address || '';
            const parts = rawAddress.split(',').map((p: string) => p.trim());

            setStreet(parts[0] || '');
            setVillageNameLocal(parts[1] || '');
            setDistrictLocal(parts[2] || '');
            setStateNameLocal(parts[3] || '');
            setPincodeLocal(parts[4] || '');
        }
        prevEditModeRef.current = isEditMode;
    }, [isEditMode, individualRecord.address]);

    // Automatically reassemble segments into a single comma-joined address string and sync back to parent state
    useEffect(() => {
        if (isEditMode) {
            const combined = [street, villageLocal, districtLocal, stateLocal, pincodeLocal]
                .map(s => s.trim())
                .filter(Boolean)
                .join(', ');
            if (combined !== editData.address) {
                updateEditField('address', combined);
            }
        }
    }, [street, villageLocal, districtLocal, stateLocal, pincodeLocal, isEditMode]);

    const filteredVillages = availableVillages.filter(v =>
        v.toLowerCase().includes(villageLocal.toLowerCase())
    );

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.replace(/\D/g, '');
        setPincodeLocal(code);

        setStateNameLocal('');
        setDistrictLocal('');
        setVillageNameLocal('');
        setAvailableVillages([]);
        setPincodeError('');

        if (code.length === 6) {
            setIsLoadingLocation(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${code}`);
                const data = await response.json();

                if (data && data[0] && data[0].Status === "Success") {
                    const postOffices = data[0].PostOffice;
                    if (postOffices && postOffices.length > 0) {
                        setStateNameLocal(postOffices[0].State);
                        setDistrictLocal(postOffices[0].District);
                        const villages = Array.from(new Set(postOffices.map((po: any) => po.Name))) as string[];
                        setAvailableVillages(villages);
                        setIsLocalityOpen(true);
                    }
                } else {
                    setPincodeError("Invalid Pincode. Please enter details manually.");
                }
            } catch (error) {
                setPincodeError("Could not auto-fetch address. Please enter details manually.");
            } finally {
                setIsLoadingLocation(false);
            }
        }
    };

    // --- SAVE LOGIC CALLING THE CUSTOM POST ENDPOINT ---
    const handleSaveIndividualChangesLocal = async () => {
        setLocalLoading(true);
        try {
            const formDataPayload = new FormData();

            // Populate text parameters safely
            formDataPayload.append('full_name', editData.full_name ?? individualRecord.full_name);
            formDataPayload.append('father_name', editData.father_name ?? individualRecord.father_name);
            formDataPayload.append('father_number', editData.father_number ?? individualRecord.father_number ?? '');
            formDataPayload.append('aadhaar_number', editData.aadhaar_number ?? individualRecord.aadhaar_number ?? '');
            formDataPayload.append('dob', editData.dob ?? individualRecord.dob);
            formDataPayload.append('gender', editData.gender ?? individualRecord.gender);
            formDataPayload.append('category', editData.category ?? individualRecord.category);
            formDataPayload.append('juz_options', editData.juz_options ?? individualRecord.juz_options ?? '');
            formDataPayload.append('selected_juz', editData.selected_juz ?? individualRecord.selected_juz ?? '');
            formDataPayload.append('whatsapp_number', editData.whatsapp_number ?? individualRecord.whatsapp_number);
            formDataPayload.append('email', editData.email ?? individualRecord.email ?? '');
            formDataPayload.append('guardian_name', editData.guardian_name ?? individualRecord.guardian_name);
            formDataPayload.append('guardian_phone', editData.guardian_phone ?? individualRecord.guardian_phone);
            formDataPayload.append('requires_accommodation', String(editData.requires_accommodation ?? individualRecord.requires_accommodation));
            formDataPayload.append('address', editData.address ?? individualRecord.address ?? '');
            formDataPayload.append('rejection_reason', editData.rejection_reason ?? individualRecord.rejection_reason ?? '');

            if (individualRecord.status === 'rejected') {
                formDataPayload.append('status', 'reapplied');
            } else {
                formDataPayload.append('status', editData.status ?? individualRecord.status);
            }

            // Append updated binary files
            if (editAadhaarFile) formDataPayload.append('aadhaar_front', editAadhaarFile);
            if (editBirthCertificateFile) formDataPayload.append('birthcertificate_photo', editBirthCertificateFile);
            if (editCandidatePhotoFile) formDataPayload.append('candidate_photo', editCandidatePhotoFile);

            const targetUrl = `/api/public/update-individual?id=${encodeURIComponent(individualRecord.id)}&dob=${encodeURIComponent(individualRecord.dob)}`;

            await pb.send(targetUrl, {
                method: 'POST',
                body: formDataPayload
            });

            setIsEditMode(false);
            if (onRefresh) await onRefresh();
            triggerAlert('Changes saved successfully!', 'Saved', 'success');
        } catch (err: any) {
            console.error('Failed to execute endpoint changes:', err);
            triggerAlert(err.response?.data?.error || err.message || 'Failed to save application updates.', 'Save Failed');
        } finally {
            setLocalLoading(false);
        }
    };

    // Canvas redrawing logic for cropper
    useEffect(() => {
        if (!showCropper || !cropImageObj || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.translate(panX, panY);

        const imgRatio = cropImageObj.width / cropImageObj.height;
        let dWidth = canvas.width;
        let dHeight = canvas.height;

        if (imgRatio > 1) {
            dWidth = canvas.height * imgRatio;
        } else {
            dHeight = canvas.width / imgRatio;
        }

        ctx.drawImage(cropImageObj, -dWidth / 2, -dHeight / 2, dWidth, dHeight);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 3, 10); ctx.lineTo(canvas.width / 3, canvas.height - 10);
        ctx.moveTo((canvas.width / 3) * 2, 10); ctx.lineTo((canvas.width / 3) * 2, canvas.height - 10);
        ctx.moveTo(10, canvas.height / 3); ctx.lineTo(canvas.width - 10, canvas.height / 3);
        ctx.moveTo(10, (canvas.height / 3) * 2); ctx.lineTo(canvas.width - 10, (canvas.height / 3) * 2);
        ctx.stroke();
    }, [showCropper, cropImageObj, zoom, rotation, panX, panY]);

    const handlePhotoSelect = (file: File | null) => {
        if (!file) return;
        if (file.size > 1 * 1024 * 1024) {
            triggerAlert('Photo size exceeds 1MB limit. Please choose a smaller image.', 'File Too Large');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                const img = new Image();
                img.onload = () => {
                    setCropImageObj(img);
                    setZoom(1.0);
                    setRotation(0);
                    setPanX(0);
                    setPanY(0);
                    setShowCropper(true);
                };
                img.src = e.target.result as string;
            }
        };
        reader.readAsDataURL(file);
    };

    const handleCropApply = () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob(
            (blob) => {
                if (blob) {
                    const file = new File([blob], 'candidate_photo.jpg', { type: 'image/jpeg' });
                    setEditCandidatePhotoFile(file);
                    setShowCropper(false);
                }
            },
            'image/jpeg',
            0.9
        );
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setIsDragging(true);
        setDragStart({ x: clientX - panX, y: clientY - panY });
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setPanX(clientX - dragStart.x);
        setPanY(clientY - dragStart.y);
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    return (
        <>
            {(individualRecord.allocated_venue != null && individualRecord.allocated_venue !== '' || (individualRecord.allocated_order != null && individualRecord.allocated_order !== 0)) && (
                <div className={styles.detailsCard}
                    style={{
                        marginBottom: '20px',
                        borderLeft: individualRecord.arrival_status === 'present'
                            ? '4px solid #10b981'
                            : individualRecord.arrival_status === 'absent'
                                ? '4px solid #ef4444'
                                : '4px solid #3b82f6'
                    }}>
                    <div className={styles.detailsHeader} style={{ marginBottom: '12px', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{
                            color: individualRecord.arrival_status === 'present' ? '#047857' : individualRecord.arrival_status === 'absent' ? '#b91c1c' : '#1d4ed8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: 0
                        }}>
                            <span style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: individualRecord.arrival_status === 'present' ? '#10b981' : individualRecord.arrival_status === 'absent' ? '#ef4444' : '#3b82f6'
                            }}></span>
                            Venue &amp; Sequence Allocation
                        </h3>
                        {individualRecord.arrival_status && individualRecord.arrival_status !== 'none' && (
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: individualRecord.arrival_status === 'present' ? '#047857' : '#b91c1c',
                                backgroundColor: individualRecord.arrival_status === 'present' ? '#d1fae5' : '#fee2e2',
                                padding: '2px 8px',
                                borderRadius: '99px',
                                textTransform: 'uppercase'
                            }}>
                                {individualRecord.arrival_status}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Allocated Venue &amp; Order</span>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f766e', marginTop: '4px' }}>
                                {individualRecord.allocated_venue ? `${individualRecord.allocated_venue}${individualRecord.allocated_order ? ` - ${individualRecord.allocated_order}` : ''}` : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.detailsCard}>
                <div className={styles.detailsHeader}>
                    <h3>Application Details</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className={`${styles.statusBadge} ${getStatusClass(individualRecord.status)}`}>
                            {individualRecord.status.toUpperCase()}
                        </div>
                        {onRefresh && (
                            <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={handleRefetch}
                                disabled={isLoading || isRefetching}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    height: '28px',
                                    backgroundColor: refetchSuccess ? '#ecfdf5' : undefined,
                                    color: refetchSuccess ? '#059669' : undefined,
                                    borderColor: refetchSuccess ? '#10b981' : undefined
                                }}
                            >
                                {isRefetching ? (
                                    <>
                                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '4px' }}>↻</span>
                                        <span className={styles.hideMobile}>Refetching...</span>
                                    </>
                                ) : refetchSuccess ? (
                                    <>
                                        <span style={{ marginRight: '4px' }}>✓</span>
                                        <span className={styles.hideMobile}>Refetched successfully!</span>
                                    </>
                                ) : (
                                    <>
                                        <span style={{ marginRight: '4px' }}>↻</span>
                                        <span className={styles.hideMobile}>Recheck Status</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {individualRecord.status === 'rejected' && individualRecord.rejection_reason && (
                    <div className={styles.rejectionBanner}>
                        <strong>Rejection Reason:</strong> {individualRecord.rejection_reason}
                    </div>
                )}

                {individualRecord.is_locked ? (
                    <div className={styles.lockBanner}>
                        <Lock size={16} className={styles.bannerIcon} /> This application is locked. It has already been reviewed/processed and details cannot be edited.
                    </div>
                ) : (
                    <div className={styles.editBanner}>
                        <Edit size={16} className={styles.bannerIcon} /> This application is open. You can edit details and save updates below.
                    </div>
                )}

                <div className={styles.detailsFormGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Application ID</label>
                        <input type="text" className={styles.formInput} value={individualRecord.id} disabled={true} />
                    </div>

                    {individualRecord.status === 'approved' && individualRecord.participant_id && (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Participant ID</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={individualRecord.participant_id}
                                disabled={true}
                                style={{ color: 'var(--success)', fontWeight: 600 }}
                            />
                        </div>
                    )}

                    {/* Dynamic fields from config */}
                    {FORM_FIELDS_CONFIG.map((field) => {
                        let value = isEditMode ? (editData[field.key] ?? '') : ((individualRecord as any)[field.key] ?? '');
                        if (value === 0) value = '';

                        const isEditable = field.editable && isEditMode && !individualRecord.is_locked;

                        if (field.key === 'address') {
                            if (!isEditMode) {
                                const parts = (value as string).split(',').map((p: string) => p.trim());
                                const viewStreet = parts[0] || '';
                                const viewVillage = parts[1] || '';
                                const viewDistrict = parts[2] || '';
                                const viewState = parts[3] || '';
                                const viewPincode = parts[4] || '';

                                return (
                                    <div key={field.key} className={`${styles.formGroup} ${styles.fullWidth}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                            <div>
                                                <label className={styles.formLabel}>Door No, Building, &amp; Street Road</label>
                                                <input type="text" className={styles.formInput} value={viewStreet} disabled={true} placeholder="N/A" />
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>Pincode</label>
                                                <input type="text" className={styles.formInput} value={viewPincode} disabled={true} placeholder="N/A" />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                            <div>
                                                <label className={styles.formLabel}>Village / Locality</label>
                                                <input type="text" className={styles.formInput} value={viewVillage} disabled={true} placeholder="N/A" />
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>District</label>
                                                <input type="text" className={styles.formInput} value={viewDistrict} disabled={true} placeholder="N/A" />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                            <div>
                                                <label className={styles.formLabel}>State</label>
                                                <input type="text" className={styles.formInput} value={viewState} disabled={true} placeholder="N/A" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }


                            return (
                                <div key={field.key} className={`${styles.formGroup} ${field.gridSpan === 2 ? styles.fullWidth : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                        <div>
                                            <label className={styles.formLabel}>Door No, Building, &amp; Street Road *</label>
                                            <input type="text" className={styles.formInput} placeholder="e.g. 1564 Palla" value={street} onChange={(e) => setStreet(e.target.value)} required />
                                        </div>

                                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                            <label className={styles.formLabel}>Pincode *</label>
                                            <input type="text" className={styles.formInput} placeholder="6-digit pincode" maxLength={6} value={pincodeLocal} onChange={handlePincodeChange} required />
                                            {isLoadingLocation && <small style={{ color: '#0d9488', position: 'absolute', top: 'calc(100% + 2px)', left: '4px', fontSize: '11px', fontWeight: '500' }}>⚡ Fetching details...</small>}
                                            {pincodeError && <small style={{ color: '#ef4444', position: 'absolute', top: 'calc(100% + 2px)', left: '4px', fontSize: '11px', fontWeight: '500' }}>{pincodeError}</small>}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }} ref={localityRef}>
                                        <div style={{ position: 'relative' }}>
                                            <label className={styles.formLabel}>Village / Locality *</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                placeholder="Search locality..."
                                                value={villageLocal}
                                                disabled={isLoadingLocation}
                                                onChange={(e) => {
                                                    setVillageNameLocal(e.target.value);
                                                    if (availableVillages.length > 0) setIsLocalityOpen(true);
                                                }}
                                                onFocus={() => {
                                                    if (availableVillages.length > 0) setIsLocalityOpen(true);
                                                }}
                                                required
                                                autoComplete="off"
                                            />
                                            {isLocalityOpen && filteredVillages.length > 0 && (
                                                <ul style={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 4px)',
                                                    left: 0,
                                                    width: '100%',
                                                    margin: '0',
                                                    padding: '4px',
                                                    listStyle: 'none',
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    maxHeight: '140px',
                                                    overflowY: 'auto',
                                                    zIndex: 100,
                                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                                }}>
                                                    {filteredVillages.map((village, idx) => (
                                                        <li
                                                            key={idx}
                                                            onClick={() => {
                                                                setVillageNameLocal(village);
                                                                setIsLocalityOpen(false);
                                                            }}
                                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                                        >
                                                            {village}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        <div>
                                            <label className={styles.formLabel}>District *</label>
                                            <input type="text" className={styles.formInput} value={districtLocal} placeholder="District" onChange={(e) => setDistrictLocal(e.target.value)} disabled={!isEditable || isLoadingLocation} required />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                        <div>
                                            <label className={styles.formLabel}>State *</label>
                                            <input type="text" className={styles.formInput} value={stateLocal} placeholder="State" onChange={(e) => setStateNameLocal(e.target.value)} disabled={!isEditable || isLoadingLocation} required />
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (field.key === 'category') {
                            return (
                                <div key={field.key} className={`${styles.formGroup} ${field.gridSpan === 2 ? styles.fullWidth : ''}`}>
                                    <label className={styles.formLabel}>{field.label} {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                                    {isEditable ? (
                                        <select
                                            className={styles.formSelect}
                                            value={value}
                                            onChange={(e) => {
                                                const nextCat = e.target.value;
                                                const birthDate = editData.dob || individualRecord.dob || '';

                                                const validation = validateCategorySelection(
                                                    nextCat,
                                                    birthDate,
                                                    metadata.event_date,
                                                    metadata.event_age_criteria,
                                                    Number(metadata.age_buffer_months || 3),
                                                    individualRecord.registration_type as 'individual' | 'institution',
                                                    (individualRecord.expand as any)?.institution_ref?.applications,
                                                    metadata.applications_per_institute
                                                );

                                                if (!validation.allowed) {
                                                    triggerAlert(validation.message || 'Cannot switch to this category.', 'Category Not Allowed');
                                                    return;
                                                }

                                                updateEditField('category', nextCat);
                                                const juzCodes = getJuzCodesForCategory(nextCat);
                                                if (juzCodes.length === 1) {
                                                    updateEditField('juz_options', juzCodes[0].code);
                                                    updateEditField('selected_juz', juzCodes[0].label);
                                                } else {
                                                    updateEditField('juz_options', '');
                                                    updateEditField('selected_juz', '');
                                                }
                                            }}
                                        >
                                            <option value="">Select Category</option>
                                            {CATEGORIES_CONFIG.map((cat) => (
                                                <option key={cat.key} value={cat.key}>{cat.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input type="text" className={styles.formInput} value={getCategoryLabel(value)} disabled={true} />
                                    )}
                                </div>
                            );
                        }

                        if (field.key === 'juz_options') {
                            if (!isEditMode) return null;
                            const currentCategory = editData.category;
                            const juzOptions = getJuzCodesForCategory(currentCategory);
                            return (
                                <div key={field.key} className={`${styles.formGroup} ${field.gridSpan === 2 ? styles.fullWidth : ''}`}>
                                    <label className={styles.formLabel}>Selected Juz Range <span style={{ color: '#ef4444' }}>*</span></label>
                                    <select
                                        className={styles.formSelect}
                                        value={value}
                                        onChange={(e) => {
                                            const code = e.target.value;
                                            updateEditField('juz_options', code);
                                            updateEditField('selected_juz', getJuzLabel(code));
                                        }}
                                    >
                                        <option value="">Select Option</option>
                                        {juzOptions.map((opt) => (
                                            <option key={opt.code} value={opt.code}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        }

                        if (field.key === 'selected_juz') {
                            if (isEditMode) return null;
                            return (
                                <div key={field.key} className={`${styles.formGroup} ${field.gridSpan === 2 ? styles.fullWidth : ''}`}>
                                    <label className={styles.formLabel}>Selected Juz Range</label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={getJuzLabel(individualRecord.juz_options || '') || individualRecord.selected_juz || 'N/A'}
                                        disabled={true}
                                    />
                                </div>
                            );
                        }

                        if (field.key === 'gender') {
                            return (
                                <div key={field.key} className={`${styles.formGroup} ${field.gridSpan === 2 ? styles.fullWidth : ''}`}>
                                    <label className={styles.formLabel}>Gender {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                                    {isEditable ? (
                                        <select className={styles.formSelect} value={value} onChange={(e) => updateEditField('gender', e.target.value)}>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    ) : (
                                        <input type="text" className={styles.formInput} value={value} disabled={true} />
                                    )}
                                </div>
                            );
                        }

                        if (field.key === 'requires_accommodation') {
                            const checkboxLabelStyle = (active: boolean, locked: boolean) => {
                                if (locked) return styles.checkboxLabelDisabled;
                                return active ? styles.checkboxLabelActive : styles.checkboxLabel;
                            };

                            return (
                                <div key={field.key} className={`${styles.formGroup} ${styles.fullWidthCheckbox}`}>
                                    <label className={checkboxLabelStyle(isEditMode, individualRecord.is_locked)}>
                                        <input
                                            type="checkbox"
                                            checked={!!value}
                                            disabled={!isEditable}
                                            onChange={(e) => updateEditField('requires_accommodation', e.target.checked)}
                                        />
                                        <span>Requires Accommodation</span>
                                    </label>
                                </div>
                            );
                        }

                        if (field.type === 'textarea') {
                            const isDisabled = !isEditable;
                            return (
                                <div key={field.key} className={`${styles.formGroup} ${field.gridSpan === 2 ? styles.fullWidth : ''}`}>
                                    <label className={styles.formLabel}>
                                        {field.label} {isEditMode && field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                    </label>
                                    <textarea
                                        className={styles.formInput}
                                        style={{ minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }}
                                        value={value}
                                        disabled={isDisabled}
                                        placeholder={field.placeholder || 'N/A'}
                                        onChange={(e) => updateEditField(field.key, e.target.value)}
                                    />
                                </div>
                            );
                        }

                        const isDisabled = !isEditable;

                        return (
                            <div key={field.key} className={`${styles.formGroup} ${field.gridSpan === 2 ? styles.fullWidth : ''}`}>
                                <label className={styles.formLabel}>
                                    {field.label} {isEditMode && field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                </label>
                                <input
                                    type={field.type === 'tel' ? 'text' : field.type}
                                    className={styles.formInput}
                                    value={field.type === 'date' && typeof value === 'string' ? value.substring(0, 10) : value}
                                    disabled={isDisabled}
                                    placeholder={field.placeholder || 'N/A'}
                                    onChange={(e) => updateEditField(field.key, e.target.value)}
                                />
                            </div>
                        );
                    })}

                    {(() => {
                        const institutionRef = (individualRecord.expand as any)?.institution_ref;
                        if (!institutionRef) return null;
                        return (
                            <>
                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                                    <h4 style={{ fontSize: '14px', color: '#0f766e', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Associated Institution Details</h4>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Institution Name</label>
                                    <input type="text" className={styles.formInput} value={institutionRef.name || 'N/A'} disabled={true} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Institution ID</label>
                                    <input type="text" className={styles.formInput} value={institutionRef.institution_id || 'N/A'} disabled={true} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Email Address</label>
                                    <input type="text" className={styles.formInput} value={institutionRef.email || 'N/A'} disabled={true} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Contact Phone</label>
                                    <input type="text" className={styles.formInput} value={institutionRef.phone_number || institutionRef.whatsapp_number || 'N/A'} disabled={true} />
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label className={styles.formLabel}>Institution Address</label>
                                    <input type="text" className={styles.formInput} value={institutionRef.address || 'N/A'} disabled={true} />
                                </div>
                            </>
                        );
                    })()}

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.formLabel}>Aadhaar Card Front Image</label>
                        {!isEditMode && individualRecord.aadhaar_front ? (
                            <div className={styles.filePreviewWrapper}>
                                <a href={getAadhaarUrl(individualRecord)} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>View Uploaded Aadhaar Image ↗</a>
                            </div>
                        ) : isEditMode && !individualRecord.is_locked ? (
                            <div className={styles.fileUploadControl}>
                                <input type="file" accept="image/*,application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { setEditAadhaarFile(e.target.files[0]); } }} />
                                <button type="button" className={styles.btnSecondary} onClick={() => fileInputRef.current?.click()}>{editAadhaarFile ? 'Change Selected Aadhaar' : 'Upload New Aadhaar'}</button>
                                {editAadhaarFile && <span className={styles.selectedFileName}>{editAadhaarFile.name}</span>}
                            </div>
                        ) : (
                            <div className={styles.filePreviewWrapper}><span style={{ color: '#94a3b8', fontSize: '13px' }}>No Aadhaar Image Uploaded</span></div>
                        )}
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.formLabel}>Birth Certificate</label>
                        {!isEditMode && individualRecord.birthcertificate_photo ? (
                            <div className={styles.filePreviewWrapper}>
                                <a href={getBirthCertificateUrl(individualRecord)} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>View Uploaded Birth Certificate ↗</a>
                            </div>
                        ) : isEditMode && !individualRecord.is_locked ? (
                            <div className={styles.fileUploadControl}>
                                <input type="file" accept="image/*,application/pdf" ref={birthCertFileInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { setEditBirthCertificateFile(e.target.files[0]); } }} />
                                <button type="button" className={styles.btnSecondary} onClick={() => birthCertFileInputRef.current?.click()}>{editBirthCertificateFile ? 'Change Selected Certificate' : 'Upload New Certificate'}</button>
                                {editBirthCertificateFile && <span className={styles.selectedFileName}>{editBirthCertificateFile.name}</span>}
                            </div>
                        ) : (
                            <div className={styles.filePreviewWrapper}><span style={{ color: '#94a3b8', fontSize: '13px' }}>No Birth Certificate Uploaded</span></div>
                        )}
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.formLabel}>Passport-size Candidate Photo</label>
                        {!isEditMode && individualRecord.candidate_photo ? (
                            <div className={styles.filePreviewWrapper}>
                                <a href={getCandidatePhotoUrl(individualRecord)} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>View Uploaded Candidate Photo ↗</a>
                            </div>
                        ) : isEditMode && !individualRecord.is_locked ? (
                            <div className={styles.fileUploadControl}>
                                <input type="file" accept="image/*" ref={photoInputRef} style={{ display: 'none' }} onChange={(e) => e.target.files && handlePhotoSelect(e.target.files[0])} />
                                <button type="button" className={styles.btnSecondary} onClick={() => photoInputRef.current?.click()}>{editCandidatePhotoFile ? 'Change Selected Photo' : 'Upload New Photo'}</button>
                                {editCandidatePhotoFile && <span className={styles.selectedFileName}>{editCandidatePhotoFile.name}</span>}
                            </div>
                        ) : (
                            <div className={styles.filePreviewWrapper}><span style={{ color: '#94a3b8', fontSize: '13px' }}>No Photo Uploaded</span></div>
                        )}
                    </div>
                </div>

                {isEditMode && !individualRecord.is_locked && (
                    <div className={styles.detailsActions} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className={styles.btnSecondary} onClick={() => setIsEditMode(false)} disabled={isLoading}>Cancel</button>
                        <button type="button" className={styles.btnPrimary} onClick={handleSaveIndividualChangesLocal} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                )}

                {!isEditMode && !individualRecord.is_locked && (
                    <div className={styles.detailsActions} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className={styles.btnPrimary} onClick={() => setIsEditMode(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Edit size={16} /> {individualRecord.status === 'rejected' ? 'Edit & Reapply' : 'Edit Application Details'}</button>
                    </div>
                )}

                {!isEditMode && individualRecord.status === 'approved' && (
                    <div className={styles.detailsActions} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={async () => {
                                setIsPrintLoading(true);
                                try {
                                    const dob = localStorage.getItem('quran_competition_track_individual_dob') || '';
                                    const res = await pb.send<any>(`/api/public/print-form`, { method: 'GET', query: { id: individualRecord.id, dob } });
                                    const tplRecord = metadata?._application_print_template_record;
                                    let customTemplateHtml = '';
                                    if (tplRecord && tplRecord.document) {
                                        try {
                                            const tplUrl = pb.files.getURL(tplRecord, tplRecord.document);
                                            const tplRes = await fetch(tplUrl);
                                            if (tplRes.ok) customTemplateHtml = await tplRes.text();
                                        } catch (e) { console.error(e); }
                                    }
                                    if (!customTemplateHtml) {
                                        try {
                                            const fallbackRes = await fetch('/default_templates/application_template.html');
                                            if (fallbackRes.ok) customTemplateHtml = await fallbackRes.text();
                                        } catch (err) { console.error(err); }
                                    }
                                    if (res) setPrintPreview(generateIndividualFormHTML(res, customTemplateHtml || undefined));
                                } catch (err) { alert('Failed to retrieve print details. Please try again.'); } finally { setIsPrintLoading(false); }
                            }}
                            disabled={isPrintLoading}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Printer size={16} /> {isPrintLoading ? 'Loading Form...' : 'Print Registration Card'}
                        </button>
                    </div>
                )}

                {printPreview && <PrintPreviewModal isOpen={true} onClose={() => setPrintPreview(null)} title="Print Registration Card" htmlContent={printPreview} />}

                {/* Photo Cropper Modal Overlay */}
                {showCropper && (
                    <div className={styles.cropperOverlay}>
                        <div className={styles.cropperModal}>
                            <div className={styles.cropperHeader}>
                                <h3>Edit &amp; Crop Photo</h3>
                                <button className={styles.closeBtn} onClick={() => setShowCropper(false)}>×</button>
                            </div>
                            <div className={styles.cropperBody}>
                                <p className={styles.cropperDesc}>Drag the image inside the box to adjust position. Use controls below to zoom and rotate.</p>
                                <div className={styles.canvasContainer}>
                                    <canvas ref={canvasRef} width={300} height={300} className={styles.cropperCanvas} onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp} onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp} />
                                </div>
                                <div className={styles.controlsRow}>
                                    <label className={styles.controlLabel}>Zoom:</label>
                                    <input type="range" min="1.0" max="3.0" step="0.05" value={zoom} className={styles.rangeInput} onChange={(e) => setZoom(parseFloat(e.target.value))} />
                                    <span className={styles.zoomVal}>{Math.round(zoom * 100)}%</span>
                                </div>
                                <div className={styles.controlsButtons}>
                                    <button type="button" className={styles.btnTool} onClick={() => setRotation((prev) => (prev + 90) % 360)}>🔄 Rotate 90°</button>
                                    <button type="button" className={styles.btnTool} onClick={() => { setZoom(1.0); setRotation(0); setPanX(0); setPanY(0); }}>Reset</button>
                                </div>
                            </div>
                            <div className={styles.cropperFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowCropper(false)}>Cancel</button>
                                <button type="button" className={styles.saveBtn} onClick={handleCropApply}>Crop &amp; Apply</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <AlertModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
}