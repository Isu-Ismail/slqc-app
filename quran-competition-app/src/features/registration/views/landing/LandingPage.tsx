// src/features/registration/views/landing/LandingPage.tsx
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.card}>
                <h1>State Level Quran Competition</h1>
                <p className={styles.desc}>Welcome to the registration and applicant portal.</p>

                <div className={styles.actionGrid}>
                    <button onClick={() => navigate('/register')} className={styles.btnPrimary}>
                        Register
                    </button>
                    <button onClick={() => navigate('/track')} className={styles.btnSecondary}>
                        Registration Status
                    </button>
                </div>
            </div>
        </div>
    );
}