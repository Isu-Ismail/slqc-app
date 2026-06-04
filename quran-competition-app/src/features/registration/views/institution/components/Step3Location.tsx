import { useState } from 'react';
import { useRegistrationStatus } from '../../../../../shared/context/StatusContext';
import styles from '../InstitutionRegisterPage.module.css';

interface Step3LocationProps {
    location: string;
    setLocation: (val: string) => void;
    rulesAccepted: boolean;
    setRulesAccepted: (val: boolean) => void;
}

export default function Step3Location({
    location,
    setLocation,
    rulesAccepted,
    setRulesAccepted
}: Step3LocationProps) {
    const { metadata } = useRegistrationStatus();
    const [showRulesModal, setShowRulesModal] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Institution Google Maps Link (Optional)</label>
                <input
                    type="url"
                    className={styles.input}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. https://maps.app.goo.gl/XXXXXX or https://share.google/..."
                />
                
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.5', marginTop: '10px' }}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '600' }}>How to get the link:</p>
                    <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li>Open Google Maps on your phone or computer.</li>
                        <li>Search for your Madrasa, School or Institution.</li>
                        <li>Click the <strong>Share</strong> button.</li>
                        <li>Click <strong>Copy link</strong> and paste it in the box above.</li>
                    </ol>
                </div>

                {location && (
                    <div className={styles.locationMapPreview} style={{ marginTop: '16px' }}>
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                            <a
                                href={location}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.locationMapLink}
                            >
                                Verify Entered Link ↗
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Guidelines & Rules Acceptance Block */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>Guidelines & Regulations</span>
                    <button 
                        type="button" 
                        id="btn-read-institution-rules"
                        onClick={() => setShowRulesModal(true)} 
                        style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        View Guidelines
                    </button>
                </div>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-h)', fontWeight: '500', marginTop: '4px' }}>
                    <input 
                        type="checkbox" 
                        id="accept-institution-rules"
                        checked={rulesAccepted} 
                        onChange={(e) => setRulesAccepted(e.target.checked)} 
                        style={{ marginTop: '3px' }}
                    />
                    <span>
                        I accept the Rules & Regulations and Privacy Policy of the competition.
                    </span>
                </label>
            </div>

            {showRulesModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '600px',
                        height: '80vh',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                        color: '#1e293b',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderBottom: '1px solid #f1f5f9'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Rules & Regulations</h3>
                            <button 
                                onClick={() => setShowRulesModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'block' }}>
                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>
                                {metadata.institution_rules || 'Loading rules & regulations...'}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            padding: '16px 20px',
                            backgroundColor: '#f8fafc',
                            borderTop: '1px solid #f1f5f9'
                        }}>
                            <button 
                                type="button" 
                                onClick={() => setShowRulesModal(false)}
                                style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                            {!rulesAccepted && (
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setRulesAccepted(true);
                                        setShowRulesModal(false);
                                    }}
                                    style={{
                                        backgroundColor: '#10b981',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 20px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#ffffff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    I Accept Rules
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
