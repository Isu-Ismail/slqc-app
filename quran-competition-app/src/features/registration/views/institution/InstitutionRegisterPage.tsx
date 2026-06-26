// src/features/registration/views/institution/InstitutionRegisterPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { institutionsApi } from '../../../../api/routes/institutions.api';
import { Clock, Ban } from 'lucide-react';
import AlertModal from '../../../../shared/components/Modal/AlertModal';
import styles from './InstitutionRegisterPage.module.css';
import { useRegistrationStatus } from '../../../../shared/context/StatusContext';

// Import refactored subcomponents
import Step1Details from './components/Step1Details';
import Step2Uploads from './components/Step2Uploads';
import Step3Location from './components/Step3Location';

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

export default function InstitutionRegisterPage() {
    const navigate = useNavigate();

    // Form Inputs - Step 1
    const [name, setName] = useState('');

    // --- NEW STRUCTURED ADDRESS STATES ---
    const [streetAddress, setStreetAddress] = useState('');
    const [pincode, setPincode] = useState('');
    const [stateName, setStateName] = useState('');
    const [districtName, setDistrictName] = useState('');
    const [villageName, setVillageName] = useState('');
    // -------------------------------------

    const [contactPerson, setContactPerson] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [passcode, setPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');

    // Form Inputs - Step 2 & 3
    const [docFile, setDocFile] = useState<File | null>(null);
    const [buildingFile, setBuildingFile] = useState<File | null>(null);
    const [location, setLocation] = useState<string>('');
    const [currentStep, setCurrentStep] = useState<number>(1);

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
        onTrack?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        extraData: ''
    });

    const triggerAlert = (
        message: string,
        title = 'Attention Required',
        type: 'success' | 'warning' = 'warning',
        extraData?: string,
        onTrack?: () => void
    ) => {
        setAlertModal({ isOpen: true, title, message, type, extraData, onTrack });
    };

    const handleNext = () => {
        if (currentStep === 1) {
            // Updated validation to check new structured address fields
            if (!name.trim() || !streetAddress.trim() || !pincode.trim() || !villageName.trim() || !contactPerson.trim() || !email.trim() || !whatsapp.trim()) {
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

        // Final pre-submit validation check
        if (!name.trim() || !streetAddress.trim() || !pincode.trim() || !villageName.trim() || !contactPerson.trim() || !email.trim() || !whatsapp.trim()) {
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
            // Updated payload to match the new PocketBase schema
            const record = await institutionsApi.registerInstitution({
                name: name.trim(),
                street_address: streetAddress.trim(),
                pincode: pincode.trim(),
                state_name: stateName.trim(),
                district_name: districtName.trim(),
                village_name: villageName.trim(),
                contact_person: contactPerson.trim(),
                email: email.trim(),
                phone_number: phone.trim() || undefined,
                whatsapp_number: whatsapp.trim(),
                document: docFile,
                instituition_building_proof: buildingFile,
                instituition_location: location.trim(),
                password: passcode
            });

            const currentPasscode = passcode;
            triggerAlert(
                `Institution application submitted successfully! Use the tracking ID below to check the status of your registration.`,
                'Registration Success',
                'success',
                record.id,
                () => {
                    localStorage.removeItem('quran_competition_track_institution_query');
                    sessionStorage.removeItem('quran_competition_track_institution_passcode');
                    localStorage.removeItem('quran_competition_track_institution_data');
                    localStorage.removeItem('quran_competition_track_institution_timestamp');

                    localStorage.setItem('quran_competition_track_institution_query', record.id);
                    sessionStorage.setItem('quran_competition_track_institution_passcode', currentPasscode);
                    localStorage.setItem('quran_competition_track_tab', 'institution');

                    setAlertModal(prev => ({ ...prev, isOpen: false }));
                    navigate(`/track?type=institution&query=${record.id}&passcode=${currentPasscode}`);
                }
            );

            // Clear form
            setName('');
            setStreetAddress('');
            setPincode('');
            setStateName('');
            setDistrictName('');
            setVillageName('');
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

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.card}>
                {checkingStatus ? (
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
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        textAlign: 'center',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '12px',
                        margin: '10px auto',
                        maxWidth: '560px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(234, 179, 8, 0.08)',
                            color: '#eab308',
                            marginBottom: '20px'
                        }}>
                            <Clock size={40} />
                        </div>
                        <h2 style={{
                            fontSize: '22px',
                            fontWeight: '700',
                            color: 'var(--text-h)',
                            margin: '0 0 10px 0'
                        }}>
                            Registration Period Pending
                        </h2>
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--text)',
                            lineHeight: '1.6',
                            margin: '0 auto',
                            maxWidth: '460px'
                        }}>
                            Thank you for your interest! The institution registration phase for the State Level Quran Competition has not started yet. Please check the schedules on the main timeline page or return once the registration period begins.
                        </p>
                    </div>
                ) : status === 'closed' ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        textAlign: 'center',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '12px',
                        margin: '10px auto',
                        maxWidth: '560px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            marginBottom: '20px'
                        }}>
                            <Ban size={40} />
                        </div>
                        <h2 style={{
                            fontSize: '22px',
                            fontWeight: '700',
                            color: '#ef4444',
                            margin: '0 0 10px 0'
                        }}>
                            Registration Period Closed
                        </h2>
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--text)',
                            lineHeight: '1.6',
                            margin: '0 auto',
                            maxWidth: '460px'
                        }}>
                            The registration window for institutions and madrasas has officially concluded. We are no longer accepting new school registration requests. If you have already registered, you can track your status using the tracking ID.
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
                                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-h)' }}>
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

                                        // Passed the new structured props here
                                        streetAddress={streetAddress}
                                        setStreetAddress={setStreetAddress}
                                        pincode={pincode}
                                        setPincode={setPincode}
                                        stateName={stateName}
                                        setStateName={setStateName}
                                        districtName={districtName}
                                        setDistrictName={setDistrictName}
                                        villageName={villageName}
                                        setVillageName={setVillageName}
                                        // -----------------------------------

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
                )}
            </div>

            <AlertModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                extraData={alertModal.extraData}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                onTrack={alertModal.onTrack}
            />
        </div>
    );
}