// src/features/registration/views/institution/InstitutionRegisterPage.tsx
import { useState } from 'react';
import { pb } from '../../../../api/db';
import { institutionsApi } from '../../../../api/routes/institutions.api';
import { Clock, Ban } from 'lucide-react';
import type { InstitutionsResponse } from '../../../../api/types';
import AlertModal from '../../../../shared/components/Modal/AlertModal';
import styles from './InstitutionRegisterPage.module.css';
import { useRegistrationStatus } from '../../../../shared/context/StatusContext';

// Import refactored subcomponents
import Step1Details from './components/Step1Details';
import Step2Uploads from './components/Step2Uploads';
import Step3Location from './components/Step3Location';
import TrackTab from './components/TrackTab';

const isValidGoogleMapsLink = (url: string): boolean => {
    try {
        const trimmed = url.trim();
        if (!trimmed) return false;
        // Check for common google maps host names, including maps.google, goo.gl/maps, maps.app.goo.gl, and share.google
        const pattern = /^(https?:\/\/)?(www\.)?(google\.[a-z]+(\.[a-z]+)?\/maps|maps\.google\.[a-z]+|maps\.app\.goo\.gl|goo\.gl\/maps|share\.google)/i;
        return pattern.test(trimmed);
    } catch {
        return false;
    }
};




