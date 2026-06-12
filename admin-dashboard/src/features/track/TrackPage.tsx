import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminTrackApi } from '../../api/track';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../api/track';
import ConfirmModal from '../../shared/components/Modal/ConfirmModal';
import { Search } from 'lucide-react';
import styles from './TrackPage.module.css';
import IndividualDetails from './components/IndividualDetails';
import InstitutionDetails from './components/InstitutionDetails';
import { FORM_FIELDS_CONFIG, getJuzCodesForCategory, JUZ_OPTIONS } from '../../config/fieldsConfig';
import { pb } from '../../api/db';
import { useIndividualRealtime, useInstitutionRealtime } from '../../realtime/track';

const isValidGoogleMapsLink = (url: string): boolean => {
    try {
        const trimmed = url.trim();
        if (!trimmed) return false;
        const pattern = /^(https?:\/\/)?(www\.)?(google\.[a-z]+(\.[a-z]+)?\/maps|maps\.google\.[a-z]+|maps\.app\.goo\.gl|goo\.gl\/maps|share\.google)/i;
        return pattern.test(trimmed);
    } catch {
        return false;
    }
};

const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
        return 'https://' + trimmed;
    }
    return trimmed;
};

export default function TrackPage() {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'individual' | 'institution'>('individual');
    
    // Search Inputs (No DOB or Passcode needed for admin)
    const [individualQuery, setIndividualQuery] = useState('');
    const [institutionQuery, setInstitutionQuery] = useState('');
    
    // States
    const [loading, setLoading] = useState(false);
    const [individualRecord, setIndividualRecord] = useState<ParticipantsApplicationResponse | null>(null);
    const [institutionData, setInstitutionData] = useState<{
        institution: InstitutionsResponse | null;
        applications: ParticipantsApplicationResponse[];
    } | null>(null);

    // Edit Form States
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<Record<string, any>>({});
    const [editAadhaarFile, setEditAadhaarFile] = useState<File | null>(null);
    const [editBirthCertificateFile, setEditBirthCertificateFile] = useState<File | null>(null);
    const [editCandidatePhotoFile, setEditCandidatePhotoFile] = useState<File | null>(null);

    const updateEditField = (key: string, value: any) => {
        setEditData(prev => ({ ...prev, [key]: value }));
    };

    const initializeEditData = (record: any) => {
        const data: Record<string, any> = {};
        FORM_FIELDS_CONFIG.forEach(field => {
            let val = (record as any)[field.key];
            if (field.type === 'date' && val) {
                val = val.split(' ')[0];
            }
            if (field.key === 'juz_options' && !val) {
                const matched = JUZ_OPTIONS.find(o => o.label === record.selected_juz);
                if (matched) {
                    val = matched.code;
                }
            }
            data[field.key] = val || '';
        });
        setEditData(data);
        setEditAadhaarFile(null);
        setEditBirthCertificateFile(null);
        setEditCandidatePhotoFile(null);
    };

    // Institution Edit Form States
    const [isInstEditMode, setIsInstEditMode] = useState(false);
    const [instEditName, setInstEditName] = useState('');
    const [instEditAddress, setInstEditAddress] = useState('');
    const [instEditContactPerson, setInstEditContactPerson] = useState('');
    const [instEditEmail, setInstEditEmail] = useState('');
    const [instEditWhatsapp, setInstEditWhatsapp] = useState('');
    const [instEditPhone, setInstEditPhone] = useState('');
    const [instEditDocFile, setInstEditDocFile] = useState<File | null>(null);
    const [instEditLocation, setInstEditLocation] = useState('');
    const [instEditBuildingFile, setInstEditBuildingFile] = useState<File | null>(null);
    const [isInstMinimized, setIsInstMinimized] = useState(() => {
        return localStorage.getItem('admin_track_inst_minimized') === 'true';
    });

    const handleSetIsInstMinimized = (val: boolean) => {
        setIsInstMinimized(val);
        localStorage.setItem('admin_track_inst_minimized', String(val));
    };

    // Alert Modal state (using ConfirmModal)
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'confirm' | 'alert' | 'success';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert'
    });

    const CACHE_TTL = 300000; // 5 minutes

    const triggerAlert = (message: string, title = 'Notification', type: 'alert' | 'success' = 'alert') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    // Realtime subscriptions
    useIndividualRealtime(
        individualRecord?.id,
        (updatedRecord) => {
            setIndividualRecord(updatedRecord);
            if (updatedRecord.is_locked) {
                setIsEditMode(false);
            }
            initializeEditData(updatedRecord);
        },
        () => {
            setIndividualRecord(null);
            triggerAlert('This application record has been deleted.', 'Deleted');
        }
    );

    useInstitutionRealtime(
        institutionData?.institution?.id,
        (updatedInst) => {
            setInstitutionData(prev => {
                if (!prev) return null;
                return { ...prev, institution: updatedInst };
            });
        },
        (action, record) => {
            setInstitutionData(prev => {
                if (!prev) return null;
                let updatedApps = [...prev.applications];
                if (action === 'create') {
                    if (!updatedApps.some(a => a.id === record.id)) {
                        updatedApps = [record, ...updatedApps];
                    }
                } else if (action === 'update') {
                    updatedApps = updatedApps.map(a => a.id === record.id ? record : a);
                } else if (action === 'delete') {
                    updatedApps = updatedApps.filter(a => a.id !== record.id);
                }
                return { ...prev, applications: updatedApps };
            });
        }
    );

    const handleSearchIndividual = async (queryVal = individualQuery, silent = false) => {
        if (!queryVal.trim()) {
            if (!silent) triggerAlert('Please enter a search term.', 'Search Required');
            return false;
        }
        if (!silent) {
            setLoading(true);
            setIndividualRecord(null);
            setIsEditMode(false);
        }

        try {
            const record = await adminTrackApi.trackIndividual(queryVal.trim());
            if (record) {
                setIndividualRecord(record);
                localStorage.setItem('admin_track_individual_query', queryVal);
                localStorage.setItem('admin_track_individual_record', JSON.stringify(record));
                localStorage.setItem('admin_track_individual_timestamp', Date.now().toString());
                localStorage.setItem('admin_track_tab', 'individual');

                initializeEditData(record);
                return true;
            } else {
                if (!silent) triggerAlert('No application found matching the search term.', 'Not Found');
                return false;
            }
        } catch (e) {
            if (!silent) triggerAlert('Failed to retrieve application. Please try again.', 'Error');
            return false;
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleSearchInstitution = async (queryVal = institutionQuery, silent = false) => {
        if (!queryVal.trim()) {
            if (!silent) triggerAlert('Please enter a search term.', 'Search Required');
            return false;
        }
        if (!silent) {
            setLoading(true);
            setInstitutionData(null);
            setIsEditMode(false);
            setIsInstEditMode(false);
        }

        try {
            const result = await adminTrackApi.trackInstitution(queryVal.trim());
            if (result && result.institution) {
                setInstitutionData(result);
                localStorage.setItem('admin_track_institution_query', queryVal);
                localStorage.setItem('admin_track_institution_data', JSON.stringify(result));
                localStorage.setItem('admin_track_institution_timestamp', Date.now().toString());
                localStorage.setItem('admin_track_tab', 'institution');

                const inst = result.institution;
                setInstEditName(inst.name || '');
                setInstEditAddress(inst.address || '');
                setInstEditContactPerson(inst.contact_person || '');
                setInstEditEmail(inst.email || '');
                setInstEditWhatsapp(inst.whatsapp_number || '');
                setInstEditPhone(inst.phone_number || '');
                setInstEditDocFile(null);
                setInstEditLocation((inst as any).instituition_location || '');
                setInstEditBuildingFile(null);
                return true;
            } else {
                if (!silent) triggerAlert('No institution found matching the search term.', 'Not Found');
                return false;
            }
        } catch (e) {
            if (!silent) triggerAlert('Failed to retrieve institution data.', 'Error');
            return false;
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Load from Cache on mount or handle query search parameters
    useEffect(() => {
        const urlType = searchParams.get('type');
        const urlQuery = searchParams.get('query');

        if (urlType === 'individual' || urlType === 'institution') {
            setActiveTab(urlType);
            if (urlQuery) {
                if (urlType === 'individual') {
                    setIndividualQuery(urlQuery);
                    handleSearchIndividual(urlQuery);
                } else {
                    setInstitutionQuery(urlQuery);
                    handleSearchInstitution(urlQuery);
                }
            }
        } else {
            const cachedTab = localStorage.getItem('admin_track_tab');
            if (cachedTab === 'individual' || cachedTab === 'institution') {
                setActiveTab(cachedTab);
            }
        }

        // Only load cached values if we aren't performing a URL-based search for that tab
        const shouldLoadIndCache = !(urlType === 'individual' && urlQuery);
        const shouldLoadInstCache = !(urlType === 'institution' && urlQuery);

        if (shouldLoadIndCache) {
            const cachedIndQuery = localStorage.getItem('admin_track_individual_query');
            const cachedIndRecord = localStorage.getItem('admin_track_individual_record');
            const cachedIndTime = localStorage.getItem('admin_track_individual_timestamp');

            if (cachedIndQuery) setIndividualQuery(cachedIndQuery);

            if (cachedIndRecord) {
                try {
                    const parsed = JSON.parse(cachedIndRecord);
                    setIndividualRecord(parsed);
                    initializeEditData(parsed);
                } catch (e) {
                    console.error('Failed to parse cached individual record:', e);
                }
            }

            const now = Date.now();
            if (cachedIndQuery && cachedIndRecord) {
                const timeDiff = now - Number(cachedIndTime || 0);
                if (timeDiff > CACHE_TTL) {
                    handleSearchIndividual(cachedIndQuery, true);
                }
            }
        }

        if (shouldLoadInstCache) {
            const cachedInstQuery = localStorage.getItem('admin_track_institution_query');
            const cachedInstData = localStorage.getItem('admin_track_institution_data');
            const cachedInstTime = localStorage.getItem('admin_track_institution_timestamp');

            if (cachedInstQuery) setInstitutionQuery(cachedInstQuery);
            if (cachedInstData) {
                try {
                    const parsed = JSON.parse(cachedInstData);
                    setInstitutionData(parsed);
                    if (parsed.institution) {
                        const inst = parsed.institution;
                        setInstEditName(inst.name || '');
                        setInstEditAddress(inst.address || '');
                        setInstEditContactPerson(inst.contact_person || '');
                        setInstEditEmail(inst.email || '');
                        setInstEditWhatsapp(inst.whatsapp_number || '');
                        setInstEditPhone(inst.phone_number || '');
                        setInstEditDocFile(null);
                        setInstEditLocation(inst.instituition_location || '');
                        setInstEditBuildingFile(null);
                    }
                } catch (e) {
                    console.error('Failed to parse cached institution data:', e);
                }
            }

            const now = Date.now();
            if (cachedInstQuery && cachedInstData) {
                const timeDiff = now - Number(cachedInstTime || 0);
                if (timeDiff > CACHE_TTL) {
                    handleSearchInstitution(cachedInstQuery, true);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleDeleteIndividual = async (app: ParticipantsApplicationResponse) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete participant ${app.full_name}? This action is permanent and cannot be undone.`);
        if (!confirmDelete) return;

        setLoading(true);
        try {
            await pb.collection('participants_application').delete(app.id);
            
            setInstitutionData(prev => {
                if (!prev) return null;
                const newApps = prev.applications.filter(a => a.id !== app.id);
                const nextData = { ...prev, applications: newApps };
                localStorage.setItem('admin_track_institution_data', JSON.stringify(nextData));
                return nextData;
            });

            triggerAlert('Participant application deleted successfully.', 'Deleted', 'success');
        } catch (e: any) {
            triggerAlert(e.message || 'Failed to delete applicant.', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveIndividualChanges = async () => {
        if (!individualRecord) return;

        // Dynamic Validation
        for (const field of FORM_FIELDS_CONFIG) {
            const val = editData[field.key];
            const valStr = val !== undefined && val !== null ? String(val).trim() : '';
            if (field.required && !valStr) {
                if (field.key === 'juz_options') {
                    if (getJuzCodesForCategory(editData.category).length > 0) {
                        triggerAlert('Please select a Juz range option.', 'Validation Error');
                        return;
                    }
                } else if (field.key !== 'selected_juz') {
                    triggerAlert(`Please fill in "${field.label}".`, 'Validation Error');
                    return;
                }
            }
        }

        // Calculate actual diff of changes
        const changes: Record<string, any> = {};
        FORM_FIELDS_CONFIG.forEach(field => {
            if (field.key === 'requires_accommodation') {
                const oldVal = !!individualRecord.requires_accommodation;
                const newVal = !!editData.requires_accommodation;
                if (oldVal !== newVal) {
                    changes.requires_accommodation = newVal;
                }
            } else {
                let oldVal = (individualRecord as any)[field.key] || '';
                if (field.type === 'date' && oldVal) {
                    oldVal = oldVal.split(' ')[0];
                }
                const newVal = editData[field.key] || '';
                if (String(oldVal).trim() !== String(newVal).trim()) {
                    changes[field.key] = String(newVal).trim();
                }
            }
        });

        const hasFileChanges = editAadhaarFile !== null || editBirthCertificateFile !== null || editCandidatePhotoFile !== null;

        if (Object.keys(changes).length === 0 && !hasFileChanges) {
            setIsEditMode(false);
            return;
        }

        setLoading(true);
        try {
            let payload: FormData | Record<string, any>;

            if (hasFileChanges) {
                const formData = new FormData();
                Object.entries(changes).forEach(([k, v]) => {
                    formData.append(k, String(v));
                });
                if (editAadhaarFile) {
                    formData.append('aadhaar_front', editAadhaarFile);
                }
                if (editBirthCertificateFile) {
                    formData.append('birthcertificate_photo', editBirthCertificateFile);
                }
                if (editCandidatePhotoFile) {
                    formData.append('candidate_photo', editCandidatePhotoFile);
                }
                payload = formData;
            } else {
                payload = changes;
            }

            const updated = await adminTrackApi.updateApplication(individualRecord.id, payload);
            setIndividualRecord(updated);
            setIsEditMode(false);

            // Auto-switch query to Application ID so status rechecks work if Aadhaar is changed
            setIndividualQuery(updated.id);
            localStorage.setItem('admin_track_individual_query', updated.id);
            localStorage.setItem('admin_track_individual_record', JSON.stringify(updated));

            triggerAlert('Application details updated successfully!', 'Success', 'success');
        } catch (e: any) {
            triggerAlert(e.message || 'Failed to update application details.', 'Update Error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInstitutionChanges = async () => {
        if (!institutionData || !institutionData.institution) return;
        if (!instEditName.trim() || !instEditAddress.trim() || !instEditContactPerson.trim() || !instEditEmail.trim() || !instEditWhatsapp.trim()) {
            triggerAlert('Please fill in all required fields.', 'Validation Error');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', instEditName.trim());
            formData.append('address', instEditAddress.trim());
            formData.append('contact_person', instEditContactPerson.trim());
            formData.append('email', instEditEmail.trim());
            formData.append('whatsapp_number', instEditWhatsapp.trim());
            if (instEditPhone) formData.append('phone_number', instEditPhone.trim());
            
            if (instEditDocFile) {
                formData.append('document', instEditDocFile);
            }

            const normalizedLocation = normalizeUrl(instEditLocation);
            if (normalizedLocation && !isValidGoogleMapsLink(normalizedLocation)) {
                triggerAlert('Please enter a valid Google Maps link for your institution.', 'Invalid Google Maps Link');
                setLoading(false);
                return;
            }
            formData.append('instituition_location', normalizedLocation);

            if (instEditBuildingFile) {
                formData.append('instituition_building_proof', instEditBuildingFile);
            }

            const updated = await adminTrackApi.updateInstitution(institutionData.institution.id, formData);
            setInstitutionData(prev => {
                if (!prev) return null;
                const nextData = { ...prev, institution: updated };
                localStorage.setItem('admin_track_institution_data', JSON.stringify(nextData));
                return nextData;
            });
            setIsInstEditMode(false);
            triggerAlert('Institution details updated successfully!', 'Success', 'success');
        } catch (e: any) {
            triggerAlert(e.message || 'Failed to update institution details.', 'Update Error');
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = () => {
        if (activeTab === 'individual') {
            setIndividualQuery('');
            setIndividualRecord(null);
            setIsEditMode(false);

            localStorage.removeItem('admin_track_individual_query');
            localStorage.removeItem('admin_track_individual_record');
            localStorage.removeItem('admin_track_individual_timestamp');

            triggerAlert('Individual applicant search cleared.', 'Cleared', 'success');
        } else {
            setInstitutionQuery('');
            setInstitutionData(null);
            setIsInstEditMode(false);

            localStorage.removeItem('admin_track_institution_query');
            localStorage.removeItem('admin_track_institution_data');
            localStorage.removeItem('admin_track_institution_timestamp');

            triggerAlert('Institution search cleared.', 'Cleared', 'success');
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return styles.statusApproved;
            case 'rejected': return styles.statusRejected;
            case 'reapplied': return styles.statusReapplied;
            default: return styles.statusPending;
        }
    };

    const getAadhaarUrl = (record: ParticipantsApplicationResponse) => {
        if (!record.aadhaar_front) return '#';
        return pb.files.getURL(record, record.aadhaar_front);
    };

    const getBirthCertificateUrl = (record: ParticipantsApplicationResponse) => {
        if (!record.birthcertificate_photo) return '#';
        return pb.files.getURL(record, record.birthcertificate_photo);
    };

    const getCandidatePhotoUrl = (record: ParticipantsApplicationResponse) => {
        if (!record.candidate_photo) return '#';
        return pb.files.getURL(record, record.candidate_photo);
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                {/* Header card with Tabs */}
                <div className={styles.searchCard}>
                    <div className={styles.cardHeader}>
                        <h2>Application Tracking</h2>
                        <p>Search by name, ID, phone, Aadhaar or email.</p>
                    </div>

                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'individual' ? styles.activeTab : ''}`}
                            onClick={() => {
                                setActiveTab('individual');
                                localStorage.setItem('admin_track_tab', 'individual');
                            }}
                        >
                            Individual Applications
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'institution' ? styles.activeTab : ''}`}
                            onClick={() => {
                                setActiveTab('institution');
                                localStorage.setItem('admin_track_tab', 'institution');
                            }}
                        >
                            Institution Applications
                        </button>
                    </div>

                    <div className={styles.searchForm}>
                        {activeTab === 'individual' ? (
                            <div className={styles.searchRow}>
                                <div className={styles.inputGroup} style={{ flex: 1 }}>
                                    <label className={styles.label}>Global Search Term</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Name · APL-xxx · email@… · 10-digit mobile · 12-digit Aadhaar…"
                                        value={individualQuery}
                                        onChange={(e) => setIndividualQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchIndividual()}
                                    />
                                </div>
                                <div className={styles.searchBtnCol} style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className={styles.btnPrimary} 
                                        onClick={() => handleSearchIndividual()}
                                        disabled={loading}
                                    >
                                        <Search size={16} style={{ marginRight: '6px' }} />
                                        {loading ? 'Searching...' : 'Search'}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.btnSecondary}
                                        onClick={handleClearCache}
                                        disabled={loading}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.searchRow}>
                                <div className={styles.inputGroup} style={{ flex: 1 }}>
                                    <label className={styles.label}>Global Search Term</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Name · INST-xxx · email@… · 6–10 digit mobile…"
                                        value={institutionQuery}
                                        onChange={(e) => setInstitutionQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchInstitution()}
                                    />
                                </div>
                                <div className={styles.searchBtnCol} style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className={styles.btnPrimary} 
                                        onClick={() => handleSearchInstitution()}
                                        disabled={loading}
                                    >
                                        <Search size={16} style={{ marginRight: '6px' }} />
                                        {loading ? 'Searching...' : 'Search'}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.btnSecondary}
                                        onClick={handleClearCache}
                                        disabled={loading}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Individual application Details Panel */}
                {activeTab === 'individual' && individualRecord && (
                    <IndividualDetails
                        individualRecord={individualRecord}
                        isEditMode={isEditMode}
                        setIsEditMode={setIsEditMode}
                        editData={editData}
                        updateEditField={updateEditField}
                        editAadhaarFile={editAadhaarFile}
                        setEditAadhaarFile={setEditAadhaarFile}
                        editBirthCertificateFile={editBirthCertificateFile}
                        setEditBirthCertificateFile={setEditBirthCertificateFile}
                        editCandidatePhotoFile={editCandidatePhotoFile}
                        setEditCandidatePhotoFile={setEditCandidatePhotoFile}
                        handleSaveIndividualChanges={handleSaveIndividualChanges}
                        loading={loading}
                        getStatusClass={getStatusClass}
                        getAadhaarUrl={getAadhaarUrl}
                        getBirthCertificateUrl={getBirthCertificateUrl}
                        getCandidatePhotoUrl={getCandidatePhotoUrl}
                        onRefresh={() => handleSearchIndividual(individualQuery, true)}
                    />
                )}

                {/* Institution Applications Panel */}
                {activeTab === 'institution' && institutionData && (
                    <InstitutionDetails
                        institutionData={institutionData}
                        isInstEditMode={isInstEditMode}
                        setIsInstEditMode={setIsInstEditMode}
                        instEditName={instEditName}
                        setInstEditName={setInstEditName}
                        instEditAddress={instEditAddress}
                        setInstEditAddress={setInstEditAddress}
                        instEditContactPerson={instEditContactPerson}
                        setInstEditContactPerson={setInstEditContactPerson}
                        instEditEmail={instEditEmail}
                        setInstEditEmail={setInstEditEmail}
                        instEditWhatsapp={instEditWhatsapp}
                        setInstEditWhatsapp={setInstEditWhatsapp}
                        instEditPhone={instEditPhone}
                        setInstEditPhone={setInstEditPhone}
                        instEditDocFile={instEditDocFile}
                        setInstEditDocFile={setInstEditDocFile}
                        instEditLocation={instEditLocation}
                        setInstEditLocation={setInstEditLocation}
                        instEditBuildingFile={instEditBuildingFile}
                        setInstEditBuildingFile={setInstEditBuildingFile}
                        isMinimized={isInstMinimized}
                        setIsMinimized={handleSetIsInstMinimized}
                        handleSaveInstitutionChanges={handleSaveInstitutionChanges}
                        loading={loading}
                        getStatusClass={getStatusClass}
                        onViewIndividual={(app) => {
                            setIndividualRecord(app);
                            initializeEditData(app);
                            setIsEditMode(false);
                            setActiveTab('individual');
                            localStorage.setItem('admin_track_tab', 'individual');
                        }}
                        onDeleteIndividual={handleDeleteIndividual}
                        onRefresh={() => handleSearchInstitution(institutionQuery, true)}
                    />
                )}
            </div>

            <ConfirmModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
