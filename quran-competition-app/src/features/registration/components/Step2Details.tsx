// src/features/registration/components/Step2Details.tsx
import { useState, useEffect, useMemo } from 'react';
import type { RegistrationFormData } from '../views/register/RegisterPage';
import { validators } from '../../../utils/validators';
import { useRegistrationStatus } from '../../../shared/context/StatusContext';
import { checkAgeEligibility, checkCategoryAvailability } from '../../../utils/ageChecker';
import styles from './Step2Details.module.css';
import { CATEGORIES_CONFIG, getJuzCodesForCategory, getJuzLabel, FORM_FIELDS_CONFIG } from '../../../config/fieldsConfig';

interface Step2Props {
    formData: RegistrationFormData;
    updateForm: <K extends keyof RegistrationFormData>(field: K, value: RegistrationFormData[K]) => void;
}

interface ValidationErrors {
    [key: string]: string | undefined;
}

export default function Step2Details({ formData, updateForm }: Step2Props) {
    const [errors, setErrors] = useState<ValidationErrors>({});
    const { metadata } = useRegistrationStatus();

    const eventDate = metadata.event_date;
    const ageCriteria = useMemo(() => {
        const raw = metadata.event_age_criteria;
        if (!raw) return undefined;
        if (typeof raw === 'string') {
            try {
                return JSON.parse(raw);
            } catch {
                return undefined;
            }
        }
        return raw;
    }, [metadata.event_age_criteria]);

    const limitConfig = useMemo(() => {
        const raw = metadata.applications_per_institute;
        if (!raw) return undefined;
        if (typeof raw === 'string') {
            try {
                return JSON.parse(raw);
            } catch {
                return undefined;
            }
        }
        return raw;
    }, [metadata.applications_per_institute]);

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
        if (formData.category) {
            if (formData.dob) {
                const currentEligibility = eligibility[formData.category];
                if (currentEligibility && !currentEligibility.eligible) {
                    updateForm('category', '');
                    setErrors(prev => ({
                        ...prev,
                        category: `Age mismatch: ${currentEligibility.message}`
                    }));
                    return;
                }
            }

            if (formData.registration_type === 'institution') {
                const availability = checkCategoryAvailability(
                    formData.category,
                    formData.institution_applications,
                    limitConfig
                );
                if (!availability.available) {
                    updateForm('category', '');
                    setErrors(prev => ({
                        ...prev,
                        category: availability.message
                    }));
                }
            }
        }
    }, [formData.dob, formData.category, eligibility, formData.registration_type, formData.institution_applications, limitConfig, updateForm]);

    const validateField = (key: string, value: any) => {
        const fieldConfig = FORM_FIELDS_CONFIG.find(f => f.key === key);
        if (!fieldConfig) return;

        if (key === 'aadhaar_number' && formData.no_aadhaar) {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            });
            return;
        }

        // 1. Required Check
        if (fieldConfig.required && (value === undefined || value === null || String(value).trim() === '')) {
            if (fieldConfig.key === 'juz_options') {
                if (getJuzCodesForCategory(formData.category).length > 0) {
                    setErrors(prev => ({ ...prev, [key]: 'Juz Option is required.' }));
                    return;
                }
            } else {
                setErrors(prev => ({ ...prev, [key]: `${fieldConfig.label} is required.` }));
                return;
            }
        }

        // 2. Validation Type Check
        if (value) {
            if (fieldConfig.validationType === 'aadhaar') {
                if (!validators.isValidAadhaar(value)) {
                    setErrors(prev => ({ ...prev, [key]: 'Invalid Aadhaar number (must be 12 digits and mathematically valid).' }));
                    return;
                }
            } else if (fieldConfig.validationType === 'phone') {
                if (!validators.isValidMobile(value)) {
                    setErrors(prev => ({ ...prev, [key]: 'Please enter a valid 10-digit mobile number starting with 6-9.' }));
                    return;
                }
            } else if (fieldConfig.validationType === 'email') {
                if (!validators.isValidEmail(value)) {
                    setErrors(prev => ({ ...prev, [key]: 'Please enter a valid email address.' }));
                    return;
                }
            }
        }

        // Clean up error if valid
        setErrors(prev => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
        });
    };

    const renderField = (field: typeof FORM_FIELDS_CONFIG[0]) => {
        if (field.customFormRender) {
            return null;
        }

        const isError = !!errors[field.key];
        const errorMsg = errors[field.key];

        if (field.key === 'gender') {
            return (
                <div key={field.key} className={field.gridSpan === 2 ? styles.inputGroupFull : styles.inputGroup}>
                    <label className={styles.inputLabel}>{field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            className={`${styles.selectorButton} ${formData.gender === 'male' ? styles.selectorButtonActive : ''}`}
                            onClick={() => {
                                updateForm('gender', 'male');
                                validateField('gender', 'male');
                            }}
                        >
                            Male
                        </button>
                        <button
                            type="button"
                            className={`${styles.selectorButton} ${formData.gender === 'female' ? styles.selectorButtonActive : ''}`}
                            onClick={() => {
                                updateForm('gender', 'female');
                                validateField('gender', 'female');
                            }}
                        >
                            Female
                        </button>
                    </div>
                    {isError && <span className={styles.errorMessage}>{errorMsg}</span>}
                </div>
            );
        }

        const isAadhaarField = field.key === 'aadhaar_number';
        const isRequired = field.required && (!isAadhaarField || !formData.no_aadhaar);
 
        if (field.type === 'textarea') {
            return (
                <div key={field.key} className={field.gridSpan === 2 ? styles.inputGroupFull : styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor={field.key}>
                        {field.label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <textarea
                        id={field.key}
                        className={`${styles.inputField} ${isError ? styles.inputError : ''}`}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        value={(formData as any)[field.key] || ''}
                        style={{ minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }}
                        onChange={(e) => {
                            updateForm(field.key as keyof RegistrationFormData, e.target.value as any);
                        }}
                        onBlur={() => validateField(field.key, (formData as any)[field.key])}
                    />
                    {isError && <span className={styles.errorMessage}>{errorMsg}</span>}
                </div>
            );
        }

        return (
            <div key={field.key} className={field.gridSpan === 2 ? styles.inputGroupFull : styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor={field.key}>
                    {field.label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                    type={field.type}
                    id={field.key}
                    maxLength={field.validationType === 'aadhaar' ? 12 : field.validationType === 'phone' ? 10 : undefined}
                    disabled={isAadhaarField && formData.no_aadhaar}
                    className={`${styles.inputField} ${isError ? styles.inputError : ''}`}
                    placeholder={isAadhaarField && formData.no_aadhaar ? "Aadhaar Card is marked as not available" : (field.placeholder || `Enter ${field.label.toLowerCase()}`)}
                    value={(formData as any)[field.key] || ''}
                    onChange={(e) => {
                        let val = e.target.value;
                        if (field.validationType === 'aadhaar' || field.validationType === 'phone') {
                            val = val.replace(/\D/g, '');
                        }
                        updateForm(field.key as keyof RegistrationFormData, val as any);
                    }}
                    onBlur={() => validateField(field.key, (formData as any)[field.key])}
                />
                {isError ? (
                    <span className={styles.errorMessage}>{errorMsg}</span>
                ) : field.validationType === 'aadhaar' ? (
                    <span className={styles.inputHint}>12-digit unique identification number. Will be mathematically verified.</span>
                ) : null}

                {isAadhaarField && (
                    <div style={{ marginTop: '8px' }}>
                        <label className={styles.checkboxLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={!!formData.no_aadhaar}
                                onChange={(e) => {
                                    updateForm('no_aadhaar', e.target.checked);
                                    if (e.target.checked) {
                                        updateForm('aadhaar_number', '');
                                        setErrors(prev => {
                                            const copy = { ...prev };
                                            delete copy.aadhaar_number;
                                            return copy;
                                        });
                                    }
                                }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)' }}>No Aadhaar Card (Birth Certificate upload will be compulsory)</span>
                        </label>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.stepContainer}>
            <div>
                <h3 className={styles.stepTitle}>Personal & Contact Details</h3>
                <p className={styles.stepDesc}>Please fill in the details of the candidate accurately.</p>
            </div>

            <div className={styles.formGrid}>
                {/* 1. Candidate Details Section Fields */}
                {FORM_FIELDS_CONFIG.filter(f => f.section === 'candidate').map(renderField)}

                {/* Custom Category Selection in original place */}
                <div className={styles.inputGroupFull}>
                    <label className={styles.inputLabel}>
                        Competition Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className={styles.buttonGroup}>
                        {CATEGORIES_CONFIG.map((cat) => {
                            const isAgeEligible = !formData.dob || eligibility[cat.key as '5_juz' | '15_juz' | '30_juz'].eligible;

                            let isAvailable = true;
                            let limitMessage = '';
                            if (formData.registration_type === 'institution') {
                                const availability = checkCategoryAvailability(
                                    cat.key,
                                    formData.institution_applications,
                                    limitConfig
                                );
                                isAvailable = availability.available;
                                limitMessage = availability.message;
                            }

                            const isEligible = isAgeEligible && isAvailable;

                            return (
                                <button
                                    key={cat.key}
                                    type="button"
                                    disabled={!isEligible}
                                    className={`${styles.selectorButton} ${formData.category === cat.key ? styles.selectorButtonActive : ''}`}
                                    style={!isEligible ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    onClick={() => {
                                        updateForm('category', cat.key as '5_juz' | '15_juz' | '30_juz');
                                        const codes = getJuzCodesForCategory(cat.key);
                                        if (codes.length === 1) {
                                            updateForm('juz_options', codes[0].code);
                                            updateForm('selected_juz', codes[0].label);
                                        } else {
                                            updateForm('juz_options', '');
                                            updateForm('selected_juz', '');
                                        }
                                        validateField('category', cat.key);
                                    }}
                                >
                                    <div>{cat.label}</div>
                                    {!isEligible && (
                                        <div style={{ fontSize: '10px', color: '#ff3b30', marginTop: '2px', fontWeight: 'bold' }}>
                                            {!isAgeEligible 
                                                ? eligibility[cat.key as '5_juz' | '15_juz' | '30_juz'].message 
                                                : limitMessage}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {errors.category && <span className={styles.errorMessage}>{errors.category}</span>}
                </div>

                {/* Custom Juz Option Selection in original place */}
                {getJuzCodesForCategory(formData.category).length > 0 && (
                    <div className={styles.inputGroupFull}>
                        <label className={styles.inputLabel}>
                            Select Juz Range / Option <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                             className={styles.inputField}
                             value={formData.juz_options || ''}
                             onChange={(e) => {
                                 const code = e.target.value;
                                 updateForm('juz_options', code);
                                 updateForm('selected_juz', getJuzLabel(code));
                                 validateField('juz_options', code);
                             }}
                        >
                            <option value="">-- Choose Juz Range --</option>
                            {getJuzCodesForCategory(formData.category).map((opt) => (
                                <option key={opt.code} value={opt.code}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 2. Divider & Guardian Header */}
                <div className={styles.inputGroupFull}>
                    <hr className={styles.sectionDivider} />
                    <h4 className={styles.sectionTitle}>Guardian Details</h4>
                </div>

                {/* 3. Guardian Details Section Fields */}
                {FORM_FIELDS_CONFIG.filter(f => f.section === 'guardian').map(renderField)}

                {/* Custom Accommodation Requirement checkbox */}
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
