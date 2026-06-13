import { useRef, useState, useEffect } from 'react';
import { pb } from '../../../api/db';
import { Lock, Edit, Printer, CheckCircle, XCircle, Unlock } from 'lucide-react';
import { adminTrackApi } from '../../../api/track';
import type { ParticipantsApplicationResponse } from '../../../api/track';
import { metadataApi } from '../../../api/metadata';
import styles from '../TrackPage.module.css';
import { CATEGORIES_CONFIG, getJuzCodesForCategory, getJuzLabel, getCategoryLabel, FORM_FIELDS_CONFIG } from '../../../config/fieldsConfig';
import printStyles from './PrintPreviewModal.module.css';
import PrintPreviewModal from './PrintPreviewModal';
import { generateIndividualFormHTML } from './printTemplates';

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
    onRefresh
}: IndividualDetailsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const birthCertInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [printPreview, setPrintPreview] = useState<string | null>(null);
    const [isPrintLoading, setIsPrintLoading] = useState(false);

    const [metadata, setMetadata] = useState<Record<string, any>>({});

    useEffect(() => {
        metadataApi.getAllMetadata().then(records => {
            const map: Record<string, any> = {};
            records.forEach(r => {
                map[r.key] = r.value;
            });
            setMetadata(map);
        }).catch(err => console.error("Failed to load metadata in admin tracker details:", err));
    }, []);

    const [isRefetching, setIsRefetching] = useState(false);
    const [refetchSuccess, setRefetchSuccess] = useState(false);

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
                    alert('Please provide a reason for rejection.');
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
            alert(e.message || 'Status update failed.');
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
            )}

            <div className={styles.detailsFormGrid}>
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
                    <button 
                        className={styles.btnPrimary} 
                        style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => setModalState({ type: 'approve' })}
                        disabled={isUpdatingStatus || loading || isEditMode}
                    >
                        <CheckCircle size={16} /> <span className={styles.btnText}>Approve &amp; Lock</span>
                    </button>
                    <button 
                        className={styles.btnSecondary} 
                        style={{ color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => setModalState({ type: 'reject' })}
                        disabled={isUpdatingStatus || loading || isEditMode}
                    >
                        <XCircle size={16} /> <span className={styles.btnText}>Reject</span>
                    </button>
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
                            const res = await pb.send<any>(`/api/admin/print-form`, {
                                method: 'GET',
                                query: { id: individualRecord.id }
                            });
                            if (res) {
                                setPrintPreview(generateIndividualFormHTML(res, metadata.print_template));
                            }
                        } catch (err) {
                            console.error('Failed to fetch print details:', err);
                            alert('Failed to retrieve print details. Please try again.');
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
                        {modalState.type === 'approve' && (
                            <>
                                <h3>Confirm Approval</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px 0' }}>
                                    Are you sure you want to approve this application? This will generate a Participant ID and lock the application.
                                </p>
                            </>
                        )}
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
                        {modalState.type === 'reject' && (
                            <>
                                <h3>Reject Application</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 12px 0' }}>Please provide a reason for rejecting this application.</p>
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder="e.g. Invalid Aadhaar card" 
                                    className={styles.rejectInput}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </>
                        )}
                        <div className={styles.modalActions}>
                            <button className={styles.btnSecondary} onClick={() => setModalState({ type: null })}>Cancel</button>
                            <button 
                                className={modalState.type === 'reject' ? styles.btnSecondary : styles.btnPrimary} 
                                style={modalState.type === 'reject' ? { color: '#ef4444', borderColor: '#ef4444' } : {}}
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
