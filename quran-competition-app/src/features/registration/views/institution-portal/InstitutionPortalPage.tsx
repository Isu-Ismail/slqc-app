// src/features/registration/views/institution-portal/InstitutionPortalPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { pb } from '../../../../api/db';
import { participantsApi } from '../../../../api/routes/participants.api';
import { institutionsApi } from '../../../../api/routes/institutions.api';
import { useRegistrationStatus } from '../../../../shared/context/StatusContext';
import { getJuzCodesForCategory } from '../../../../config/fieldsConfig';
import { validators } from '../../../../utils/validators';

import Step2Details from '../../components/Step2Details';
import Step3Upload from '../../components/Step3Upload';
import AlertModal from '../../../../shared/components/Modal/AlertModal';

import { LogOut, Plus, Trash2, ShieldAlert, Award, Building, User, MapPin, Calendar, CheckCircle2, AlertCircle, XCircle, Clock, Edit } from 'lucide-react';
import styles from './InstitutionPortalPage.module.css';

interface ApplicationItem {
    collectionId: string;
    collectionName: string;
    id: string;
    participant_id: string;
    full_name: string;
    dob: string;
    gender: 'male' | 'female';
    category: '5_juz' | '15_juz' | '30_juz';
    selected_juz: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;
    candidate_photo?: string;
    created: string;
    is_locked?: boolean;
    aadhaar_number?: string;
    aadhaar_front?: string;
    birthcertificate_photo?: string;
    father_name?: string;
    father_number?: string;
    guardian_name?: string;
    guardian_phone?: string;
    requires_accommodation?: boolean;
    street_address?: string;
    village_name?: string;
    district_name?: string;
    state_name?: string;
    pincode?: string;
    juz_options?: string;
    address?: string;
    email?: string;
    whatsapp_number: string;
}

interface InstitutionData {
    id: string;
    institution_id: string;
    name: string;
    street_address: string;
    pincode: string;
    state_name: string;
    district_name: string;
    village_name: string;
    contact_person: string;
    email: string;
    whatsapp_number: string;
    phone_number?: string;
    status: 'pending' | 'approved' | 'rejected';
    is_locked?: boolean;
    rejection_reason?: string;
    instituition_location?: string;
}

const AUTH_KEY_INST = 'quran_competition_portal_institution';
const AUTH_KEY_PASS = 'quran_competition_portal_passcode';

