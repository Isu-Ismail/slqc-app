// src/shared/components/BackButton/BackButton.tsx
import { useNavigate } from 'react-router-dom';
import styles from './BackButton.module.css';

interface BackButtonProps {
    to?: string; // Optional custom route path, defaults to home "/"
}

export default function BackButton({ to = '/' }: BackButtonProps) {
    const navigate = useNavigate();

    return (
        <button onClick={() => navigate(to)} className={styles.backButton}>
            <span className={styles.arrow}>←</span> Back
        </button>
    );
}