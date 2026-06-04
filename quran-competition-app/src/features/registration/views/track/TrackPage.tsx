// src/features/registration/views/track/TrackPage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pb } from '../../../../api/db';
import { trackApplicationApi } from '../../../../api/routes/TracApplication.api';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../../../api/types';
import AlertModal from '../../../../shared/components/Modal/AlertModal';

import styles from './TrackPage.module.css';
import IndividualDetails from './components/IndividualDetails';
import InstitutionDetails from './components/InstitutionDetails';




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
    
    // Search Inputs
    const [individualQuery, setIndividualQuery] = useState('');
    const [searchDob, setSearchDob] = useState('');
    const [institutionQuery, setInstitutionQuery] = useState('');
    const [institutionPasscode, setInstitutionPasscode] = useState('');
    
    // States
    const [loading, setLoading] = useState(false);
    const [individualRecord, setIndividualRecord] = useState<ParticipantsApplicationResponse | null>(null);
    const [institutionData, setInstitutionData] = useState<{
        institution: InstitutionsResponse | null;
        applications: ParticipantsApplicationResponse[];
    } | null>(null);

    // Edit Form States
    const [isEditMode, setIsEditMode] = useState(false);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState<'5_juz' | '15_juz' | '30_juz' | ''>('');
    const [editGender, setEditGender] = useState<'male' | 'female'>('male');
    const [editDob, setEditDob] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editWhatsapp, setEditWhatsapp] = useState('');
    const [editFatherName, setEditFatherName] = useState('');
    const [editFatherNumber, setEditFatherNumber] = useState('');
    const [editGuardianName, setEditGuardianName] = useState('');
    const [editGuardianPhone, setEditGuardianPhone] = useState('');
    const [editRequiresAcc, setEditRequiresAcc] = useState(false);
    const [editAadhaarFile, setEditAadhaarFile] = useState<File | null>(null);
    const [editCandidatePhotoFile, setEditCandidatePhotoFile] = useState<File | null>(null);


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
        return localStorage.getItem('quran_competition_track_inst_minimized') === 'true';
    });


    const handleSetIsInstMinimized = (val: boolean) => {
        setIsInstMinimized(val);
        localStorage.setItem('quran_competition_track_inst_minimized', String(val));
    };

    // Alert Modal state
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'warning';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning'
    });

    const CACHE_TTL = 300000; // 5 minutes

    // Load from Cache on mount
    useEffect(() => {
        const urlType = searchParams.get('type');
        const urlQuery = searchParams.get('query');
        

        
        if (urlType === 'individual' || urlType === 'institution') {
            setActiveTab(urlType);
            if (urlQuery) {
                if (urlType === 'individual') setIndividualQuery(urlQuery);
                else setInstitutionQuery(urlQuery);
            }
        } else {
            const cachedTab = localStorage.getItem('quran_competition_track_tab');
            if (cachedTab === 'individual' || cachedTab === 'institution') {
                setActiveTab(cachedTab);
            }
        }

        const cachedIndQuery = localStorage.getItem('quran_competition_track_individual_query');
        const cachedIndDob = localStorage.getItem('quran_competition_track_individual_dob');
        const cachedIndRecord = localStorage.getItem('quran_competition_track_individual_record');
        const cachedIndTime = localStorage.getItem('quran_competition_track_individual_timestamp');

        if (cachedIndQuery) setIndividualQuery(cachedIndQuery);
        if (cachedIndDob) setSearchDob(cachedIndDob);

        if (cachedIndRecord) {
            try {
                const parsed = JSON.parse(cachedIndRecord);
                setIndividualRecord(parsed);
                setEditName(parsed.full_name);
                setEditCategory(parsed.category);
                setEditGender(parsed.gender);
                setEditDob(parsed.dob ? parsed.dob.split(' ')[0] : '');
                setEditEmail(parsed.email || '');
                setEditWhatsapp(parsed.whatsapp_number);
                setEditFatherName(parsed.father_name || '');
                setEditFatherNumber(parsed.father_number || '');
                setEditGuardianName(parsed.guardian_name || '');
                setEditGuardianPhone(parsed.guardian_phone || '');
                setEditRequiresAcc(!!parsed.requires_accommodation);
                setEditCandidatePhotoFile(null);
            } catch (e) {
                console.error('Failed to parse cached individual record:', e);
            }
        }

        const cachedInstQuery = localStorage.getItem('quran_competition_track_institution_query');
        const cachedInstPasscode = sessionStorage.getItem('quran_competition_track_institution_passcode');
        const cachedInstData = localStorage.getItem('quran_competition_track_institution_data');
        const cachedInstTime = localStorage.getItem('quran_competition_track_institution_timestamp');

        if (cachedInstQuery) setInstitutionQuery(cachedInstQuery);
        if (cachedInstPasscode) setInstitutionPasscode(cachedInstPasscode);
        if (cachedInstData) {
            try {
                const parsed = JSON.parse(cachedInstData);
                setInstitutionData(parsed);
                if (parsed.institution) {
                    setInstEditName(parsed.institution.name || '');
                    setInstEditAddress(parsed.institution.address || '');
                    setInstEditContactPerson(parsed.institution.contact_person || '');
                    setInstEditEmail(parsed.institution.email || '');
                    setInstEditWhatsapp(parsed.institution.whatsapp_number || '');
                    setInstEditPhone(parsed.institution.phone_number || '');
                    setInstEditDocFile(null);
                    setInstEditLocation(parsed.institution.instituition_location || '');
                    setInstEditBuildingFile(null);
                }
            } catch (e) {
                console.error('Failed to parse cached institution data:', e);
            }
        }

        // Trigger background fetch if cache exists but is stale
        const now = Date.now();
        if (cachedIndQuery && cachedIndDob && cachedIndRecord) {
            const timeDiff = now - Number(cachedIndTime || 0);
            if (timeDiff > CACHE_TTL) {
                handleSearchIndividual(cachedIndQuery, cachedIndDob, true);
            }
        }
        if (cachedInstQuery && cachedInstData) {
            const timeDiff = now - Number(cachedInstTime || 0);
            if (timeDiff > CACHE_TTL && cachedInstPasscode) {
                handleSearchInstitution(cachedInstQuery, cachedInstPasscode, true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Realtime subscriptions


    const triggerAlert = (message: string, title = 'Notification', type: 'success' | 'warning' = 'warning') => {
        setAlertModal({ isOpen: true, title, message, type });
    };

    const handleSearchIndividual = async (queryVal = individualQuery, dobVal = searchDob, silent = false) => {
        if (!queryVal.trim()) {
            if (!silent) triggerAlert('Please enter an Application ID or Aadhaar Number.', 'Search Required');
            return false;
        }
        if (!dobVal) {
            if (!silent) triggerAlert('Please select your Date of Birth.', 'Search Required');
            return false;
        }
        if (!silent) {
            setLoading(true);
            setIndividualRecord(null);
            setIsEditMode(false);
        }

        try {
            const record = await trackApplicationApi.trackIndividual(queryVal.trim(), dobVal);
            if (record) {
                setIndividualRecord(record);
                localStorage.setItem('quran_competition_track_individual_query', queryVal);
                localStorage.setItem('quran_competition_track_individual_dob', dobVal);
                localStorage.setItem('quran_competition_track_individual_record', JSON.stringify(record));
                localStorage.setItem('quran_competition_track_individual_timestamp', Date.now().toString());
                localStorage.setItem('quran_competition_track_tab', 'individual');

                setEditName(record.full_name);
                setEditCategory(record.category);
                setEditGender(record.gender);
                setEditDob(record.dob ? record.dob.split(' ')[0] : '');
                setEditEmail(record.email || '');
                setEditWhatsapp(record.whatsapp_number);
                setEditFatherName(record.father_name || '');
                setEditFatherNumber(record.father_number || '');
                setEditGuardianName(record.guardian_name || '');
                setEditGuardianPhone(record.guardian_phone || '');
                setEditRequiresAcc(!!record.requires_accommodation);
                setEditAadhaarFile(null);
                setEditCandidatePhotoFile(null);
                return true;
            } else {
                if (!silent) triggerAlert('No application found matching the provided ID, Aadhaar, and Date of Birth details.', 'Not Found');
                return false;
            }
        } catch (e) {
            if (!silent) triggerAlert('Failed to retrieve application. Please try again.', 'Error');
            return false;
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleSearchInstitution = async (queryVal = institutionQuery, passcodeVal = institutionPasscode, silent = false) => {
        if (!queryVal.trim()) {
            if (!silent) triggerAlert('Please enter an Institution ID or Email address.', 'Search Required');
            return false;
        }
        if (!passcodeVal.trim()) {
            if (!silent) triggerAlert('Please enter the Institution Passcode to refresh status.', 'Passcode Required');
            return false;
        }
        if (!silent) {
            setLoading(true);
            setInstitutionData(null);
            setIsEditMode(false);
            setIsInstEditMode(false);
        }

        try {
            const result = await trackApplicationApi.trackInstitution(queryVal.trim(), passcodeVal.trim());
            if (result && result.institution) {
                setInstitutionData(result);
                localStorage.setItem('quran_competition_track_institution_query', queryVal);
                sessionStorage.setItem('quran_competition_track_institution_passcode', institutionPasscode.trim());
                localStorage.setItem('quran_competition_track_institution_data', JSON.stringify(result));
                localStorage.setItem('quran_competition_track_institution_timestamp', Date.now().toString());
                localStorage.setItem('quran_competition_track_tab', 'institution');

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
                if (!silent) triggerAlert('No institution found matching the provided credentials.', 'Not Found');
                return false;
            }
        } catch (e) {
            if (!silent) triggerAlert('Failed to retrieve institution data.', 'Error');
            return false;
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleDeleteIndividual = async (app: ParticipantsApplicationResponse) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete participant ${app.full_name}? This action is permanent and cannot be undone.`);
        if (!confirmDelete) return;

        setLoading(true);
        try {
            await pb.collection('participants_application').delete(app.id);
            
            // Proactively update state for instant local feedback
            setInstitutionData(prev => {
                if (!prev) return null;
                const newApps = prev.applications.filter(a => a.id !== app.id);
                const nextData = { ...prev, applications: newApps };
                localStorage.setItem('quran_competition_track_institution_data', JSON.stringify(nextData));
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
        if (!editName.trim() || !editWhatsapp.trim() || !editFatherName.trim() || !editGuardianName.trim() || !editGuardianPhone.trim()) {
            triggerAlert('Please fill in all required fields.', 'Validation Error');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('full_name', editName.trim());
            formData.append('category', editCategory);
            formData.append('gender', editGender);
            if (editDob) formData.append('dob', editDob);
            formData.append('email', editEmail.trim());
            formData.append('whatsapp_number', editWhatsapp.trim());
            formData.append('father_name', editFatherName.trim());
            formData.append('father_number', editFatherNumber.trim());
            formData.append('guardian_name', editGuardianName.trim());
            formData.append('guardian_phone', editGuardianPhone.trim());
            formData.append('requires_accommodation', String(editRequiresAcc));
            
            if (editAadhaarFile) {
                formData.append('aadhaar_front', editAadhaarFile);
            }
            if (editCandidatePhotoFile) {
                formData.append('candidate_photo', editCandidatePhotoFile);
            }

            const updated = await trackApplicationApi.updateApplication(individualRecord.id, formData);
            setIndividualRecord(updated);
            setIsEditMode(false);
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

            const updated = await trackApplicationApi.updateInstitution(institutionData.institution.id, formData);
            setInstitutionData(prev => {
                if (!prev) return null;
                const nextData = { ...prev, institution: updated };
                localStorage.setItem('quran_competition_track_institution_data', JSON.stringify(nextData));
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
            setSearchDob('');
            setIndividualRecord(null);
            setIsEditMode(false);

            localStorage.removeItem('quran_competition_track_individual_query');
            localStorage.removeItem('quran_competition_track_individual_dob');
            localStorage.removeItem('quran_competition_track_individual_record');
            localStorage.removeItem('quran_competition_track_individual_timestamp');

            triggerAlert('Individual applicant search cache cleared.', 'Cache Cleared', 'success');
        } else {
            setInstitutionQuery('');
            setInstitutionPasscode('');
            setInstitutionData(null);
            setIsInstEditMode(false);

            localStorage.removeItem('quran_competition_track_institution_query');
            sessionStorage.removeItem('quran_competition_track_institution_passcode');
            localStorage.removeItem('quran_competition_track_institution_data');
            localStorage.removeItem('quran_competition_track_institution_timestamp');

            triggerAlert('Institution search cache cleared.', 'Cache Cleared', 'success');
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return styles.statusApproved;
            case 'rejected': return styles.statusRejected;
            default: return styles.statusPending;
        }
    };

    const getAadhaarUrl = (record: ParticipantsApplicationResponse) => {
        if (!record.aadhaar_front) return '#';
        return pb.files.getURL(record, record.aadhaar_front);
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
                        <h2>Application Status Tracker</h2>
                        <p>Track your registration or manage submissions</p>
                    </div>

                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'individual' ? styles.activeTab : ''}`}
                            onClick={() => {
                                setActiveTab('individual');
                                localStorage.setItem('quran_competition_track_tab', 'individual');
                            }}
                        >
                            Individual Applicant
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'institution' ? styles.activeTab : ''}`}
                            onClick={() => {
                                setActiveTab('institution');
                                localStorage.setItem('quran_competition_track_tab', 'institution');
                            }}
                        >
                            Institution submissions
                        </button>
                    </div>

                    <div className={styles.searchForm}>
                        {activeTab === 'individual' ? (
                            <div className={styles.searchRow}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Application ID or Aadhaar Number</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. scza1md0dxa58gc or 12-digit Aadhaar"
                                        value={individualQuery}
                                        onChange={(e) => setIndividualQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchIndividual()}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Date of Birth</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={searchDob}
                                        onChange={(e) => setSearchDob(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchIndividual()}
                                    />
                                </div>
                                <div className={styles.searchBtnCol} style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className={styles.btnPrimary} 
                                        onClick={() => handleSearchIndividual()}
                                        disabled={loading}
                                    >
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
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Institution ID or Email</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. INST-4829 or contact@school.com"
                                        value={institutionQuery}
                                        onChange={(e) => setInstitutionQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchInstitution()}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Institution Passcode</label>
                                    <input
                                        type="password"
                                        className={styles.input}
                                        placeholder="Enter passcode"
                                        value={institutionPasscode}
                                        onChange={(e) => setInstitutionPasscode(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchInstitution()}
                                    />
                                </div>
                                <div className={styles.searchBtnCol} style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className={styles.btnPrimary} 
                                        onClick={() => handleSearchInstitution(institutionQuery, institutionPasscode, false)}
                                        disabled={loading}
                                    >
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
                        editName={editName}
                        setEditName={setEditName}
                        editCategory={editCategory}
                        setEditCategory={setEditCategory}
                        editGender={editGender}
                        setEditGender={setEditGender}
                        editDob={editDob}
                        setEditDob={setEditDob}
                        editEmail={editEmail}
                        setEditEmail={setEditEmail}
                        editWhatsapp={editWhatsapp}
                        setEditWhatsapp={setEditWhatsapp}
                        editFatherName={editFatherName}
                        setEditFatherName={setEditFatherName}
                        editFatherNumber={editFatherNumber}
                        setEditFatherNumber={setEditFatherNumber}
                        editGuardianName={editGuardianName}
                        setEditGuardianName={setEditGuardianName}
                        editGuardianPhone={editGuardianPhone}
                        setEditGuardianPhone={setEditGuardianPhone}
                        editRequiresAcc={editRequiresAcc}
                        setEditRequiresAcc={setEditRequiresAcc}
                        editAadhaarFile={editAadhaarFile}
                        setEditAadhaarFile={setEditAadhaarFile}
                        editCandidatePhotoFile={editCandidatePhotoFile}
                        setEditCandidatePhotoFile={setEditCandidatePhotoFile}
                        handleSaveIndividualChanges={handleSaveIndividualChanges}
                        loading={loading}
                        getStatusClass={getStatusClass}
                        getAadhaarUrl={getAadhaarUrl}
                        getCandidatePhotoUrl={getCandidatePhotoUrl}
                        onRefresh={() => handleSearchIndividual(individualQuery, searchDob, true)}
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
                            setEditName(app.full_name);
                            setEditCategory(app.category);
                            setEditGender(app.gender);
                            setEditDob(app.dob ? app.dob.split(' ')[0] : '');
                            setEditEmail(app.email || '');
                            setEditWhatsapp(app.whatsapp_number);
                            setEditFatherName(app.father_name || '');
                            setEditFatherNumber(app.father_number || '');
                            setEditGuardianName(app.guardian_name || '');
                            setEditGuardianPhone(app.guardian_phone || '');
                            setEditRequiresAcc(!!app.requires_accommodation);
                            setEditAadhaarFile(null);
                            setEditCandidatePhotoFile(null);
                            setIsEditMode(false);
                            setActiveTab('individual');
                            localStorage.setItem('quran_competition_track_tab', 'individual');
                        }}
                        onDeleteIndividual={handleDeleteIndividual}
                        onRefresh={() => handleSearchInstitution(institutionQuery, institutionPasscode, true)}
                    />
                )}

            </div>

            <AlertModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}