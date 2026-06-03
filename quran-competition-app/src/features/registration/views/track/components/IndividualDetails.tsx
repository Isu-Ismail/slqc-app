import { useRef, useState } from 'react';
import { Lock, Edit, Printer } from 'lucide-react';
import type { ParticipantsApplicationResponse } from '../../../../../api/types';
import styles from '../TrackPage.module.css';
import printStyles from './PrintPreviewModal.module.css';
import PrintPreviewModal, { generateIndividualFormHTML } from './PrintPreviewModal';

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
                            {isRefetching ? 'Refetching...' : refetchSuccess ? 'Refetched successfully! ✓' : 'Recheck Status ↻'}
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
                    <label className={styles.formLabel}>Applicant Name</label>
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
                    <label className={styles.formLabel}>Category</label>
                    {isEditMode && !individualRecord.is_locked ? (
                        <select
                            className={styles.formSelect}
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as any)}
                        >
                            <option value="5_juz">5 Juz</option>
                            <option value="15_juz">15 Juz</option>
                            <option value="30_juz">30 Juz</option>
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
                    <label className={styles.formLabel}>Gender</label>
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
                    <label className={styles.formLabel}>Date of Birth</label>
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
                    <label className={styles.formLabel}>WhatsApp Number</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editWhatsapp : individualRecord.whatsapp_number}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditWhatsapp(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Guardian Name</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editGuardianName : individualRecord.guardian_name}
                        disabled={!isEditMode || individualRecord.is_locked}
                        onChange={(e) => setEditGuardianName(e.target.value)}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Guardian Phone</label>
                    <input
                        type="text"
                        className={styles.formInput}
                        value={isEditMode ? editGuardianPhone : individualRecord.guardian_phone}
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

            <div className={printStyles.downloadBar}>
                <button
                    className={printStyles.downloadBtn}
                    onClick={() => setPrintPreview(generateIndividualFormHTML(individualRecord))}
                >
                    <Printer size={15} /> Print Application Form
                </button>
            </div>

            <PrintPreviewModal
                isOpen={!!printPreview}
                onClose={() => setPrintPreview(null)}
                title="Application Form Preview"
                htmlContent={printPreview || ''}
            />
        </div>
    );
}

function checkboxLabelStyle(isEditMode: boolean, isLocked?: boolean) {
    return isEditMode && !isLocked ? styles.checkboxLabel : `${styles.checkboxLabel} ${styles.disabledCheckboxLabel || ''}`;
}
