import { useRef, useState, useEffect, useMemo } from 'react';
import { Lock, Edit, Printer, CheckCircle, XCircle, Unlock, RefreshCw } from 'lucide-react';
import { adminTrackApi } from '../../../api/track';
import type { ParticipantsApplicationResponse } from '../../../api/track';
import { metadataApi } from '../../../api/metadata';
import { checkAgeEligibility } from '../../../shared/utils/ageChecker';
import styles from '../TrackPage.module.css';
import printStyles from './PrintPreviewModal.module.css';
import PrintPreviewModal from './PrintPreviewModal';
import { generateIndividualFormHTML } from './printTemplates';

interface IndividualDetailsProps {
    individualRecord: ParticipantsApplicationResponse;
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    editName: string;
    setEditName: (val: string) => void;
    editCategory: '5_juz' | '15_juz' | '30_juz' | '';
    setEditCategory: (val: '5_juz' | '15_juz' | '30_juz' | '') => void;
    editGender: 'male' | 'female';
    setEditGender: (val: 'male' | 'female') => void;
    editDob: string;
    setEditDob: (val: string) => void;
    editEmail: string;
    setEditEmail: (val: string) => void;
    editWhatsapp: string;
    setEditWhatsapp: (val: string) => void;
    editFatherName: string;
    setEditFatherName: (val: string) => void;
    editFatherNumber: string;
    setEditFatherNumber: (val: string) => void;
    editGuardianName: string;
    setEditGuardianName: (val: string) => void;
    editGuardianPhone: string;
    setEditGuardianPhone: (val: string) => void;
    editRequiresAcc: boolean;
    setEditRequiresAcc: (val: boolean) => void;
    editAadhaarFile: File | null;
    setEditAadhaarFile: (val: File | null) => void;
    editCandidatePhotoFile: File | null;
    setEditCandidatePhotoFile: (val: File | null) => void;
    handleSaveIndividualChanges: () => void;
    loading: boolean;
    getStatusClass: (status: string) => string;
    getAadhaarUrl: (record: ParticipantsApplicationResponse) => string;
    getCandidatePhotoUrl: (record: ParticipantsApplicationResponse) => string;
    onRefresh?: () => Promise<boolean>;
}

