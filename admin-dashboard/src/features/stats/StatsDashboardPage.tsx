import { useEffect, useState } from 'react';
import { pb } from '../../api/db';
import {
    Users, Building2, CheckCircle2, XCircle, Clock,
    RefreshCw, AlertCircle, BarChart3, ChevronRight, Layers
} from 'lucide-react';
import styles from './StatsDashboardPage.module.css';

interface StatData {
    total_institutions: number;
    total_applications: number;
    status_counts: {
        pending: number;
        approved: number;
        rejected: number;
        reapplied: number;
    };
    category_stats: {
        [key: string]: {
            total_accepted: number;
            options: {
                [key: string]: number;
            };
        };
    };
    accommodation_stats?: {
        total_students_needing_accommodation: number;
        accepted_students_needing_accommodation: number;
        institutions_count_incharge: number;
        grand_total_accommodation: number;
    };
    last_updated?: string;
}

const JUZ_OPTION_LABELS: Record<string, string> = {
    '2630': 'Juz 26 to 30',
    '0105': 'Juz 1 to 5',
    '0030': 'Juz 1 to 30 (Full Quran)',
    '01102630': 'Juz 1-10 & 26-30',
    '0115': 'Juz 1 to 15',
    '1530': 'Juz 15 to 30',
    'none': 'Not Specified'
};

const CATEGORY_LABELS: Record<string, string> = {
    '5_juz': '5 Juz Category',
    '15_juz': '15 Juz Category',
    '30_juz': '30 Juz Category'
};