export default function InstitutionRegisterPage() {
    // Tab Selector
    const [activeTab, setActiveTab] = useState<'register' | 'track'>('register');

    // Form Inputs
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);
    const [buildingFile, setBuildingFile] = useState<File | null>(null);
    const [location, setLocation] = useState<string>('');
    const [passcode, setPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');
    const [currentStep, setCurrentStep] = useState<number>(1);

    // Tracking Inputs & Edit States
    const [trackQuery, setTrackQuery] = useState('');
    const [trackPasscode, setTrackPasscode] = useState('');
    const [trackedRecord, setTrackedRecord] = useState<InstitutionsResponse | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editContactPerson, setEditContactPerson] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editWhatsapp, setEditWhatsapp] = useState('');
    const [editDocFile, setEditDocFile] = useState<File | null>(null);
    const [editBuildingFile, setEditBuildingFile] = useState<File | null>(null);
    const [editLocation, setEditLocation] = useState('');

    // Common States
    const [loading, setLoading] = useState(false);
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const [rulesAccepted, setRulesAccepted] = useState<boolean>(false);
    const { madrasaStatus: status, checkingStatus } = useRegistrationStatus();

    // Alert Modal State
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'warning';
        extraData?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        extraData: ''
    });

    const triggerAlert = (message: string, title = 'Attention Required', type: 'success' | 'warning' = 'warning', extraData?: string) => {
        setAlertModal({ isOpen: true, title, message, type, extraData });
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!name.trim() || !address.trim() || !contactPerson.trim() || !email.trim() || !whatsapp.trim()) {
                triggerAlert('Please fill in all required fields.', 'Validation Error');
                return;
            }
            if (!passcode || !confirmPasscode) {
                triggerAlert('Please enter a passcode and confirm it.', 'Validation Error');
                return;
            }
            if (passcode !== confirmPasscode) {
                triggerAlert('Passcodes do not match.', 'Validation Error');
                return;
            }
            if (passcode.length < 4) {
                triggerAlert('Passcode must be at least 4 characters long.', 'Validation Error');
                return;
            }
            if (!isVerified) {
                triggerAlert('Please solve the captcha security verification.', 'Security Verification Required');
                return;
            }
        } else if (currentStep === 2) {
            if (!docFile) {
                triggerAlert('Please upload a document to verify the authenticity of the institution.', 'Document Required');
                return;
            }
            if (!buildingFile) {
                triggerAlert('Please upload a building proof photo of your institution.', 'Building Photo Required');
                return;
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !address.trim() || !contactPerson.trim() || !email.trim() || !whatsapp.trim()) {
            triggerAlert('Please fill in all required fields.', 'Validation Error');
            return;
        }

        if (!passcode || passcode !== confirmPasscode) {
            triggerAlert('Passcode is required and must match the confirmation.', 'Validation Error');
            return;
        }
        if (passcode.length < 4) {
            triggerAlert('Passcode must be at least 4 characters long.', 'Validation Error');
            return;
        }

        if (!docFile) {
            triggerAlert('Please upload a document to verify the authenticity of the institution.', 'Document Required');
            return;
        }

        if (!buildingFile) {
            triggerAlert('Please upload a building proof photo.', 'Building Photo Required');
            return;
        }

        if (location.trim() && !isValidGoogleMapsLink(location)) {
            triggerAlert('Please enter a valid Google Maps link for your institution.', 'Invalid Google Maps Link');
            return;
        }

        if (!rulesAccepted) {
            triggerAlert('You must accept the Rules & Regulations and Privacy Policy before submitting.', 'Agreement Required');
            return;
        }

        setLoading(true);
        try {
            const record = await institutionsApi.registerInstitution({
                name: name.trim(),
                address: address.trim(),
                contact_person: contactPerson.trim(),
                email: email.trim(),
                phone_number: phone.trim() || undefined,
                whatsapp_number: whatsapp.trim(),
                document: docFile,
                instituition_building_proof: buildingFile,
                instituition_location: location.trim(),
                password: passcode
            });

            triggerAlert(
                `Institution application submitted successfully! Use the tracking ID below to check the status of your registration.`,
                'Registration Success',
                'success',
                record.id
            );

            setName('');
            setAddress('');
            setContactPerson('');
            setEmail('');
            setPhone('');
            setWhatsapp('');
            setPasscode('');
            setConfirmPasscode('');
            setDocFile(null);
            setBuildingFile(null);
            setLocation('');
            setCurrentStep(1);
            setIsVerified(false);

        } catch (error: any) {
            console.error('Institution registration error:', error);
            let errorMessage = 'Registration failed. Please check your database connection.';
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                const errorList: string[] = [];
                for (const [key, errorDetail] of Object.entries(errorData)) {
                    let fieldName = key.replace('_', ' ');
                    fieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
                    const detail = errorDetail as any;
                    if (detail && typeof detail === 'object') {
                        if (detail.code === 'validation_not_unique') {
                            errorList.push(`• ${fieldName} is already registered.`);
                        } else {
                            errorList.push(`• ${fieldName}: ${detail.message || 'invalid field.'}`);
                        }
                    } else {
                        errorList.push(`• ${fieldName}: ${detail}`);
                    }
                }
                if (errorList.length > 0) {
                    errorMessage = `The institution could not be registered due to conflicts:\n\n${errorList.join('\n')}`;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            triggerAlert(errorMessage, 'Registration Error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackedRecord) return;

        if (!editName.trim() || !editAddress.trim() || !editContactPerson.trim() || !editEmail.trim() || !editWhatsapp.trim()) {
            triggerAlert('Please fill in all required fields.', 'Validation Error');
            return;
        }

        if (editLocation.trim() && !isValidGoogleMapsLink(editLocation)) {
            triggerAlert('Please enter a valid Google Maps link before saving.', 'Invalid Google Maps Link');
            return;
        }

        setLoading(true);
        try {
            const updated = await institutionsApi.updateInstitution(trackedRecord.id, {
                name: editName.trim(),
                address: editAddress.trim(),
                contact_person: editContactPerson.trim(),
                email: editEmail.trim(),
                phone_number: editPhone.trim() || undefined,
                whatsapp_number: editWhatsapp.trim(),
                document: editDocFile || undefined,
                instituition_building_proof: editBuildingFile || undefined,
                instituition_location: editLocation.trim()
            });

            triggerAlert('Institution details updated successfully!', 'Update Success', 'success');
            setTrackedRecord(updated);
            setIsEditing(false);
        } catch (error: any) {
            console.error('Update institution error:', error);
            let errorMessage = 'Update failed. Please try again.';
            if (error.message) {
                errorMessage = error.message;
            }
            triggerAlert(errorMessage, 'Update Error');
        } finally {
            setLoading(false);
        }
    };

    const handleTrack = async () => {
        if (!trackQuery.trim()) {
            triggerAlert('Please enter an Institution ID or Email address.', 'Search Required');
            return;
        }
        if (!trackPasscode.trim()) {
            triggerAlert('Please enter the Passcode.', 'Search Required');
            return;
        }

        setLoading(true);
        setTrackedRecord(null);
        setIsEditing(false);

        try {
            const record = await institutionsApi.trackInstitutionStatus(trackQuery.trim(), trackPasscode.trim());
            if (record) {
                setTrackedRecord(record);
                setEditName(record.name);
                setEditAddress(record.address);
                setEditContactPerson(record.contact_person);
                setEditEmail(record.email);
                setEditPhone(record.phone_number || '');
                setEditWhatsapp(record.whatsapp_number);
                setEditLocation((record as any).instituition_location || '');
                setEditDocFile(null);
                setEditBuildingFile(null);
            } else {
                triggerAlert('No institution application matches this ID or Email.', 'Not Found');
            }
        } catch (e) {
            triggerAlert('Failed to query status. Please try again.', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'approved': return styles.statusApproved;
            case 'rejected': return styles.statusRejected;
            default: return styles.statusPending;
        }
    };

    const getDocUrl = (record: InstitutionsResponse) => {
        const fileKey = (record as any).document || (record as any).bonafide || '';
        if (!fileKey) return '#';
        return pb.files.getURL(record, fileKey);
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'register' ? styles.activeTab : ''}`}
                            onClick={() => {
                                setActiveTab('register');
                            }}
                        >
                            Register Institution
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'track' ? styles.activeTab : ''}`}
                            onClick={() => {
                                setActiveTab('track');
                            }}
                        >
                            Track Status
                        </button>
                    </div>

                    {activeTab === 'register' ? (
                        checkingStatus ? (
                            <div style={{ textAlign: 'center', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    border: '3px solid rgba(16, 185, 129, 0.1)',
                                    borderTop: '3px solid #10b981',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500', margin: 0 }}>Verifying registration status...</p>
                                <style>{`
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                `}</style>
                            </div>
                        ) : status === 'waiting' ? (
                            <div style={{ textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <Clock size={48} style={{ color: '#eab308' }} />
                                <h2>Registration Not Yet Started</h2>
                                <p style={{ color: 'var(--text)', lineHeight: '1.6', margin: '8px 0 0 0', maxWidth: '480px' }}>
                                    Thank you for your interest! The institution registration period for the State Level Quran Competition has not commenced yet. Please check back later or refer to the dashboard timelines.
                                </p>
                            </div>
                        ) : status === 'closed' ? (
                            <div style={{ textAlign: 'center', padding: '40px', borderTop: '4px solid #ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <Ban size={48} style={{ color: '#ef4444' }} />
                                <h2 style={{ color: '#ef4444' }}>Registration Period Closed</h2>
                                <p style={{ color: 'var(--text)', lineHeight: '1.6', margin: '8px 0 0 0', maxWidth: '480px' }}>
                                    The registration period for institutions and schools has ended. We are no longer accepting new institution requests. Thank you for your understanding.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className={styles.cardHeader}>
                                    <h2>Institution Registration</h2>
                                    <p>Register your Madarasa or School to submit bulk candidate applications</p>
                                </div>

                                {/* Progress Bar & Step Indicator */}
                                <div style={{ marginTop: '20px' }}>
                                    <div className={styles.header}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>
                                            {currentStep === 1 && 'Step 1: Contact Details'}
                                            {currentStep === 2 && 'Step 2: Verification Documents'}
                                            {currentStep === 3 && 'Step 3: Location Link'}
                                        </span>
                                        <span className={styles.stepIndicator}>Step {currentStep} of 3</span>
                                    </div>
                                    <div className={styles.progressBar}>
                                        <div 
                                            className={styles.progressFill} 
                                            style={{ width: `${(currentStep / 3) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <form onSubmit={handleRegister} className={styles.form}>
                                    <div className={styles.formContainer}>
                                        {currentStep === 1 && (
                                            <Step1Details
                                                name={name}
                                                setName={setName}
                                                address={address}
                                                setAddress={setAddress}
                                                contactPerson={contactPerson}
                                                setContactPerson={setContactPerson}
                                                email={email}
                                                setEmail={setEmail}
                                                whatsapp={whatsapp}
                                                setWhatsapp={setWhatsapp}
                                                phone={phone}
                                                setPhone={setPhone}
                                                passcode={passcode}
                                                setPasscode={setPasscode}
                                                confirmPasscode={confirmPasscode}
                                                setConfirmPasscode={setConfirmPasscode}
                                                isVerified={isVerified}
                                                setIsVerified={setIsVerified}
                                            />
                                        )}

                                        {currentStep === 2 && (
                                            <Step2Uploads
                                                docFile={docFile}
                                                setDocFile={setDocFile}
                                                buildingFile={buildingFile}
                                                setBuildingFile={setBuildingFile}
                                            />
                                        )}

                                        {currentStep === 3 && (
                                            <Step3Location
                                                location={location}
                                                setLocation={setLocation}
                                                rulesAccepted={rulesAccepted}
                                                setRulesAccepted={setRulesAccepted}
                                            />
                                        )}
                                    </div>

                                    {/* Navigation Buttons */}
                                    <div className={styles.navigationButtons}>
                                        {currentStep > 1 ? (
                                            <button
                                                type="button"
                                                className={styles.btnSecondary}
                                                onClick={handleBack}
                                            >
                                                Back
                                            </button>
                                        ) : (
                                            <div /> // Spacer
                                        )}

                                        {currentStep < 3 ? (
                                            <button
                                                type="button"
                                                className={styles.btnPrimary}
                                                onClick={handleNext}
                                            >
                                                Continue
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                className={styles.btnSubmit}
                                                disabled={loading || !rulesAccepted}
                                            >
                                                {loading ? 'Submitting...' : 'Submit Application'}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )
                    ) : (
                        <TrackTab
                            trackQuery={trackQuery}
                            setTrackQuery={setTrackQuery}
                            trackPasscode={trackPasscode}
                            setTrackPasscode={setTrackPasscode}
                            handleTrack={handleTrack}
                            trackedRecord={trackedRecord}
                            isEditing={isEditing}
                            setIsEditing={setIsEditing}
                            loading={loading}
                            editName={editName}
                            setEditName={setEditName}
                            editAddress={editAddress}
                            setEditAddress={setEditAddress}
                            editContactPerson={editContactPerson}
                            setEditContactPerson={setEditContactPerson}
                            editEmail={editEmail}
                            setEditEmail={setEditEmail}
                            editWhatsapp={editWhatsapp}
                            setEditWhatsapp={setEditWhatsapp}
                            editPhone={editPhone}
                            setEditPhone={setEditPhone}
                            editDocFile={editDocFile}
                            setEditDocFile={setEditDocFile}
                            editBuildingFile={editBuildingFile}
                            setEditBuildingFile={setEditBuildingFile}
                            editLocation={editLocation}
                            setEditLocation={setEditLocation}
                            handleUpdate={handleUpdate}
                            getStatusClass={getStatusClass}
                            getDocUrl={getDocUrl}
                        />
                    )}
                </div>
            </div>

            <AlertModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                extraData={alertModal.extraData}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
