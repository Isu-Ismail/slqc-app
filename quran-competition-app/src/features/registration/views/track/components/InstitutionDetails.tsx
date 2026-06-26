import { useRef, useState } from 'react';
import { Lock, Edit, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { pb } from '../../../../../api/db';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../../../../api/types';
import styles from '../TrackPage.module.css';
import printStyles from './PrintPreviewModal.module.css';
import PrintPreviewModal, { generateAllFormsHTML } from './PrintPreviewModal';
import { useRegistrationStatus } from '../../../../../shared/context/StatusContext';

interface InstitutionDetailsProps {
    institutionData: {
        institution: InstitutionsResponse | null;
        applications: ParticipantsApplicationResponse[];
    };
    isInstEditMode: boolean;
    setIsInstEditMode: (val: boolean) => void;

    // Updated structured fields
    instEditName: string; setInstEditName: (val: string) => void;
    instEditStreet: string; setInstEditStreet: (val: string) => void;
    instEditPincode: string; setInstEditPincode: (val: string) => void;
    instEditState: string; setInstEditState: (val: string) => void;
    instEditDistrict: string; setInstEditDistrict: (val: string) => void;
    instEditVillage: string; setInstEditVillage: (val: string) => void;

    instEditContactPerson: string; setInstEditContactPerson: (val: string) => void;
    instEditEmail: string; setInstEditEmail: (val: string) => void;
    instEditWhatsapp: string; setInstEditWhatsapp: (val: string) => void;
    instEditPhone: string; setInstEditPhone: (val: string) => void;
    instEditDocFile: File | null; setInstEditDocFile: (val: File | null) => void;
    instEditLocation: string; setInstEditLocation: (val: string) => void;
    instEditBuildingFile: File | null; setInstEditBuildingFile: (val: File | null) => void;

    isMinimized: boolean; setIsMinimized: (val: boolean) => void;
    handleSaveInstitutionChanges: () => void;
    loading: boolean;
    getStatusClass: (status: string) => string;
    onViewIndividual: (app: ParticipantsApplicationResponse) => void;
    onDeleteIndividual: (app: ParticipantsApplicationResponse) => void;
    onRefresh?: () => Promise<boolean>;
}

export default function InstitutionDetails(props: InstitutionDetailsProps) {
    const {
        institutionData, isInstEditMode, setIsInstEditMode, instEditName, setInstEditName,
        instEditStreet, setInstEditStreet, instEditPincode, setInstEditPincode,
        instEditState, setInstEditState, instEditDistrict, setInstEditDistrict,
        instEditVillage, setInstEditVillage, instEditContactPerson, setInstEditContactPerson,
        instEditEmail, setInstEditEmail, instEditWhatsapp, setInstEditWhatsapp,
        instEditPhone, setInstEditPhone, instEditDocFile, setInstEditDocFile,
        instEditLocation, setInstEditLocation, instEditBuildingFile, setInstEditBuildingFile,
        isMinimized, setIsMinimized, handleSaveInstitutionChanges, loading,
        getStatusClass, onViewIndividual, onDeleteIndividual, onRefresh
    } = props;

    const instFileInputRef = useRef<HTMLInputElement>(null);
    const instBuildingFileInputRef = useRef<HTMLInputElement>(null);
    const [printPreview, setPrintPreview] = useState<{ title: string; html: string } | null>(null);
    const { metadata } = useRegistrationStatus();

    const [isRefetching, setIsRefetching] = useState(false);
    const [refetchSuccess, setRefetchSuccess] = useState(false);

    const getFileUrl = (recordId: string, filename: string) => {
        // PocketBase file URL structure: /api/files/collectionName/recordId/filename
        return `${import.meta.env.VITE_PB_URL}/api/files/institutions/${recordId}/${filename}`;
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
                            {!isInstEditMode && institutionData.institution?.document ? (
                                <div className={styles.filePreviewWrapper}>
                                    <a
                                        href={getFileUrl(institutionData.institution.id, institutionData.institution.document)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.previewLink}
                                        style={{ fontSize: '13px' }}
                                    >
                                        View Bonafide / ID ↗
                                    </a>
                                </div>
                            ) : isInstEditMode && !institutionData.institution?.is_locked ? (
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
                            ) : (
                                <div className={styles.filePreviewWrapper}>
                                    <span className={styles.fileName} style={{ fontSize: '12px' }}>Not provided</span>
                                </div>
                            )}
                        </div>
                        {/* 300 */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Building Proof Photo</label>
                            {!isInstEditMode && institutionData.institution?.instituition_building_proof ? (
                                <div className={styles.filePreviewWrapper}>
                                    <a
                                        href={getFileUrl(institutionData.institution.id, institutionData.institution.instituition_building_proof)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.previewLink}
                                    >
                                        View Building Photo ↗
                                    </a>
                                </div>
                            ) : isInstEditMode && !institutionData.institution?.is_locked ? (
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
                            ) : (
                                <div className={styles.filePreviewWrapper}>
                                    <span className={styles.fileName} style={{ fontSize: '12px' }}>Not provided</span>
                                </div>
                            )}
                        </div>


                        {/* Row 1: 50/50 */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Street Address</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditStreet : (institutionData.institution?.street_address || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditStreet(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Pincode</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditPincode : (institutionData.institution?.pincode || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditPincode(e.target.value)}
                            />
                        </div>

                        {/* Row 2: 50/50 */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>District</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditDistrict : (institutionData.institution?.district_name || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditDistrict(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>Village / Locality</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditVillage : (institutionData.institution?.village_name || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
                                onChange={(e) => setInstEditVillage(e.target.value)}
                            />
                        </div>

                        {/* Row 3: Full Width */}
                        <div className={styles.formGroup} style={{ gridColumn: 'span 1' }}>
                            <label className={styles.formLabel} style={{ fontSize: '11px', marginBottom: '2px' }}>State</label>
                            <input
                                type="text" className={styles.formInput}
                                value={isInstEditMode ? instEditState : (institutionData.institution?.state_name || '')}
                                disabled={!isInstEditMode || institutionData.institution?.is_locked}
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
                                        disabled={loading || !(
                                            (instEditName || '').toString().trim() !== (institutionData.institution?.name || '').toString().trim() ||
                                            (instEditStreet || '').toString().trim() !== (institutionData.institution?.street_address || '').toString().trim() ||
                                            (instEditPincode || '').toString().trim() !== (institutionData.institution?.pincode || '').toString().trim() ||
                                            (instEditState || '').toString().trim() !== (institutionData.institution?.state_name || '').toString().trim() ||
                                            (instEditDistrict || '').toString().trim() !== (institutionData.institution?.district_name || '').toString().trim() ||
                                            (instEditVillage || '').toString().trim() !== (institutionData.institution?.village_name || '').toString().trim() ||
                                            (instEditContactPerson || '').toString().trim() !== (institutionData.institution?.contact_person || '').toString().trim() ||
                                            (instEditEmail || '').toString().trim() !== (institutionData.institution?.email || '').toString().trim() ||
                                            (instEditWhatsapp || '').toString().trim() !== (institutionData.institution?.whatsapp_number || '').toString().trim() ||
                                            (instEditPhone || '').toString().trim() !== (institutionData.institution?.phone_number || '').toString().trim() ||
                                            (instEditLocation || '').toString().trim() !== (institutionData.institution?.instituition_location || '').toString().trim() ||
                                            instEditDocFile !== null ||
                                            instEditBuildingFile !== null
                                        )}
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
                                        const res = await pb.send<any>(`/api/public/print-institution-students`, {
                                            method: 'GET',
                                            query: { id: institutionData.institution.id }
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
                                <FileText size={13} /> Print All Application Forms
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
                                            <button
                                                className={styles.tableActionBtn}
                                                style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' }}
                                                onClick={() => onDeleteIndividual(app)}
                                            >
                                                Delete
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
        </div>
    );
}
