import { useState } from 'react';

import Step1Type from '../../components/Step1Type';
import Step2Details from '../../components/Step2Details';
import Step3Upload from '../../components/Step3Upload';
import AlertModal from '../../../../shared/components/Modal/AlertModal';
import { validators } from '../../../../utils/validators';
import { participantsApi } from '../../../../api/routes/participants.api';
import { Clock, Ban } from 'lucide-react';
import styles from './RegisterPage.module.css';

import { useRegistrationStatus } from '../../../../shared/context/StatusContext';

// We define the master data structure here
export interface RegistrationFormData {
    registration_type: 'individual' | 'institution';
    institution_id: string; // If they come through a madarasa
    institution_ref: string; // PocketBase relation record ID
    institution_verified?: boolean;
    full_name: string;
    aadhaar_number: string;
    dob: string;
    category: '5_juz' | '15_juz' | '30_juz' | '';
    gender: 'male' | 'female';
    email: string;
    whatsapp_number: string;
    father_name: string;
    father_number: string;
    guardian_name: string;
    guardian_phone: string;
    requires_accommodation: boolean;
    aadhaar_front: File | null;
    candidate_photo: File | null;
}

const CACHE_KEY = 'quran_competition_registration_form';

const getInitialFormData = (): RegistrationFormData => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            return {
                ...parsed,
                aadhaar_front: null,
                candidate_photo: null
            };
        } catch (e) {
            console.error("Failed to parse cached form data:", e);
        }
    }
    return {
        registration_type: 'institution',
        institution_id: '',
        institution_ref: '',
        institution_verified: false,
        full_name: '',
        aadhaar_number: '',
        dob: '',
        category: '',
        gender: 'male',
        email: '',
        whatsapp_number: '',
        father_name: '',
        father_number: '',
        guardian_name: '',
        guardian_phone: '',
        requires_accommodation: false,
        aadhaar_front: null,
        candidate_photo: null,
    };
};

