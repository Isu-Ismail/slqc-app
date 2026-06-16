import { useRef, useState, useEffect } from 'react';
import { Lock, Edit, Printer } from 'lucide-react';
import { pb } from '../../../../../api/db';
import type { ParticipantsApplicationResponse } from '../../../../../api/types';
import { useRegistrationStatus } from '../../../../../shared/context/StatusContext';
import styles from '../TrackPage.module.css';
import { CATEGORIES_CONFIG, getJuzCodesForCategory, getJuzLabel, getCategoryLabel, FORM_FIELDS_CONFIG } from '../../../../../config/fieldsConfig';
import PrintPreviewModal, { generateIndividualFormHTML } from './PrintPreviewModal';

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
    const birthCertFileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [printPreview, setPrintPreview] = useState<string | null>(null);
    const [isPrintLoading, setIsPrintLoading] = useState(false);

    const { metadata } = useRegistrationStatus();

    const [isRefetching, setIsRefetching] = useState(false);
    const [refetchSuccess, setRefetchSuccess] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageObj, setCropImageObj] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    // Canvas redrawing for cropper
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
            alert('Photo size exceeds 1MB limit.');
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
        <>
            {(individualRecord.allocated_venue || individualRecord.allocated_order) && (
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
                            color: individualRecord.arrival_status === 'present' 
                                ? '#047857' 
                                : individualRecord.arrival_status === 'absent' 
                                    ? '#b91c1c' 
                                    : '#1d4ed8', 
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
                                backgroundColor: individualRecord.arrival_status === 'present' 
                                    ? '#10b981' 
                                    : individualRecord.arrival_status === 'absent' 
                                        ? '#ef4444' 
                                        : '#3b82f6' 
                            }}></span>
                            Venue & Sequence Allocation
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
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Allocated Venue & Order</span>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f766e', marginTop: '4px' }}>
                                {individualRecord.allocated_venue ? `${individualRecord.allocated_venue} - ${individualRecord.allocated_order || 'N/A'}` : 'N/A'}
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

                {/* Dynamic fields from config */}
                {FORM_FIELDS_CONFIG.map((field) => {
                    const value = isEditMode ? (editData[field.key] ?? '') : ((individualRecord as any)[field.key] ?? '');
                    const isEditable = field.editable && isEditMode && !individualRecord.is_locked;

                    // Custom renders
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
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={institutionRef.name || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Institution ID</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={institutionRef.institution_id || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Email Address</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={institutionRef.email || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Contact Phone</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={institutionRef.phone_number || institutionRef.whatsapp_number || 'N/A'}
                                    disabled={true}
                                />
                            </div>
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className={styles.formLabel}>Institution Address</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={institutionRef.address || 'N/A'}
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
                                accept="image/*,application/pdf"
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
                                className={styles.btnSecondary}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {editAadhaarFile ? 'Change Selected Aadhaar' : 'Upload New Aadhaar'}
                            </button>
                            {editAadhaarFile && <span className={styles.selectedFileName}>{editAadhaarFile.name}</span>}
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
                                ref={birthCertFileInputRef}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setEditBirthCertificateFile(e.target.files[0]);
                                    }
                                }}
                            />
                            <button 
                                type="button" 
                                className={styles.btnSecondary}
                                onClick={() => birthCertFileInputRef.current?.click()}
                            >
                                {editBirthCertificateFile ? 'Change Selected Certificate' : 'Upload New Certificate'}
                            </button>
                            {editBirthCertificateFile && <span className={styles.selectedFileName}>{editBirthCertificateFile.name}</span>}
                        </div>
                    ) : (
                        <div className={styles.filePreviewWrapper}>
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>No Birth Certificate Uploaded</span>
                        </div>
                    )}
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.formLabel}>Passport-size Candidate Photo</label>
                    {!isEditMode && individualRecord.candidate_photo ? (
                        <div className={styles.filePreviewWrapper}>
                            <a 
                                href={getCandidatePhotoUrl(individualRecord)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={styles.previewLink}
                            >
                                View Uploaded Candidate Photo ↗
                            </a>
                        </div>
                    ) : isEditMode && !individualRecord.is_locked ? (
                        <div className={styles.fileUploadControl}>
                            <input
                                type="file"
                                accept="image/*"
                                ref={photoInputRef}
                                style={{ display: 'none' }}
                                onChange={(e) => e.target.files && handlePhotoSelect(e.target.files[0])}
                            />
                            <button 
                                type="button" 
                                className={styles.btnSecondary}
                                onClick={() => photoInputRef.current?.click()}
                            >
                                {editCandidatePhotoFile ? 'Change Selected Photo' : 'Upload New Photo'}
                            </button>
                            {editCandidatePhotoFile && <span className={styles.selectedFileName}>{editCandidatePhotoFile.name}</span>}
                        </div>
                    ) : (
                        <div className={styles.filePreviewWrapper}>
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>No Photo Uploaded</span>
                        </div>
                    )}
                </div>
            </div>

            {isEditMode && !individualRecord.is_locked && (
                <div className={styles.detailsActions} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={() => setIsEditMode(false)}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={handleSaveIndividualChanges}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}

            {!isEditMode && !individualRecord.is_locked && (
                <div className={styles.detailsActions} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={() => setIsEditMode(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Edit size={16} /> {individualRecord.status === 'rejected' ? 'Edit & Reapply' : 'Edit Application Details'}
                    </button>
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
                                const res = await pb.send<any>(`/api/public/print-form`, {
                                    method: 'GET',
                                    query: { id: individualRecord.id, dob }
                                });
                                
                                const tplRecord = metadata?._application_print_template_record;
                                let customTemplateHtml = '';
                                if (tplRecord && tplRecord.document) {
                                    try {
                                        const tplUrl = pb.files.getURL(tplRecord, tplRecord.document);
                                        const tplRes = await fetch(tplUrl);
                                        if (tplRes.ok) {
                                            customTemplateHtml = await tplRes.text();
                                        }
                                    } catch (e) {
                                        console.error('Failed to fetch custom template:', e);
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

                                if (res) {
                                    setPrintPreview(generateIndividualFormHTML(res, customTemplateHtml || undefined));
                                }
                            } catch (err) {
                                console.error('Failed to fetch print details:', err);
                                alert('Failed to retrieve print details. Please try again.');
                            } finally {
                                setIsPrintLoading(false);
                            }
                        }}
                        disabled={isPrintLoading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Printer size={16} /> {isPrintLoading ? 'Loading Form...' : 'Print Registration Card'}
                    </button>
                </div>
            )}

            {printPreview && (
                <PrintPreviewModal 
                    isOpen={true} 
                    onClose={() => {
                        setPrintPreview(null);
                    }} 
                    title="Print Registration Card"
                    htmlContent={printPreview}
                />
            )}

            {/* Photo Cropper Modal Overlay */}
            {showCropper && (
                <div className={styles.cropperOverlay}>
                    <div className={styles.cropperModal}>
                        <div className={styles.cropperHeader}>
                            <h3>Edit & Crop Photo</h3>
                            <button className={styles.closeBtn} onClick={() => setShowCropper(false)}>×</button>
                        </div>
                        <div className={styles.cropperBody}>
                            <p className={styles.cropperDesc}>Drag the image inside the box to adjust position. Use controls below to zoom and rotate.</p>
                            
                            <div className={styles.canvasContainer}>
                                <canvas
                                    ref={canvasRef}
                                    width={300}
                                    height={300}
                                    className={styles.cropperCanvas}
                                    onMouseDown={handlePointerDown}
                                    onMouseMove={handlePointerMove}
                                    onMouseUp={handlePointerUp}
                                    onMouseLeave={handlePointerUp}
                                    onTouchStart={handlePointerDown}
                                    onTouchMove={handlePointerMove}
                                    onTouchEnd={handlePointerUp}
                                />
                            </div>

                            {/* Editor Controls */}
                            <div className={styles.controlsRow}>
                                <label className={styles.controlLabel}>Zoom:</label>
                                <input
                                    type="range"
                                    min="1.0"
                                    max="3.0"
                                    step="0.05"
                                    value={zoom}
                                    className={styles.rangeInput}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                />
                                <span className={styles.zoomVal}>{Math.round(zoom * 100)}%</span>
                            </div>

                            <div className={styles.controlsButtons}>
                                <button
                                    type="button"
                                    className={styles.btnTool}
                                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                                >
                                    🔄 Rotate 90°
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnTool}
                                    onClick={() => {
                                        setZoom(1.0);
                                        setRotation(0);
                                        setPanX(0);
                                        setPanY(0);
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                        <div className={styles.cropperFooter}>
                            <button type="button" className={styles.cancelBtn} onClick={() => setShowCropper(false)}>
                                Cancel
                            </button>
                            <button type="button" className={styles.saveBtn} onClick={handleCropApply}>
                                Crop & Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}
