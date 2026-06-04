import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { pb } from '../../../api/db';
import styles from './MainLayout.module.css';
import logoSvg from '../../../assets/logo.svg';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [pendingLanguageCode, setPendingLanguageCode] = useState('en');
    const [pendingLanguageLabel, setPendingLanguageLabel] = useState('English');
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const navigate = useNavigate();

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'ar', label: 'العربية' },
        { code: 'ur', label: 'اردو' },
        { code: 'ml', label: 'മലയാളം' },
        { code: 'ta', label: 'தமிழ்' },
        { code: 'kn', label: 'ಕನ್ನಡ' },
        { code: 'hi', label: 'हिन्दी' },
    ];

    const handleSelectLanguage = (code: string, label: string) => {
        setPendingLanguageCode(code);
        setPendingLanguageLabel(label);
    };

    const triggerTranslation = () => {
        setIsLangMenuOpen(false);
        const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (selectEl) {
            selectEl.value = pendingLanguageCode;
            selectEl.dispatchEvent(new Event('change'));
            setSelectedLanguage(pendingLanguageLabel);
        }
    };

    useEffect(() => {
        if (document.getElementById('google-translate-script')) return;

        const addScript = document.createElement('script');
        addScript.setAttribute('src', 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
        addScript.setAttribute('id', 'google-translate-script');
        document.body.appendChild(addScript);

        (window as any).googleTranslateElementInit = () => {
            new (window as any).google.translate.TranslateElement({
                pageLanguage: 'en',
            }, 'google_translate_element');
        };
    }, []);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const handleLogout = () => {
        pb.authStore.clear();
        navigate('/login');
    };

    const user = pb.authStore.model;

    return (
        <div className={styles.layoutContainer}>
            {/* Backdrop for Mobile Sidebar */}
            <div
                className={`${styles.backdrop} ${isMobileMenuOpen ? styles.backdropVisible : ''}`}
                onClick={closeMobileMenu}
            />

            {/* Sidebar Navigation */}
            <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
                <Link to="/" className={styles.brand} onClick={closeMobileMenu}>
                    <img src={logoSvg} className={styles.logoSvg} alt="SLQC Logo" />
                    <div className={styles.brandText}>
                        <span className={styles.brandTitle}>Admin Panel</span>
                        <span className={styles.brandSubtitle}>SLQC 2026</span>
                    </div>
                </Link>

                <nav className={styles.nav}>
                    <NavLink
                        to="/"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        onClick={closeMobileMenu}
                        end
                    >
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        Dashboard
                    </NavLink>

                    <NavLink
                        to="/track"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        onClick={closeMobileMenu}
                    >
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        Track Application
                    </NavLink>

                    <NavLink
                        to="/approvals"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        onClick={closeMobileMenu}
                    >
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Approval Panel
                    </NavLink>

                    {user?.designation === 'admin' && (
                        <>
                            <NavLink
                                to="/organisers"
                                className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                                onClick={closeMobileMenu}
                            >
                                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                Organisers
                            </NavLink>

                            <NavLink
                                to="/control-panel"
                                className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                                onClick={closeMobileMenu}
                            >
                                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                                Control Panel
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className={styles.sidebarFooter}>
                    <button className={styles.logoutButton} onClick={handleLogout}>
                        Logout
                    </button>
                    <span className={styles.footerText}>Logged in as: {user?.name || user?.email}</span>
                </div>
            </aside>

            {/* Main Page Area */}
            <div className={styles.mainWrapper}>
                <header className={styles.topbar}>
                    <div className={styles.topbarLeft}>
                        <button className={styles.burgerButton} onClick={toggleMobileMenu} aria-label="Toggle Menu">
                            <svg className={styles.burgerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                {isMobileMenuOpen ? (
                                    <>
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </>
                                ) : (
                                    <>
                                        <line x1="4" y1="12" x2="20" y2="12" />
                                        <line x1="4" y1="6" x2="20" y2="6" />
                                        <line x1="4" y1="18" x2="20" y2="18" />
                                    </>
                                )}
                            </svg>
                        </button>
                        <h2 className={styles.pageHeader}>Organizers Dashboard</h2>
                    </div>
                    <div className={styles.topbarActions}>
                        <div id="google_translate_element" style={{ display: 'none' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={styles.customTranslateWrapper}>
                                <button 
                                    type="button"
                                    className={styles.translateBtn} 
                                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                    aria-label="Select Language"
                                >
                                    <svg className={styles.globeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                    <span className={styles.translateLabel}>{pendingLanguageLabel}</span>
                                    <svg className={styles.translateChevron} style={{ width: '12px', height: '12px', opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                                
                                {isLangMenuOpen && (
                                    <>
                                        <div className={styles.translateMenuBackdrop} onClick={() => setIsLangMenuOpen(false)} />
                                        <div className={styles.translateMenu}>
                                            {languages.map((lang) => (
                                                <label
                                                    key={lang.code}
                                                    className={styles.translateMenuItemLabel}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="lang-select"
                                                        checked={pendingLanguageCode === lang.code}
                                                        onChange={() => handleSelectLanguage(lang.code, lang.label)}
                                                        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                                                    />
                                                    <span style={{ color: '#334155', fontWeight: '500' }}>{lang.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <button
                                type="button"
                                onClick={triggerTranslation}
                                className={styles.btnTranslateAction}
                            >
                                Translate
                            </button>
                        </div>
                        <span className={styles.roleBadge}>{user?.designation || 'Staff'}</span>
                    </div>
                </header>

                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}
