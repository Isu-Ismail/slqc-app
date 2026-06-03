import React, { useRef } from 'react';
import type { InstitutionsResponse } from '../../../../../api/types';
import styles from '../InstitutionRegisterPage.module.css';

interface TrackTabProps {
    trackQuery: string;
    setTrackQuery: (val: string) => void;
    trackPasscode: string;
    setTrackPasscode: (val: string) => void;
    handleTrack: () => void;
    trackedRecord: InstitutionsResponse | null;
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    loading: boolean;
    editName: string;
    setEditName: (val: string) => void;
    editAddress: string;
    setEditAddress: (val: string) => void;
    editContactPerson: string;
    setEditContactPerson: (val: string) => void;
    editEmail: string;
    setEditEmail: (val: string) => void;
    editWhatsapp: string;
    setEditWhatsapp: (val: string) => void;
    editPhone: string;
    setEditPhone: (val: string) => void;
    editDocFile: File | null;
    setEditDocFile: (val: File | null) => void;
    editBuildingFile: File | null;
    setEditBuildingFile: (val: File | null) => void;
    editLocation: string;
    setEditLocation: (val: string) => void;
    handleUpdate: (e: React.FormEvent) => void;
    getStatusClass: (status: string) => string;
    getDocUrl: (record: InstitutionsResponse) => string;
}

export default function TrackTab({
    trackQuery,
    setTrackQuery,
    trackPasscode,
    setTrackPasscode,
    handleTrack,
    trackedRecord,
    isEditing,
    setIsEditing,
    loading,
    editName,
    setEditName,
    editAddress,
    setEditAddress,
    editContactPerson,
    setEditContactPerson,
    editEmail,
    setEditEmail,
    editWhatsapp,
    setEditWhatsapp,
    editPhone,
    setEditPhone,
    editDocFile,
    setEditDocFile,
    editBuildingFile,
    setEditBuildingFile,
    editLocation,
    setEditLocation,
    handleUpdate,
    getStatusClass,
    getDocUrl
}: TrackTabProps) {
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const editBuildingFileInputRef = useRef<HTMLInputElement>(null);

    const isLinkUrl = (val: string) => {
        return val.startsWith('http://') || val.startsWith('https://');
    };

    return (
        <div>
            <div className={styles.cardHeader}>
                <h2>Track Registration</h2>
                <p>Check the status of your institution's registration request</p>
            </div>

            <div className={styles.searchBox} style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Institution ID or Email</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g. INST-4829 or contact@school.com"
                            value={trackQuery}
                            onChange={(e) => setTrackQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Passcode</label>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="Enter passcode"
                            value={trackPasscode}
                            onChange={(e) => setTrackPasscode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                        />
                    </div>
                    <button
                        type="button"
                        className={styles.btnPrimary}
                        style={{ padding: '12px', width: '100%', borderRadius: '8px' }}
                        onClick={handleTrack}
                        disabled={loading}
                    >
                        {loading ? 'Tracking...' : 'Track Institution Status'}
                    </button>
                </div>
            </div>

            {trackedRecord && (
                <div className={styles.trackDetails} style={{ marginTop: '24px' }}>
                    <div className={styles.trackHeader}>
                        <h3>{isEditing ? 'Edit Institution Details' : trackedRecord.name}</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {(trackedRecord as any).is_locked && (
                                <span style={{ fontSize: '12px', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Locked</span>
                            )}
                            <div className={`${styles.statusBadge} ${getStatusClass(trackedRecord.status)}`}>
                                {trackedRecord.status.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleUpdate} className={styles.form} style={{ marginTop: '12px' }}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Institution Name *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Full Address *</label>
                                <textarea
                                    className={styles.textarea}
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Contact Person Name *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={editContactPerson}
                                    onChange={(e) => setEditContactPerson(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.inputRow}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Email Address *</label>
                                    <input
                                        type="email"
                                        className={styles.input}
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>WhatsApp Number *</label>
                                    <input
                                        type="tel"
                                        className={styles.input}
                                        value={editWhatsapp}
                                        onChange={(e) => setEditWhatsapp(e.target.value.replace(/\D/g, ''))}
                                        maxLength={10}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Phone Number (Optional)</label>
                                <input
                                    type="tel"
                                    className={styles.input}
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Authenticity Proof (ID Card / Bonafide Certificate) - Upload to Replace</label>
                                <div className={styles.fileControl}>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        ref={editFileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setEditDocFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className={styles.btnUpload}
                                        onClick={() => editFileInputRef.current?.click()}
                                    >
                                        Choose File
                                    </button>
                                    <span className={styles.fileName}>
                                        {editDocFile ? editDocFile.name : 'No file selected (Leave empty to keep current)'}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Institution Building Photo - Upload to Replace</label>
                                <div className={styles.fileControl}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={editBuildingFileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setEditBuildingFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className={styles.btnUpload}
                                        onClick={() => editBuildingFileInputRef.current?.click()}
                                    >
                                        Choose Photo
                                    </button>
                                    <span className={styles.fileName}>
                                        {editBuildingFile ? editBuildingFile.name : 'No photo selected (Leave empty to keep current)'}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Institution Google Maps Link *</label>
                                <input
                                    type="url"
                                    className={styles.input}
                                    value={editLocation}
                                    onChange={(e) => setEditLocation(e.target.value)}
                                    placeholder="e.g. https://maps.app.goo.gl/XXXX or https://share.google/..."
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button
                                    type="submit"
                                    className={styles.btnPrimary}
                                    disabled={loading}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnSecondary}
                                    onClick={() => setIsEditing(false)}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className={styles.detailsList}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Institution ID:</span>
                                    <span className={styles.detailVal}>{trackedRecord.institution_id || 'Generating...'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Contact Person:</span>
                                    <span className={styles.detailVal}>{trackedRecord.contact_person}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Official Email:</span>
                                    <span className={styles.detailVal}>{trackedRecord.email}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>WhatsApp No:</span>
                                    <span className={styles.detailVal}>{trackedRecord.whatsapp_number}</span>
                                </div>
                                {trackedRecord.instituition_location && isLinkUrl(trackedRecord.instituition_location) && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Google Maps Link:</span>
                                        <span className={styles.detailVal}>
                                            <a
                                                href={trackedRecord.instituition_location}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.docLink}
                                            >
                                                View Madrasa Location ↗
                                            </a>
                                        </span>
                                    </div>
                                )}
                                {getDocUrl(trackedRecord) !== '#' && (
                                    <div className={styles.detailItem} style={{ marginTop: '12px' }}>
                                        <a
                                            href={getDocUrl(trackedRecord)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.docLink}
                                        >
                                            View Verification Document ↗
                                        </a>
                                    </div>
                                )}
                            </div>

                            {trackedRecord.status === 'pending' && (
                                <div className={styles.pendingNotice}>
                                    Your application is currently being reviewed by our verification committee. You will receive credentials once approved.
                                </div>
                            )}

                            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    className={styles.btnPrimary}
                                    style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                                    onClick={handleTrack}
                                    disabled={loading}
                                >
                                    {loading ? 'Rechecking...' : 'Recheck Status ↻'}
                                </button>
                                {!(trackedRecord as any).is_locked && (
                                    <button
                                        type="button"
                                        className={styles.btnSecondary}
                                        style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Edit Details
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
