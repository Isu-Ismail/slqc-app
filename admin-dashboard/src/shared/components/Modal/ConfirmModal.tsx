import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'confirm' | 'alert' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onClose: () => void;
}

export default function ConfirmModal({ 
    isOpen, 
    title, 
    message, 
    type = 'confirm',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm, 
    onClose 
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const isAlert = type === 'alert' || type === 'success';

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
        }}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', overflow: 'hidden',
                animation: 'scaleIn 0.2s ease-out'
            }}>
                <div style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{
                        background: type === 'confirm' ? '#fee2e2' : type === 'success' ? '#dcfce7' : '#e0f2fe',
                        color: type === 'confirm' ? '#ef4444' : type === 'success' ? '#22c55e' : '#0ea5e9',
                        padding: '12px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {type === 'confirm' && <AlertTriangle size={24} />}
                        {type === 'success' && <CheckCircle size={24} />}
                        {type === 'alert' && <Info size={24} />}
                    </div>
                    <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>{title}</h3>
                        <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>{message}</p>
                    </div>
                </div>

                <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    {!isAlert && (
                        <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '600', color: '#64748b', fontSize: '14px', transition: '0.2s' }}>
                            {cancelText}
                        </button>
                    )}
                    <button 
                        onClick={() => { onConfirm(); if (isAlert) onClose(); }} 
                        style={{ 
                            padding: '10px 16px', borderRadius: '8px', border: 'none', 
                            background: type === 'confirm' ? '#ef4444' : '#0f766e', 
                            cursor: 'pointer', fontWeight: '600', color: 'white', fontSize: '14px', transition: '0.2s' 
                        }}
                    >
                        {isAlert ? 'OK' : confirmText}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
