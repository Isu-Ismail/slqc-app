import { useRef, useState, useEffect } from 'react';
import { pb } from '../../../api/db';
import { Lock, Edit, Printer, Unlock } from 'lucide-react';
import { adminTrackApi } from '../../../api/track';
import type { ParticipantsApplicationResponse } from '../../../api/track';
import { metadataApi } from '../../../api/metadata';
import styles from '../TrackPage.module.css';
import { CATEGORIES_CONFIG, getJuzCodesForCategory, getJuzLabel, getCategoryLabel, FORM_FIELDS_CONFIG } from '../../../config/fieldsConfig';
import printStyles from './PrintPreviewModal.module.css';
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
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [pincodeError, setPincodeError] = useState('');

    const prevEditModeRef = useRef(isEditMode);

    // Initialise address sub-fields when entering edit mode
    useEffect(() => {
        if (isEditMode && !prevEditModeRef.current) {
            const raw = editData.address || individualRecord.address || '';
            const parts = raw.split(',').map((p: string) => p.trim());
            setStreet(parts[0] || '');
            setVillageLocal(parts[1] || '');
            setDistrictLocal(parts[2] || '');
            setStateLocal(parts[3] || '');
            setPincodeLocal(parts[4] || '');
        }
        prevEditModeRef.current = isEditMode;
    }, [isEditMode, individualRecord.address]);

    // Keep combined address in sync with sub-fields
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

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.replace(/\D/g, '');
        setPincodeLocal(code);
        setStateLocal(''); setDistrictLocal('');
        setPincodeError('');
        if (code.length === 6) {
            setIsLoadingLocation(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${code}`);
                const data = await response.json();
                if (data && data[0] && data[0].Status === 'Success') {
                    const postOffices = data[0].PostOffice;
                    if (postOffices && postOffices.length > 0) {
                        setStateLocal(postOffices[0].State);
                        setDistrictLocal(postOffices[0].District);
                    }
                } else {
                    setPincodeError('Invalid Pincode.');
                }
            } catch {
                setPincodeError('Could not fetch address. Enter manually.');
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

    // Admin workflow state
    const [modalState, setModalState] = useState<{ type: 'approve' | 'reject' | 'lock' | 'unlock' | null }>({ type: null });
    const [rejectReason, setRejectReason] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);



    const submitAction = async () => {
        if (!modalState.type) return;
        setIsUpdatingStatus(true);
        try {
            let updated: any = null;
            if (modalState.type === 'approve') {
                updated = await adminTrackApi.updateStatusAndLock(individualRecord.id, 'individual', 'approved', true);
            } else if (modalState.type === 'lock') {
                updated = await adminTrackApi.updateLockStatus(individualRecord.id, 'individual', true);
            } else if (modalState.type === 'unlock') {
                updated = await adminTrackApi.updateLockStatus(individualRecord.id, 'individual', false);
            } else if (modalState.type === 'reject') {
                if (!rejectReason.trim()) {
                    triggerAlert('Please provide a reason for rejection.', 'Reason Required');
                    setIsUpdatingStatus(false);
                    return;
                }
                updated = await adminTrackApi.updateStatusAndLock(individualRecord.id, 'individual', 'rejected', false, rejectReason.trim());
            }

            if (updated) {
                if (onRefresh) await onRefresh();
                setModalState({ type: null });
                setRejectReason('');
            }
        } catch (e: any) {
            triggerAlert(e.message || 'Status update failed.', 'Update Failed');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Calculate if any fields have changed
    const hasChanges = () => {
        for (const field of FORM_FIELDS_CONFIG) {
            if (field.key === 'requires_accommodation') {
                if (!!editData.requires_accommodation !== !!individualRecord.requires_accommodation) return true;
            } else {
                let oldVal = (individualRecord as any)[field.key] || '';
                if (field.type === 'date' && oldVal) oldVal = oldVal.split(' ')[0];
                const newVal = editData[field.key] || '';
                if (String(oldVal).trim() !== String(newVal).trim()) return true;
            }
        }
        return editAadhaarFile !== null || editCandidatePhotoFile !== null;
    };

    return (
        <>


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
                )}            <div className={styles.detailsFormGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Application ID</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            value={individualRecord.id}
                            disabled={true}
                        />
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

                    {individualRecord.status === 'approved' && (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Allocated Venue</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={individualRecord.allocated_venue || 'No Venue / Unallocated'}
                                    disabled={true}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Sequence Order</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={individualRecord.allocated_order != null && individualRecord.allocated_order !== 0 ? String(individualRecord.allocated_order) : '—'}
                                    disabled={true}
                                />
                            </div>
                        </>
                    )}

                    {individualRecord.status === 'approved' && (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Approved By</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={
                                    (individualRecord as any).expand?.approved_by
                                        ? `${(individualRecord as any).expand.approved_by.name || 'Organising Committee'} (${(individualRecord as any).expand.approved_by.mobile || 'Official Support'})`
                                        : 'Organising Committee (Official Support)'
                                }
                                disabled={true}
                            />
                        </div>
                    )}

                    {/* Dynamic Fields */}
                    {FORM_FIELDS_CONFIG.map((field) => {
                        const value = isEditMode ? (editData[field.key] ?? '') : ((individualRecord as any)[field.key] ?? '');
                        const isEditable = field.editable && isEditMode && !individualRecord.is_locked;

                        // Custom Renders
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
                                                // Live age validation
                                                if (appMetadata?.event_date) {
                                                    const v = validateCategorySelection(
                                                        nextCat,
                                                        editData.dob || individualRecord.dob,
                                                        appMetadata.event_date,
                                                        appMetadata.event_age_criteria,
                                                        appMetadata.age_buffer_months
                                                    );
                                                    if (!v.allowed) {
                                                        triggerAlert(v.message || 'Cannot switch to this category.', 'Category Not Allowed');
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
                                                <option key={cat.key} value={cat.key}>
                                                    {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            value={getCategoryLabel(value)}
                                            disabled={true}
                                        />
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
                                            <option key={opt.code} value={opt.code}>
                                                {opt.label}
                                            </option>
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
                                        <select
                                            className={styles.formSelect}
                                            value={value}
                                            onChange={(e) => updateEditField('gender', e.target.value)}
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            value={value}
                                            disabled={true}
                                        />
                                    )}
                                </div>
                            );
                        }

                        if (field.key === 'requires_accommodation') {
                            const checkboxLabelStyle = (active: boolean, locked: boolean) => {
                                if (locked) return `${styles.checkboxLabel} ${styles.disabledCheckboxLabel || ''}`;
                                return active ? styles.checkboxLabel : `${styles.checkboxLabel} ${styles.disabledCheckboxLabel || ''}`;
                            };

                            return (
                                <div key={field.key} className={`${styles.formGroup} ${styles.fullWidthCheckbox}`}>
                                    <label className={checkboxLabelStyle(isEditMode, !!individualRecord.is_locked)}>
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

                        if (field.type === 'textarea' && field.key === 'address') {
                            if (!isEditMode) {
                                // View mode: parse and show split fields
                                const raw = (individualRecord.address || '');
                                const parts = raw.split(',').map((p: string) => p.trim());
                                const vs = parts[0] || '', vv = parts[1] || '', vd = parts[2] || '', vst = parts[3] || '', vp = parts[4] || '';
                                return (
                                    <div key={field.key} className={`${styles.formGroup} ${styles.fullWidth}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label className={styles.formLabel}>Door No, Building &amp; Street Road</label>
                                                <input type="text" className={styles.formInput} value={vs} disabled placeholder="N/A" />
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>Pincode</label>
                                                <input type="text" className={styles.formInput} value={vp} disabled placeholder="N/A" />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label className={styles.formLabel}>Village / Locality</label>
                                                <input type="text" className={styles.formInput} value={vv} disabled placeholder="N/A" />
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>District</label>
                                                <input type="text" className={styles.formInput} value={vd} disabled placeholder="N/A" />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label className={styles.formLabel}>State</label>
                                                <input type="text" className={styles.formInput} value={vst} disabled placeholder="N/A" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Edit mode: split pincode-driven fields
                            return (
                                <div key={field.key} className={`${styles.formGroup} ${styles.fullWidth}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label className={styles.formLabel}>Door No, Building &amp; Street Road <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input type="text" className={styles.formInput} value={street}
                                                disabled={!isEditable} placeholder="e.g. 12/3 Main Street"
                                                onChange={e => setStreet(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className={styles.formLabel}>Pincode <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input type="text" className={styles.formInput} value={pincodeLocal}
                                                disabled={!isEditable} placeholder="6-digit pincode"
                                                onChange={handlePincodeChange} maxLength={6} />
                                            {isLoadingLocation && <span style={{ fontSize: '11px', color: '#64748b' }}>Fetching location…</span>}
                                            {pincodeError && <span style={{ fontSize: '11px', color: '#ef4444' }}>{pincodeError}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label className={styles.formLabel}>Village / Locality <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input type="text" className={styles.formInput} value={villageLocal}
                                                disabled={!isEditable} placeholder="Village or Locality"
                                                onChange={e => setVillageLocal(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className={styles.formLabel}>District <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input type="text" className={styles.formInput} value={districtLocal}
                                                disabled={!isEditable} placeholder="District"
                                                onChange={e => setDistrictLocal(e.target.value)} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label className={styles.formLabel}>State <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input type="text" className={styles.formInput} value={stateLocal}
                                                disabled={!isEditable} placeholder="State"
                                                onChange={e => setStateLocal(e.target.value)} />
                                        </div>
                                    </div>
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

                        // Allow editing Aadhaar Number during edit mode
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

                    {individualRecord.expand?.institution_ref && (
                        <>
                            <div className={styles.formGroup} style={{ gridColumn: '1 / -1', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                                <h4 style={{ fontSize: '14px', color: '#0f766e', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600 }}>Associated Institution Details</h4>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Institution Name</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={individualRecord.expand.institution_ref.name || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Institution ID</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={individualRecord.expand.institution_ref.institution_id || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Email Address</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={individualRecord.expand.institution_ref.email || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Contact Phone</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={individualRecord.expand.institution_ref.phone_number || individualRecord.expand.institution_ref.whatsapp_number || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className={styles.formLabel}>Institution Address</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={individualRecord.expand.institution_ref.address || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                        </>
                    )}

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.formLabel}>Aadhaar Card Front Image</label>
                        {!isEditMode && individualRecord.aadhaar_front ? (
                            <div className={styles.filePreviewWrapper}>
                                <a
                                    href={getAadhaarUrl(individualRecord)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.previewLink}
                                >
                                    View Uploaded Aadhaar Image ↗
                                </a>
                            </div>
                        ) : isEditMode && !individualRecord.is_locked ? (
                            <div className={styles.fileUploadControl}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setEditAadhaarFile(e.target.files[0]);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className={styles.btnUpload}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Choose New Image
                                </button>
                                <span className={styles.fileName}>
                                    {editAadhaarFile ? editAadhaarFile.name : (individualRecord.aadhaar_front ? 'Keep existing image' : 'No file selected')}
                                </span>
                            </div>
                        ) : (
                            <div className={styles.filePreviewWrapper}>
                                <span style={{ color: '#94a3b8', fontSize: '13px' }}>No Aadhaar Image Uploaded</span>
                            </div>
                        )}
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.formLabel}>Birth Certificate</label>
                        {!isEditMode && individualRecord.birthcertificate_photo ? (
                            <div className={styles.filePreviewWrapper}>
                                <a
                                    href={getBirthCertificateUrl(individualRecord)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.previewLink}
                                >
                                    View Uploaded Birth Certificate ↗
                                </a>
                            </div>
                        ) : isEditMode && !individualRecord.is_locked ? (
                            <div className={styles.fileUploadControl}>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    ref={birthCertInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setEditBirthCertificateFile(e.target.files[0]);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className={styles.btnUpload}
                                    onClick={() => birthCertInputRef.current?.click()}
                                >
                                    Choose New Image
                                </button>
                                <span className={styles.fileName}>
                                    {editBirthCertificateFile ? editBirthCertificateFile.name : (individualRecord.birthcertificate_photo ? 'Keep existing document' : 'No file selected')}
                                </span>
                            </div>
                        ) : (
                            <div className={styles.filePreviewWrapper}>
                                <span style={{ color: '#94a3b8', fontSize: '13px' }}>No Birth Certificate Uploaded</span>
                            </div>
                        )}
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                        <label className={styles.formLabel}>Passport Size Photo</label>
                        {!isEditMode && individualRecord.candidate_photo ? (
                            <div className={styles.filePreviewWrapper}>
                                <a
                                    href={getCandidatePhotoUrl(individualRecord)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.previewLink}
                                >
                                    View Uploaded Passport Photo ↗
                                </a>
                            </div>
                        ) : isEditMode && !individualRecord.is_locked ? (
                            <div className={styles.fileUploadControl}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={photoInputRef}
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setEditCandidatePhotoFile(e.target.files[0]);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className={styles.btnUpload}
                                    onClick={() => photoInputRef.current?.click()}
                                >
                                    Choose New Photo
                                </button>
                                <span className={styles.fileName}>
                                    {editCandidatePhotoFile ? editCandidatePhotoFile.name : (individualRecord.candidate_photo ? 'Keep existing photo' : 'No file selected')}
                                </span>
                            </div>
                        ) : (
                            <div className={styles.filePreviewWrapper}>
                                <span style={{ color: '#94a3b8', fontSize: '13px' }}>No Photo Uploaded</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.detailsActions}>
                    {!individualRecord.is_locked && (
                        <>
                            {isEditMode ? (
                                <>
                                    <button
                                        className={styles.btnSecondary}
                                        onClick={() => setIsEditMode(false)}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={styles.btnPrimary}
                                        onClick={handleSaveIndividualChanges}
                                        disabled={loading || !hasChanges()}
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    className={styles.btnPrimary}
                                    onClick={() => setIsEditMode(true)}
                                >
                                    Edit Application Details
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className={styles.detailsActions} style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '12px', flex: 1 }}>


                    </div>
                    <div>
                        {individualRecord.is_locked ? (
                            <button
                                className={styles.btnSecondary}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => setModalState({ type: 'unlock' })}
                                disabled={isUpdatingStatus || loading}
                            >
                                <Unlock size={16} /> <span className={styles.btnText}>Unlock Application</span>
                            </button>
                        ) : (
                            <button
                                className={styles.btnSecondary}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => setModalState({ type: 'lock' })}
                                disabled={isUpdatingStatus || loading}
                            >
                                <Lock size={16} /> <span className={styles.btnText}>Lock Application</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className={printStyles.downloadBar}>
                    <button
                        className={printStyles.downloadBtn}
                        onClick={async () => {
                            setIsPrintLoading(true);
                            try {
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
                                    } catch (tplErr) {
                                        console.error('Failed to fetch custom print template:', tplErr);
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

                                const res = await pb.send<any>(`/api/admin/print-form`, {
                                    method: 'GET',
                                    query: { id: individualRecord.id }
                                });
                                if (res) {
                                    setPrintPreview(generateIndividualFormHTML(res, customTemplateHtml || undefined));
                                }
                            } catch (err) {
                                console.error('Failed to fetch print details:', err);
                                triggerAlert('Failed to retrieve print details. Please try again.', 'Print Error');
                            } finally {
                                setIsPrintLoading(false);
                            }
                        }}
                        disabled={isPrintLoading}
                    >
                        <Printer size={15} /> <span className={styles.btnText}>{isPrintLoading ? 'Loading Form...' : 'Print Application Form'}</span>
                    </button>
                </div>

                <PrintPreviewModal
                    isOpen={!!printPreview}
                    onClose={() => setPrintPreview(null)}
                    title="Application Form Preview"
                    htmlContent={printPreview || ''}
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
            <ConfirmModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
}
