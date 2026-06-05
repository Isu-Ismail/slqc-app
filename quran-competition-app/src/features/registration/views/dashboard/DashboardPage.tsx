import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Ban, Search, UserPlus, School, CalendarDays } from 'lucide-react';
import { useRegistrationStatus } from '../../../../shared/context/StatusContext';
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
    const pad = (n: number) => String(n).padStart(2, '0');

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
                } catch {}
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

    useEffect(() => {
        const tick = () => {
            const timeInfo = getTimeMetadata(activeCategory);
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
    }, [stats.time, activeCategory]);

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
                <Link to="/register" className={styles.btnPrimarySmall}>
                    <UserPlus size={14} /> Register Candidate
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

    const timeInfo = getTimeMetadata();
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
        </div>
    );
}
