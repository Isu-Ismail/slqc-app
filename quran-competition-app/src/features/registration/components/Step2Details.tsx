// src/features/registration/components/Step2Details.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import type { RegistrationFormData } from '../views/register/RegisterPage';
import { validators } from '../../../utils/validators';
import { useRegistrationStatus } from '../../../shared/context/StatusContext';
import { checkAgeEligibility, checkCategoryAvailability } from '../../../utils/ageChecker';
import{validateCategorySelection} from '../../../utils/categoryValidator';

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
    const localityRef = useRef<HTMLDivElement | null>(null);

    // ─── LOCAL STATE ACCUMULATORS FOR THE SPLIT ADDRESS FIELD ───────────────────
    const [street, setStreet] = useState('');
    const [pincodeLocal, setPincodeLocal] = useState('');
    const [districtLocal, setDistrictLocal] = useState('');
    const [villageLocal, setVillageNameLocal] = useState('');
    const [stateLocal, setStateNameLocal] = useState('');

    const [availableVillages, setAvailableVillages] = useState<string[]>([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [pincodeError, setPincodeError] = useState('');
    const [isLocalityOpen, setIsLocalityOpen] = useState(false);

    // Close the locality list when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (localityRef.current && !localityRef.current.contains(event.target as Node)) {
                setIsLocalityOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── PIPING COMBINED STRING BACK INTO PROP WITHOUT CHANGING API ENGINES ───
    useEffect(() => {
        const combinedAddress = [
            street.trim(),
            villageLocal.trim(),
            districtLocal.trim(),
            stateLocal.trim(),
            pincodeLocal.trim()
        ].filter(Boolean).join(', ');

        // Pass to parent registration state object property key directly
        updateForm('address' as any, combinedAddress);
    }, [street, villageLocal, districtLocal, stateLocal, pincodeLocal]);

    const filteredVillages = availableVillages.filter(v =>
        v.toLowerCase().includes(villageLocal.toLowerCase())
    );

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.replace(/\D/g, '');
        setPincodeLocal(code);

        setStateNameLocal('');
        setDistrictLocal('');
        setVillageNameLocal('');
        setAvailableVillages([]);
        setPincodeError('');

        if (code.length === 6) {
            setIsLoadingLocation(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${code}`);
                const data = await response.json();

                if (data && data[0] && data[0].Status === "Success") {
                    const postOffices = data[0].PostOffice;
                    if (postOffices && postOffices.length > 0) {
                        setStateNameLocal(postOffices[0].State);
                        setDistrictLocal(postOffices[0].District);
                        const villages = Array.from(new Set(postOffices.map((po: any) => po.Name))) as string[];
                        setAvailableVillages(villages);
                        setIsLocalityOpen(true);
                    }
                } else {
                    setPincodeError("Invalid Pincode. Please write manually.");
                }
            } catch (error) {
                setPincodeError("Could not auto-fetch address. Please write manually.");
            } finally {
                setIsLoadingLocation(false);
            }
        }
    };

    const eventDate = metadata.event_date;
    const ageCriteria = useMemo(() => {
        const raw = metadata.event_age_criteria;
        if (!raw) return undefined;
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return undefined; }
        }
        return raw;
    }, [metadata.event_age_criteria]);

    const limitConfig = useMemo(() => {
        const raw = metadata.applications_per_institute;
        if (!raw) return undefined;
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return undefined; }
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

    // Insert this replacement hook inside your Step2Details component
    useEffect(() => {
        if (formData.category && formData.dob) {
            const validation = validateCategorySelection(
                formData.category,
                formData.dob,
                eventDate,
                ageCriteria,
                ageBuffer,
                formData.registration_type,
                formData.institution_applications,
                limitConfig
            );

            if (!validation.allowed) {
                updateForm('category', ''); // Reset invalid choice
                setErrors(prev => ({
                    ...prev,
                    category: validation.message
                }));
            }
        }
    }, [formData.dob, formData.category, eligibility, formData.registration_type, formData.institution_applications, limitConfig, updateForm]);

    const validateField = (key: string, value: any) => {
        const fieldConfig = FORM_FIELDS_CONFIG.find(f => f.key === key);
        if (!fieldConfig) return;

        // Skip standard rendering loops for the address string field block completely
        if (key === 'address') return;

        if (key === 'aadhaar_number' && formData.no_aadhaar) {
            setErrors(prev => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            });
            return;
        }

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

        if (value) {
            if (fieldConfig.validationType === 'phone') {
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

        setErrors(prev => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
        });
    };

    const renderField = (field: typeof FORM_FIELDS_CONFIG[0]) => {
        if (field.customFormRender || field.key === 'address') {
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
                ) : isAadhaarField ? (
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
                {FORM_FIELDS_CONFIG.filter(f => f.section === 'candidate').map(renderField)}

                {/* ─── DYNAMIC SPLIT ADDRESS INTERFACE REGION ────────────────────────── */}
                <div className={styles.inputGroupFull} style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '8px 0' }}>
                    <div className={styles.inputGroupFull}>
                        <label className={styles.inputLabel}>Door No, Building, & Street Road *</label>
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="e.g. 12B, Mosque Street"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Pincode *</label>
                            <input
                                type="text"
                                className={styles.inputField}
                                placeholder="6-digit pincode"
                                maxLength={6}
                                value={pincodeLocal}
                                onChange={handlePincodeChange}
                                required
                            />
                            {isLoadingLocation && <small style={{ color: '#0d9488', marginTop: '4px' }}>Fetching details...</small>}
                            {pincodeError && <small style={{ color: '#ef4444', marginTop: '4px' }}>{pincodeError}</small>}
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>District *</label>
                            <input
                                type="text"
                                className={styles.inputField}
                                value={districtLocal}
                                placeholder="District"
                                onChange={(e) => setDistrictLocal(e.target.value)}
                                disabled={isLoadingLocation}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }} ref={localityRef}>
                        <div className={styles.inputGroup} style={{ position: 'relative' }}>
                            <label className={styles.inputLabel}>Village / Locality *</label>
                            <input
                                type="text"
                                className={styles.inputField}
                                placeholder="Search or select locality..."
                                value={villageLocal}
                                disabled={isLoadingLocation}
                                onChange={(e) => {
                                    setVillageNameLocal(e.target.value);
                                    if (availableVillages.length > 0) setIsLocalityOpen(true);
                                }}
                                onFocus={() => {
                                    if (availableVillages.length > 0) setIsLocalityOpen(true);
                                }}
                                required
                                autoComplete="off"
                            />
                            {isLocalityOpen && filteredVillages.length > 0 && (
                                <ul style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    width: '100%',
                                    margin: '4px 0 0 0',
                                    padding: '4px',
                                    listStyle: 'none',
                                    backgroundColor: '#fff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    zIndex: 100
                                }}>
                                    {filteredVillages.map((village, idx) => (
                                        <li
                                            key={idx}
                                            onClick={() => {
                                                setVillageNameLocal(village);
                                                setIsLocalityOpen(false);
                                            }}
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                        >
                                            {village}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>State *</label>
                            <input
                                type="text"
                                className={styles.inputField}
                                value={stateLocal}
                                placeholder="State"
                                onChange={(e) => setStateNameLocal(e.target.value)}
                                disabled={isLoadingLocation}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Competition Category Selection */}
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

                {/* Custom Juz Option Selection */}
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

                <div className={styles.inputGroupFull}>
                    <hr className={styles.sectionDivider} />
                    <h4 className={styles.sectionTitle}>Guardian Details</h4>
                </div>

                {FORM_FIELDS_CONFIG.filter(f => f.section === 'guardian').map(renderField)}

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