export default function InstitutionPortalPage() {
    const { metadata, participantStatus } = useRegistrationStatus();

    // Portal state
    const [loggedInInst, setLoggedInInst] = useState<InstitutionData | null>(null);
    const [passcode, setPasscode] = useState('');
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    
    // Institution Details State
    const [showInstDetailsForm, setShowInstDetailsForm] = useState(false);
    const [isInstFieldsUnlocked, setIsInstFieldsUnlocked] = useState(false);
    const [instFormData, setInstFormData] = useState({
        name: '',
        contact_person: '',
        email: '',
        whatsapp_number: '',
        phone_number: '',
        street_address: '',
        village_name: '',
        district_name: '',
        state_name: '',
        pincode: '',
        instituition_location: ''
    });

    // Sync institution form data when logged in institution data is updated
    useEffect(() => {
        if (loggedInInst) {
            setInstFormData({
                name: loggedInInst.name || '',
                contact_person: loggedInInst.contact_person || '',
                email: loggedInInst.email || '',
                whatsapp_number: loggedInInst.whatsapp_number || '',
                phone_number: loggedInInst.phone_number || '',
                street_address: loggedInInst.street_address || '',
                village_name: loggedInInst.village_name || '',
                district_name: loggedInInst.district_name || '',
                state_name: loggedInInst.state_name || '',
                pincode: loggedInInst.pincode || '',
                instituition_location: loggedInInst.instituition_location || ''
            });
        }
    }, [loggedInInst]);
    
    // Login form state
    const [loginId, setLoginId] = useState('');
    const [loginPasscode, setLoginPasscode] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Dashboard State
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
    const [isWizardFieldsUnlocked, setIsWizardFieldsUnlocked] = useState(false);
    
    // Add Participant form wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [rulesAccepted, setRulesAccepted] = useState(false);
    const [formData, setFormData] = useState<any>({
        registration_type: 'institution',
        institution_id: '',
        institution_ref: '',
        institution_verified: true,
        full_name: '',
        aadhaar_number: '',
        no_aadhaar: false,
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
        address: '',
        street_address: '',
        village_name: '',
        district_name: '',
        state_name: '',
        pincode: '',
        aadhaar_front: null,
        birthcertificate_photo: null,
        candidate_photo: null,
        selected_juz: '',
        juz_options: '',
    });

    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        message: string;
        title?: string;
        type?: 'success' | 'warning';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        message: '',
        title: '',
        type: 'warning'
    });

    const triggerAlert = (message: string, title?: string, type: 'success' | 'warning' = 'warning', onConfirm?: () => void) => {
        setAlertModal({ isOpen: true, message, title, type, onConfirm });
    };

    const closeAlert = () => {
        setAlertModal((prev) => ({ ...prev, isOpen: false }));
    };

    // Restore session on mount
    useEffect(() => {
        const cachedInst = localStorage.getItem(AUTH_KEY_INST);
        const cachedPass = localStorage.getItem(AUTH_KEY_PASS);
        if (cachedInst && cachedPass) {
            try {
                const instObj = JSON.parse(cachedInst);
                setLoggedInInst(instObj);
                setPasscode(cachedPass);
                loadInstitutionDetails(instObj.institution_id || instObj.id, cachedPass);
            } catch (_) {
                localStorage.removeItem(AUTH_KEY_INST);
                localStorage.removeItem(AUTH_KEY_PASS);
            }
        }
    }, []);

    // Load applications & updated details
    // Load applications & updated details
    const loadInstitutionDetails = async (query: string, passVal: string) => {
        try {
            const data = await pb.send<any>('/api/public/track-institution', {
                method: 'GET',
                query: { query, passcode: passVal }
            });
            if (data && data.institution) {
                setLoggedInInst(data.institution);
                setApplications(data.applications || []);
                localStorage.setItem(AUTH_KEY_INST, JSON.stringify(data.institution));
                localStorage.setItem(AUTH_KEY_PASS, passVal);
                sessionStorage.setItem('quran_competition_track_institution_passcode', passVal);
            }
        } catch (err: any) {
            console.error('Failed to load institution details:', err);
            // If mismatch/unauthorized, log out
            if (err.status === 403 || err.status === 404) {
                handleLogout();
            }
        }
    };

    // Real-time tracking subscription
    useEffect(() => {
        if (!loggedInInst || !passcode) return;

        const handleTriggerUpdate = () => {
            console.log('[Portal] Realtime event received. Refetching details...');
            loadInstitutionDetails(loggedInInst.id, passcode);
        };

        pb.collection('trigger_collection').subscribe('*', (e) => {
            if (e.record && (e.record.column_name === 'participants_application' || e.record.column_name === 'institutions')) {
                handleTriggerUpdate();
            }
        }).catch((err) => {
            console.error('[Portal] Failed to subscribe to trigger_collection:', err);
        });

        return () => {
            pb.collection('trigger_collection').unsubscribe('*').catch(() => {});
        };
    }, [loggedInInst?.id, passcode]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginId.trim() || !loginPasscode.trim()) {
            setErrorMsg('Please enter both Institution ID/Email and Passcode.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        try {
            const data = await pb.send<any>('/api/public/track-institution', {
                method: 'GET',
                query: { query: loginId.trim(), passcode: loginPasscode.trim() }
            });

            if (data && data.institution) {
                setLoggedInInst(data.institution);
                setPasscode(loginPasscode.trim());
                setApplications(data.applications || []);
                localStorage.setItem(AUTH_KEY_INST, JSON.stringify(data.institution));
                localStorage.setItem(AUTH_KEY_PASS, loginPasscode.trim());
                sessionStorage.setItem('quran_competition_track_institution_passcode', loginPasscode.trim());
            } else {
                setErrorMsg('Invalid response from server.');
            }
        } catch (err: any) {
            console.error('Login failed:', err);
            if (err.status === 404 || err.status === 403) {
                setErrorMsg('No matching institution found with this ID and Passcode.');
            } else {
                setErrorMsg(err.message || 'Failed to authenticate. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setLoggedInInst(null);
        setPasscode('');
        setApplications([]);
        localStorage.removeItem(AUTH_KEY_INST);
        localStorage.removeItem(AUTH_KEY_PASS);
        sessionStorage.removeItem('quran_competition_track_institution_passcode');
        setShowAddForm(false);
        setShowInstDetailsForm(false);
    };

    // Calculate slots config
    const limitConfig = useMemo(() => {
        const raw = metadata.applications_per_institute;
        if (!raw) return [];
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return []; }
        }
        return raw;
    }, [metadata.applications_per_institute]);

    const getCategoryLimit = (catKey: string) => {
        const item = limitConfig?.find((l: any) => l.cat === catKey);
        return item ? Number(item.count) : 3;
    };

    const getCategoryCount = (catKey: string) => {
        return applications.filter(app => app.category === catKey).length;
    };

    const totalLimit = getCategoryLimit('5_juz') + getCategoryLimit('15_juz') + getCategoryLimit('30_juz');
    const totalRegistered = applications.length;

    // Delete application
    const handleDeleteApplication = (appId: string, participantName: string) => {
        if (!loggedInInst) return;

        triggerAlert(
            `Are you sure you want to delete the application for "${participantName}"? This action cannot be undone.`,
            'Delete Confirmation',
            'warning',
            async () => {
                try {
                    await pb.send('/api/public/institution/delete-application', {
                        method: 'POST',
                        body: {
                            application_id: appId,
                            institution_id: loggedInInst.institution_id,
                            passcode: passcode
                        }
                    });
                    triggerAlert('Application deleted successfully.', 'Deleted', 'success');
                    loadInstitutionDetails(loggedInInst.institution_id, passcode);
                } catch (e: any) {
                    console.error('Delete failed:', e);
                    triggerAlert(e.message || 'Failed to delete application. Approved records cannot be deleted.', 'Error');
                }
            }
        );
    };

    const handleSaveInstitutionDetails = async () => {
        if (!loggedInInst) return;

        // Validation
        if (
            !instFormData.name.trim() || 
            !instFormData.contact_person.trim() || 
            !instFormData.email.trim() || 
            !instFormData.whatsapp_number.trim() || 
            !instFormData.street_address.trim() || 
            !instFormData.pincode.trim()
        ) {
            triggerAlert('Please fill in all required fields (Name, Contact Person, Email, WhatsApp, Street Address, Pincode).', 'Validation Error');
            return;
        }

        if (instFormData.whatsapp_number && !validators.isValidMobile(instFormData.whatsapp_number)) {
            triggerAlert('Please enter a valid 10-digit mobile number for WhatsApp.', 'Invalid Contact');
            return;
        }

        setLoading(true);
        try {
            sessionStorage.setItem('quran_competition_track_institution_passcode', passcode);
            const updated = await institutionsApi.updateInstitution(loggedInInst.id, instFormData);
            triggerAlert('Institution details updated successfully!', 'Success', 'success', () => {
                loadInstitutionDetails(updated.institution_id || updated.id, passcode);
            });
            setLoggedInInst(updated);
            localStorage.setItem(AUTH_KEY_INST, JSON.stringify(updated));
            setIsInstFieldsUnlocked(false);
        } catch (err: any) {
            console.error('Failed to update institution:', err);
            triggerAlert(err.message || 'Failed to update institution details.', 'Error');
        } finally {
            setLoading(false);
        }
    };

    // Initialize/reset add form state
    const openAddParticipantForm = () => {
        if (!loggedInInst) return;
        setEditingCandidateId(null);
        setIsWizardFieldsUnlocked(true);
        setFormData({
            registration_type: 'institution',
            institution_id: loggedInInst.institution_id,
            institution_ref: loggedInInst.id,
            institution_verified: true,
            full_name: '',
            aadhaar_number: '',
            no_aadhaar: false,
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
            address: `${loggedInInst.street_address || ''}, ${loggedInInst.village_name || ''}, ${loggedInInst.district_name || ''}, ${loggedInInst.state_name || ''} - ${loggedInInst.pincode || ''}`.trim().replace(/^,\s*/, ''),
            street_address: loggedInInst.street_address || '',
            village_name: loggedInInst.village_name || '',
            district_name: loggedInInst.district_name || '',
            state_name: loggedInInst.state_name || '',
            pincode: loggedInInst.pincode || '',
            aadhaar_front: null,
            birthcertificate_photo: null,
            candidate_photo: null,
            selected_juz: '',
            juz_options: '',
        });
        setRulesAccepted(false);
        setCurrentStep(1);
        setShowAddForm(true);
    };

    const handleStartEdit = (app: ApplicationItem) => {
        setEditingCandidateId(app.id);
        setFormData({
            registration_type: 'institution',
            institution_id: loggedInInst?.institution_id || '',
            institution_ref: loggedInInst?.id || '',
            institution_verified: true,
            full_name: app.full_name,
            aadhaar_number: app.aadhaar_number || '',
            no_aadhaar: !app.aadhaar_number,
            dob: app.dob ? app.dob.split(' ')[0] : '',
            category: app.category,
            gender: app.gender,
            email: app.email || '',
            whatsapp_number: app.whatsapp_number,
            father_name: app.father_name || '',
            father_number: app.father_number || '',
            guardian_name: app.guardian_name || '',
            guardian_phone: app.guardian_phone || '',
            requires_accommodation: !!app.requires_accommodation,
            address: `${app.street_address || ''}, ${app.village_name || ''}, ${app.district_name || ''}, ${app.state_name || ''} - ${app.pincode || ''}`.trim().replace(/^,\s*/, ''),
            street_address: app.street_address || '',
            village_name: app.village_name || '',
            district_name: app.district_name || '',
            state_name: app.state_name || '',
            pincode: app.pincode || '',
            aadhaar_front: app.aadhaar_front || null,
            birthcertificate_photo: app.birthcertificate_photo || null,
            candidate_photo: app.candidate_photo || null,
            selected_juz: app.selected_juz || '',
            juz_options: app.juz_options || '',
        });
        setIsWizardFieldsUnlocked(false); // Locked by default when viewing
        setRulesAccepted(true); // Pre-consent for edits
        setCurrentStep(1);
        setShowAddForm(true);
    };

    const updateForm = (field: string, value: any) => {
        setFormData((prev: any) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleNextStep = () => {
        if (currentStep === 1) {
            const requiredFields = [
                { key: 'full_name', label: 'Full Name' },
                { key: 'father_name', label: 'Father Name' },
                { key: 'dob', label: 'Date of Birth' },
                { key: 'category', label: 'Category' },
                { key: 'whatsapp_number', label: 'WhatsApp Number' },
                { key: 'street_address', label: 'Door No, Building, & Street Road' },
                { key: 'pincode', label: 'Pincode' },
                { key: 'village_name', label: 'Village / Locality' },
                { key: 'district_name', label: 'District' },
                { key: 'state_name', label: 'State' },
                { key: 'guardian_name', label: 'Guardian Name' },
                { key: 'guardian_phone', label: 'Guardian Phone' }
            ];

            for (const field of requiredFields) {
                const val = formData[field.key];
                if (val === undefined || val === null || String(val).trim() === '') {
                    triggerAlert(`Please enter a value for "${field.label}".`, 'Incomplete Fields');
                    return;
                }
            }

            if (getJuzCodesForCategory(formData.category).length > 0 && !formData.juz_options) {
                triggerAlert('Please select a Juz option before proceeding.', 'Juz Option Required');
                return;
            }

            if (!formData.no_aadhaar) {
                if (!formData.aadhaar_number) {
                    triggerAlert('Please enter the Aadhaar number.', 'Aadhaar Required');
                    return;
                }
                if (!validators.isValidAadhaar(formData.aadhaar_number)) {
                    triggerAlert('Please enter a mathematically valid Aadhaar number.', 'Invalid Aadhaar');
                    return;
                }
            }

            if (formData.whatsapp_number && !validators.isValidMobile(formData.whatsapp_number)) {
                triggerAlert('Please enter a valid 10-digit mobile number for WhatsApp.', 'Invalid Contact');
                return;
            }
            if (formData.guardian_phone && !validators.isValidMobile(formData.guardian_phone)) {
                triggerAlert('Please enter a valid 10-digit mobile number for Guardian Phone.', 'Invalid Contact');
                return;
            }
            if (formData.father_number && !validators.isValidMobile(formData.father_number)) {
                triggerAlert('Please enter a valid 10-digit mobile number for Father Mobile.', 'Invalid Contact');
                return;
            }
            if (formData.email && !validators.isValidEmail(formData.email)) {
                triggerAlert('Please enter a valid email address.', 'Invalid Email');
                return;
            }

            // Check category availability against limit config
            const originalCandidate = editingCandidateId ? applications.find(a => a.id === editingCandidateId) : null;
            const isChangingCategory = !originalCandidate || formData.category !== originalCandidate.category;

            if (isChangingCategory) {
                const remaining = getCategoryLimit(formData.category) - getCategoryCount(formData.category);
                if (remaining <= 0) {
                    triggerAlert(`Cannot register. All ${getCategoryLimit(formData.category)} slots for the ${formData.category.replace('_', ' ')} category are already filled.`, 'Limit Reached');
                    return;
                }
            }
        }
        setCurrentStep((prev) => prev + 1);
    };

    const handleFormSubmit = async () => {
        if (!formData.no_aadhaar && !formData.aadhaar_front) {
            triggerAlert('Please upload the Aadhaar Card Front Image.', 'Missing File');
            return;
        }
        if (formData.no_aadhaar && !formData.birthcertificate_photo) {
            triggerAlert('Please upload the Birth Certificate.', 'Missing File');
            return;
        }
        if (!formData.candidate_photo) {
            triggerAlert('Please upload the Passport Size Photo.', 'Missing File');
            return;
        }
        if (!rulesAccepted) {
            triggerAlert('Please accept the declaration rules to submit.', 'Consent Required');
            return;
        }

        setLoading(true);
        try {
            if (editingCandidateId) {
                // Update existing application details
                const updatePayload = new FormData();
                updatePayload.append('full_name', formData.full_name);
                updatePayload.append('aadhaar_number', formData.no_aadhaar ? '' : formData.aadhaar_number);
                updatePayload.append('dob', formData.dob);
                updatePayload.append('category', formData.category);
                updatePayload.append('gender', formData.gender);
                if (formData.email) updatePayload.append('email', formData.email);
                updatePayload.append('whatsapp_number', formData.whatsapp_number);
                if (formData.father_name) updatePayload.append('father_name', formData.father_name);
                if (formData.father_number) updatePayload.append('father_number', formData.father_number);
                updatePayload.append('guardian_name', formData.guardian_name);
                updatePayload.append('guardian_phone', formData.guardian_phone);
                updatePayload.append('requires_accommodation', String(formData.requires_accommodation || false));
                updatePayload.append('street_address', formData.street_address.trim());
                updatePayload.append('village_name', formData.village_name.trim());
                updatePayload.append('district_name', formData.district_name.trim());
                updatePayload.append('state_name', formData.state_name.trim());
                updatePayload.append('pincode', formData.pincode);
                if (formData.selected_juz) updatePayload.append('selected_juz', formData.selected_juz);
                if (formData.juz_options) updatePayload.append('juz_options', formData.juz_options);

                if (formData.aadhaar_front instanceof File) {
                    updatePayload.append('aadhaar_front', formData.aadhaar_front);
                }
                if (formData.birthcertificate_photo instanceof File) {
                    updatePayload.append('birthcertificate_photo', formData.birthcertificate_photo);
                }
                if (formData.candidate_photo instanceof File) {
                    updatePayload.append('candidate_photo', formData.candidate_photo);
                }

                // If candidate was rejected, update status to reapplied
                const candidateRecord = applications.find(a => a.id === editingCandidateId);
                if (candidateRecord && candidateRecord.status === 'rejected') {
                    updatePayload.append('status', 'reapplied');
                }

                await participantsApi.updateApplication(editingCandidateId, updatePayload, formData.dob);
                triggerAlert('Candidate details updated successfully!', 'Success', 'success');
            } else {
                // Register a new candidate
                await participantsApi.createApplication({
                    registration_type: 'institution',
                    institution_id: loggedInInst?.institution_id,
                    institution_ref: loggedInInst?.id,
                    full_name: formData.full_name,
                    aadhaar_number: formData.no_aadhaar ? '' : formData.aadhaar_number,
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
                    street_address: formData.street_address,
                    village_name: formData.village_name,
                    district_name: formData.district_name,
                    state_name: formData.state_name,
                    pincode: formData.pincode,
                    aadhaar_front: formData.no_aadhaar ? undefined : formData.aadhaar_front || undefined,
                    birthcertificate_photo: formData.no_aadhaar ? formData.birthcertificate_photo || undefined : formData.birthcertificate_photo || undefined,
                    candidate_photo: formData.candidate_photo,
                    selected_juz: formData.selected_juz || undefined,
                    juz_options: formData.juz_options || undefined
                });
                triggerAlert('Candidate registered successfully!', 'Success', 'success');
            }

            setShowAddForm(false);
            if (loggedInInst) {
                loadInstitutionDetails(loggedInInst.institution_id, passcode);
            }
        } catch (e: any) {
            console.error('Registration failed:', e);
            let errMsg = 'Failed to submit application. Please try again.';
            if (e.response && e.response.data) {
                const errorData = e.response.data;
                if (errorData.error) {
                    errMsg = errorData.error;
                } else {
                    const list: string[] = [];
                    for (const [k, v] of Object.entries(errorData)) {
                        const label = k.replace('_', ' ');
                        const detail = v as any;
                        if (detail && typeof detail === 'object') {
                            list.push(`• ${label}: ${detail.message || 'invalid field'}`);
                        } else {
                            list.push(`• ${label}: ${v}`);
                        }
                    }
                    if (list.length > 0) errMsg = `Validation Errors:\n\n${list.join('\n')}`;
                }
            }
            triggerAlert(errMsg, 'Submission Error');
        } finally {
            setLoading(false);
        }
    };

    if (!loggedInInst) {
        // --- RENDER LOGIN VIEW ---
        return (
            <div className={styles.loginWrapper}>
                <div className={styles.loginCard}>
                    <div className={styles.loginHeader}>
                        <Building className={styles.buildingIcon} size={42} />
                        <h2>Institution Portal</h2>
                        <p>Sign in with your registered ID and Passcode to manage student registrations</p>
                    </div>

                    <form onSubmit={handleLogin} className={styles.loginForm}>
                        {errorMsg && (
                            <div className={styles.loginError}>
                                <ShieldAlert size={16} />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label>Institution ID or Email</label>
                            <input
                                type="text"
                                placeholder="e.g. INST-00001 or Madrasa Email"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Institution Passcode</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={loginPasscode}
                                onChange={(e) => setLoginPasscode(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" className={styles.btnLogin} disabled={loading}>
                            {loading ? 'Authenticating...' : 'Secure Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER PORTAL DASHBOARD VIEW ---
    return (
        <div className={styles.dashboardWrapper}>
            {/* Header / Info Panel */}
            <header className={styles.dashboardHeader} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div className={styles.headerLeft} style={{ alignItems: 'flex-start' }}>
                        <div className={styles.instIconFrame} style={{ marginTop: '4px' }}>
                            <Building size={28} />
                        </div>
                        <div>
                            <h1 className={styles.instName}>{loggedInInst.name}</h1>
                            <div className={styles.headerMetadata} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                                    <span><strong>ID:</strong> {loggedInInst.status === 'rejected' ? 'N/A' : (loggedInInst.institution_id || 'Pending')}</span>
                                    <span className={styles.dot}>•</span>
                                    <span><strong>Contact Person:</strong> {loggedInInst.contact_person}</span>
                                    <span className={styles.dot}>•</span>
                                    <span><strong>Email:</strong> {loggedInInst.email}</span>
                                    <span className={styles.dot}>•</span>
                                    <span><strong>WhatsApp:</strong> {loggedInInst.whatsapp_number}</span>
                                    {loggedInInst.phone_number && (
                                        <>
                                            <span className={styles.dot}>•</span>
                                            <span><strong>Phone:</strong> {loggedInInst.phone_number}</span>
                                        </>
                                    )}
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                                    <strong>Address:</strong> {`${loggedInInst.street_address || ''}, ${loggedInInst.village_name || ''}, ${loggedInInst.district_name || ''}, ${loggedInInst.state_name || ''} - ${loggedInInst.pincode || ''}`.trim().replace(/^,\s*/, '')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.headerActions} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                            onClick={() => setShowInstDetailsForm(!showInstDetailsForm)} 
                            className={styles.btnSecondary}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '38px',
                                padding: '0 14px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                border: '1px solid #cbd5e1',
                                backgroundColor: showInstDetailsForm ? '#f1f5f9' : '#fff',
                                color: '#334155'
                            }}
                        >
                            <Building size={15} />
                            {showInstDetailsForm ? 'Hide Details' : 'Details'}
                        </button>
                        <span className={`${styles.statusBadge} ${styles['status_' + loggedInInst.status]}`}>
                            {loggedInInst.status.toUpperCase()}
                        </span>
                        <button onClick={handleLogout} className={styles.btnLogout}>
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {showInstDetailsForm && (
                <div className={styles.wizardCard} style={{ marginBottom: '24px', animation: 'slideUp 0.2s ease-out' }}>
                    <div className={styles.wizardHeader}>
                        <div>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building size={20} style={{ color: '#059669' }} />
                                Institution Profile Details
                            </h2>
                            <p>
                                {loggedInInst.is_locked 
                                    ? 'This profile is locked and cannot be edited.' 
                                    : 'You can update your institution details below. Unlocking fields enables edits.'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {!loggedInInst.is_locked && (
                                <button
                                    onClick={() => setIsInstFieldsUnlocked(!isInstFieldsUnlocked)}
                                    className={styles.btnSecondary}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 12px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        backgroundColor: isInstFieldsUnlocked ? '#fef2f2' : '#f1f5f9',
                                        color: isInstFieldsUnlocked ? '#ef4444' : '#334155',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Edit size={14} />
                                    {isInstFieldsUnlocked ? 'Lock Fields' : 'Edit Details'}
                                </button>
                            )}
                            <button onClick={() => setShowInstDetailsForm(false)} className={styles.btnCancelWizard}>
                                Close
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '4px 0 0 0' }}>
                        <fieldset disabled={!isInstFieldsUnlocked} style={{ border: 'none', padding: 0, margin: 0, width: '100%' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Institution Name *</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.name}
                                        onChange={(e) => setInstFormData({ ...instFormData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Contact Person Name *</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.contact_person}
                                        onChange={(e) => setInstFormData({ ...instFormData, contact_person: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                                    <input
                                        type="email"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.email}
                                        onChange={(e) => setInstFormData({ ...instFormData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>WhatsApp Number *</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.whatsapp_number}
                                        onChange={(e) => setInstFormData({ ...instFormData, whatsapp_number: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Landline/Phone Number</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.phone_number}
                                        onChange={(e) => setInstFormData({ ...instFormData, phone_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Door No / Building / Street Address *</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.street_address}
                                        onChange={(e) => setInstFormData({ ...instFormData, street_address: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Village / Locality *</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.village_name}
                                        onChange={(e) => setInstFormData({ ...instFormData, village_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>District *</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.district_name}
                                        onChange={(e) => setInstFormData({ ...instFormData, district_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>State *</label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.state_name}
                                        onChange={(e) => setInstFormData({ ...instFormData, state_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Pincode *</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.pincode}
                                        onChange={(e) => setInstFormData({ ...instFormData, pincode: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Google Map Location Link</label>
                                    <input
                                        type="url"
                                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: !isInstFieldsUnlocked ? '#f8fafc' : '#fff', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                                        value={instFormData.instituition_location}
                                        onChange={(e) => setInstFormData({ ...instFormData, instituition_location: e.target.value })}
                                        placeholder="https://maps.google.com/?q=..."
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {isInstFieldsUnlocked && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    className={styles.btnSecondary}
                                    onClick={() => {
                                        setIsInstFieldsUnlocked(false);
                                        if (loggedInInst) {
                                            setInstFormData({
                                                name: loggedInInst.name || '',
                                                contact_person: loggedInInst.contact_person || '',
                                                email: loggedInInst.email || '',
                                                whatsapp_number: loggedInInst.whatsapp_number || '',
                                                phone_number: loggedInInst.phone_number || '',
                                                street_address: loggedInInst.street_address || '',
                                                village_name: loggedInInst.village_name || '',
                                                district_name: loggedInInst.district_name || '',
                                                state_name: loggedInInst.state_name || '',
                                                pincode: loggedInInst.pincode || '',
                                                instituition_location: loggedInInst.instituition_location || ''
                                            });
                                        }
                                    }}
                                    style={{ height: '38px', padding: '0 16px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnPrimary}
                                    onClick={handleSaveInstitutionDetails}
                                    disabled={loading}
                                    style={{ height: '38px', padding: '0 16px' }}
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAddForm ? (
                // --- INLINE ADD PARTICIPANT WIZARD ---
                <div className={styles.wizardCard}>
                    <div className={styles.wizardHeader}>
                        <div>
                            <h2>{editingCandidateId ? 'Edit Candidate Details' : 'Add New Candidate'}</h2>
                            <p>{editingCandidateId ? `Editing registration for ${formData.full_name}` : `Registering candidate under ${loggedInInst.name}`}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {editingCandidateId && (() => {
                                const candidateRecord = applications.find(a => a.id === editingCandidateId);
                                const canEdit = candidateRecord && candidateRecord.status !== 'approved' && !candidateRecord.is_locked;
                                if (!canEdit) return null;
                                return (
                                    <button
                                        onClick={() => setIsWizardFieldsUnlocked(!isWizardFieldsUnlocked)}
                                        className={styles.btnSecondary}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '6px 12px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            backgroundColor: isWizardFieldsUnlocked ? '#fef2f2' : '#f1f5f9',
                                            color: isWizardFieldsUnlocked ? '#ef4444' : '#334155',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Edit size={14} />
                                        {isWizardFieldsUnlocked ? 'Lock Fields' : 'Edit Details'}
                                    </button>
                                );
                            })()}
                            <button onClick={() => setShowAddForm(false)} className={styles.btnCancelWizard}>
                                Close
                            </button>
                        </div>
                    </div>

                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${(currentStep / 2) * 100}%` }}
                        />
                    </div>

                    <div className={styles.stepIndicator}>
                        Step {currentStep} of 2: {currentStep === 1 ? 'Details' : 'Upload Documents'}
                    </div>

                    <div className={styles.wizardContent}>
                        {currentStep === 1 ? (
                            <Step2Details formData={formData} updateForm={updateForm} disabled={editingCandidateId ? !isWizardFieldsUnlocked : false} />
                        ) : (() => {
                            const candidateRecord = editingCandidateId ? applications.find(a => a.id === editingCandidateId) : null;
                            const existingAadhaarUrl = candidateRecord && candidateRecord.aadhaar_front 
                                ? pb.files.getURL(candidateRecord as any, candidateRecord.aadhaar_front) 
                                : undefined;
                            const existingBirthCertificateUrl = candidateRecord && candidateRecord.birthcertificate_photo 
                                ? pb.files.getURL(candidateRecord as any, candidateRecord.birthcertificate_photo) 
                                : undefined;
                            const existingPhotoUrl = candidateRecord && candidateRecord.candidate_photo 
                                ? pb.files.getURL(candidateRecord as any, candidateRecord.candidate_photo) 
                                : undefined;

                            return (
                                <Step3Upload
                                    formData={formData}
                                    updateForm={updateForm}
                                    rulesAccepted={rulesAccepted}
                                    setRulesAccepted={setRulesAccepted}
                                    existingAadhaarUrl={existingAadhaarUrl}
                                    existingBirthCertificateUrl={existingBirthCertificateUrl}
                                    existingPhotoUrl={existingPhotoUrl}
                                    disabled={editingCandidateId ? !isWizardFieldsUnlocked : false}
                                />
                            );
                        })()}
                    </div>

                    <div className={styles.wizardNav}>
                        {currentStep > 1 ? (
                            <button onClick={() => setCurrentStep(1)} className={styles.btnSecondary}>
                                Back
                            </button>
                        ) : (
                            <button onClick={() => setShowAddForm(false)} className={styles.btnSecondary}>
                                Cancel
                            </button>
                        )}

                        {currentStep < 2 ? (
                            <button onClick={handleNextStep} className={styles.btnPrimary}>
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={handleFormSubmit}
                                className={styles.btnPrimary}
                                disabled={loading || !rulesAccepted || (editingCandidateId ? !isWizardFieldsUnlocked : false)}
                            >
                                {loading ? 'Submitting...' : (editingCandidateId ? 'Save Changes' : 'Register Candidate')}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                // --- PORTAL MAIN DASHBOARD CONTENT ---
                <>
                    {/* Capacity and Stats Panels */}
                    <section className={styles.statsSection}>
                        <div className={styles.slotsGrid}>
                            {(['5_juz', '15_juz', '30_juz'] as const).map((cat) => {
                                const count = getCategoryCount(cat);
                                const limit = getCategoryLimit(cat);
                                const isFull = count >= limit;
                                return (
                                    <div key={cat} className={`${styles.slotCard} ${isFull ? styles.slotFull : ''}`}>
                                        <div className={styles.slotDetails}>
                                            <span className={styles.slotCategory}>
                                                {cat === '5_juz' ? '5 Juz Memorization' : cat === '15_juz' ? '15 Juz Memorization' : '30 Juz Memorization'}
                                            </span>
                                            <span className={styles.slotCount}>
                                                <strong>{count}</strong> / {limit} slots filled
                                            </span>
                                        </div>
                                        <div className={styles.slotProgress}>
                                            <div
                                                className={styles.slotBarFill}
                                                style={{ width: `${Math.min((count / limit) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.actionsBox} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div className={styles.totalStats}>
                                <span className={styles.totalCount}>{totalRegistered}</span>
                                <span className={styles.totalLabel}>Total Registered Candidates</span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <button
                                    onClick={() => loadInstitutionDetails(loggedInInst.institution_id, passcode)}
                                    className={styles.btnSecondary}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 16px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        backgroundColor: '#fff',
                                        color: '#334155',
                                        height: '42px'
                                    }}
                                    title="Reload candidate list"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                                    </svg>
                                    Reload List
                                </button>

                                {participantStatus === 'open' && loggedInInst.status === 'approved' && totalRegistered < totalLimit && (
                                    <button onClick={openAddParticipantForm} className={styles.btnAddParticipant} style={{ height: '42px' }}>
                                        <Plus size={18} />
                                        Add Participant
                                    </button>
                                )}
                            </div>

                            {loggedInInst.status !== 'approved' && (
                                <div className={styles.warningAlert} style={{ margin: 0 }}>
                                    <AlertCircle size={16} />
                                    <span>Institution is pending approval. You can add candidates once approved.</span>
                                </div>
                            )}
                            {loggedInInst.status === 'approved' && participantStatus !== 'open' && (
                                <div className={styles.warningAlert} style={{ margin: 0 }}>
                                    <Clock size={16} />
                                    <span>Registrations are currently closed.</span>
                                </div>
                            )}
                            {loggedInInst.status === 'approved' && participantStatus === 'open' && totalRegistered >= totalLimit && (
                                <div className={styles.warningAlert} style={{ margin: 0 }}>
                                    <CheckCircle2 size={16} />
                                    <span>All institutional categories limit reached.</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Applications List */}
                    <section className={styles.applicationsSection}>
                        <h2 className={styles.sectionTitle}>Registered Candidates</h2>

                        {applications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <User size={48} className={styles.emptyIcon} />
                                <h3>No Candidates Registered Yet</h3>
                                <p>You haven't submitted any candidate applications for this year's competition.</p>
                                {loggedInInst.status === 'approved' && participantStatus === 'open' && (
                                    <button onClick={openAddParticipantForm} className={styles.btnSecondary} style={{ marginTop: '16px' }}>
                                        Register Your First Student
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={styles.cardsGrid}>
                                {applications.map((app) => {
                                    const photoUrl = app.candidate_photo
                                        ? pb.files.getURL(app as any, app.candidate_photo)
                                        : './placeholder-avatar.png';
                                    return (
                                        <div 
                                            key={app.id} 
                                            className={styles.appCard}
                                            onClick={() => handleStartEdit(app)}
                                            style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                        >
                                            <div className={styles.cardHeader}>
                                                <img src={photoUrl} alt={app.full_name} className={styles.candidatePhoto} />
                                                <div className={styles.candidatePrimaryInfo}>
                                                    <h3 className={styles.candidateName}>{app.full_name}</h3>
                                                    <span className={styles.candidateId}>{app.participant_id || 'ID Pending'}</span>
                                                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                                                        <strong>Track ID:</strong> {app.id}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={styles.cardBody}>
                                                <div className={styles.detailRow}>
                                                    <Award size={14} />
                                                    <span>Category: <strong>{app.category.replace('_', ' ')}</strong></span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <Calendar size={14} />
                                                    <span>DOB: {new Date(app.dob).toLocaleDateString()}</span>
                                                </div>
                                                <div className={styles.detailRow}>
                                                    <MapPin size={14} />
                                                    <span>Juz Selected: {app.selected_juz || 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
                                                <span className={`${styles.appStatusBadge} ${styles['status_' + app.status]}`}>
                                                    {app.status === 'approved' && <CheckCircle2 size={12} />}
                                                    {app.status === 'pending' && <Clock size={12} />}
                                                    {app.status === 'rejected' && <XCircle size={12} />}
                                                    {app.status.toUpperCase()}
                                                </span>

                                                {app.status !== 'approved' && (
                                                    <button
                                                        onClick={() => handleDeleteApplication(app.id, app.full_name)}
                                                        className={styles.btnDeleteApp}
                                                        title="Delete Application"
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete
                                                    </button>
                                                )}
                                            </div>

                                            {app.status === 'rejected' && app.rejection_reason && (
                                                <div className={styles.rejectionReasonBox}>
                                                    <strong>Reason:</strong> {app.rejection_reason}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}

            <AlertModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
                onClose={closeAlert}
                onTrack={alertModal.onConfirm}
            />
        </div>
    );
}
