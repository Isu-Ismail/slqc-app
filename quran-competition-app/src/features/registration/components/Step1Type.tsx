import React, { useEffect, useRef, useState } from 'react';
import type { RegistrationFormData } from '../views/register/RegisterPage';
import { pb } from '../../../api/db';
import styles from './Step1Type.module.css';

interface Step1Props {
    formData: RegistrationFormData;
    updateForm: <K extends keyof RegistrationFormData>(field: K, value: RegistrationFormData[K]) => void;
    onCaptchaVerified: (verified: boolean) => void;
}

const generateCaptchaText = (): string => {
    // Exclude easily confused characters like O, 0, I, 1, L, 9, g
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ2345678';
    let text = '';
    for (let i = 0; i < 6; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
};

export default function Step1Type({ formData, updateForm, onCaptchaVerified }: Step1Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [captchaText, setCaptchaText] = useState<string>('');
    const [userAnswer, setUserAnswer] = useState<string>('');
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const [passcode, setPasscode] = useState<string>('');

    const [verifying, setVerifying] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState<{ text: string; isError: boolean } | null>(
        formData.institution_verified ? { text: `✓ Verified: Approved Institution`, isError: false } : null
    );

    const handleSearchInstitution = async () => {
        if (!formData.institution_id.trim()) {
            setVerificationMessage({ text: 'Please enter an Institution ID.', isError: true });
            return;
        }
        if (!passcode.trim()) {
            setVerificationMessage({ text: 'Please enter the Institution Passcode.', isError: true });
            return;
        }

        setVerifying(true);
        setVerificationMessage(null);
        updateForm('institution_verified', false);

        try {
            const records = await pb.collection('institutions').getList(1, 1, {
                filter: `institution_id = "${formData.institution_id.trim()}" && passcode = "${passcode.trim()}"`
            });
            const record = records.items[0];

            if (!record) {
                setVerificationMessage({ 
                    text: 'No institution found matching this ID and Passcode.', 
                    isError: true 
                });
            } else if (record.status !== 'approved') {
                setVerificationMessage({ 
                    text: 'Institution is registered but not approved yet. Please wait for approval.', 
                    isError: true 
                });
            } else {
                setVerificationMessage({ 
                    text: `✓ Verified: ${record.name}`, 
                    isError: false 
                });
                updateForm('institution_ref', record.id);
                updateForm('institution_verified', true);
            }
        } catch (e) {
            setVerificationMessage({ text: 'Failed to verify institution details. Please try again.', isError: true });
        } finally {
            setVerifying(false);
        }
    };

    // Refresh function to generate a new captcha and reset state
    const handleRefresh = () => {
        const text = generateCaptchaText();
        setCaptchaText(text);
        setUserAnswer('');
        setIsVerified(false);
        onCaptchaVerified(false);
    };

    // Initialize Captcha on mount
    useEffect(() => {
        handleRefresh();
        // Force registration type to institution
        updateForm('registration_type', 'institution');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Draw captcha text on canvas with random scribble lines and noise dots
    const drawCaptcha = (text: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill background with light gray tint
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw some random scribble background lines
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 120)}, ${Math.floor(Math.random() * 120)}, ${Math.floor(Math.random() * 120)}, 0.25)`;
            ctx.lineWidth = Math.random() * 2 + 1;
            ctx.stroke();
        }

        // Draw text with random position, rotation, and colors
        ctx.font = 'bold 22px "Courier New", Courier, monospace';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const x = 12 + i * 24; // Character horizontal space
            const y = canvas.height / 2 + (Math.random() * 10 - 5);
            const angle = (Math.random() * 30 - 15) * Math.PI / 180; // rotation angle between -15 and +15 deg

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillStyle = `rgb(${Math.floor(Math.random() * 80)}, ${Math.floor(Math.random() * 120)}, ${Math.floor(Math.random() * 80)})`; // Islamic theme colors (greens, darks)
            ctx.fillText(char, 0, 0);
            ctx.restore();
        }

        // Add small random noise dots
        for (let i = 0; i < 40; i++) {
            ctx.fillStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 150)}, 0.4)`;
            ctx.beginPath();
            ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }
    };

    // Redraw whenever captchaText changes
    useEffect(() => {
        if (captchaText) {
            drawCaptcha(captchaText);
        }
    }, [captchaText]);

    const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUserAnswer(val);

        // Verification check (case insensitive check)
        if (val.trim().toUpperCase() === captchaText) {
            setIsVerified(true);
            onCaptchaVerified(true);
        } else {
            setIsVerified(false);
            onCaptchaVerified(false);
        }
    };

    return (
        <div className={styles.stepContainer}>
            <h3 className={styles.stepTitle}>Institution Verification</h3>
            <p className={styles.stepDesc}>Applications are accepted only through registered and approved institutions.</p>

            <div className={styles.inputGroup} style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
                <div>
                    <label className={styles.inputLabel}>Institution ID</label>
                    <input
                        type="text"
                        className={styles.inputField}
                        style={{ width: '100%' }}
                        placeholder="e.g. INST-00001"
                        value={formData.institution_id}
                        onChange={(e) => {
                            updateForm('institution_id', e.target.value);
                            updateForm('institution_ref', '');
                            updateForm('institution_verified', false);
                            setVerificationMessage(null);
                        }}
                    />
                </div>

                <div>
                    <label className={styles.inputLabel}>Institution Passcode</label>
                    <input
                        type="password"
                        className={styles.inputField}
                        style={{ width: '100%' }}
                        placeholder="Enter the passcode provided by your institution"
                        value={passcode}
                        onChange={(e) => {
                            setPasscode(e.target.value);
                            updateForm('institution_ref', '');
                            updateForm('institution_verified', false);
                            setVerificationMessage(null);
                        }}
                    />
                </div>

                <button
                    type="button"
                    className={styles.btnVerify}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={handleSearchInstitution}
                    disabled={verifying}
                >
                    {verifying ? 'Verifying...' : 'Verify Institution Credentials'}
                </button>

                {verificationMessage && (
                    <span className={verificationMessage.isError ? styles.errorMsg : styles.successMsg}>
                        {verificationMessage.text}
                    </span>
                )}
            </div>

            {/* Interactive Security Captcha */}
            <div className={styles.captchaBox} style={{ marginTop: '24px' }}>
                <div className={styles.captchaHeader}>
                    <span className={styles.captchaTitle}>Security Verification</span>
                    <span className={`${styles.captchaBadge} ${isVerified ? styles.captchaBadgeSuccess : styles.captchaBadgePending}`}>
                        {isVerified ? 'Verified' : 'Required'}
                    </span>
                </div>
                <p className={styles.inputHint} style={{ margin: 0 }}>Solve the security code to prove you are a human candidate:</p>
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