export default function RegisterPage() {
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [isCaptchaVerified, setIsCaptchaVerified] = useState<boolean>(false);
    const [alertModal, setAlertModal] = useState<{ 
        isOpen: boolean; 
        message: string; 
        title?: string;
        type?: 'success' | 'warning';
        extraData?: string;
    }>({
        isOpen: false,
        message: '',
        title: '',
        type: 'warning',
        extraData: ''
    });

    const [formData, setFormData] = useState<RegistrationFormData>(getInitialFormData());
    const [rulesAccepted, setRulesAccepted] = useState<boolean>(false);
    const { participantStatus: status, checkingStatus } = useRegistrationStatus();

    const triggerAlert = (message: string, title?: string, type: 'success' | 'warning' = 'warning', extraData?: string) => {
        setAlertModal({ isOpen: true, message, title, type, extraData });
    };

    const closeAlert = () => {
        setAlertModal((prev) => ({ ...prev, isOpen: false }));
    };

    // Helper to update form data from child components and sync to sessionStorage
    const updateForm = <K extends keyof RegistrationFormData>(field: K, value: RegistrationFormData[K]) => {
        setFormData((prev) => {
            const updated = { ...prev, [field]: value };
            if (field !== 'aadhaar_front') {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));
            }
            return updated;
        });
    };

    const handleNext = () => {
        // Basic validation before going to next step
        if (currentStep === 1) {
            if (formData.registration_type === 'institution') {
                if (!formData.institution_id.trim()) {
                    triggerAlert('Please enter your Institution ID.', 'Missing Information');
                    return;
                }
                if (!formData.institution_verified) {
                    triggerAlert('Please search and verify your Institution ID before continuing.', 'Verification Required');
                    return;
                }
            }
            if (!isCaptchaVerified) {
                triggerAlert('Please solve the security captcha before continuing.', 'Security Check');
                return;
            }
        } else if (currentStep === 2) {
            const { full_name, aadhaar_number, dob, category, whatsapp_number, father_name, father_number, guardian_name, guardian_phone } = formData;
            if (!full_name || !aadhaar_number || !dob || !category || !whatsapp_number || !father_name || !guardian_name || !guardian_phone) {
                triggerAlert('Please fill all required fields before proceeding.', 'Incomplete Fields');
                return;
            }
            if (!validators.isValidAadhaar(aadhaar_number)) {
                triggerAlert('Please enter a mathematically valid Aadhaar number.', 'Invalid Aadhaar');
                return;
            }
            if (!validators.isValidMobile(whatsapp_number)) {
                triggerAlert('Please enter a valid mobile number.', 'Invalid Contact');
                return;
            }
            if (father_number.trim() && !validators.isValidMobile(father_number)) {
                triggerAlert('Please enter a valid mobile number for the Father.', 'Invalid Father Contact');
                return;
            }
            if (!validators.isValidMobile(guardian_phone)) {
                triggerAlert('Please enter a valid mobile number for the Guardian.', 'Invalid Guardian Contact');
                return;
            }
        }
        setCurrentStep((prev) => Math.min(prev + 1, 3));
    };

    const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        if (!formData.aadhaar_front) {
            triggerAlert('Please upload a copy of your Aadhaar card before submitting.', 'Document Required');
            return;
        }
        if (!formData.candidate_photo) {
            triggerAlert('Please upload a passport-size photo before submitting.', 'Photo Required');
            return;
        }
        if (!rulesAccepted) {
            triggerAlert('You must accept the Rules & Regulations and Privacy Policy before submitting.', 'Agreement Required');
            return;
        }

        try {
            const record = await participantsApi.createApplication({
                registration_type: formData.registration_type,
                institution_id: formData.institution_id || undefined,
                institution_ref: formData.institution_ref || undefined,
                full_name: formData.full_name,
                aadhaar_number: formData.aadhaar_number,
                dob: formData.dob,
                category: formData.category,
                gender: formData.gender,
                email: formData.email || undefined,
                whatsapp_number: formData.whatsapp_number,
                father_name: formData.father_name || undefined,
                father_number: formData.father_number || undefined,
                guardian_name: formData.guardian_name,
                guardian_phone: formData.guardian_phone,
                requires_accommodation: formData.requires_accommodation,
                aadhaar_front: formData.aadhaar_front,
                candidate_photo: formData.candidate_photo
            });

            triggerAlert(
                'Application submitted successfully! You can track your status on the status page.', 
                'Registration Success', 
                'success', 
                record.id
            );
            
            // Reset form
            setFormData({
                registration_type: 'institution',
                institution_id: '',
                institution_ref: '',
                full_name: '',
                aadhaar_number: '',
                dob: '',
                category: '',
                gender: 'male',
                email: '',
                whatsapp_number: '',
                father_name: '',
                father_number: '',
                guardian_name: '',
                guardian_phone: '',
                requires_accommodation: false,
                aadhaar_front: null,
                candidate_photo: null
            });
            sessionStorage.removeItem(CACHE_KEY);
            setCurrentStep(1);
        } catch (e: any) {
            console.error('Submission failed:', e);
            let errorMessage = 'Submission failed. Please check your database connection.';
            
            // Extract PocketBase validation error details (e.g. non-unique fields)
            if (e.response && e.response.data) {
                const errorData = e.response.data;
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
                    errorMessage = `The application could not be saved due to conflicts:\n\n${errorList.join('\n')}`;
                }
            } else if (e.message) {
                errorMessage = e.message;
            }
            
            triggerAlert(errorMessage, 'Submission Error');
        }
    };

    if (checkingStatus) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
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
            </div>
        );
    }

    if (status === 'waiting') {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.card} style={{ textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Clock size={48} style={{ color: '#eab308' }} />
                    <h2>Registration Not Yet Started</h2>
                    <p style={{ color: 'var(--text)', lineHeight: '1.6', margin: '8px 0 0 0', maxWidth: '480px' }}>
                        Thank you for your interest! The candidate registration period for the State Level Quran Competition has not commenced yet. Please refer to the timeline on our dashboard for the official opening schedule.
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'closed') {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.card} style={{ textAlign: 'center', padding: '40px', borderTop: '4px solid #ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Ban size={48} style={{ color: '#ef4444' }} />
                    <h2 style={{ color: '#ef4444' }}>Registration Period Closed</h2>
                    <p style={{ color: 'var(--text)', lineHeight: '1.6', margin: '8px 0 0 0', maxWidth: '480px' }}>
                        The registration period for candidate applications has ended. We are no longer accepting new submissions. We sincerely thank everyone for their interest.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2>Application Form</h2>
                    <span className={styles.stepIndicator}>Step {currentStep} of 3</span>
                </div>

                {/* Progress Bar UI */}
                <div className={styles.progressBar}>
                    <div
                         className={styles.progressFill}
                         style={{ width: `${(currentStep / 3) * 100}%` }}
                    />
                </div>

                <div className={styles.formContainer}>
                    {currentStep === 1 && (
                        <Step1Type 
                            formData={formData} 
                            updateForm={updateForm} 
                            onCaptchaVerified={setIsCaptchaVerified} 
                        />
                    )}
                    {currentStep === 2 && (
                        <Step2Details formData={formData} updateForm={updateForm} />
                    )}
                    {currentStep === 3 && (
                        <Step3Upload 
                            formData={formData} 
                            updateForm={updateForm} 
                            rulesAccepted={rulesAccepted}
                            setRulesAccepted={setRulesAccepted}
                        />
                    )}
                </div>

                <div className={styles.navigationButtons}>
                    {currentStep > 1 && (
                        <button onClick={handleBack} className={styles.btnSecondary}>Back</button>
                    )}

                    {currentStep < 3 ? (
                        <button onClick={handleNext} className={styles.btnPrimary}>Continue</button>
                    ) : (
                        <button 
                            onClick={handleSubmit} 
                            className={styles.btnPrimary}
                            disabled={!rulesAccepted}
                        >
                            Submit Application
                        </button>
                    )}
                </div>
            </div>

            {/* Custom Alert Modal */}
            <AlertModal 
                isOpen={alertModal.isOpen} 
                title={alertModal.title} 
                message={alertModal.message} 
                type={alertModal.type}
                extraData={alertModal.extraData}
                onClose={closeAlert} 
            />
        </div>
    );
}
