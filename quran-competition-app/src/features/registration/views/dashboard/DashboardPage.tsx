import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Ban, Search, UserPlus, School, CalendarDays } from 'lucide-react';
import { useRegistrationStatus } from '../../../../shared/context/StatusContext';
import { parseMarkdownToHtml } from '../../../../shared/utils/markdown';
import { pb } from '../../../../api/db';
import styles from './DashboardPage.module.css';

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

interface EventItem {
    date: string;
    title: string;
    desc: string;
    active: boolean;
}

interface PrizeItem {
    rank: string;
    title: string;
    value: string;
    highlight?: boolean;
}

export default function DashboardPage() {
    const { metadata } = useRegistrationStatus();
    const [activeCategory, setActiveCategory] = useState<'5_juz' | '15_juz' | '30_juz'>('5_juz');
    const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const pad = (n: number) => String(n).padStart(2, '0');

    const handleViewRules = async (title: string, keyBase: string) => {
        const rec = metadata[`_${keyBase}_record`];
        const valText = metadata[keyBase]; // Fallback text from context

        if (rec && rec.document) {
            const fileUrl = pb.files.getURL(rec, rec.document);
            const lowerDoc = rec.document.toLowerCase();
            if (lowerDoc.endsWith('.pdf')) {
                window.open(fileUrl, '_blank');
                return;
            }
            
            // It is .txt or .html
            setModalLoading(true);
            setModalContent({ title, body: 'Loading file content...' });
            try {
                const res = await fetch(fileUrl);
                const text = await res.text();
                setModalContent({ title, body: text });
            } catch (err) {
                console.error(err);
                setModalContent({ title, body: 'Failed to load file content.' });
            } finally {
                setModalLoading(false);
            }
        } else if (valText) {
            setModalContent({ title, body: valText });
        } else {
            setModalContent({ title, body: 'Rules content not uploaded yet.' });
        }
    };

    // Default configuration merged with real-time metadata from Context
    const stats: Record<string, any> = {
        // Stat defaults (plain numbers — overridden by realtime metadata)
        total_applicant: 0,
        institution_count: 0,
        today_count: 0,
        time: { date: '2026-06-19T00:00:00' },
        events: [
            { date: 'May 1, 2026', title: 'Registration Opens', desc: 'Online applications open for all categories (5 Juz, 15 Juz, 30 Juz).', active: true },
            { date: 'August 31, 2026', title: 'Registration Closes', desc: 'Final date to submit application forms and register.', active: true },
            { date: 'September 15, 2026', title: 'Verification Deadline', desc: 'Final verification of uploaded documents (Aadhaar & Certificates).', active: false },
            { date: 'October 10, 2026', title: 'State Level Competition Begins', desc: 'Inaugural ceremonies and first round of competition.', active: false }
        ],
        prizes: [
            { rank: '🏆', title: 'First Place Grand Prize', value: '₹ 5,00,000' },
            { rank: '🥈', title: 'Second Place Prize', value: '₹ 3,00,000' },
            { rank: '🥉', title: 'Third Place Prize', value: '₹ 1,50,000' },
            { rank: '🌟', title: 'Consolation Prizes (10 Candidates)', value: '₹ 25,000 each', highlight: true }
        ],
        ...metadata
    };

    const formatEventDate = (dateStr: string): string => {
        try {
            const dateObj = new Date(dateStr);
            const datePart = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const timePart = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `${datePart} at ${timePart}`;
        } catch {
            return dateStr;
        }
    };

    const getTimeMetadata = (cat = activeCategory) => {
        const timeVal = stats[`time_${cat}`] || stats.time;
        let obj = {
            startDate: '2026-05-01T00:00:00',
            endDate: '2026-06-19T00:00:00',
            startDescription: 'Registration Opens In',
            endDescription: 'Registration Closes In'
        };
        if (timeVal) {
            let parsed: any = timeVal;
            if (typeof timeVal === 'string') {
                try {
                    parsed = JSON.parse(timeVal);
                } catch { }
            }
            if (parsed) {
                // Support legacy format where key was just 'date'
                if (parsed.date && !parsed.endDate) {
                    obj.endDate = parsed.date;
                }
                if (parsed.startDate) obj.startDate = parsed.startDate;
                if (parsed.endDate) obj.endDate = parsed.endDate;
                if (parsed.startDescription) obj.startDescription = parsed.startDescription;
                if (parsed.endDescription) obj.endDescription = parsed.endDescription;
            }
        }
        return obj;
    };

    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    const timeInfo = getTimeMetadata(activeCategory);
    const timeString = `${timeInfo.startDate}_${timeInfo.endDate}`;

    useEffect(() => {
        const tick = () => {
            const now = new Date().getTime();
            const start = new Date(timeInfo.startDate).getTime();
            const end = new Date(timeInfo.endDate).getTime();

            let target = end;
            if (now < start) {
                target = start;
            } else if (now > end) {
                target = 0;
            }

            if (target > 0) {
                const difference = target - now;
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        // Tick immediately and then set interval
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [timeString]);

    // Simple getter — metadata values for stats are now plain integers
    const getStatNumber = (key: string): number => {
        const val = stats[key];
        if (typeof val === 'number') return val;
        const parsed = parseInt(String(val), 10);
        return isNaN(parsed) ? 0 : parsed;
    };

    const getFormattedDeadline = (cat = activeCategory): string => {
        const timeInfo = getTimeMetadata(cat);
        const now = new Date().getTime();
        const start = new Date(timeInfo.startDate).getTime();
        const activeDeadline = now < start ? timeInfo.startDate : timeInfo.endDate;

        try {
            const dateObj = new Date(activeDeadline);
            return dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'Friday, June 19, 2026';
        }
    };

    const isDatePassed = (dateStr: string): boolean => {
        try {
            const dateVal = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dateVal.setHours(0, 0, 0, 0);
            return dateVal.getTime() < today.getTime();
        } catch {
            return false;
        }
    };

    const eventsList: EventItem[] = Array.isArray(stats.events) ? stats.events : [];
    const prizesList: PrizeItem[] = Array.isArray(stats[`prizes_${activeCategory}`])
        ? stats[`prizes_${activeCategory}`]
        : Array.isArray(stats.prizes)
            ? stats.prizes
            : [];

    const getStatus = (key: string): 'waiting' | 'open' | 'closed' => {
        const val = stats[key];
        if (val) {
            let obj = val;
            if (typeof val === 'string') {
                try {
                    obj = JSON.parse(val);
                } catch {
                    return 'open';
                }
            }
            if (obj && obj.status) {
                return obj.status;
            }
        }
        return 'open';
    };

    const madrasaStatus = getStatus('madrasa_application_status');
    const participantStatus = getStatus('participant_application_status');

    const renderParticipantAction = () => {
        if (participantStatus === 'waiting') {
            return (
                <div className={styles.statusWaitMessageSmall}>
                    <Clock size={13} /> Candidates Coming Soon
                </div>
            );
        } else if (participantStatus === 'closed') {
            return (
                <div className={styles.statusClosedMessageSmall}>
                    <Ban size={13} /> Candidates Closed
                </div>
            );
        } else {
            return (
                <Link to="/portal" className={styles.btnPrimarySmall}>
                    <UserPlus size={14} /> Candidate Registration
                </Link>
            );
        }
    };

    const renderMadrasaAction = () => {
        if (madrasaStatus === 'waiting') {
            return (
                <div className={styles.statusWaitMessageSmall}>
                    <Clock size={13} /> Madrasa Coming Soon
                </div>
            );
        } else if (madrasaStatus === 'closed') {
            return (
                <div className={styles.statusClosedMessageSmall}>
                    <Ban size={13} /> Madrasa Closed
                </div>
            );
        } else {
            return (
                <Link to="/institution-register" className={styles.btnSecondarySmallWhite}>
                    <School size={14} /> Register Madrasa / School
                </Link>
            );
        }
    };


    const now = new Date().getTime();
    const start = new Date(timeInfo.startDate).getTime();
    const end = new Date(timeInfo.endDate).getTime();

    const isWaiting = now < start;
    const isClosed = now > end;
    const activeTitle = isWaiting ? timeInfo.startDescription : timeInfo.endDescription;

    return (
        <div className={styles.dashboardWrapper}>

            {/* Welcome banner with integrated countdown timer */}
            <section className={styles.welcomeSection}>
                <div className={styles.welcomeLeft}>
                    <h1 className={styles.welcomeTitle}>State Level Quran Competition</h1>
                    {stats.event_date && (
                        <div className={styles.commenceDate}>
                            <CalendarDays size={16} /> Commence on: {formatEventDate(String(stats.event_date))}
                        </div>
                    )}
                    <p className={styles.welcomeDesc}>
                        Welcome to the registration hub for the State Level Quran Recitation and Memorization Competition. Register to participate, track your status, or view competition timelines.
                    </p>
                    <div className={styles.quickActionsBarInline}>
                        {renderParticipantAction()}
                        {renderMadrasaAction()}
                        <Link to="/track" className={styles.btnSecondarySmall}>
                            <Search size={14} /> Track Status
                        </Link>
                    </div>
                </div>

                <div className={`${styles.welcomeRight} ${isClosed ? styles.welcomeRightClosed : ''}`}>
                    {isClosed ? (
                        <div className={styles.bannerClosedContainer}>
                            <Ban size={36} style={{ color: '#fca5a5', marginBottom: '4px' }} />
                            <span className={styles.bannerTimerTitle} style={{ color: '#fca5a5' }}>Registration Closed</span>
                            <p className={styles.bannerClosedText}>The registration period has ended. We are no longer accepting new registrations.</p>
                        </div>
                    ) : (
                        <>
                            <span className={styles.bannerTimerTitle}>{activeTitle}</span>
                            <div className={styles.bannerTimer}>
                                <div className={styles.bannerTimeSegment}>
                                    <span className={styles.bannerTimeValue}>{pad(timeLeft.days)}</span>
                                    <span className={styles.bannerTimeLabel}>Days</span>
                                </div>
                                <div className={styles.bannerTimeSegment}>
                                    <span className={styles.bannerTimeValue}>{pad(timeLeft.hours)}</span>
                                    <span className={styles.bannerTimeLabel}>Hours</span>
                                </div>
                                <div className={styles.bannerTimeSegment}>
                                    <span className={styles.bannerTimeValue}>{pad(timeLeft.minutes)}</span>
                                    <span className={styles.bannerTimeLabel}>Min</span>
                                </div>
                                <div className={styles.bannerTimeSegment}>
                                    <span className={styles.bannerTimeValue}>{pad(timeLeft.seconds)}</span>
                                    <span className={styles.bannerTimeLabel}>Sec</span>
                                </div>
                            </div>
                            <div className={styles.bannerDeadline}>
                                Target: {getFormattedDeadline()}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Public Statistics Grid (balanced 3-card layout) */}
            <div className={styles.topStatsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Applicants</span>
                    <span className={styles.statValue}>{getStatNumber('total_applicant').toLocaleString()}</span>
                    <span className={styles.statChange}>Registered candidates</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Registered Institutions</span>
                    <span className={styles.statValue}>{getStatNumber('institution_count').toLocaleString()}</span>
                    <span className={styles.statChange}>Madrasas & Schools</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Today's Registrations</span>
                    <span className={styles.statValue}>{getStatNumber('today_count').toLocaleString()}</span>
                    <span className={styles.statChange}>New submissions today</span>
                </div>
            </div>

            {/* Bottom Section - Timeline vs Prizes */}
            <div className={styles.bottomGrid}>
                {/* Dynamic Milestones Timeline */}
                <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>Important Dates & Milestones</h3>
                    <div className={eventsList.length > 3 ? styles.timelineContainer : ''}>
                        <div className={styles.timeline}>
                            {eventsList.map((evt, idx) => {
                                const passed = isDatePassed(evt.date);
                                return (
                                    <div key={idx} className={styles.timelineItem}>
                                        <div className={`${styles.timelineDot} ${passed ? styles.timelineDotActive : ''}`}></div>
                                        <div className={styles.timelineContent}>
                                            <span className={styles.timelineDate}>{evt.date}</span>
                                            <span className={styles.timelineLabel}>{evt.title}</span>
                                            <span className={styles.timelineDesc}>{evt.desc}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Dynamic Prize Pool & Category Rewards */}
                <div className={styles.sectionCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                        <h3 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>State Level Grand Prizes</h3>
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '20px' }}>
                            {(['5_juz', '15_juz', '30_juz'] as const).map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setActiveCategory(cat)}
                                    style={{
                                        background: activeCategory === cat ? '#ffffff' : 'transparent',
                                        color: activeCategory === cat ? '#059669' : '#64748b',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        transition: 'all 0.2s ease',
                                        whiteSpace: 'nowrap',
                                        boxShadow: activeCategory === cat ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                        outline: 'none'
                                    }}
                                >
                                    {cat === '5_juz' && '5 Juz'}
                                    {cat === '15_juz' && '15 Juz'}
                                    {cat === '30_juz' && '30 Juz'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={prizesList.length > 3 ? styles.prizesContainer : ''}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {prizesList.map((prz, idx) => (
                                <div
                                    key={idx}
                                    className={styles.prizeItem}
                                    style={prz.highlight ? { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' } : undefined}
                                >
                                    <span className={styles.prizeRank}>{prz.rank}</span>
                                    <div className={styles.prizeInfo}>
                                        <span className={styles.prizeTitle} style={prz.highlight ? { color: '#047857' } : undefined}>
                                            {prz.title}
                                        </span>
                                        <span className={styles.prizeValue} style={prz.highlight ? { color: '#065f46' } : undefined}>
                                            {prz.value}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Guidelines Section */}
            <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Guidelines</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '4px' }}>

                    {/* Overall Rules Card */}
                    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Overall Competition Rules</span>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, flex: 1, lineHeight: '1.45' }}>Read the overall evaluation criteria, scoring marks, and rules of the competition.</p>
                        {(() => {
                            const rec = metadata._overall_rules_record;
                            const hasDoc = rec && rec.document;
                            const isPdf = hasDoc && rec.document.toLowerCase().endsWith('.pdf');
                            const hasText = !!metadata.overall_rules;

                            if (hasDoc && isPdf) {
                                return (
                                    <a
                                        href={pb.files.getURL(rec, rec.document)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.btnPrimarySmall}
                                        style={{ alignSelf: 'flex-start', textDecoration: 'none', textAlign: 'center', background: '#0d9488', color: '#ffffff', boxShadow: 'none' }}
                                    >
                                        View Overall Rules ↗
                                    </a>
                                );
                            }
                            return (
                                <button
                                    type="button"
                                    className={styles.btnSecondarySmall}
                                    style={{ alignSelf: 'flex-start', background: '#ffffff', color: '#0f766e', border: '1px solid #0d9488', width: 'auto' }}
                                    onClick={() => handleViewRules('Overall Competition Rules', 'overall_rules')}
                                    disabled={!hasDoc && !hasText}
                                >
                                    {hasDoc || hasText ? 'View Overall Rules' : 'Not Uploaded Yet'}
                                </button>
                            );
                        })()}
                    </div>

                    {/* Individual Rules Card */}
                    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Individual Rules</span>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, flex: 1, lineHeight: '1.45' }}>Guidelines, age criteria, dress code, and terms for individual candidates.</p>
                        {(() => {
                            const rec = metadata._individual_rules_record;
                            const hasDoc = rec && rec.document;
                            const isPdf = hasDoc && rec.document.toLowerCase().endsWith('.pdf');
                            const hasText = !!metadata.individual_rules;

                            if (hasDoc && isPdf) {
                                return (
                                    <a
                                        href={pb.files.getURL(rec, rec.document)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.btnPrimarySmall}
                                        style={{ alignSelf: 'flex-start', textDecoration: 'none', textAlign: 'center', background: '#0d9488', color: '#ffffff', boxShadow: 'none' }}
                                    >
                                        View Individual Rules ↗
                                    </a>
                                );
                            }
                            return (
                                <button
                                    type="button"
                                    className={styles.btnSecondarySmall}
                                    style={{ alignSelf: 'flex-start', background: '#ffffff', color: '#0f766e', border: '1px solid #0d9488', width: 'auto' }}
                                    onClick={() => handleViewRules('Individual Rules & Regulations', 'individual_rules')}
                                    disabled={!hasDoc && !hasText}
                                >
                                    {hasDoc || hasText ? 'View Individual Rules' : 'Not Uploaded Yet'}
                                </button>
                            );
                        })()}
                    </div>

                    {/* Institution Rules Card */}
                    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Institution Guidelines</span>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, flex: 1, lineHeight: '1.45' }}>Rules and submission instructions for Madrasas, Schools, and coordinators.</p>
                        {(() => {
                            const rec = metadata._institution_rules_record;
                            const hasDoc = rec && rec.document;
                            const isPdf = hasDoc && rec.document.toLowerCase().endsWith('.pdf');
                            const hasText = !!metadata.institution_rules;

                            if (hasDoc && isPdf) {
                                return (
                                    <a
                                        href={pb.files.getURL(rec, rec.document)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.btnPrimarySmall}
                                        style={{ alignSelf: 'flex-start', textDecoration: 'none', textAlign: 'center', background: '#0d9488', color: '#ffffff', boxShadow: 'none' }}
                                    >
                                        View Institution Rules ↗
                                    </a>
                                );
                            }
                            return (
                                <button
                                    type="button"
                                    className={styles.btnSecondarySmall}
                                    style={{ alignSelf: 'flex-start', background: '#ffffff', color: '#0f766e', border: '1px solid #0d9488', width: 'auto' }}
                                    onClick={() => handleViewRules('Institution Rules & Regulations', 'institution_rules')}
                                    disabled={!hasDoc && !hasText}
                                >
                                    {hasDoc || hasText ? 'View Institution Rules' : 'Not Uploaded Yet'}
                                </button>
                            );
                        })()}
                    </div>

                    {/* Do's and Don'ts Card */}
                    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Do's & Don'ts</span>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, flex: 1, lineHeight: '1.45' }}>Must-know instructions, checklist, and code of conduct for reporting at the venue.</p>
                        {(() => {
                            const rec = metadata._dos_and_donts_record;
                            const hasDoc = rec && rec.document;
                            const isPdf = hasDoc && rec.document.toLowerCase().endsWith('.pdf');
                            const hasText = !!metadata.dos_and_donts;

                            if (hasDoc && isPdf) {
                                return (
                                    <a
                                        href={pb.files.getURL(rec, rec.document)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.btnPrimarySmall}
                                        style={{ alignSelf: 'flex-start', textDecoration: 'none', textAlign: 'center', background: '#0d9488', color: '#ffffff', boxShadow: 'none' }}
                                    >
                                        View Do's & Don'ts ↗
                                    </a>
                                );
                            }
                            return (
                                <button
                                    type="button"
                                    className={styles.btnSecondarySmall}
                                    style={{ alignSelf: 'flex-start', background: '#ffffff', color: '#0f766e', border: '1px solid #0d9488', width: 'auto' }}
                                    onClick={() => handleViewRules("Do's & Don'ts", 'dos_and_donts')}
                                    disabled={!hasDoc && !hasText}
                                >
                                    {hasDoc || hasText ? "View Do's & Don'ts" : 'Not Uploaded Yet'}
                                </button>
                            );
                        })()}
                    </div>

                    {/* Venue Map Card */}
                    <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Competition Venue Map</span>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, flex: 1, lineHeight: '1.45' }}>Download or view the location layout map of the competition venue.</p>
                        {(() => {
                            const mapRecord = metadata._venue_map_record;
                            const mapUrl = mapRecord && mapRecord.document ? pb.files.getURL(mapRecord, mapRecord.document) : '';
                            if (mapUrl) {
                                return (
                                    <a
                                        href={mapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.btnPrimarySmall}
                                        style={{ alignSelf: 'flex-start', textDecoration: 'none', textAlign: 'center', background: '#0d9488', color: '#ffffff', boxShadow: 'none' }}
                                    >
                                        View Venue Map ↗
                                    </a>
                                );
                            } else {
                                return (
                                    <button
                                        type="button"
                                        disabled
                                        className={styles.btnSecondarySmall}
                                        style={{ alignSelf: 'flex-start', opacity: 0.6, cursor: 'not-allowed', width: 'auto' }}
                                    >
                                        Map Not Uploaded Yet
                                    </button>
                                );
                            }
                        })()}
                    </div>

                </div>
            </div>

            {modalContent && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px',
                    animation: 'fadeIn 0.2s ease-in-out'
                }} onClick={() => setModalContent(null)}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '640px',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{modalContent.title}</h3>
                            <button
                                onClick={() => setModalContent(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                    padding: 0
                                }}
                            >×</button>
                        </div>
                        <div style={{
                            padding: '24px',
                            overflowY: 'auto',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#334155'
                        }}>
                            {modalLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', color: '#64748b' }}>
                                    Loading document content...
                                </div>
                            ) : (
                                <div
                                    style={{ fontFamily: 'inherit' }}
                                    dangerouslySetInnerHTML={{
                                        __html: /<[a-z][\s\S]*>/i.test(modalContent.body)
                                            ? modalContent.body
                                            : parseMarkdownToHtml(modalContent.body)
                                    }}
                                />
                            )}
                        </div>
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                type="button"
                                className={styles.btnSecondarySmall}
                                style={{ background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: '600', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', width: 'auto' }}
                                onClick={() => setModalContent(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
