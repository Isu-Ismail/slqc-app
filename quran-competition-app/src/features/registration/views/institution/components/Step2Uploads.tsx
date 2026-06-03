import { useRef } from 'react';
import styles from '../InstitutionRegisterPage.module.css';

interface Step2UploadsProps {
    docFile: File | null;
    setDocFile: (val: File | null) => void;
    buildingFile: File | null;
    setBuildingFile: (val: File | null) => void;
}

export default function Step2Uploads({
    docFile,
    setDocFile,
    buildingFile,
    setBuildingFile
}: Step2UploadsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const buildingFileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Authenticity Proof (ID Card / Bonafide Certificate) *</label>
                <div className={styles.fileControl}>
                    <input
                        type="file"
                        accept=".pdf,image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setDocFile(e.target.files[0]);
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={styles.btnUpload}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Choose File
                    </button>
                    <span className={styles.fileName}>
                        {docFile ? docFile.name : 'No file selected (PDF/Image)'}
                    </span>
                </div>
                <span className={styles.hint}>Please upload official letterhead bonafide, registration certificate, or institution ID to verify authenticity.</span>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Institution Building Photo *</label>
                <div className={styles.fileControl}>
                    <input
                        type="file"
                        accept="image/*"
                        ref={buildingFileInputRef}
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setBuildingFile(e.target.files[0]);
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={styles.btnUpload}
                        onClick={() => buildingFileInputRef.current?.click()}
                    >
                        Choose Photo
                    </button>
                    <span className={styles.fileName}>
                        {buildingFile ? buildingFile.name : 'No photo selected (Image)'}
                    </span>
                </div>
                <span className={styles.hint}>Please upload a clear photograph of the institution's building front view.</span>
            </div>
        </div>
    );
}
