import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../../api/db';
import styles from './LoginPage.module.css';
import logoSvg from '../../assets/logo.svg';

export default function LoginPage() {
    // Changed 'email' to 'identity' since it can be a username or email
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // PocketBase accepts username OR email as the first argument here
            const authData = await pb.collection('users').authWithPassword(identity, password);
            if (authData.token) {
                navigate('/');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Invalid username/email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <div className={styles.loginHeader}>
                    <img src={logoSvg} alt="SLQC Logo" className={styles.logo} />
                    <h2>SLQC Admin Portal</h2>
                    <p>Sign in to manage the Quran Competition</p>
                </div>

                <form className={styles.loginForm} onSubmit={handleLogin}>
                    {error && <div className={styles.errorMessage}>{error}</div>}

                    <div className={styles.inputGroup}>
                        {/* Updated label to reflect both options */}
                        <label htmlFor="identity">Username or Email</label>
                        <input
                            type="text" // Changed from 'email' to 'text' to prevent browser '@' validation errors
                            id="identity"
                            value={identity}
                            onChange={(e) => setIdentity(e.target.value)}
                            placeholder="username or admin@example.com"
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