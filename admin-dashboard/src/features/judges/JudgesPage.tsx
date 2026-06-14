import React from 'react';
import styles from '../control-panel/ControlPanelPage.module.css';
import { ShieldAlert } from 'lucide-react';

export default function JudgesPage() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Judges Panel</h1>
                <p>Manage judges and assign them to competition venues.</p>
            </div>
            
            <div className={styles.card} style={{ textAlign: 'center', padding: '60px 20px', marginTop: '20px' }}>
                <ShieldAlert size={48} style={{ color: '#0d9488', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Judges List Placeholder</h3>
                <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                    The Judges Panel is currently under construction. You will be able to manage judges, assign venues, and configure grading permissions here.
                </p>
            </div>
        </div>
    );
}
