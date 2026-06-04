// admin-dashboard/src/features/dashboard/AdminDashboardPage.tsx
//
// Admin version of the public DashboardPage.
// Same countdown logic, same metadata, same stats — plus a stats recalculator card.

import { useEffect, useState } from 'react';
import {
    Users, Building2, CalendarDays, Ban, RefreshCw,
    CheckCircle2, AlertCircle, Timer, BarChart3, Trophy, Landmark
} from 'lucide-react';
import { pb } from '../../api/db';
import styles from './AdminDashboardPage.module.css';

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; }
interface EventItem { date: string; title: string; desc: string; active: boolean; }
interface PrizeItem { rank: string; title: string; value: string; highlight?: boolean; }

export default function AdminDashboardPage() {
    const [metadata, setMetadata] = useState<Record<string, unknown>>({});
    const user = pb.authStore.model;
    const isAdmin = user?.designation === 'admin';

    // ── Load metadata & subscribe to realtime ────────────────────────────────
    useEffect(() => {
        pb.collection('metadata').getFullList({ requestKey: null }).then((records) => {
            const map: Record<string, unknown> = {};
            records.forEach((r: unknown) => { 
                const record = r as { key: string; value: unknown };
                map[record.key] = record.value; 
            });
            setMetadata(map);
        }).catch((err) => {
            if (err?.isAbort) return;
            console.error('AdminDashboard: failed to load metadata', err);
        });

        pb.collection('metadata').subscribe('*', (e) => {
            if (e.action === 'update' || e.action === 'create') {
                setMetadata((prev) => ({ ...prev, [e.record.key]: e.record.value }));
            }
        });

        return () => { pb.collection('metadata').unsubscribe('*'); };
    }, []);

    // ── Merge with defaults ───────────────────────────────────────────────────
    const stats: Record<string, unknown> = {
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

    // ── Time metadata parser (same as public dashboard) ───────────────────────
    const getTimeMetadata = () => {
        const timeVal = stats.time;
        const obj = {
            startDate: '2026-05-01T00:00:00',
            endDate: '2026-06-19T00:00:00',
            startDescription: 'Registration Opens In',
            endDescription: 'Registration Closes In'
        };
        if (timeVal) {
            let parsed = timeVal;
            if (typeof timeVal === 'string') {
                try { parsed = JSON.parse(timeVal); } catch { /* ignore */ }
            }
            if (parsed && typeof parsed === 'object') {
                const p = parsed as Record<string, string>;
                if (p.date && !p.endDate) obj.endDate = p.date;
                if (p.startDate) obj.startDate = p.startDate;
                if (p.endDate) obj.endDate = p.endDate;
                if (p.startDescription) obj.startDescription = p.startDescription;
                if (p.endDescription) obj.endDescription = p.endDescription;
            }
        }
        return obj;
    };

    // ── Countdown timer ───────────────────────────────────────────────────────
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const tick = () => {
            const timeInfo = getTimeMetadata();
            const now = new Date().getTime();
            const start = new Date(timeInfo.startDate).getTime();
            const end = new Date(timeInfo.endDate).getTime();
            let target = end;
            if (now < start) target = start;
            else if (now > end) target = 0;

            if (target > 0) {
                const d = target - now;
                setTimeLeft({
                    days: Math.floor(d / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((d / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((d / 1000 / 60) % 60),
                    seconds: Math.floor((d / 1000) % 60)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stats.time]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getStatNumber = (key: string): number => {
        const val = stats[key];
        if (typeof val === 'number') return val;
        const p = parseInt(String(val), 10);
        return isNaN(p) ? 0 : p;
    };

    const getStatus = (key: string): 'waiting' | 'open' | 'closed' => {
        const val = stats[key];
        if (!val) return 'open';
        let obj = val;
        if (typeof val === 'string') {
            try { obj = JSON.parse(val); } catch { return 'open'; }
        }
        return (obj as Record<string, string>)?.status as 'waiting' | 'open' | 'closed' ?? 'open';
    };

    const isDatePassed = (dateStr: string): boolean => {
        try {
            const d = new Date(dateStr); d.setHours(0,0,0,0);
            const t = new Date(); t.setHours(0,0,0,0);
            return d.getTime() < t.getTime();
        } catch { return false; }
    };

    const getFormattedDeadline = (): string => {
        const timeInfo = getTimeMetadata();
        const now = new Date().getTime();
        const start = new Date(timeInfo.startDate).getTime();
        const activeDeadline = now < start ? timeInfo.startDate : timeInfo.endDate;
        try {
            return new Date(activeDeadline).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch { return 'Friday, June 19, 2026'; }
    };

    const timeInfo = getTimeMetadata();
    const now = new Date().getTime();
    const start = new Date(timeInfo.startDate).getTime();
    const end = new Date(timeInfo.endDate).getTime();
    const isWaiting = now < start;
    const isClosed = now > end;
    const activeTitle = isWaiting ? timeInfo.startDescription : timeInfo.endDescription;

    const participantStatus = getStatus('participant_application_status');
    const madrasaStatus = getStatus('madrasa_application_status');

    const eventsList: EventItem[] = Array.isArray(stats.events) ? stats.events : [];
    const prizesList: PrizeItem[] = Array.isArray(stats.prizes) ? stats.prizes : [];

    const statusLabel = (s: 'waiting' | 'open' | 'closed') =>
        s === 'waiting' ? 'Coming Soon' : s === 'open' ? 'Open' : 'Closed';

    const statusPillClass = (s: 'waiting' | 'open' | 'closed') =>
        s === 'waiting' ? styles.statusPillWaiting : s === 'open' ? styles.statusPillOpen : styles.statusPillClosed;

    // ── Recalculate stats ─────────────────────────────────────────────────────
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [recalcResult, setRecalcResult] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleRecalculate = async () => {
        setRecalcLoading(true);
        setRecalcResult(null);
        try {
            await pb.send('/api/admin-recalculate-stats', { method: 'POST' });
            setRecalcResult({ ok: true, msg: 'Recalculated at ' + new Date().toLocaleTimeString() });
        } catch (err: unknown) {
            setRecalcResult({ ok: false, msg: (err as Error)?.message || 'Request failed' });
        } finally {
            setRecalcLoading(false);
        }
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

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={styles.dashboardWrapper}>

            {/* ── Welcome Banner ── */}
            <section className={styles.welcomeSection}>
                <div className={styles.welcomeLeft}>
                    <span className={styles.welcomeBadge}>
                        <Landmark size={11} /> Admin Dashboard
                    </span>
                    <h1 className={styles.welcomeTitle}>State Level Quran Competition</h1>
                    {stats.event_date && (
                        <div className={styles.commenceDate}>
                            <CalendarDays size={16} /> Commence on: {formatEventDate(String(stats.event_date))}
                        </div>
                    )}
                    <p className={styles.welcomeDesc}>
                        Real-time overview of all registrations, timelines, and competition status. Data updates automatically via live subscription.
                    </p>

                    {/* Status pills */}
                    <div className={styles.statusRow}>
                        <span className={`${styles.statusPill} ${statusPillClass(participantStatus)}`}>
                            <Users size={12} />
                            Candidates: {statusLabel(participantStatus)}
                        </span>
                        <span className={`${styles.statusPill} ${statusPillClass(madrasaStatus)}`}>
                            <Building2 size={12} />
                            Institutions: {statusLabel(madrasaStatus)}
                        </span>
                    </div>
                </div>

                {/* Countdown */}
                <div className={`${styles.welcomeRight} ${isClosed ? styles.welcomeRightClosed : ''}`}>
                    {isClosed ? (
                        <div className={styles.bannerClosedContainer}>
                            <Ban size={32} style={{ color: '#fca5a5' }} />
                            <span className={styles.bannerTimerTitle} style={{ color: '#fca5a5' }}>Registration Closed</span>
                            <p className={styles.bannerClosedText}>The registration period has ended.</p>
                        </div>
                    ) : (
                        <>
                            <span className={styles.bannerTimerTitle}>{activeTitle}</span>
                            <div className={styles.bannerTimer}>
                                {[{ v: timeLeft.days, l: 'Days' }, { v: timeLeft.hours, l: 'Hours' }, { v: timeLeft.minutes, l: 'Min' }, { v: timeLeft.seconds, l: 'Sec' }].map(({ v, l }) => (
                                    <div key={l} className={styles.bannerTimeSegment}>
                                        <span className={styles.bannerTimeValue}>{v}</span>
                                        <span className={styles.bannerTimeLabel}>{l}</span>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.bannerDeadline}>Target: {getFormattedDeadline()}</div>
                        </>
                    )}
                </div>
            </section>

            {/* ── Stats Cards ── */}
            <div className={styles.topStatsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statCardIcon}>
                        <Users size={16} color="#10b981" />
                        <span className={styles.statLabel}>Total Applicants</span>
                    </div>
                    <span className={styles.statValue}>{getStatNumber('total_applicant').toLocaleString()}</span>
                    <span className={styles.statSubtext}>Registered candidates</span>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statCardIcon}>
                        <Building2 size={16} color="#10b981" />
                        <span className={styles.statLabel}>Registered Institutions</span>
                    </div>
                    <span className={styles.statValue}>{getStatNumber('institution_count').toLocaleString()}</span>
                    <span className={styles.statSubtext}>Madrasas &amp; Schools</span>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statCardIcon}>
                        <CalendarDays size={16} color="#10b981" />
                        <span className={styles.statLabel}>Today's Registrations</span>
                    </div>
                    <span className={styles.statValue}>{getStatNumber('today_count').toLocaleString()}</span>
                    <span className={styles.statSubtext}>New submissions today</span>
                </div>
            </div>

            {/* ── Stats Recalculator ── */}
            {isAdmin && (
                <div className={styles.recalcCard}>
                    <div className={styles.recalcLeft}>
                        <div className={styles.recalcIcon}>
                            <BarChart3 size={20} />
                        </div>
                        <div className={styles.recalcText}>
                            <h3>Stats Recalculator</h3>
                            <p>Counts all records from scratch and updates the three stats above instantly.</p>
                        </div>
                    </div>
                    <div className={styles.recalcRight}>
                        {recalcResult && (
                            recalcResult.ok
                                ? <span className={styles.recalcSuccess}><CheckCircle2 size={14} /> {recalcResult.msg}</span>
                                : <span className={styles.recalcError}><AlertCircle size={14} /> {recalcResult.msg}</span>
                        )}
                        <button
                            className={styles.btnRecalc}
                            onClick={handleRecalculate}
                            disabled={recalcLoading}
                        >
                            <RefreshCw size={15} className={recalcLoading ? styles.spinning : ''} />
                            {recalcLoading ? 'Recalculating…' : 'Recalculate Now'}
                        </button>
                        <span className={styles.cronNote}>
                            <Timer size={12} /> Auto-runs at 01:00 AM daily
                        </span>
                    </div>
                </div>
            )}

            {/* ── Timeline & Prizes ── */}
            <div className={styles.bottomGrid}>
                {/* Timeline */}
                <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                        <CalendarDays size={16} color="#10b981" /> Important Dates &amp; Milestones
                    </h3>
                    <div className={eventsList.length > 3 ? styles.timelineContainer : ''}>
                        <div className={styles.timeline}>
                            {eventsList.map((evt, idx) => {
                                const passed = isDatePassed(evt.date);
                                return (
                                    <div key={idx} className={styles.timelineItem}>
                                        <div className={`${styles.timelineDot} ${passed ? styles.timelineDotActive : ''}`} />
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

                {/* Prizes */}
                <div className={styles.sectionCard}>
                    <h3 className={styles.sectionTitle}>
                        <Trophy size={16} color="#10b981" /> State Level Grand Prizes
                    </h3>
                    <div className={prizesList.length > 3 ? styles.prizesContainer : ''}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
