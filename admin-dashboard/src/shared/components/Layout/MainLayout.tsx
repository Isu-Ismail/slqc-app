// src/components/MainLayout.tsx
import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { pb } from '../../../api/db';
import styles from './MainLayout.module.css';
import logoSvg from '../../../assets/logo.svg';

// Import Lucide React components cleanly
import {
    LayoutDashboard,
    BarChart3,
    Image,
    Table,
    FileText,
    CheckSquare,
    Search,
    Users,
    UserCheck,
    History,
    Globe,
    ChevronDown,
    Menu,
    X,
    LogOut,
    Edit3,
    Star,
    MapPin,
    Sliders
} from 'lucide-react';

interface NavItem {
    title: string;
    path: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
}

interface NavSection {
    heading: string;
    contents: NavItem[];
    roles?: string[];
}

const SIDEBAR_CONFIG: NavSection[] = [
    {
        heading: 'Statistics',
        roles: ['admin', 'coordinators'],
        contents: [
            { title: 'Dashboard', path: '/', icon: LayoutDashboard },
            { title: 'Stats', path: '/stats', icon: BarChart3 },

        ]
    },
    {
        heading: 'Registration & Approvals',
        roles: ['admin', 'coordinators'],
        contents: [
            { title: 'Applications', path: '/applications', icon: Table },
            { title: 'Approval Panel', path: '/approvals', icon: FileText },
            { title: 'Inst Admin', path: '/arrival-checking', icon: CheckSquare },
            { title: 'Track Application', path: '/track', icon: Search },
        ]
    },
    {
        heading: 'Competition Admin',
        roles: ['admin', 'coordinators', 'venue Incharge'],
        contents: [
            { title: 'Venue', path: '/venue-panel', icon: MapPin },
            { title: 'Mark Entry', path: '/mark-entry', icon: Edit3 },
            { title: 'Marksheet Upload', path: '/marksheet-upload', icon: Image },
            { title: 'Finalist Selection', path: '/finalist-selection', icon: Star },
        ]
    },
    {
        heading: 'Setup & Administration',
        roles: ['admin'],
        contents: [
            { title: 'Organisers', path: '/organisers', icon: Users },
            { title: 'Judges Panel', path: '/judges', icon: UserCheck },
            { title: 'Historical Records', path: '/history', icon: History },
            { title: 'Control Panel', path: '/control-panel', icon: Sliders },
        ]
    }
];

export default function MainLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [pendingLanguageCode, setPendingLanguageCode] = useState('en');
    const [pendingLanguageLabel, setPendingLanguageLabel] = useState('English');
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
    const userRole = user?.designation || 'staff';

    return (
        <div className={styles.layoutContainer}>
            <div
                className={`${styles.backdrop} ${isMobileMenuOpen ? styles.backdropVisible : ''}`}
                onClick={closeMobileMenu}
            />

            <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
                <Link to="/" className={styles.brand} onClick={closeMobileMenu}>
                    <img src={logoSvg} className={styles.logoSvg} alt="SLQC Logo" />
                    <div className={styles.brandText}>
                        <span className={styles.brandTitle}>SLQC Admin Portal</span>
                        <span className={styles.brandSubtitle}>SLQC 2026</span>
                    </div>
                </Link>

                <nav className={styles.nav}>
                    {SIDEBAR_CONFIG.map((section, secIdx) => {
                        if (section.roles && !section.roles.includes(userRole)) {
                            if (section.heading === "Competition Admin" && (userRole === "venue Incharge" || userRole === "coordinators")) {
                                // Fallback path match logic exception rules
                            } else {
                                return null;
                            }
                        }

                        let visibleContents = section.contents;
                        if (userRole === 'venue Incharge' || userRole === 'coordinators') {
                            if (section.heading === "Competition Admin") {
                                visibleContents = section.contents.filter(c => c.path === '/mark-entry' || c.path === '/marksheet-upload');
                            }
                        }

                        if (visibleContents.length === 0) return null;

                        return (
                            <div key={secIdx} className={styles.navSectionGroup} style={{ marginBottom: '16px' }}>
                                <div className={styles.navSectionTitle}>{section.heading}</div>
                                {visibleContents.map((item, itemIdx) => {
                                    const IconComponent = item.icon;
                                    return (
                                        <NavLink
                                            key={itemIdx}
                                            to={item.path}
                                            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                                            onClick={closeMobileMenu}
                                            preventScrollReset={true}
                                            end={item.path === '/'}
                                        >
                                            <IconComponent size={16} />
                                            {item.title}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                <div className={styles.sidebarTranslate}>
                    <div className={styles.customTranslateWrapper}>
                        <button
                            type="button"
                            className={styles.translateBtn}
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            aria-label="Select Language"
                        >
                            <Globe size={14} style={{ marginRight: '6px' }} />
                            <span className={styles.translateLabel}>{pendingLanguageLabel}</span>
                            <ChevronDown size={12} style={{ marginLeft: 'auto', opacity: 0.7 }} />
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

                    <button type="button" onClick={triggerTranslation} className={styles.btnTranslateAction}>
                        Translate
                    </button>
                </div>

                <div className={styles.sidebarFooter}>
                    <button className={styles.logoutButton} onClick={handleLogout}>
                        <LogOut size={14} style={{ marginRight: '6px' }} /> Logout
                    </button>
                    <span className={styles.footerText}>Logged in as: {user?.name || user?.email}</span>
                </div>
            </aside>

            <div className={styles.mainWrapper}>
                <header className={styles.topbar}>
                    <div className={styles.topbarBranding}>
                        <img src={logoSvg} className={styles.topbarLogo} alt="Logo" />
                        <h2 className={styles.topbarTitle}>SLQC Admin Portal</h2>
                    </div>
                    <div className={styles.topbarActions}>
                        <div id="google_translate_element" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}></div>
                        <span className={styles.roleBadge}>{user?.designation || 'Staff'}</span>
                        <button className={styles.burgerButton} onClick={toggleMobileMenu} aria-label="Toggle Menu">
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </header>

                <main className={styles.content}>
                    {/* React Router handles rendering sub-routes dynamically here without unmounting parent components */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}