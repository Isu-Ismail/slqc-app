import React, { useEffect, useRef, useState } from 'react';
import styles from '../InstitutionRegisterPage.module.css';

interface Step1DetailsProps {
    name: string;
    setName: (val: string) => void;
    streetAddress: string;
    setStreetAddress: (val: string) => void;
    pincode: string;
    setPincode: (val: string) => void;
    stateName: string;
    setStateName: (val: string) => void;
    districtName: string;
    setDistrictName: (val: string) => void;
    villageName: string;
    setVillageName: (val: string) => void;
    contactPerson: string;
    setContactPerson: (val: string) => void;
    email: string;
    setEmail: (val: string) => void;
    whatsapp: string;
    setWhatsapp: (val: string) => void;
    phone: string;
    setPhone: (val: string) => void;
    passcode: string;
    setPasscode: (val: string) => void;
    confirmPasscode: string;
    setConfirmPasscode: (val: string) => void;
    isVerified: boolean;
    setIsVerified: (val: boolean) => void;
}

const generateCaptchaText = (): string => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ2345678';
    let text = '';
    for (let i = 0; i < 6; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
};

export default function Step1Details({
    name, setName,
    streetAddress, setStreetAddress,
    pincode, setPincode,
    stateName, setStateName,
    districtName, setDistrictName,
    villageName, setVillageName,
    contactPerson, setContactPerson,
    email, setEmail,
    whatsapp, setWhatsapp,
    phone, setPhone,
    passcode, setPasscode,
    confirmPasscode, setConfirmPasscode,
    isVerified, setIsVerified
}: Step1DetailsProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const localityRef = useRef<HTMLDivElement | null>(null);

    const [captchaText, setCaptchaText] = useState<string>('');
    const [userAnswer, setUserAnswer] = useState<string>('');

    // --- LIVE API LOCATION STATES ---
    const [availableVillages, setAvailableVillages] = useState<string[]>([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [pincodeError, setPincodeError] = useState<string>('');
    const [isLocalityOpen, setIsLocalityOpen] = useState(false);

    // Handle click outside to close the custom locality dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (localityRef.current && !localityRef.current.contains(event.target as Node)) {
                setIsLocalityOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter villages based on user typing
    const filteredVillages = availableVillages.filter(v =>
        v.toLowerCase().includes(villageName.toLowerCase())
    );

    // --- CAPTCHA LOGIC ---
    const handleRefresh = () => {
        const text = generateCaptchaText();
        setCaptchaText(text);
        setUserAnswer('');
        setIsVerified(false);
    };

    useEffect(() => { handleRefresh(); }, []);

    const drawCaptcha = (text: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 120)}, ${Math.floor(Math.random() * 120)}, ${Math.floor(Math.random() * 120)}, 0.25)`;
            ctx.lineWidth = Math.random() * 2 + 1;
            ctx.stroke();
        }

        ctx.font = 'bold 22px "Courier New", Courier, monospace';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const x = 12 + i * 24;
            const y = canvas.height / 2 + (Math.random() * 10 - 5);
            const angle = (Math.random() * 30 - 15) * Math.PI / 180;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillStyle = `rgb(${Math.floor(Math.random() * 80)}, ${Math.floor(Math.random() * 120)}, ${Math.floor(Math.random() * 80)})`;
            ctx.fillText(char, 0, 0);
            ctx.restore();
        }

        for (let i = 0; i < 40; i++) {
            ctx.fillStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 150)}, 0.4)`;
            ctx.beginPath();
            ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }
    };

    useEffect(() => {
        if (captchaText) drawCaptcha(captchaText);
    }, [captchaText]);

    const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUserAnswer(val);
        setIsVerified(val.trim().toUpperCase() === captchaText);
    };

    // --- LIVE PINCODE FETCH LOGIC ---
    // --- LIVE PINCODE FETCH LOGIC ---
    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.replace(/\D/g, '');
        setPincode(code);

        // Reset dependent fields when the user types a new code
        setStateName('');
        setDistrictName('');
        setVillageName('');
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
                        setStateName(postOffices[0].State);
                        setDistrictName(postOffices[0].District);

                        // Extract unique village/locality names safely
                        const villages = Array.from(new Set(postOffices.map((po: any) => po.Name))) as string[];
                        setAvailableVillages(villages);

                        // Automatically open dropdown since valid locations are found
                        setIsLocalityOpen(true);
                    }
                } else {
                    // API returned success structure but no records matched. Fall back to manual input.
                    setPincodeError("Pincode details not found in database. Please enter details manually.");
                }
            } catch (error) {
                console.error("Failed to fetch location data", error);
                // API network downtime fallback notice
                setPincodeError("Could not auto-fetch location. Please enter your address details manually.");
            } finally {
                setIsLoadingLocation(false);
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Institution Name *</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="Enter school or institution name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>

            {/* --- ADDRESS SECTION --- */}
            <div className={styles.inputGroup}>
                <label className={styles.label}>Door No, Building, & Street *</label>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. 12B, School Street, North Zone"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    required
                />
            </div>

            <div className={styles.inputRow} style={{ display: 'flex', gap: '15px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>Pincode *</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="6-digit pincode"
                        maxLength={6}
                        value={pincode}
                        onChange={handlePincodeChange}
                        required
                    />
                    {isLoadingLocation && <small style={{ color: '#0d9488', marginTop: '4px', display: 'block' }}>⚡ Fetching locations...</small>}
                    {pincodeError && <small style={{ color: '#ef4444', marginTop: '4px', display: 'block', fontWeight: '500' }}>{pincodeError}</small>}
                </div>

                <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>District *</label>
                    <input
                        type="text"
                        className={styles.input}
                        value={districtName}
                        onChange={(e) => setDistrictName(e.target.value)}
                        placeholder="District Name"
                        required
                        // Only disable if currently loading, allowing manual entry as fallback
                        disabled={isLoadingLocation}
                        style={{ backgroundColor: isLoadingLocation ? '#f1f5f9' : '#ffffff' }}
                    />
                </div>
            </div>

            <div className={styles.inputRow} style={{ display: 'flex', gap: '15px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }} ref={localityRef}>
                    <label className={styles.label}>Village / Locality *</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Enter or search locality..."
                            value={villageName}
                            onChange={(e) => {
                                setVillageName(e.target.value);
                                if (availableVillages.length > 0) setIsLocalityOpen(true);
                            }}
                            onFocus={() => {
                                if (availableVillages.length > 0) setIsLocalityOpen(true);
                            }}
                            disabled={isLoadingLocation}
                            required
                            autoComplete="off"
                            style={{ backgroundColor: isLoadingLocation ? '#f1f5f9' : '#ffffff', width: '100%', boxSizing: 'border-box' }}
                        />

                        {/* Search Suggestions Dropdown Overlay */}
                        {isLocalityOpen && filteredVillages.length > 0 && (
                            <ul style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                left: 0,
                                width: '100%',
                                boxSizing: 'border-box',
                                margin: '0',
                                padding: '4px',
                                listStyle: 'none',
                                backgroundColor: '#fff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                maxHeight: '180px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}>
                                {filteredVillages.map((village, index) => (
                                    <li
                                        key={index}
                                        onClick={() => {
                                            setVillageName(village);
                                            setIsLocalityOpen(false);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            borderRadius: '6px',
                                            color: '#334155',
                                            transition: 'background-color 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                    >
                                        {village}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>State *</label>
                    <input
                        type="text"
                        className={styles.input}
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="State Name"
                        required
                        disabled={isLoadingLocation}
                        style={{ backgroundColor: isLoadingLocation ? '#f1f5f9' : '#ffffff' }}
                    />
                </div>
            </div>
            {/* ----------------------- */}
            <div className={styles.inputRow} style={{ display: 'flex', gap: '15px' }}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Contact Person Name *</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Name of representative or admin"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        required
                    />
                </div>


                <div className={styles.inputGroup} >
                    <label className={styles.label}>Email Address *</label>
                    <input
                        type="email"
                        className={styles.input}
                        placeholder="e.g. contact@school.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
            </div>
            <div className={styles.inputRow} style={{ display: 'flex', gap: '15px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>WhatsApp Number *</label>
                    <input
                        type="tel"
                        className={styles.input}
                        placeholder="10-digit whatsapp number"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                        required
                    />
                </div>


                <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>Phone Number (Optional)</label>
                    <input
                        type="tel"
                        className={styles.input}
                        placeholder="Alternate contact phone number"
                        value={phone}
                        maxLength={10}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                </div>
            </div>

            <div className={styles.inputRow} style={{ display: 'flex', gap: '15px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>Passcode *</label>
                    <input
                        type="password"
                        className={styles.input}
                        placeholder="Create passcode to track"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        required
                    />
                </div>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>Confirm Passcode *</label>
                    <input
                        type="password"
                        className={styles.input}
                        placeholder="Confirm passcode"
                        value={confirmPasscode}
                        onChange={(e) => setConfirmPasscode(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className={styles.captchaBox}>
                <div className={styles.captchaHeader}>
                    <span className={styles.captchaTitle}>Security Verification</span>
                    <span className={`${styles.captchaBadge} ${isVerified ? styles.captchaBadgeSuccess : styles.captchaBadgePending}`}>
                        {isVerified ? 'Verified' : 'Required'}
                    </span>
                </div>
                <p className={styles.hint} style={{ margin: 0 }}>Solve the security code to prove you are a human representative:</p>
                <div className={styles.captchaBody}>
                    <canvas
                        ref={canvasRef}
                        width={160}
                        height={46}
                        className={styles.captchaCanvas}
                    />

                    {!isVerified && (
                        <button
                            type="button"
                            className={styles.refreshBtn}
                            onClick={handleRefresh}
                            title="Refresh Captcha"
                        >
                            <svg className={styles.refreshIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                            </svg>
                        </button>
                    )}

                    {isVerified ? (
                        <div className={styles.captchaVerifiedText}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verification Complete
                        </div>
                    ) : (
                        <input
                            type="text"
                            maxLength={6}
                            className={styles.captchaInput}
                            placeholder="Enter code"
                            value={userAnswer}
                            onChange={handleAnswerChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}