export default function IndividualDetails({
    individualRecord,
    isEditMode,
    setIsEditMode,
    editName,
    setEditName,
    editCategory,
    setEditCategory,
    editGender,
    setEditGender,
    editDob,
    setEditDob,
    editEmail,
    setEditEmail,
    editWhatsapp,
    setEditWhatsapp,
    editFatherName,
    setEditFatherName,
    editFatherNumber,
    setEditFatherNumber,
    editGuardianName,
    setEditGuardianName,
    editGuardianPhone,
    setEditGuardianPhone,
    editRequiresAcc,
    setEditRequiresAcc,
    editAadhaarFile,
    setEditAadhaarFile,
    editCandidatePhotoFile,
    setEditCandidatePhotoFile,
    handleSaveIndividualChanges,
    loading,
    getStatusClass,
    getAadhaarUrl,
    getCandidatePhotoUrl,
    onRefresh
}: IndividualDetailsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [printPreview, setPrintPreview] = useState<string | null>(null);

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

    const eventDate = metadata.event_date;
    const ageCriteria = metadata.event_age_criteria;
    const ageBuffer = metadata.age_buffer_months !== undefined ? Number(metadata.age_buffer_months) : 3;

    const eligibility = useMemo(() => {
        return checkAgeEligibility(
            editDob,
            eventDate,
            ageCriteria || {
                '5_juz': { min: 0, max: 15 },
                '15_juz': { min: 0, max: 19 },
                '30_juz': { min: 0, max: 25 }
            },
            ageBuffer
        );
    }, [editDob, eventDate, ageCriteria, ageBuffer]);

    // Clear category if invalid for newly selected DOB
    useEffect(() => {
        if (isEditMode && editDob && editCategory && eventDate) {
            const currentEligibility = eligibility[editCategory];
            if (currentEligibility && !currentEligibility.eligible) {
                setEditCategory('');
                alert(`Category cleared! Selected Juz is ineligible for this Date of Birth: ${currentEligibility.message}`);
            }
        }
    }, [editDob, editCategory, eligibility, isEditMode, setEditCategory, eventDate]);

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

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [modalState, setModalState] = useState<{ type: 'approve' | 'reject' | 'lock' | 'unlock' | null }>({ type: null });
    const [rejectReason, setRejectReason] = useState('');

    const submitAction = async () => {
        setIsUpdatingStatus(true);
        try {
            if (modalState.type === 'approve') {
                await adminTrackApi.updateStatusAndLock(individualRecord.id, 'individual', 'approved', true);
            } else if (modalState.type === 'reject') {
                if (!rejectReason.trim()) {
                    alert("Rejection reason is required.");
                    setIsUpdatingStatus(false);
                    return;
                }
                await adminTrackApi.updateStatusAndLock(individualRecord.id, 'individual', 'rejected', true, rejectReason.trim());
            } else if (modalState.type === 'lock') {
                await adminTrackApi.updateStatusAndLock(individualRecord.id, 'individual', individualRecord.status, true, individualRecord.rejection_reason);
            } else if (modalState.type === 'unlock') {
                await adminTrackApi.updateStatusAndLock(individualRecord.id, 'individual', individualRecord.status, false, individualRecord.rejection_reason);
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
        <div className={styles.detailsCard}>
            <div className={styles.detailsHeader}>
                <h3>Application Details</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                            {isRefetching ? <RefreshCw size={14} className={styles.spin} /> : refetchSuccess ? '✓' : (
                                <>
                                    <RefreshCw size={14} /> <span className={styles.btnText}>Recheck Status</span>
                                </>
                            )}
                        </button>
                    )}
                    <div className={`${styles.statusBadge} ${getStatusClass(individualRecord.status)}`}>
                        {individualRecord.status.toUpperCase()}
                    </div>
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

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Applicant Name {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editName : individualRecord.full_name}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditName(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Aadhaar Number</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={individualRecord.aadhaar_number}
                        disabled={true}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Category {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    {isEditMode && !individualRecord.is_locked ? (
                        <select
                            className={styles.formSelect}
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as any)}
                        >
                            <option value="">Select Category</option>
                            <option value="5_juz" disabled={editDob ? !eligibility['5_juz'].eligible : false}>
                                5 Juz {editDob && !eligibility['5_juz'].eligible && `(${eligibility['5_juz'].message})`}
                            </option>
                            <option value="15_juz" disabled={editDob ? !eligibility['15_juz'].eligible : false}>
                                15 Juz {editDob && !eligibility['15_juz'].eligible && `(${eligibility['15_juz'].message})`}
                            </option>
                            <option value="30_juz" disabled={editDob ? !eligibility['30_juz'].eligible : false}>
                                30 Juz {editDob && !eligibility['30_juz'].eligible && `(${eligibility['30_juz'].message})`}
                            </option>
                        </select>
                    ) : (
                        <input
                            type="text"
                            className={styles.formInput}
                            value={individualRecord.category.replace('_', ' ')}
                            disabled={true}
                        />
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Gender {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    {isEditMode && !individualRecord.is_locked ? (
                        <select
                            className={styles.formSelect}
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value as any)}
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    ) : (
                        <input
                            type="text"
                            className={styles.formInput}
                            value={individualRecord.gender}
                            disabled={true}
                        />
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Date of Birth {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <input
                        type="date"
                        className={styles.formInput}
                        value={isEditMode ? editDob : (individualRecord.dob ? individualRecord.dob.substring(0,10) : '')}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditDob(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email</label>
                    <input
                        type="email"
                        className={styles.formInput}
                        placeholder="N/A"
                        value={isEditMode ? editEmail : (individualRecord.email || '')}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditEmail(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>WhatsApp Number {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editWhatsapp : individualRecord.whatsapp_number}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditWhatsapp(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Father Name {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editFatherName : (individualRecord.father_name || '')}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditFatherName(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Father Phone (Optional)</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editFatherNumber : (individualRecord.father_number || '')}
                        placeholder="N/A"
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditFatherNumber(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Guardian Name {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editGuardianName : (individualRecord.guardian_name || '')}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditGuardianName(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Guardian Phone {isEditMode && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editGuardianPhone : (individualRecord.guardian_phone || '')}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditGuardianPhone(e.target.value)}
                    />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidthCheckbox}`}>
                    <label className={checkboxLabelStyle(isEditMode, individualRecord.is_locked)}>
                        <input
                            type="checkbox"
                            checked={isEditMode ? editRequiresAcc : !!individualRecord.requires_accommodation}
                            disabled={!isEditMode || individualRecord.is_locked}
                            onChange={(e) => setEditRequiresAcc(e.target.checked)}
                        />
                        <span>Requires Accommodation</span>
                    </label>
                </div>

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
                    <div className={styles.filePreviewWrapper}>
                        {!isEditMode && individualRecord.aadhaar_front && (
                            <a 
                                href={getAadhaarUrl(individualRecord)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={styles.previewLink}
                            >
                                View Uploaded Aadhaar Image ↗
                            </a>
                        )}
                        
                        {isEditMode && !individualRecord.is_locked && (
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
                        )}
                    </div>
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.formLabel}>Passport Size Photo</label>
                    <div className={styles.filePreviewWrapper}>
                        {!isEditMode && individualRecord.candidate_photo && (
                            <a 
                                href={getCandidatePhotoUrl(individualRecord)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={styles.previewLink}
                            >
                                View Uploaded Passport Photo ↗
                            </a>
                        )}
                        
                        {isEditMode && !individualRecord.is_locked && (
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
                        )}
                    </div>
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
                                    disabled={loading || !(
                                        (editName || '').toString().trim() !== (individualRecord.full_name || '').toString().trim() ||
                                        (editCategory || '').toString().trim() !== (individualRecord.category || '').toString().trim() ||
                                        (editGender || '').toString().trim() !== (individualRecord.gender || 'male').toString().trim() ||
                                        (editDob || '').toString().trim() !== (individualRecord.dob ? individualRecord.dob.split(' ')[0] : '').toString().trim() ||
                                        (editEmail || '').toString().trim() !== (individualRecord.email || '').toString().trim() ||
                                        (editWhatsapp || '').toString().trim() !== (individualRecord.whatsapp_number || '').toString().trim() ||
                                        (editFatherName || '').toString().trim() !== (individualRecord.father_name || '').toString().trim() ||
                                        (editFatherNumber || '').toString().trim() !== (individualRecord.father_number || '').toString().trim() ||
                                        (editGuardianName || '').toString().trim() !== (individualRecord.guardian_name || '').toString().trim() ||
                                        (editGuardianPhone || '').toString().trim() !== (individualRecord.guardian_phone || '').toString().trim() ||
                                        (!!editRequiresAcc) !== (!!individualRecord.requires_accommodation) ||
                                        editAadhaarFile !== null ||
                                        editCandidatePhotoFile !== null
                                    )}
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
                    onClick={() => setPrintPreview(generateIndividualFormHTML(individualRecord))}
                >
                    <Printer size={15} /> <span className={styles.btnText}>Print Application Form</span>
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

function checkboxLabelStyle(isEditMode: boolean, isLocked?: boolean) {
    return isEditMode && !isLocked ? styles.checkboxLabel : `${styles.checkboxLabel} ${styles.disabledCheckboxLabel || ''}`;
}
