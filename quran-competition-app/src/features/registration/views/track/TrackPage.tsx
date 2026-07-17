// src/features/registration/views/track/TrackPage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pb } from '../../../../api/db';
import { trackApplicationApi } from '../../../../api/routes/TracApplication.api';
import type { ParticipantsApplicationResponse } from '../../../../api/types';
import AlertModal from '../../../../shared/components/Modal/AlertModal';
import { useIndividualRealtime } from '../../../../realtime/track';
import styles from './TrackPage.module.css';
import IndividualDetails from './components/IndividualDetails';

export default function TrackPage() {
    const [searchParams] = useSearchParams();

    // Search Inputs
    const [individualQuery, setIndividualQuery] = useState('');
    const [searchDob, setSearchDob] = useState('');

    // States
    const [loading, setLoading] = useState(false);
    const [individualRecord, setIndividualRecord] = useState<ParticipantsApplicationResponse | null>(null);

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

    // Load from Cache / URL and auto-fetch on mount
    useEffect(() => {
        const urlType = searchParams.get('type');
        const urlQuery = searchParams.get('query');
        const urlDob = searchParams.get('dob');

        if (urlType === 'individual' && urlQuery && urlDob) {
            setIndividualQuery(urlQuery);
            setSearchDob(urlDob);
            localStorage.setItem('quran_competition_track_individual_query', urlQuery);
            localStorage.setItem('quran_competition_track_individual_dob', urlDob);
            handleSearchIndividual(urlQuery, urlDob, false);
            return;
        }

        const cachedIndQuery = localStorage.getItem('quran_competition_track_individual_query');
        const cachedIndDob = localStorage.getItem('quran_competition_track_individual_dob');

        if (cachedIndQuery) setIndividualQuery(cachedIndQuery);
        if (cachedIndDob) setSearchDob(cachedIndDob);

        if (cachedIndQuery && cachedIndDob) {
            handleSearchIndividual(cachedIndQuery, cachedIndDob, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Realtime subscriptions
    useIndividualRealtime(
        individualRecord?.id,
        (updatedRecord) => {
            setIndividualRecord(updatedRecord);
        },
        () => {
            setIndividualRecord(null);
            triggerAlert('Your application record has been deleted by an administrator.', 'Deleted');
        }
    );

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
        }

        try {
            const record = await trackApplicationApi.trackIndividual(queryVal.trim(), dobVal);
            if (record) {
                setIndividualRecord(record);
                localStorage.setItem('quran_competition_track_individual_query', queryVal);
                localStorage.setItem('quran_competition_track_individual_dob', dobVal);
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

    const handleClearCache = () => {
        setIndividualQuery('');
        setSearchDob('');
        setIndividualRecord(null);

        localStorage.removeItem('quran_competition_track_individual_query');
        localStorage.removeItem('quran_competition_track_individual_dob');

        triggerAlert('Individual applicant search cache cleared.', 'Cache Cleared', 'success');
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
                {/* Header card */}
                <div className={styles.searchCard}>
                    <div className={styles.cardHeader}>
                        <h2>Application Status Tracker</h2>
                        <p>Track your registration or manage submissions</p>
                    </div>

                    <div className={styles.searchForm}>
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
                    </div>
                </div>

                {/* Individual application Details Panel */}
                {individualRecord && (
                    <IndividualDetails
                        individualRecord={individualRecord}
                        isEditMode={false}
                        setIsEditMode={() => {}}
                        editData={{}}
                        updateEditField={() => {}}
                        editAadhaarFile={null}
                        setEditAadhaarFile={() => {}}
                        editBirthCertificateFile={null}
                        setEditBirthCertificateFile={() => {}}
                        editCandidatePhotoFile={null}
                        setEditCandidatePhotoFile={() => {}}
                        loading={loading}
                        getStatusClass={getStatusClass}
                        getAadhaarUrl={getAadhaarUrl}
                        getBirthCertificateUrl={getBirthCertificateUrl}
                        getCandidatePhotoUrl={getCandidatePhotoUrl}
                        onRefresh={async () => handleSearchIndividual(individualQuery, searchDob, true)}
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