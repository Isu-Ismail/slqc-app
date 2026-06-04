// src/features/registration/components/Step3Upload.tsx
import { useState, useRef, useEffect } from 'react';
import type { RegistrationFormData } from '../views/register/RegisterPage';
import { useRegistrationStatus } from '../../../shared/context/StatusContext';
import styles from './Step3Upload.module.css';

interface Step3Props {
    formData: RegistrationFormData;
    updateForm: <K extends keyof RegistrationFormData>(field: K, value: RegistrationFormData[K]) => void;
    rulesAccepted: boolean;
    setRulesAccepted: (val: boolean) => void;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export default function Step3Upload({ formData, updateForm, rulesAccepted, setRulesAccepted }: Step3Props) {
    const { metadata } = useRegistrationStatus();
    const [showRulesModal, setShowRulesModal] = useState(false);

    const aadhaarInputRef = useRef<HTMLInputElement | null>(null);
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [aadhaarError, setAadhaarError] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);

    // Cropper States
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageObj, setCropImageObj] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Handle Aadhaar Previews
    useEffect(() => {
        if (!formData.aadhaar_front) {
            setAadhaarPreview(null);
            return;
        }
        if (formData.aadhaar_front.type.startsWith('image/')) {
            const url = URL.createObjectURL(formData.aadhaar_front);
            setAadhaarPreview(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setAadhaarPreview(null);
        }
    }, [formData.aadhaar_front]);

    // Handle Photo Previews
    useEffect(() => {
        if (!formData.candidate_photo) {
            setPhotoPreview(null);
            return;
        }
        const url = URL.createObjectURL(formData.candidate_photo);
        setPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [formData.candidate_photo]);

    // Canvas redrawing for cropper
    useEffect(() => {
        if (!showCropper || !cropImageObj || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and fill dark/gray background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Translate to center to zoom and rotate
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        // Apply panning offsets
        ctx.translate(panX, panY);

        // Draw image centered
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

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // vertical
        ctx.moveTo(canvas.width / 3, 10); ctx.lineTo(canvas.width / 3, canvas.height - 10);
        ctx.moveTo((canvas.width / 3) * 2, 10); ctx.lineTo((canvas.width / 3) * 2, canvas.height - 10);
        // horizontal
        ctx.moveTo(10, canvas.height / 3); ctx.lineTo(canvas.width - 10, canvas.height / 3);
        ctx.moveTo(10, (canvas.height / 3) * 2); ctx.lineTo(canvas.width - 10, (canvas.height / 3) * 2);
        ctx.stroke();

    }, [showCropper, cropImageObj, zoom, rotation, panX, panY]);

    const handleAadhaarChange = (file: File | null) => {
        setAadhaarError(null);
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setAadhaarError('Aadhaar size exceeds 1MB limit.');
            return;
        }
        updateForm('aadhaar_front', file);
    };

    const handlePhotoSelect = (file: File | null) => {
        setPhotoError(null);
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setPhotoError('Photo size exceeds 1MB limit.');
            return;
        }

        // Initialize editor
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
                    updateForm('candidate_photo', file);
                    setShowCropper(false);
                }
            },
            'image/jpeg',
            0.9
        );
    };

    // Canvas Mouse/Touch Panning
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

    const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const sizes = ['B', 'KB', 'MB'];
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={styles.stepContainer}>
            {/* 1. AGE VERIFICATION DOCUMENT UPLOAD */}
            <div className={styles.uploadBlock}>
                <div>
                    <h3 className={styles.stepTitle}>Age Verification Document *</h3>
                    <p className={styles.stepDesc}>Upload a clear scanned copy of your Birth Certificate, Aadhaar Card, or Passport.</p>
                </div>

                {aadhaarError && <div className={styles.errorBox}>{aadhaarError}</div>}

                <input
                    type="file"
                    ref={aadhaarInputRef}
                    className={styles.fileInput}
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files && handleAadhaarChange(e.target.files[0])}
                />

                {!formData.aadhaar_front ? (
                    <div className={styles.dropzone} onClick={() => aadhaarInputRef.current?.click()}>
                        <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className={styles.uploadText}>Upload Document</span>
                        <span className={styles.uploadHint}>Supports PNG, JPG, JPEG, or PDF (Max 1MB)</span>
                    </div>
                ) : (
                    <div className={styles.previewContainer}>
                        <div className={styles.previewHeader}>
                            <div className={styles.fileInfo}>
                                <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <div className={styles.fileNameDetails}>
                                    <span className={styles.fileName}>{formData.aadhaar_front.name}</span>
                                    <span className={styles.fileSize}>{formatSize(formData.aadhaar_front.size)}</span>
                                </div>
                            </div>
                            <button type="button" className={styles.removeBtn} onClick={() => updateForm('aadhaar_front', null)}>
                                Remove
                            </button>
                        </div>
                        {aadhaarPreview ? (
                            <div className={styles.imagePreviewWrapper}>
                                <img src={aadhaarPreview} alt="Aadhaar Preview" className={styles.imagePreview} />
                            </div>
                        ) : (
                            <div className={styles.imagePreviewWrapper} style={{ padding: '16px', fontSize: '13px' }}>
                                PDF uploaded successfully (preview unavailable)
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. PASSPORT PHOTO UPLOAD */}
            <div className={styles.uploadBlock} style={{ marginTop: '24px' }}>
                <div>
                    <h3 className={styles.stepTitle}>Passport Size Photo *</h3>
                    <p className={styles.stepDesc}>Upload a recent formal photo. You can crop, rotate, and zoom your photo after choosing it.</p>
                </div>

                {photoError && <div className={styles.errorBox}>{photoError}</div>}

                <input
                    type="file"
                    ref={photoInputRef}
                    className={styles.fileInput}
                    accept="image/*"
                    onChange={(e) => e.target.files && handlePhotoSelect(e.target.files[0])}
                />

                {!formData.candidate_photo ? (
                    <div className={styles.dropzone} onClick={() => photoInputRef.current?.click()}>
                        <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span className={styles.uploadText}>Upload Passport Photo</span>
                        <span className={styles.uploadHint}>Supports PNG, JPG, JPEG (Max 1MB)</span>
                    </div>
                ) : (
                    <div className={styles.previewContainer}>
                        <div className={styles.previewHeader}>
                            <div className={styles.fileInfo}>
                                <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 8v8M8 12h8" />
                                </svg>
                                <div className={styles.fileNameDetails}>
                                    <span className={styles.fileName}>{formData.candidate_photo.name}</span>
                                    <span className={styles.fileSize}>{formatSize(formData.candidate_photo.size)}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" className={styles.editBtn} onClick={() => handlePhotoSelect(formData.candidate_photo)}>
                                    Edit
                                </button>
                                <button type="button" className={styles.removeBtn} onClick={() => updateForm('candidate_photo', null)}>
                                    Remove
                                </button>
                            </div>
                        </div>
                        {photoPreview && (
                            <div className={styles.imagePreviewWrapper} style={{ width: '150px', height: '150px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden' }}>
                                <img src={photoPreview} alt="Candidate Preview" className={styles.imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3. PHOTO EDITING CROPPER MODAL OVERLAY */}
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
            
            {/* Guidelines & Rules Acceptance Block */}
            <div className={styles.rulesCheckboxBlock} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>Guidelines & Regulations</span>
                    <button 
                        type="button" 
                        id="btn-read-individual-rules"
                        onClick={() => setShowRulesModal(true)} 
                        className={styles.btnTool}
                        style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none' }}
                    >
                        View Guidelines
                    </button>
                </div>
                
                <label className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-h)', fontWeight: '500', marginTop: '4px' }}>
                    <input 
                        type="checkbox" 
                        id="accept-individual-rules"
                        checked={rulesAccepted} 
                        onChange={(e) => setRulesAccepted(e.target.checked)} 
                        style={{ marginTop: '3px' }}
                    />
                    <span>
                        I accept the Rules & Regulations and Privacy Policy of the competition.
                    </span>
                </label>
            </div>

            {showRulesModal && (
                <div className={styles.cropperOverlay}>
                    <div className={styles.cropperModal} style={{ maxWidth: '600px', height: '80vh' }}>
                        <div className={styles.cropperHeader}>
                            <h3>Rules & Regulations</h3>
                            <button className={styles.closeBtn} onClick={() => setShowRulesModal(false)}>×</button>
                        </div>
                        <div className={styles.cropperBody} style={{ flex: 1, overflowY: 'auto', alignItems: 'stretch', padding: '20px', display: 'block' }}>
                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
                                {metadata.individual_rules || 'Loading rules & regulations...'}
                            </div>
                        </div>
                        <div className={styles.cropperFooter} style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" className={styles.cancelBtn} onClick={() => setShowRulesModal(false)}>
                                Close
                            </button>
                            {!rulesAccepted && (
                                <button 
                                    type="button" 
                                    className={styles.saveBtn} 
                                    onClick={() => {
                                        setRulesAccepted(true);
                                        setShowRulesModal(false);
                                    }}
                                >
                                    I Accept Rules
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
