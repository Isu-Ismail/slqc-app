import { useRef, useState, useEffect, useMemo } from 'react';
import { Lock, Edit, FileText, ChevronDown, ChevronUp, Unlock, RefreshCw } from 'lucide-react';
import { pb } from '../../../api/db';
import { adminTrackApi } from '../../../api/track';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../../api/track';
import styles from '../TrackPage.module.css';
import printStyles from './PrintPreviewModal.module.css';
import PrintPreviewModal from './PrintPreviewModal';
import { generateAllFormsHTML } from './printTemplates';
import { metadataApi } from '../../../api/metadata';

interface InstitutionDetailsProps {
    institutionData: {
        institution: InstitutionsResponse | null;
        applications: ParticipantsApplicationResponse[];
    };
    isInstEditMode: boolean;
    setIsInstEditMode: (val: boolean) => void;
    instEditName: string;
    setInstEditName: (val: string) => void;
    instEditStreet: string;
    setInstEditStreet: (val: string) => void;
    instEditPincode: string;
    setInstEditPincode: (val: string) => void;
    instEditVillage: string;
    setInstEditVillage: (val: string) => void;
    instEditDistrict: string;
    setInstEditDistrict: (val: string) => void;
    instEditState: string;
    setInstEditState: (val: string) => void;
    instEditContactPerson: string;
    setInstEditContactPerson: (val: string) => void;
    instEditEmail: string;
    setInstEditEmail: (val: string) => void;
    instEditWhatsapp: string;
    setInstEditWhatsapp: (val: string) => void;
    instEditPhone: string;
    setInstEditPhone: (val: string) => void;
    instEditDocFile: File | null;
    setInstEditDocFile: (val: File | null) => void;
    instEditLocation: string;
    setInstEditLocation: (val: string) => void;
    instEditBuildingFile: File | null;
    setInstEditBuildingFile: (val: File | null) => void;
    isMinimized: boolean;
    setIsMinimized: (val: boolean) => void;
    handleSaveInstitutionChanges: () => void;
    loading: boolean;
    getStatusClass: (status: string) => string;
    onViewIndividual?: (app: ParticipantsApplicationResponse) => void;
    onRefresh?: () => Promise<boolean>;
}

