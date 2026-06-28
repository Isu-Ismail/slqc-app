// src/features/registration/components/Step2Details.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import type { RegistrationFormData } from '../views/register/RegisterPage';
import { validators } from '../../../utils/validators';
import { useRegistrationStatus } from '../../../shared/context/StatusContext';
import { checkAgeEligibility, checkCategoryAvailability } from '../../../utils/ageChecker';
import { validateCategorySelection } from '../../../utils/categoryValidator';

import styles from './Step2Details.module.css';
import { CATEGORIES_CONFIG, getJuzCodesForCategory, getJuzLabel } from '../../../config/fieldsConfig';

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

    const filteredVillages = availableVillages.filter(v =>
        v.toLowerCase().includes((formData.village_name || '').toLowerCase())
    );

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.replace(/\D/g, '');
        updateForm('pincode', code);

        updateForm('state_name', '');
        updateForm('district_name', '');
        updateForm('village_name', '');
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
                        updateForm('state_name', postOffices[0].State);
                        updateForm('district_name', postOffices[0].District);
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

    // Validate Category selection when DOB or Category changes
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
        if (key === 'full_name' || key === 'father_name' || key === 'dob' || key === 'whatsapp_number' || key === 'guardian_name' || key === 'guardian_phone' || key === 'street_address' || key === 'village_name' || key === 'district_name' || key === 'state_name' || key === 'pincode') {
            if (value === undefined || value === null || String(value).trim() === '') {
                setErrors(prev => ({ ...prev, [key]: 'This field is required.' }));
                return;
            }
        }
        if (key === 'aadhaar_number' && !formData.no_aadhaar) {
            if (!value || String(value).trim() === '') {
                setErrors(prev => ({ ...prev, [key]: 'Aadhaar Number is required.' }));
                return;
            }
            if (!validators.isValidAadhaar(value)) {
                setErrors(prev => ({ ...prev, [key]: 'Please enter a valid 12-digit Aadhaar number.' }));
                return;
            }
        }
        if (key === 'whatsapp_number' || key === 'guardian_phone' || key === 'father_number') {
            if (value && !validators.isValidMobile(value)) {
                setErrors(prev => ({ ...prev, [key]: 'Please enter a valid 10-digit mobile number starting with 6-9.' }));
                return;
            }
        }
        if (key === 'email' && value) {
            if (!validators.isValidEmail(value)) {
                setErrors(prev => ({ ...prev, [key]: 'Please enter a valid email address.' }));
                return;
            }
        }
        setErrors(prev => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
        });
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
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="full_name"
                        className={`${styles.inputField} ${errors.full_name ? styles.inputError : ''}`}
                        placeholder="Enter full name"
                        value={formData.full_name || ''}
                        onChange={(e) => updateForm('full_name', e.target.value.replace(/[0-9]/g, ''))}
                        onBlur={() => validateField('full_name', formData.full_name)}
                    />
                    {errors.full_name && <span className={styles.errorMessage}>{errors.full_name}</span>}
                </div>

                {/* Father Name */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="father_name">
                        Father Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="father_name"
                        className={`${styles.inputField} ${errors.father_name ? styles.inputError : ''}`}
                        placeholder="Enter father name"
                        value={formData.father_name || ''}
                        onChange={(e) => updateForm('father_name', e.target.value.replace(/[0-9]/g, ''))}
                        onBlur={() => validateField('father_name', formData.father_name)}
                    />
                    {errors.father_name && <span className={styles.errorMessage}>{errors.father_name}</span>}
                </div>

                {/* Father Mobile */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="father_number">
                        Father Mobile
                    </label>
                    <input
                        type="text"
                        id="father_number"
                        maxLength={10}
                        className={`${styles.inputField} ${errors.father_number ? styles.inputError : ''}`}
                        placeholder="Enter father mobile"
                        value={formData.father_number || ''}
                        onChange={(e) => updateForm('father_number', e.target.value.replace(/\D/g, ''))}
                        onBlur={() => validateField('father_number', formData.father_number)}
                    />
                    {errors.father_number && <span className={styles.errorMessage}>{errors.father_number}</span>}
                </div>

                {/* Aadhaar Number */}
                <div className={styles.inputGroupFull}>
                    <label className={styles.inputLabel} htmlFor="aadhaar_number">
                        Aadhaar Number {!formData.no_aadhaar && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                        type="text"
                        id="aadhaar_number"
                        maxLength={12}
                        disabled={formData.no_aadhaar}
                        className={`${styles.inputField} ${errors.aadhaar_number ? styles.inputError : ''}`}
                        placeholder={formData.no_aadhaar ? "Aadhaar Card is marked as not available" : "Enter 12-digit Aadhaar"}
                        value={formData.aadhaar_number || ''}
                        onChange={(e) => updateForm('aadhaar_number', e.target.value.replace(/\D/g, ''))}
                        onBlur={() => validateField('aadhaar_number', formData.aadhaar_number)}
                    />
                    {errors.aadhaar_number ? (
                        <span className={styles.errorMessage}>{errors.aadhaar_number}</span>
                    ) : (
                        <span className={styles.inputHint}>12-digit unique identification number. Will be mathematically verified.</span>
                    )}

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
                        value={formData.dob || ''}
                        onChange={(e) => updateForm('dob', e.target.value)}
                        onBlur={() => validateField('dob', formData.dob)}
                    />
                    {errors.dob && <span className={styles.errorMessage}>{errors.dob}</span>}
                </div>

                {/* Gender */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Gender <span style={{ color: '#ef4444' }}>*</span></label>
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
                    {errors.gender && <span className={styles.errorMessage}>{errors.gender}</span>}
                </div>

                {/* WhatsApp Number */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="whatsapp_number">
                        WhatsApp Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="whatsapp_number"
                        maxLength={10}
                        className={`${styles.inputField} ${errors.whatsapp_number ? styles.inputError : ''}`}
                        placeholder="10-digit WhatsApp number"
                        value={formData.whatsapp_number || ''}
                        onChange={(e) => updateForm('whatsapp_number', e.target.value.replace(/\D/g, ''))}
                        onBlur={() => validateField('whatsapp_number', formData.whatsapp_number)}
                    />
                    {errors.whatsapp_number && <span className={styles.errorMessage}>{errors.whatsapp_number}</span>}
                </div>

                {/* Email */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="email">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        className={`${styles.inputField} ${errors.email ? styles.inputError : ''}`}
                        placeholder="Enter email address"
                        value={formData.email || ''}
                        onChange={(e) => updateForm('email', e.target.value)}
                        onBlur={() => validateField('email', formData.email)}
                    />
                    {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
                </div>

                {/* Address Section */}
                <div className={styles.inputGroupFull} style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '8px 0' }}>
                    <div className={styles.inputGroupFull}>
                        <label className={styles.inputLabel}>Door No, Building, & Street Road *</label>
                        <input
                            type="text"
                            className={`${styles.inputField} ${errors.street_address ? styles.inputError : ''}`}
                            placeholder="e.g. 12B, Mosque Street"
                            value={formData.street_address || ''}
                            onChange={(e) => updateForm('street_address', e.target.value)}
                            onBlur={() => validateField('street_address', formData.street_address)}
                            required
                        />
                        {errors.street_address && <span className={styles.errorMessage}>{errors.street_address}</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Pincode *</label>
                            <input
                                type="text"
                                className={`${styles.inputField} ${errors.pincode ? styles.inputError : ''}`}
                                placeholder="6-digit pincode"
                                maxLength={6}
                                value={formData.pincode || ''}
                                onChange={handlePincodeChange}
                                onBlur={() => validateField('pincode', formData.pincode)}
                                required
                            />
                            {isLoadingLocation && <small style={{ color: '#0d9488', marginTop: '4px' }}>Fetching details...</small>}
                            {pincodeError && <small style={{ color: '#ef4444', marginTop: '4px' }}>{pincodeError}</small>}
                            {errors.pincode && <span className={styles.errorMessage}>{errors.pincode}</span>}
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>District *</label>
                            <input
                                type="text"
                                className={`${styles.inputField} ${errors.district_name ? styles.inputError : ''}`}
                                value={formData.district_name || ''}
                                placeholder="District"
                                onChange={(e) => updateForm('district_name', e.target.value)}
                                onBlur={() => validateField('district_name', formData.district_name)}
                                disabled={isLoadingLocation}
                                required
                            />
                            {errors.district_name && <span className={styles.errorMessage}>{errors.district_name}</span>}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }} ref={localityRef}>
                        <div className={styles.inputGroup} style={{ position: 'relative' }}>
                            <label className={styles.inputLabel}>Village / Locality *</label>
                            <input
                                type="text"
                                className={`${styles.inputField} ${errors.village_name ? styles.inputError : ''}`}
                                placeholder="Search or select locality..."
                                value={formData.village_name || ''}
                                disabled={isLoadingLocation}
                                onChange={(e) => {
                                    updateForm('village_name', e.target.value);
                                    if (availableVillages.length > 0) setIsLocalityOpen(true);
                                }}
                                onFocus={() => {
                                    if (availableVillages.length > 0) setIsLocalityOpen(true);
                                }}
                                onBlur={() => validateField('village_name', formData.village_name)}
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
                                                updateForm('village_name', village);
                                                setIsLocalityOpen(false);
                                                validateField('village_name', village);
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
                            {errors.village_name && <span className={styles.errorMessage}>{errors.village_name}</span>}
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>State *</label>
                            <input
                                type="text"
                                className={`${styles.inputField} ${errors.state_name ? styles.inputError : ''}`}
                                value={formData.state_name || ''}
                                placeholder="State"
                                onChange={(e) => updateForm('state_name', e.target.value)}
                                onBlur={() => validateField('state_name', formData.state_name)}
                                disabled={isLoadingLocation}
                                required
                            />
                            {errors.state_name && <span className={styles.errorMessage}>{errors.state_name}</span>}
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
                            className={`${styles.inputField} ${errors.juz_options ? styles.inputError : ''}`}
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
                        {errors.juz_options && <span className={styles.errorMessage}>{errors.juz_options}</span>}
                    </div>
                )}

                <div className={styles.inputGroupFull}>
                    <hr className={styles.sectionDivider} />
                    <h4 className={styles.sectionTitle}>Guardian Details</h4>
                </div>

                {/* Guardian Name */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="guardian_name">
                        Guardian Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="guardian_name"
                        className={`${styles.inputField} ${errors.guardian_name ? styles.inputError : ''}`}
                        placeholder="Enter guardian name"
                        value={formData.guardian_name || ''}
                        onChange={(e) => updateForm('guardian_name', e.target.value.replace(/[0-9]/g, ''))}
                        onBlur={() => validateField('guardian_name', formData.guardian_name)}
                    />
                    {errors.guardian_name && <span className={styles.errorMessage}>{errors.guardian_name}</span>}
                </div>

                {/* Guardian Phone */}
                <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="guardian_phone">
                        Guardian Phone <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="guardian_phone"
                        maxLength={10}
                        className={`${styles.inputField} ${errors.guardian_phone ? styles.inputError : ''}`}
                        placeholder="Enter guardian mobile number"
                        value={formData.guardian_phone || ''}
                        onChange={(e) => updateForm('guardian_phone', e.target.value.replace(/\D/g, ''))}
                        onBlur={() => validateField('guardian_phone', formData.guardian_phone)}
                    />
                    {errors.guardian_phone && <span className={styles.errorMessage}>{errors.guardian_phone}</span>}
                </div>

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