export default function StatsDashboardPage() {
    const [stats, setStats] = useState<StatData | null>(null);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const record = await pb.collection('metadata').getFirstListItem('key="stat"');
            if (record && record.value) {
                const parsed = typeof record.value === 'string' 
                    ? JSON.parse(record.value)
                    : record.value;
                setStats(parsed as StatData);
            }
        } catch (err: any) {
            console.error('Failed to load stats metadata:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCalculate = async () => {
        setCalculating(true);
        setError(null);
        try {
            const result = await pb.send('/api/admin/calculate-stats', { method: 'POST' });
            setStats(result as StatData);
        } catch (err: any) {
            console.error('Failed to calculate stats:', err);
            setError(err.message || 'Failed to calculate statistics.');
        } finally {
            setCalculating(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <RefreshCw className={styles.spinner} size={40} />
                <p>Loading statistics...</p>
            </div>
        );
    }

    return (
        <div className={styles.statsContainer}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>System Statistics</h1>
                    <p className={styles.subtitle}>
                        Overview of applications, status distribution, and Juz-wise breakdowns.
                    </p>
                </div>
                <button
                    className={styles.calculateBtn}
                    onClick={handleCalculate}
                    disabled={calculating}
                >
                    <RefreshCw className={calculating ? styles.spinning : ''} size={16} />
                    {calculating ? 'Calculating...' : 'Calculate Stats'}
                </button>
            </div>

            {error && (
                <div className={styles.errorAlert}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {!stats || Object.keys(stats).length === 0 ? (
                <div className={styles.emptyState}>
                    <BarChart3 size={48} />
                    <h3>No Statistics Generated Yet</h3>
                    <p>Click the button above to calculate the initial system statistics.</p>
                </div>
            ) : (
                <>
                    {stats.last_updated && (
                        <div className={styles.lastUpdated}>
                            Last Updated: {new Date(stats.last_updated).toLocaleString()}
                        </div>
                    )}

                    {/* Overview Cards */}
                    <div className={styles.overviewGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.cardHeader}>
                                <div className={`${styles.iconWrapper} ${styles.instIcon}`}>
                                    <Building2 size={20} />
                                </div>
                                <span className={styles.cardLabel}>Total Institutions</span>
                            </div>
                            <div className={styles.cardValue}>{stats.total_institutions}</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.cardHeader}>
                                <div className={`${styles.iconWrapper} ${styles.appIcon}`}>
                                    <Users size={20} />
                                </div>
                                <span className={styles.cardLabel}>Total Applications</span>
                            </div>
                            <div className={styles.cardValue}>{stats.total_applications}</div>
                        </div>
                    </div>

                    {/* Status Breakdown Section */}
                    <h2 className={styles.sectionTitle}>Application Status Breakdown</h2>
                    <div className={styles.statusGrid}>
                        <div className={`${styles.statusCard} ${styles.approved}`}>
                            <div className={styles.statusHeader}>
                                <CheckCircle2 size={18} />
                                <span>Accepted</span>
                            </div>
                            <div className={styles.statusValue}>{stats.status_counts.approved || 0}</div>
                        </div>

                        <div className={`${styles.statusCard} ${styles.pending}`}>
                            <div className={styles.statusHeader}>
                                <Clock size={18} />
                                <span>Pending</span>
                            </div>
                            <div className={styles.statusValue}>{stats.status_counts.pending || 0}</div>
                        </div>

                        <div className={`${styles.statusCard} ${styles.rejected}`}>
                            <div className={styles.statusHeader}>
                                <XCircle size={18} />
                                <span>Rejected</span>
                            </div>
                            <div className={styles.statusValue}>{stats.status_counts.rejected || 0}</div>
                        </div>

                        <div className={`${styles.statusCard} ${styles.resubmitted}`}>
                            <div className={styles.statusHeader}>
                                <RefreshCw size={18} />
                                <span>Resubmitted</span>
                            </div>
                            <div className={styles.statusValue}>{stats.status_counts.reapplied || 0}</div>
                        </div>
                    </div>

                    {/* Accommodation Section */}
                    {stats.accommodation_stats && (
                        <>
                            <h2 className={styles.sectionTitle}>Accommodation Requirements</h2>
                            <div className={styles.accommodationGrid}>
                                <div className={styles.accommodationCard}>
                                    <h3 className={styles.accommodationCardTitle}>Accepted Candidates</h3>
                                    <p className={styles.accommodationCardDesc}>Accepted students requesting accommodation</p>
                                    <div className={styles.accommodationCardValue}>
                                        {stats.accommodation_stats.accepted_students_needing_accommodation}
                                    </div>
                                    <span className={styles.accommodationSubtext}>
                                        Out of {stats.accommodation_stats.total_students_needing_accommodation} total applicants
                                    </span>
                                </div>
                                <div className={styles.accommodationCard}>
                                    <h3 className={styles.accommodationCardTitle}>Institution Incharges</h3>
                                    <p className={styles.accommodationCardDesc}>Coordinators representing registered institutions</p>
                                    <div className={styles.accommodationCardValue}>
                                        {stats.accommodation_stats.institutions_count_incharge}
                                    </div>
                                    <span className={styles.accommodationSubtext}>1 incharge per institution</span>
                                </div>
                                <div className={`${styles.accommodationCard} ${styles.accommodationTotalCard}`}>
                                    <h3 className={styles.accommodationCardTitle}>Grand Total Accommodation</h3>
                                    <p className={styles.accommodationCardDesc}>Total beds / allocations required</p>
                                    <div className={styles.accommodationCardValue}>
                                        {stats.accommodation_stats.grand_total_accommodation}
                                    </div>
                                    <span className={styles.accommodationSubtext}>Students + Incharges</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Category Breakdowns */}
                    <h2 className={styles.sectionTitle}>Juz Category Accepted Student Details</h2>
                    <div className={styles.categoriesGrid}>
                        {['30_juz', '15_juz', '5_juz'].map((catKey) => {
                            const catData = stats.category_stats[catKey] || { total_accepted: 0, options: {} };
                            return (
                                <div key={catKey} className={styles.categoryCard}>
                                    <div className={styles.categoryHeader}>
                                        <div className={styles.categoryTitleWrapper}>
                                            <Layers size={18} className={styles.categoryIcon} />
                                            <h3>{CATEGORY_LABELS[catKey] || catKey}</h3>
                                        </div>
                                        <span className={styles.categoryBadge}>
                                            {catData.total_accepted} Accepted
                                        </span>
                                    </div>
                                    
                                    <div className={styles.optionsList}>
                                        <h4 className={styles.optionsTitle}>Juz Option Breakdown:</h4>
                                        {Object.keys(catData.options).length === 0 ? (
                                            <div className={styles.noOptions}>No accepted student options found.</div>
                                        ) : (
                                            Object.entries(catData.options).map(([optKey, count]) => (
                                                <div key={optKey} className={styles.optionRow}>
                                                    <span className={styles.optionLabel}>
                                                        <ChevronRight size={14} />
                                                        {JUZ_OPTION_LABELS[optKey] || optKey}
                                                    </span>
                                                    <span className={styles.optionCount}>{count}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
