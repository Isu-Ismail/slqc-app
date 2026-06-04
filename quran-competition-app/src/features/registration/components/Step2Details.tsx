// src/features/registration/components/Step2Details.tsx
import { useState, useEffect, useMemo } from 'react';
import type { RegistrationFormData } from '../views/register/RegisterPage';
import { validators } from '../../../utils/validators';
import { useRegistrationStatus } from '../../../shared/context/StatusContext';
import { checkAgeEligibility } from '../../../utils/ageChecker';
import styles from './Step2Details.module.css';

interface Step2Props {
    formData: RegistrationFormData;
    updateForm: <K extends keyof RegistrationFormData>(field: K, value: RegistrationFormData[K]) => void;
}

interface ValidationErrors {
    full_name?: string;
    aadhaar_number?: string;
    dob?: string;
    category?: string;
    email?: string;
    whatsapp_number?: string;
    father_name?: string;
    father_number?: string;
    guardian_name?: string;
    guardian_phone?: string;
}

export default function Step2Details({ formData, updateForm }: Step2Props) {
    const [errors, setErrors] = useState<ValidationErrors>({});
    const { metadata } = useRegistrationStatus();

    const eventDate = metadata.event_date;
    const ageCriteria = metadata.event_age_criteria;
    const ageBuffer = metadata.age_buffer_months !== undefined ? Number(metadata.age_buffer_months) : 3;

    const eligibility = useMemo(() => {
        return checkAgeEligibility(
            formData.dob,
            eventDate,
            ageCriteria || {
                '5_juz': { min: 0, max: 15 },
                '15_juz': { min: 0, max: 19 },
                '30_juz': { min: 0, max: 25 }
            },
            ageBuffer
        );
    }, [formData.dob, eventDate, ageCriteria, ageBuffer]);

    useEffect(() => {
        if (formData.dob && formData.category) {
            const currentEligibility = eligibility[formData.category];
            if (currentEligibility && !currentEligibility.eligible) {
                updateForm('category', '');
                setErrors(prev => ({
                    ...prev,
                    category: `Age mismatch: ${currentEligibility.message}`
                }));
            }
        }
    }, [formData.dob, formData.category, eligibility, updateForm]);

    const handleAadhaarBlur = () => {
        if (!formData.aadhaar_number) {
            setErrors(prev => ({ ...prev, aadhaar_number: 'Aadhaar number is required.' }));
            return;
        }
        const isValid = validators.isValidAadhaar(formData.aadhaar_number);
        if (!isValid) {
            setErrors(prev => ({ 
                ...prev, 
                aadhaar_number: 'Invalid Aadhaar number (must be 12 digits and mathematically valid).' 
            }));
        } else {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy.aadhaar_number;
                return copy;
            });
        }
    };

    const handleMobileBlur = () => {
        if (!formData.whatsapp_number) {
            setErrors(prev => ({ ...prev, whatsapp_number: 'Mobile number is required.' }));
            return;
        }
        const isValid = validators.isValidMobile(formData.whatsapp_number);
        if (!isValid) {
            setErrors(prev => ({ 
                ...prev, 
                whatsapp_number: 'Please enter a valid 10-digit mobile number starting with 6-9.' 
            }));
        } else {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy.whatsapp_number;
                return copy;
            });
        }
    };

    const handleEmailBlur = () => {
        if (!formData.email) return; // Optional in form schema, but validate if entered
        const isValid = validators.isValidEmail(formData.email);
        if (!isValid) {
            setErrors(prev => ({ 
                ...prev, 
                email: 'Please enter a valid email address.' 
            }));
        } else {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy.email;
                return copy;
            });
        }
    };

    const handleFatherPhoneBlur = () => {
        if (!formData.father_number) {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy.father_number;
                return copy;
            });
            return;
        }
        const isValid = validators.isValidMobile(formData.father_number);
        if (!isValid) {
            setErrors(prev => ({ 
                ...prev, 
                father_number: 'Please enter a valid 10-digit mobile number starting with 6-9.' 
            }));
        } else {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy.father_number;
                return copy;
            });
        }
    };

    const handleGuardianPhoneBlur = () => {
        if (!formData.guardian_phone) {
            setErrors(prev => ({ ...prev, guardian_phone: 'Guardian phone is required.' }));
            return;
        }
        const isValid = validators.isValidMobile(formData.guardian_phone);
        if (!isValid) {
            setErrors(prev => ({ 
                ...prev, 
                guardian_phone: 'Please enter a valid 10-digit mobile number starting with 6-9.' 
            }));
        } else {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy.guardian_phone;
                return copy;
            });
        }
    };

    const handleRequiredBlur = (field: keyof ValidationErrors, label: string) => {
        const val = formData[field as keyof RegistrationFormData];
        if (!val) {
            setErrors(prev => ({ ...prev, [field]: `${label} is required.` }));
        } else {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy[field];
                return copy;
            });
        }
    };

    return (
        <div className={styles.stepContainer}>
            <div>
                <h3 className={styles.stepTitle}>Personal & Contact Details</h3>
                <p className={styles.stepDesc}>Please fill in the details of the candidate accurately.</p>
            </div>

            <div className={styles.formGrid}>
                {/* Full Name */}
                <div className={styles.inputGroupFull}>
                    <label className={styles.inputLabel} htmlFor="full_name">
                        Full Name (as in Aadhaar) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="full_name"
                        className={`${styles.inputField} ${errors.full_name ? styles.inputError : ''}`}
                        placeholder="Enter full name"
                        value={formData.full_name}
                        onChange={(e) => updateForm('full_name', e.target.value)}
                        onBlur={() => handleRequiredBlur('full_name', 'Full name')}
                    />
                    {errors.full_name && <span className={styles.errorMessage}>{errors.full_name}</span>}
                </div>

                {/* Father's Name */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="father_name">
                        Father's Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="father_name"
                        className={`${styles.inputField} ${errors.father_name ? styles.inputError : ''}`}
                        placeholder="Enter father's name"
                        value={formData.father_name}
                        onChange={(e) => updateForm('father_name', e.target.value)}
                        onBlur={() => handleRequiredBlur('father_name', "Father's name")}
                    />
                    {errors.father_name && <span className={styles.errorMessage}>{errors.father_name}</span>}
                </div>

                {/* Father's Phone */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="father_number">Father's Phone (Optional)</label>
                    <input
                        type="tel"
                        id="father_number"
                        maxLength={10}
                        className={`${styles.inputField} ${errors.father_number ? styles.inputError : ''}`}
                        placeholder="10-digit mobile number"
                        value={formData.father_number}
                        onChange={(e) => updateForm('father_number', e.target.value.replace(/\D/g, ''))}
                        onBlur={handleFatherPhoneBlur}
                    />
                    {errors.father_number && <span className={styles.errorMessage}>{errors.father_number}</span>}
                </div>

                {/* Aadhaar Number */}
                <div className={styles.inputGroupFull}>
                    <label className={styles.inputLabel} htmlFor="aadhaar_number">
                        Aadhaar Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="aadhaar_number"
                        maxLength={12}
                        className={`${styles.inputField} ${errors.aadhaar_number ? styles.inputError : ''}`}
                        placeholder="e.g. 543210987654"
                        value={formData.aadhaar_number}
                        onChange={(e) => updateForm('aadhaar_number', e.target.value.replace(/\D/g, ''))}
                        onBlur={handleAadhaarBlur}
                    />
                    {errors.aadhaar_number ? (
                        <span className={styles.errorMessage}>{errors.aadhaar_number}</span>
                    ) : (
                        <span className={styles.inputHint}>12-digit unique identification number. Will be mathematically verified.</span>
                    )}
                </div>

                {/* Date of Birth */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="dob">
                        Date of Birth <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="date"
                        id="dob"
                        className={`${styles.inputField} ${errors.dob ? styles.inputError : ''}`}
                        value={formData.dob}
                        onChange={(e) => updateForm('dob', e.target.value)}
                        onBlur={() => handleRequiredBlur('dob', 'Date of birth')}
                    />
                    {errors.dob && <span className={styles.errorMessage}>{errors.dob}</span>}
                </div>

                {/* Gender */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Gender</label>
                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            className={`${styles.selectorButton} ${formData.gender === 'male' ? styles.selectorButtonActive : ''}`}
                            onClick={() => updateForm('gender', 'male')}
                        >
                            Male
                        </button>
                        <button
                            type="button"
                            className={`${styles.selectorButton} ${formData.gender === 'female' ? styles.selectorButtonActive : ''}`}
                            onClick={() => updateForm('gender', 'female')}
                        >
                            Female
                        </button>
                    </div>
                </div>

                {/* Category Selection */}
                <div className={styles.inputGroupFull}>
                    <label className={styles.inputLabel}>
                        Competition Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className={styles.buttonGroup}>
                        {(['5_juz', '15_juz', '30_juz'] as const).map((cat) => {
                            const isEligible = !formData.dob || eligibility[cat].eligible;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    disabled={!isEligible}
                                    className={`${styles.selectorButton} ${formData.category === cat ? styles.selectorButtonActive : ''}`}
                                    style={!isEligible ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    onClick={() => updateForm('category', cat)}
                                >
                                    <div>{cat === '5_juz' ? '5 Juz Hifz' : cat === '15_juz' ? '15 Juz Hifz' : '30 Juz Hifz'}</div>
                                    {!isEligible && (
                                        <div style={{ fontSize: '10px', color: '#ff3b30', marginTop: '2px', fontWeight: 'bold' }}>
                                            {eligibility[cat].message}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {errors.category && <span className={styles.errorMessage}>{errors.category}</span>}
                </div>

                {/* Mobile Number */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="whatsapp_number">
                        WhatsApp / Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="tel"
                        id="whatsapp_number"
                        maxLength={10}
                        className={`${styles.inputField} ${errors.whatsapp_number ? styles.inputError : ''}`}
                        placeholder="10-digit mobile number"
                        value={formData.whatsapp_number}
                        onChange={(e) => updateForm('whatsapp_number', e.target.value.replace(/\D/g, ''))}
                        onBlur={handleMobileBlur}
                    />
                    {errors.whatsapp_number && <span className={styles.errorMessage}>{errors.whatsapp_number}</span>}
                </div>

                {/* Email Address */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        className={`${styles.inputField} ${errors.email ? styles.inputError : ''}`}
                        placeholder="e.g. candidate@example.com"
                        value={formData.email}
                        onChange={(e) => updateForm('email', e.target.value)}
                        onBlur={handleEmailBlur}
                    />
                    {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
                </div>

                <div className={styles.inputGroupFull}>
                    <hr className={styles.sectionDivider} />
                    <h4 className={styles.sectionTitle}>Guardian Details</h4>
                </div>

                {/* Guardian Name */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="guardian_name">
                        Guardian's Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="guardian_name"
                        className={`${styles.inputField} ${errors.guardian_name ? styles.inputError : ''}`}
                        placeholder="Enter parent or guardian name"
                        value={formData.guardian_name}
                        onChange={(e) => updateForm('guardian_name', e.target.value)}
                        onBlur={() => handleRequiredBlur('guardian_name', "Guardian's name")}
                    />
                    {errors.guardian_name && <span className={styles.errorMessage}>{errors.guardian_name}</span>}
                </div>

                {/* Guardian Phone */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="guardian_phone">
                        Guardian's Phone <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="tel"
                        id="guardian_phone"
                        maxLength={10}
                        className={`${styles.inputField} ${errors.guardian_phone ? styles.inputError : ''}`}
                        placeholder="10-digit mobile number"
                        value={formData.guardian_phone}
                        onChange={(e) => updateForm('guardian_phone', e.target.value.replace(/\D/g, ''))}
                        onBlur={handleGuardianPhoneBlur}
                    />
                    {errors.guardian_phone && <span className={styles.errorMessage}>{errors.guardian_phone}</span>}
                </div>

                {/* Accommodation Requirement */}
                <div className={styles.inputGroupFull} style={{ marginTop: '12px' }}>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkboxInput}
                            checked={formData.requires_accommodation}
                            onChange={(e) => updateForm('requires_accommodation', e.target.checked)}
                        />
                        <span>Requires Accommodation (Hostel facility during competition)</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
