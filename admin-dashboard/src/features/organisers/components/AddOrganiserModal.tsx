import { useState } from 'react';
import { usersApi } from '../../../api/users';
import ConfirmModal from '../../../shared/components/Modal/ConfirmModal';
import { X, RefreshCw } from 'lucide-react';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddOrganiserModal({ onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        designation: 'coordinators',
        password: '',
        verified: true
    });
    const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, type: 'alert' | 'success'} | null>(null);

    const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let pass = '';
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password: pass }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await usersApi.createOrganiser(formData);
            setModalConfig({
                isOpen: true,
                title: "Success",
                message: "Organiser created successfully. Credentials queued for emailing.",
                type: 'success'
            });
        } catch (err: any) {
            console.error("Failed to create organiser", err);
            setModalConfig({
                isOpen: true,
                title: "Error",
                message: "Failed to create organiser. " + (err?.message || "Please check your network."),
                type: 'alert'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
        }}>
            <div style={{
                background: 'white', borderRadius: '20px', width: '100%', maxWidth: '500px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }}>
                <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfc' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px', color: '#0f172a', fontWeight: 'bold' }}>Add New Organiser</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Create an account for an admin or coordinator.</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', borderRadius: '50%', padding: '8px', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white' }}>
                    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                        <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>Full Name</label>
                        <input 
                            type="text" 
                            required 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px', color: '#1e293b', outline: 'none', transition: '0.2s' }}
                            placeholder="e.g. John Doe"
                            onFocus={(e) => e.target.style.border = '1px solid #0f766e'}
                            onBlur={(e) => e.target.style.border = '1px solid #e2e8f0'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>Email Address</label>
                        <input 
                            type="email" 
                            required 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px', color: '#1e293b', outline: 'none', transition: '0.2s' }}
                            placeholder="e.g. john@example.com"
                            onFocus={(e) => e.target.style.border = '1px solid #0f766e'}
                            onBlur={(e) => e.target.style.border = '1px solid #e2e8f0'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>Role / Designation</label>
                        <select 
                            value={formData.designation}
                            onChange={(e) => setFormData({...formData, designation: e.target.value})}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px', color: '#1e293b', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                        >
                            <option value="coordinators">Coordinator (Approves Applications)</option>
                            <option value="admin">Administrator (Full Access)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>Mobile Number</label>
                        <input 
                            type="tel" 
                            required 
                            value={formData.mobile}
                            onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px', color: '#1e293b', outline: 'none', transition: '0.2s' }}
                            placeholder="e.g. +91 9876543210"
                            onFocus={(e) => e.target.style.border = '1px solid #0f766e'}
                            onBlur={(e) => e.target.style.border = '1px solid #e2e8f0'}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                            type="checkbox" 
                            id="verifiedCheckbox"
                            checked={formData.verified}
                            onChange={(e) => setFormData({...formData, verified: e.target.checked})}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f766e' }}
                        />
                        <label htmlFor="verifiedCheckbox" style={{ fontSize: '14px', fontWeight: '500', color: '#475569', cursor: 'pointer' }}>
                            Mark as Verified
                        </label>
                    </div>

                    <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
                            <span>Password</span>
                            <button type="button" onClick={generatePassword} style={{ background: '#e0f2fe', borderRadius: '12px', padding: '4px 10px', border: 'none', color: '#0369a1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                <RefreshCw size={12} /> Auto-Generate
                            </button>
                        </label>
                        <input 
                            type="text" 
                            required 
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '15px', color: '#1e293b', outline: 'none', transition: '0.2s' }}
                            placeholder="Enter a strong password"
                            onFocus={(e) => e.target.style.border = '1px solid #0f766e'}
                            onBlur={(e) => e.target.style.border = '1px solid #e2e8f0'}
                        />
                        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '8px' }}>
                            <span style={{color: '#0f766e', fontWeight: 'bold'}}>ℹ</span> Credentials will be emailed automatically.
                        </p>
                    </div>

                    </div>
                    <div style={{ padding: '20px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', background: 'white', flexShrink: 0 }}>
                        <button type="button" onClick={onClose} style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '600', color: '#64748b', fontSize: '14px', transition: '0.2s' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#0f766e', cursor: 'pointer', fontWeight: '600', color: 'white', fontSize: '14px', transition: '0.2s', boxShadow: '0 4px 6px -1px rgba(15, 118, 110, 0.2)' }}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>

            {modalConfig && (
                <ConfirmModal 
                    isOpen={modalConfig.isOpen}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    onConfirm={() => {
                        setModalConfig(null);
                        if (modalConfig.type === 'success') onSuccess();
                    }}
                    onClose={() => {
                        setModalConfig(null);
                        if (modalConfig.type === 'success') onSuccess();
                    }}
                />
            )}
        </div>
    );
}
