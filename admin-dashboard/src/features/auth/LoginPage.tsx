import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../../api/db';
import styles from './LoginPage.module.css';
import logoSvg from '../../assets/logo.svg';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            if (authData.token) {
                navigate('/');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <div className={styles.loginHeader}>
                    <img src={logoSvg} alt="SLQC Logo" className={styles.logo} />
                    <h2>Admin Dashboard</h2>
                    <p>Sign in to manage the Quran Competition</p>
                </div>

                <form className={styles.loginForm} onSubmit={handleLogin}>
                    {error && <div className={styles.errorMessage}>{error}</div>}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.loginButton}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
