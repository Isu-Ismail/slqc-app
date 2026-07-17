import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useRegistrationStatus } from '../../context/StatusContext';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [pendingLanguageCode, setPendingLanguageCode] = useState('en');
    const [pendingLanguageLabel, setPendingLanguageLabel] = useState('English');
    const location = useLocation();
    const { participantStatus, madrasaStatus } = useRegistrationStatus();

    // Decide status display based on path
    const isMadrasaPage = location.pathname.includes('institution-register');
    const currentStatus = isMadrasaPage ? madrasaStatus : participantStatus;

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
                    {/* Stylized Quran/Islamic Geometric SVG Icon */}
                    <img src="./logo.svg" className={styles.logoSvg} alt="SLQC Logo" />
                    <div className={styles.brandText}>
                        <span className={styles.brandTitle}>SLQC Portal</span>
                        <span className={styles.brandSubtitle}>State Level Quran</span>
                    </div>
                </Link>

                <nav className={styles.nav}>
                    <NavLink
                        to="/"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        onClick={closeMobileMenu}
                    >
                        {/* Home Grid Icon */}
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        Dashboard
                    </NavLink>

                    <NavLink
                        to="/portal"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        onClick={closeMobileMenu}
                    >
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Institution Portal
                    </NavLink>

                    <NavLink
                        to="/institution-register"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        onClick={closeMobileMenu}
                    >
                        {/* Institution / Columns Icon */}
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 22h16" />
                            <path d="M20 6H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
                            <path d="M12 2 2 6h20L12 2z" />
                            <path d="M6 12v8M10 12v8M14 12v8M18 12v8" />
                        </svg>
                        Institution Registration
                    </NavLink>

                    <NavLink
                        to="/track"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        onClick={closeMobileMenu}
                    >
                        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Track Application
                    </NavLink>
                </nav>

                {/* Translate widget inside sidebar for mobile */}
                <div className={styles.sidebarTranslate}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <div className={styles.customTranslateWrapperSidebar}>
                            <button 
                                type="button"
                                className={styles.translateBtnSidebar} 
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                aria-label="Select Language"
                            >
                                <svg className={styles.globeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                                <span className={styles.translateLabelSidebar}>{pendingLanguageLabel}</span>
                                <svg className={styles.translateChevron} style={{ width: '12px', height: '12px', opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            
                            {isLangMenuOpen && (
                                <>
                                    <div className={styles.translateMenuBackdrop} onClick={() => setIsLangMenuOpen(false)} />
                                    <div className={styles.translateMenuSidebar}>
                                        {languages.map((lang) => (
                                            <label
                                                key={lang.code}
                                                className={styles.translateMenuItemLabel}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="lang-select-sidebar"
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
                            className={styles.btnTranslateActionSidebar}
                        >
                            Translate
                        </button>
                    </div>
                </div>

                <div className={styles.sidebarFooter}>
                    <span className={styles.footerText}>State Level Quran Competition</span>
                    <span className={styles.footerYear}>State Committee © 2026</span>
                </div>
            </aside>

            {/* Main Page Area */}
            <div className={styles.mainWrapper}>
                <header className={styles.topbar}>
                    {/* Left side: Logo & SLQC Portal title (unified for PC & Mobile) */}
                    <div className={styles.topbarBranding}>
                        <img src="./logo.svg" className={styles.topbarLogo} alt="SLQC Logo" />
                        <h2 className={styles.topbarTitle}>SLQC Portal</h2>
                    </div>

                    {/* Right side: Status Indicator & Hamburger Burger Menu (burger only on Mobile) */}
                    <div className={styles.topbarRightActions}>
                        {/* Google Translate API Hidden Target Container */}
                        <div id="google_translate_element" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}></div>

                        {/* Status Badge */}
                        <div className={
                            currentStatus === 'waiting'
                                ? styles.topbarStatusBadgeWaiting
                                : currentStatus === 'closed'
                                    ? styles.topbarStatusBadgeClosed
                                    : styles.topbarStatusBadge
                        }>
                            <span className={
                                currentStatus === 'waiting'
                                    ? styles.statusIndicatorWaiting
                                    : currentStatus === 'closed'
                                        ? styles.statusIndicatorClosed
                                        : styles.statusIndicator
                            }></span>
                            <span className={styles.topbarStatusText}>
                                {currentStatus === 'waiting'
                                    ? 'Registration Not Started'
                                    : currentStatus === 'closed'
                                        ? 'Registration Closed'
                                        : 'Registration Open'}
                            </span>
                        </div>

                        {/* Hamburger button (shows only on mobile via CSS) */}
                        <button className={styles.topbarBurgerButton} onClick={toggleMobileMenu} aria-label="Toggle Menu">
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
                    </div>
                </header>

                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}
