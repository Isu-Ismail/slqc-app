import { useRef, useState, useEffect, useMemo } from 'react';
import { pb } from '../../../api/db';
import { Lock, Edit, Printer, Unlock } from 'lucide-react';
import { adminTrackApi } from '../../../api/track';
import type { ParticipantsApplicationResponse } from '../../../api/track';
import styles from '../TrackPage.module.css';
import { CATEGORIES_CONFIG, getJuzCodesForCategory, getJuzLabel, getCategoryLabel, JUZ_OPTIONS } from '../../../config/fieldsConfig';
import PrintPreviewModal from './PrintPreviewModal';
import { generateIndividualFormHTML } from './printTemplates';
import ConfirmModal from '../../../shared/components/Modal/ConfirmModal';
import { validateCategorySelection } from '../../../shared/utils/categoryValidator';

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
    handleSaveIndividualChanges: () => void;
    loading: boolean;
    getStatusClass: (status: string) => string;
    getAadhaarUrl: (record: ParticipantsApplicationResponse) => string;
    getBirthCertificateUrl: (record: ParticipantsApplicationResponse) => string;
    getCandidatePhotoUrl: (record: ParticipantsApplicationResponse) => string;
    onRefresh?: () => Promise<boolean>;
    appMetadata?: { event_date: string; event_age_criteria: any; age_buffer_months: number };
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
    handleSaveIndividualChanges,
    loading,
    getStatusClass,
    getAadhaarUrl,
    getBirthCertificateUrl,
    getCandidatePhotoUrl,
    onRefresh,
    appMetadata
}: IndividualDetailsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const birthCertInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const localityRef = useRef<HTMLDivElement | null>(null);

    const [printPreview, setPrintPreview] = useState<string | null>(null);
    const [isPrintLoading, setIsPrintLoading] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [refetchSuccess, setRefetchSuccess] = useState(false);

    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'success' }>({
        isOpen: false, title: '', message: '', type: 'alert'
    });
    const triggerAlert = (message: string, title = 'Attention Required', type: 'alert' | 'success' = 'alert') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    // Address sub-state for split fields
    const [street, setStreet] = useState('');
    const [pincodeLocal, setPincodeLocal] = useState('');
    const [villageLocal, setVillageLocal] = useState('');
    const [districtLocal, setDistrictLocal] = useState('');
    const [stateLocal, setStateLocal] = useState('');

    const [availableVillages, setAvailableVillages] = useState<string[]>([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const [isLocalityOpen, setIsLocalityOpen] = useState(false);

    const prevEditModeRef = useRef(isEditMode);

    // Initialise address sub-fields when entering edit mode
    useEffect(() => {
        if (isEditMode && !prevEditModeRef.current) {
            setStreet(editData.street_address || individualRecord.street_address || '');
            setVillageLocal(editData.village_name || individualRecord.village_name || '');
            setDistrictLocal(editData.district_name || individualRecord.district_name || '');
            setStateLocal(editData.state_name || individualRecord.state_name || '');
            setPincodeLocal(editData.pincode ? String(editData.pincode) : (individualRecord.pincode ? String(individualRecord.pincode) : ''));
        }
        prevEditModeRef.current = isEditMode;
    }, [isEditMode, individualRecord]);

    // Keep address fields in sync
    useEffect(() => {
        if (isEditMode) {
            updateEditField('street_address', street);
            updateEditField('village_name', villageLocal);
            updateEditField('district_name', districtLocal);
            updateEditField('state_name', stateLocal);
            updateEditField('pincode', pincodeLocal);
        }
    }, [street, villageLocal, districtLocal, stateLocal, pincodeLocal, isEditMode]);

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
        v.toLowerCase().includes(villageLocal.toLowerCase())
    );

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.replace(/\D/g, '');
        setPincodeLocal(code);

        setStateLocal('');
        setDistrictLocal('');
        setVillageLocal('');
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
                        setStateLocal(postOffices[0].State);
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

    const hasChanges = useMemo(() => {
        if (editAadhaarFile || editBirthCertificateFile || editCandidatePhotoFile) return true;
        const keysToCheck = [
            'full_name', 'father_name', 'father_number', 'aadhaar_number',
            'dob', 'gender', 'category', 'juz_options', 'selected_juz',
            'whatsapp_number', 'email', 'guardian_name', 'guardian_phone',
            'requires_accommodation', 'street_address', 'village_name',
            'district_name', 'state_name', 'pincode'
        ];
        for (const key of keysToCheck) {
            let dbVal = (individualRecord as any)[key];
            let editVal = editData[key];
            
            if (key === 'dob' && dbVal) {
                dbVal = dbVal.split(' ')[0];
            }
            if (key === 'juz_options' && !dbVal) {
                const matched = JUZ_OPTIONS.find(o => o.label === individualRecord.selected_juz);
                if (matched) dbVal = matched.code;
            }
            if (key === 'requires_accommodation') {
                const dbBool = !!dbVal;
                const editBool = editVal === true || editVal === 'true';
                if (dbBool !== editBool) return true;
                continue;
            }
            
            const normDb = (dbVal === undefined || dbVal === null) ? '' : String(dbVal).trim();
            const normEdit = (editVal === undefined || editVal === null) ? '' : String(editVal).trim();
            
            if (normDb !== normEdit) return true;
        }
        return false;
    }, [editData, individualRecord, editAadhaarFile, editBirthCertificateFile, editCandidatePhotoFile]);

    const isFormValid = useMemo(() => {
        const requiredKeys = [
            'full_name', 'father_name', 'dob', 'whatsapp_number',
            'street_address', 'village_name', 'district_name', 'state_name', 'pincode',
            'guardian_name', 'guardian_phone'
        ];
        for (const key of requiredKeys) {
            const val = editData[key] ?? (individualRecord as any)[key];
            if (val === undefined || val === null || String(val).trim() === '') {
                return false;
            }
        }
        if (!(individualRecord as any).no_aadhaar) {
            const aadhaar = editData.aadhaar_number ?? individualRecord.aadhaar_number;
            if (!aadhaar || String(aadhaar).trim() === '') {
                return false;
            }
        }
        return true;
    }, [editData, individualRecord]);

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

    // Unlock logic to toggle lock status
    const [confirmUnlockOpen, setConfirmUnlockOpen] = useState(false);
    const handleUnlockApplication = async () => {
        try {
            await adminTrackApi.updateLockStatus(individualRecord.id, 'individual', false);
            if (onRefresh) await onRefresh();
            triggerAlert('Application unlocked successfully!', 'Unlocked', 'success');
        } catch (err: any) {
            const errMsg = err.data?.error || err.data?.message || err.message || 'Failed to unlock application.';
            triggerAlert(errMsg, 'Error');
        } finally {
            setConfirmUnlockOpen(false);
        }
    };

    const getVal = (key: string) => {
        return isEditMode ? (editData[key] ?? '') : ((individualRecord as any)[key] ?? '');
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
                                disabled={loading || isRefetching}
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
                                        <span className={styles.hideMobile}>Refetched!</span>
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
                    <div className={styles.lockBanner} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Lock size={16} className={styles.bannerIcon} />
                            <span>This application is locked. Changes are disabled.</span>
                        </div>
                        <button
                            type="button"
                            className={styles.btnUnlock}
                            onClick={() => setConfirmUnlockOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#1e293b',
                                color: '#fff',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <Unlock size={12} /> Unlock
                        </button>
                    </div>
                ) : (
                    <div className={styles.editBanner}>
                        <Edit size={16} className={styles.bannerIcon} /> This application is open for edits.
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

                    {/* Full Name */}
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.formLabel}>Full Name {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={getVal('full_name')}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('full_name', e.target.value)}
                        />
                    </div>

                    {/* Father Name */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Father Name {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={getVal('father_name')}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('father_name', e.target.value)}
                        />
                    </div>

                    {/* Father Mobile */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Father Mobile</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={getVal('father_number')}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('father_number', e.target.value)}
                        />
                    </div>

                    {/* Aadhaar Number */}
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.formLabel}>Aadhaar Number</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={getVal('aadhaar_number')}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('aadhaar_number', e.target.value)}
                        />
                    </div>

                    {/* Date of Birth */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Date of Birth {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                        <input
                            type="date"
                            className={styles.formInput}
                            value={getVal('dob') ? getVal('dob').substring(0, 10) : ''}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('dob', e.target.value)}
                        />
                    </div>

                    {/* Gender */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Gender {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                        {isEditMode && !individualRecord.is_locked ? (
                            <select className={styles.formSelect} value={getVal('gender')} onChange={(e) => updateEditField('gender', e.target.value)}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        ) : (
                            <input type="text" className={styles.formInput} value={getVal('gender')} disabled={true} />
                        )}
                    </div>

                    {/* Category */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Category {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                        {isEditMode && !individualRecord.is_locked ? (
                            <select
                                className={styles.formSelect}
                                value={getVal('category')}
                                onChange={(e) => {
                                    const nextCat = e.target.value;
                                    const birthDate = editData.dob || individualRecord.dob || '';

                                    if (appMetadata) {
                                        const validation = validateCategorySelection(
                                            nextCat,
                                            birthDate,
                                            appMetadata.event_date,
                                            appMetadata.event_age_criteria,
                                            appMetadata.age_buffer_months
                                        );

                                        if (!validation.allowed) {
                                            triggerAlert(validation.message || 'Cannot switch to this category.', 'Category Not Allowed');
                                            return;
                                        }
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
                            <input type="text" className={styles.formInput} value={getCategoryLabel(getVal('category'))} disabled={true} />
                        )}
                    </div>

                    {/* Juz Range Option */}
                    {isEditMode ? (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Selected Juz Range <span style={{ color: '#ef4444' }}>*</span></label>
                            <select
                                className={styles.formSelect}
                                value={getVal('juz_options')}
                                onChange={(e) => {
                                    const code = e.target.value;
                                    updateEditField('juz_options', code);
                                    updateEditField('selected_juz', getJuzLabel(code));
                                }}
                            >
                                <option value="">Select Option</option>
                                {getJuzCodesForCategory(getVal('category')).map((opt) => (
                                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Selected Juz Range</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={getJuzLabel(individualRecord.juz_options || '') || individualRecord.selected_juz || 'N/A'}
                                disabled={true}
                            />
                        </div>
                    )}

                    {/* WhatsApp Number */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>WhatsApp Number {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={getVal('whatsapp_number')}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('whatsapp_number', e.target.value)}
                        />
                    </div>

                    {/* Email */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email Address</label>
                        <input
                            type="email"
                            className={styles.formInput}
                            value={getVal('email')}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('email', e.target.value)}
                        />
                    </div>

                    {/* Address Fields split region */}
                    {!isEditMode ? (
                        <div className={`${styles.formGroup} ${styles.fullWidth}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                <div>
                                    <label className={styles.formLabel}>Door No, Building &amp; Street Road</label>
                                    <input type="text" className={styles.formInput} value={individualRecord.street_address || ''} disabled={true} placeholder="N/A" />
                                </div>
                                <div>
                                    <label className={styles.formLabel}>Pincode</label>
                                    <input type="text" className={styles.formInput} value={individualRecord.pincode ? String(individualRecord.pincode) : ''} disabled={true} placeholder="N/A" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                <div>
                                    <label className={styles.formLabel}>Village / Locality</label>
                                    <input type="text" className={styles.formInput} value={individualRecord.village_name || ''} disabled={true} placeholder="N/A" />
                                </div>
                                <div>
                                    <label className={styles.formLabel}>District</label>
                                    <input type="text" className={styles.formInput} value={individualRecord.district_name || ''} disabled={true} placeholder="N/A" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                <div>
                                    <label className={styles.formLabel}>State</label>
                                    <input type="text" className={styles.formInput} value={individualRecord.state_name || ''} disabled={true} placeholder="N/A" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`${styles.formGroup} ${styles.fullWidth}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                <div>
                                    <label className={styles.formLabel}>Door No, Building &amp; Street Road *</label>
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
                                            setVillageLocal(e.target.value);
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
                                                        setVillageLocal(village);
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
                                    <input type="text" className={styles.formInput} value={districtLocal} placeholder="District" onChange={(e) => setDistrictLocal(e.target.value)} disabled={isLoadingLocation} required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                                <div>
                                    <label className={styles.formLabel}>State *</label>
                                    <input type="text" className={styles.formInput} value={stateLocal} placeholder="State" onChange={(e) => setStateLocal(e.target.value)} disabled={isLoadingLocation} required />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Guardian Name */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Guardian Name {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={getVal('guardian_name')}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('guardian_name', e.target.value)}
                        />
                    </div>

                    {/* Guardian Phone */}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Guardian Phone {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={getVal('guardian_phone')}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => updateEditField('guardian_phone', e.target.value)}
                        />
                    </div>

                    {/* Requires Accommodation */}
                    <div className={`${styles.formGroup} ${styles.fullWidthCheckbox}`}>
                        <label className={isEditMode && !individualRecord.is_locked ? styles.checkboxLabel : `${styles.checkboxLabel} ${styles.disabledCheckboxLabel || ''}`}>
                            <input
                                type="checkbox"
                                checked={!!getVal('requires_accommodation')}
                                disabled={!isEditMode || individualRecord.is_locked}
                                onChange={(e) => updateEditField('requires_accommodation', e.target.checked)}
                            />
                            <span>Requires Accommodation</span>
                        </label>
                    </div>

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
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        value={
                                            institutionRef.address ||
                                            [
                                                institutionRef.street_address,
                                                institutionRef.village_name,
                                                institutionRef.district_name,
                                                institutionRef.state_name,
                                                institutionRef.pincode
                                            ]
                                                .map(s => (s || '') + '')
                                                .map(s => s.trim())
                                                .filter(Boolean)
                                                .join(', ') ||
                                            'N/A'
                                        }
                                        disabled={true}
                                    />
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
                                <input type="file" accept="image/*,application/pdf" ref={birthCertInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { setEditBirthCertificateFile(e.target.files[0]); } }} />
                                <button type="button" className={styles.btnSecondary} onClick={() => birthCertInputRef.current?.click()}>{editBirthCertificateFile ? 'Change Selected Certificate' : 'Upload New Certificate'}</button>
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
                                <input type="file" accept="image/*" ref={photoInputRef} style={{ display: 'none' }} onChange={(e) => e.target.files && e.target.files && setEditCandidatePhotoFile(e.target.files[0])} />
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
                        <button type="button" className={styles.btnSecondary} onClick={() => setIsEditMode(false)} disabled={loading}>Cancel</button>
                        <button type="button" className={styles.btnPrimary} onClick={handleSaveIndividualChanges} disabled={loading || !hasChanges || !isFormValid}>{loading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                )}

                {!isEditMode && !individualRecord.is_locked && (
                    <div className={styles.detailsActions} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className={styles.btnPrimary} onClick={() => setIsEditMode(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Edit size={16} /> Edit Application Details</button>
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
                                    const res = await pb.send<any>(`/api/admin/print-form`, { method: 'GET', query: { id: individualRecord.id } });
                                    let customTemplateHtml = '';
                                    try {
                                        const metaRecords = await pb.collection('metadata').getFullList({ filter: 'key = "application_print_template"' });
                                        const tplRecord = metaRecords.length > 0 ? metaRecords[0] : null;
                                        if (tplRecord && tplRecord.document) {
                                            try {
                                                const tplUrl = pb.files.getURL(tplRecord, tplRecord.document);
                                                const tplRes = await fetch(tplUrl);
                                                if (tplRes.ok) customTemplateHtml = await tplRes.text();
                                            } catch (e) { console.error(e); }
                                        }
                                    } catch (e) { console.error(e); }
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
            </div>

            <ConfirmModal
                isOpen={confirmUnlockOpen}
                title="Unlock Application"
                message="Are you sure you want to unlock this application? This will allow details to be edited again."
                confirmText="Unlock"
                cancelText="Cancel"
                onConfirm={handleUnlockApplication}
                onClose={() => setConfirmUnlockOpen(false)}
            />

            {alertModal.isOpen && (
                <ConfirmModal
                    isOpen={alertModal.isOpen}
                    title={alertModal.title}
                    message={alertModal.message}
                    confirmText="OK"
                    onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                    onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                />
            )}
        </>
    );
}
