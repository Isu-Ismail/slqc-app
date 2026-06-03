import { useState, useEffect } from 'react';
import styles from './AlertModal.module.css';

interface AlertModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'success' | 'warning';
    extraData?: string;
    onClose: () => void;
}

export default function AlertModal({ 
    isOpen, 
    title = 'Attention Required', 
    message, 
    type = 'warning', 
    extraData, 
    onClose 
}: AlertModalProps) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setCopied(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCopy = async () => {
        if (extraData) {
            try {
                await navigator.clipboard.writeText(extraData);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy ID: ', err);
            }
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    {type === 'success' ? (
                        <svg className={`${styles.icon} ${styles.iconSuccess}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="16 9 11 14 8 11" />
                        </svg>
                    ) : (
                        <svg className={`${styles.icon} ${styles.iconWarning}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    )}
                    <h3 className={styles.title}>{title}</h3>
                </div>
                
                <p className={styles.message}>{message}</p>

                {extraData && (
                    <div className={styles.extraDataContainer}>
                        <div className={styles.idLabel}>Registration ID</div>
                        <div className={styles.idBox}>
                            <span className={styles.idText}>{extraData}</span>
                            <button 
                                type="button" 
                                className={styles.copyButton} 
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <svg className={styles.copyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <svg className={styles.copyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                )}
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                        <p className={styles.emailNotice}>ID will be sent to registered email shortly.</p>
                    </div>
                )}
                
                <div className={styles.actions}>
                    <button type="button" className={styles.button} onClick={onClose}>
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}