export default function InstitutionDetails({
    institutionData,
    isInstEditMode,
    setIsInstEditMode,
    instEditName,
    setInstEditName,
    instEditStreet,
    setInstEditStreet,
    instEditPincode,
    setInstEditPincode,
    instEditVillage,
    setInstEditVillage,
    instEditDistrict,
    setInstEditDistrict,
    instEditState,
    setInstEditState,
    instEditContactPerson,
    setInstEditContactPerson,
    instEditEmail,
    setInstEditEmail,
    instEditWhatsapp,
    setInstEditWhatsapp,
    instEditPhone,
    setInstEditPhone,
    instEditDocFile,
    setInstEditDocFile,
    instEditLocation,
    setInstEditLocation,
    instEditBuildingFile,
    setInstEditBuildingFile,
    isMinimized,
    setIsMinimized,
    handleSaveInstitutionChanges,
    loading,
    getStatusClass,
    onViewIndividual,
    onRefresh
}: InstitutionDetailsProps) {
    const instFileInputRef = useRef<HTMLInputElement>(null);
    const instBuildingFileInputRef = useRef<HTMLInputElement>(null);
    const [printPreview, setPrintPreview] = useState<{ title: string; html: string } | null>(null);

    const hasChanges = useMemo(() => {
        if (!institutionData.institution) return false;
        const inst = institutionData.institution;

        if (instEditDocFile || instEditBuildingFile) return true;

        const mappings = [
            { current: inst.name, edit: instEditName },
            { current: inst.street_address, edit: instEditStreet },
            { current: inst.pincode, edit: instEditPincode },
            { current: inst.village_name, edit: instEditVillage },
            { current: inst.district_name, edit: instEditDistrict },
            { current: inst.state_name, edit: instEditState },
            { current: inst.contact_person, edit: instEditContactPerson },
            { current: inst.email, edit: instEditEmail },
            { current: inst.whatsapp_number, edit: instEditWhatsapp },
            { current: inst.phone_number, edit: instEditPhone },
            { current: inst.instituition_location, edit: instEditLocation }
        ];

        for (const item of mappings) {
            const normCurrent = (item.current === undefined || item.current === null) ? '' : String(item.current).trim();
            const normEdit = (item.edit === undefined || item.edit === null) ? '' : String(item.edit).trim();
            if (normCurrent !== normEdit) return true;
        }

        return false;
    }, [
        institutionData.institution,
        instEditName, instEditStreet, instEditPincode, instEditVillage,
        instEditDistrict, instEditState, instEditContactPerson, instEditEmail,
        instEditWhatsapp, instEditPhone, instEditLocation, instEditDocFile, instEditBuildingFile
    ]);

    const [isRefetching, setIsRefetching] = useState(false);
    const [refetchSuccess, setRefetchSuccess] = useState(false);

    // Locality dropdown states
    const [availableVillages, setAvailableVillages] = useState<string[]>([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const [isLocalityOpen, setIsLocalityOpen] = useState(false);
    const localityRef = useRef<HTMLDivElement | null>(null);

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

    const filteredVillages = availableVillages.filter(v =>
        v.toLowerCase().includes((instEditVillage || '').toLowerCase())
    );

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.replace(/\D/g, '');
        setInstEditPincode(code);

        setInstEditState('');
        setInstEditDistrict('');
        setInstEditVillage('');
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
                        setInstEditState(postOffices[0].State);
                        setInstEditDistrict(postOffices[0].District);
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

    const handleRefetch = async () => {
        if (!onRefresh) return;
        setIsRefetching(true);
        setRefetchSuccess(false);
        try {
            const success = await onRefresh();
            if (success) {
                setRefetchSuccess(true);
                setTimeout(() => setRefetchSuccess(false), 2000);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsRefetching(false);
        }
    };
    const getFileUrl = (recordId: string, filename: string) => {
        // PocketBase file URL structure: /api/files/collectionName/recordId/filename
        return `${import.meta.env.VITE_PB_URL}/api/files/institutions/${recordId}/${filename}`;
    };

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [modalState, setModalState] = useState<{ type: 'approve' | 'reject' | 'lock' | 'unlock' | null }>({ type: null });
    const [rejectReason, setRejectReason] = useState('');

    const submitAction = async () => {
        if (!institutionData.institution) return;
        setIsUpdatingStatus(true);
        try {
            if (modalState.type === 'approve') {
                await adminTrackApi.updateStatusAndLock(institutionData.institution.id, 'institution', 'approved', true);
            } else if (modalState.type === 'reject') {
                if (!rejectReason.trim()) {
                    alert("Rejection reason is required.");
                    setIsUpdatingStatus(false);
                    return;
                }
                await adminTrackApi.updateStatusAndLock(institutionData.institution.id, 'institution', 'rejected', true, rejectReason.trim());
            } else if (modalState.type === 'lock') {
                await adminTrackApi.updateLockStatus(institutionData.institution.id, 'institution', true);
            } else if (modalState.type === 'unlock') {
                await adminTrackApi.updateLockStatus(institutionData.institution.id, 'institution', false);
            }
            handleRefetch();
            setModalState({ type: null });
            setRejectReason('');
        } catch (e) {
            console.error("Failed action", e);
            alert("Failed to perform action. Please try again.");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className={styles.detailsCard} style={{ padding: '16px' }}>
            <div className={styles.detailsHeader} style={{ marginBottom: '12px', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: '18px', margin: 0 }}>{institutionData.institution?.name}</h3>
                    <p className={styles.instSubText} style={{ margin: '2px 0 0 0' }}>Institution ID: {institutionData.institution?.institution_id || institutionData.institution?.id}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={`${styles.statusBadge} ${getStatusClass(institutionData.institution?.status || '')}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
                        {institutionData.institution?.status.toUpperCase()}
                    </div>
                    {onRefresh && (
                        <button
                            type="button"
                            onClick={handleRefetch}
                            className={styles.btnSecondary}
                            disabled={loading || isRefetching}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                height: '28px',
                                backgroundColor: refetchSuccess ? '#ecfdf5' : undefined,
                                color: refetchSuccess ? '#059669' : undefined,
                                borderColor: refetchSuccess ? '#10b981' : undefined
                            }}
                        >
                            {isRefetching ? <RefreshCw size={14} className={styles.spin} /> : refetchSuccess ? '✓' : (
                                <>
                                    <RefreshCw size={14} /> <span className={styles.hideMobile}>Recheck Status</span>
                                </>
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsMinimized(!isMinimized)}
                        className={styles.btnSecondary}
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    >
                        {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span className={styles.hideMobile}>
                            {isMinimized ? 'Show Details' : 'Hide Details'}
                        </span>
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {institutionData.institution?.is_locked ? (
                        <div className={styles.lockBanner} style={{ padding: '8px 12px', fontSize: '13px', marginBottom: '12px' }}>
                            <Lock size={14} className={styles.bannerIcon} /> Locked: Details cannot be edited.
                        </div>
                    ) : (
                        <div className={styles.editBanner} style={{ padding: '8px 12px', fontSize: '13px', marginBottom: '12px' }}>
                            <Edit size={14} className={styles.bannerIcon} /> Open: Details can be edited.
                        </div>
                    )}

                    <div className={styles.detailsFormGrid} style={{ marginBottom: '16px', gap: '10px' }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Institution Name</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={isInstEditMode ? instEditName : institutionData.institution?.name}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditName(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Contact Person</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={isInstEditMode ? instEditContactPerson : institutionData.institution?.contact_person}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditContactPerson(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Email Address</label>
                            <input
                                type="email"
                                className={styles.formInput}
                                value={isInstEditMode ? instEditEmail : institutionData.institution?.email}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditEmail(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>WhatsApp Number</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={isInstEditMode ? instEditWhatsapp : institutionData.institution?.whatsapp_number}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditWhatsapp(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Phone Number (Optional)</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={isInstEditMode ? instEditPhone : (institutionData.institution?.phone_number || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditPhone(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Google Maps Location</label>
                            {isInstEditMode ? (
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={instEditLocation}
                                    onChange={(e) => setInstEditLocation(e.target.value)}
                                />
                            ) : (
                                <div className={styles.filePreviewWrapper} style={{ paddingTop: '4px' }}>
                                    {institutionData.institution?.instituition_location ? (
                                        <a
                                            href={institutionData.institution.instituition_location}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.previewLink}
                                            style={{ fontSize: '13px' }}
                                        >
                                            View Location ↗
                                        </a>
                                    ) : (
                                        <span className={styles.fileName} style={{ fontSize: '12px' }}>Not provided</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Authenticity Document</label>
                            <div className={styles.filePreviewWrapper}>
                                {!isInstEditMode && institutionData.institution?.document ? (
                                    <a
                                        href={getFileUrl(institutionData.institution.id, institutionData.institution.document)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.previewLink}
                                        style={{ fontSize: '13px' }}
                                    >
                                        View Bonafide / ID ↗
                                    </a>
                                ) : (
                                    !isInstEditMode && <span className={styles.fileName} style={{ fontSize: '12px' }}>Not provided</span>
                                )}

                                {isInstEditMode && !institutionData.institution?.is_locked && (
                                    <div className={styles.fileUploadControl}>
                                        <input
                                            type="file"
                                            accept=".pdf,image/*"
                                            ref={instFileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setInstEditDocFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className={styles.btnUpload}
                                            onClick={() => instFileInputRef.current?.click()}
                                        >
                                            Upload
                                        </button>
                                        <span className={styles.fileName} style={{ fontSize: '11px', marginLeft: '6px' }}>
                                            {instEditDocFile ? instEditDocFile.name : (institutionData.institution?.document ? 'Keep existing document' : 'No file chosen')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Building Proof Photo</label>
                            <div className={styles.filePreviewWrapper}>
                                {!isInstEditMode && institutionData.institution?.instituition_building_proof ? (
                                    <a
                                        href={getFileUrl(institutionData.institution.id, institutionData.institution.instituition_building_proof)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.previewLink}
                                        style={{ fontSize: '13px' }}
                                    >
                                        View Building Photo ↗
                                    </a>
                                ) : (
                                    !isInstEditMode && <span className={styles.fileName} style={{ fontSize: '12px' }}>Not provided</span>
                                )}

                                {isInstEditMode && !institutionData.institution?.is_locked && (
                                    <div className={styles.fileUploadControl}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={instBuildingFileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setInstEditBuildingFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className={styles.btnUpload}
                                            onClick={() => instBuildingFileInputRef.current?.click()}
                                        >
                                            Upload
                                        </button>
                                        <span className={styles.fileName} style={{ fontSize: '11px', marginLeft: '6px' }}>
                                            {instEditBuildingFile ? instEditBuildingFile.name : (institutionData.institution?.instituition_building_proof ? 'Keep existing photo' : 'No photo chosen')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Street Address</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditStreet : (institutionData.institution?.street_address || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditStreet(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup} style={{ position: 'relative' }}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Pincode</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditPincode : (institutionData.institution?.pincode || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={handlePincodeChange}
                                maxLength={6}
                            />
                            {isLoadingLocation && <small style={{ color: '#0d9488', position: 'absolute', top: 'calc(100% + 2px)', left: '4px', fontSize: '11px', fontWeight: '500' }}>⚡ Fetching details...</small>}
                            {pincodeError && <small style={{ color: '#ef4444', position: 'absolute', top: 'calc(100% + 2px)', left: '4px', fontSize: '11px', fontWeight: '500' }}>{pincodeError}</small>}
                        </div>

                        {/* Row 2: 50/50 */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>District</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditDistrict : (institutionData.institution?.district_name || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked || isLoadingLocation}
                                onChange={(e) => setInstEditDistrict(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup} style={{ position: 'relative' }} ref={localityRef}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Village / Locality</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditVillage : (institutionData.institution?.village_name || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked || isLoadingLocation}
                                onChange={(e) => {
                                    setInstEditVillage(e.target.value);
                                    if (availableVillages.length > 0) setIsLocalityOpen(true);
                                }}
                                onFocus={() => {
                                    if (availableVillages.length > 0) setIsLocalityOpen(true);
                                }}
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
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    zIndex: 100,
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                }}>
                                    {filteredVillages.map((village, idx) => (
                                        <li
                                            key={idx}
                                            onClick={() => {
                                                setInstEditVillage(village);
                                                setIsLocalityOpen(false);
                                            }}
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                        >
                                            {village}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Row 3: Full Width */}
                        <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>State</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditState : (institutionData.institution?.state_name || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked || isLoadingLocation}
                                onChange={(e) => setInstEditState(e.target.value)}
                            />
                        </div>
                    </div>

                    {!institutionData.institution?.is_locked && (
                        <div className={styles.detailsActions} style={{ margin: '16px 0', borderBottom: 'none' }}>
                            {isInstEditMode ? (
                                <>
                                    <button
                                        className={styles.btnSecondary}
                                        style={{ padding: '6px 12px', fontSize: '13px' }}
                                        onClick={() => setIsInstEditMode(false)}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={styles.btnPrimary}
                                        style={{ padding: '6px 12px', fontSize: '13px' }}
                                        onClick={handleSaveInstitutionChanges}
                                        disabled={loading || !hasChanges}
                                    >
                                        {loading ? 'Saving...' : 'Save'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    className={styles.btnPrimary}
                                    style={{ padding: '6px 12px', fontSize: '13px' }}
                                    onClick={() => setIsInstEditMode(true)}
                                >
                                    Edit Details
                                </button>
                            )}
                        </div>
                    )}

                    <div className={styles.detailsActions} style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '12px', flex: 1 }}>


                        </div>
                        <div>
                            {institutionData.institution?.is_locked ? (
                                <button
                                    className={styles.btnSecondary}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}
                                    onClick={() => setModalState({ type: 'unlock' })}
                                    disabled={isUpdatingStatus || loading}
                                >
                                    <Unlock size={14} /> <span className={styles.btnText}>Unlock Application</span>
                                </button>
                            ) : (
                                <button
                                    className={styles.btnSecondary}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}
                                    onClick={() => setModalState({ type: 'lock' })}
                                    disabled={isUpdatingStatus || loading}
                                >
                                    <Lock size={14} /> <span className={styles.btnText}>Lock Application</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.statsSummary} style={{ gap: '10px', marginBottom: '16px' }}>
                        <div className={styles.statBox} style={{ padding: '10px' }}>
                            <span className={styles.statNum} style={{ fontSize: '18px' }}>{institutionData.applications.length}</span>
                            <span className={styles.statLabel} style={{ fontSize: '11px' }}>Total Applicants</span>
                        </div>
                        <div className={styles.statBox} style={{ padding: '10px' }}>
                            <span className={styles.statNum} style={{ fontSize: '18px' }}>
                                {institutionData.applications.filter(a => a.status === 'approved').length}
                            </span>
                            <span className={styles.statLabel} style={{ fontSize: '11px' }}>Approved</span>
                        </div>
                        <div className={styles.statBox} style={{ padding: '10px' }}>
                            <span className={styles.statNum} style={{ fontSize: '18px' }}>
                                {institutionData.applications.filter(a => a.status === 'pending').length}
                            </span>
                            <span className={styles.statLabel} style={{ fontSize: '11px' }}>Pending</span>
                        </div>
                    </div>

                    {institutionData.applications.length > 0 && (
                        <div className={printStyles.downloadBar} style={{ padding: '8px', marginBottom: '16px' }}>
                            <button
                                className={printStyles.downloadBtn}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={async () => {
                                    if (!institutionData.institution) return;
                                    try {
                                        const res = await pb.send<any>(`/api/admin/print-institution-students`, {
                                            method: 'GET',
                                            query: { id: institutionData.institution.id }
                                        });

                                        const allMeta = await metadataApi.getAllMetadata(true);
                                        const tplRecord = allMeta.find(r => r.key === 'application_print_template');
                                        let customTemplateHtml = '';
                                        if (tplRecord && tplRecord.document) {
                                            try {
                                                const tplUrl = pb.files.getURL(tplRecord, tplRecord.document);
                                                const tplRes = await fetch(tplUrl);
                                                if (tplRes.ok) {
                                                    customTemplateHtml = await tplRes.text();
                                                }
                                            } catch (e) {
                                                console.error('Failed to load custom application template:', e);
                                            }
                                        }

                                        if (!customTemplateHtml) {
                                            try {
                                                const fallbackRes = await fetch('/default_templates/application_template.html');
                                                if (fallbackRes.ok) {
                                                    customTemplateHtml = await fallbackRes.text();
                                                }
                                            } catch (err) {
                                                console.error('Failed to fetch local default template:', err);
                                            }
                                        }

                                        setPrintPreview({
                                            title: 'All Application Forms',
                                            html: generateAllFormsHTML(res.applications, customTemplateHtml || undefined)
                                        });
                                    } catch (err) {
                                        console.error('Failed to prepare application forms:', err);
                                        alert('Failed to load print data. Please try again.');
                                    }
                                }}
                            >
                                <FileText size={13} /> <span className={styles.btnText}>Print All Application Forms</span>
                            </button>
                        </div>
                    )}
                </>
            )}

            <div className={styles.tableWrapper}>
                <table className={styles.table} style={{ fontSize: '13px' }}>
                    <thead>
                        <tr>
                            <th>Applicant Name</th>
                            <th>Application ID</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {institutionData.applications.length > 0 ? (
                            institutionData.applications.map((app) => (
                                <tr key={app.id}>
                                    <td className={styles.fontBold}>{app.full_name}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                        {app.status === 'approved' && app.participant_id
                                            ? app.participant_id
                                            : app.id}
                                    </td>
                                    <td>{app.category.replace('_', ' ')}</td>
                                    <td>
                                        <span className={`${styles.tableStatus} ${getStatusClass(app.status)}`} style={{ fontSize: '11px', padding: '2px 6px' }}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                className={styles.tableActionBtn}
                                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                                onClick={() => onViewIndividual(app)}
                                            >
                                                View / Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className={styles.noDataCell}>
                                    No candidate registrations found under this institution.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <PrintPreviewModal
                isOpen={!!printPreview}
                onClose={() => setPrintPreview(null)}
                title={printPreview?.title || ''}
                htmlContent={printPreview?.html || ''}
            />

            {/* Modals */}
            {modalState.type !== null && (
                <div className={styles.imgModalOverlay} onClick={() => setModalState({ type: null })}>
                    <div className={styles.customModal} onClick={e => e.stopPropagation()}>

                        {modalState.type === 'lock' && (
                            <>
                                <h3>Confirm Lock</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px 0' }}>
                                    Lock this application to prevent further edits?
                                </p>
                            </>
                        )}
                        {modalState.type === 'unlock' && (
                            <>
                                <h3>Confirm Unlock</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px 0' }}>
                                    Unlock this application to allow edits?
                                </p>
                            </>
                        )}

                        <div className={styles.modalActions}>
                            <button className={styles.btnSecondary} onClick={() => setModalState({ type: null })}>Cancel</button>
                            <button
                                className={modalState.type === 'lock' ? styles.btnSecondary : styles.btnPrimary}
                                style={modalState.type === 'lock' ? { color: '#ef4444', borderColor: '#ef4444' } : {}}
                                onClick={submitAction}
                                disabled={isUpdatingStatus}
                            >
                                {isUpdatingStatus ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
