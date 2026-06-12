// admin-dashboard/src/features/applications/ApplicationsListPage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../../api/db';
import { RefreshCw, Search, ExternalLink, ChevronDown } from 'lucide-react';
import type { ParticipantsApplicationResponse, InstitutionsResponse } from '../../api/track';
import styles from './ApplicationsListPage.module.css';
import { getJuzLabel } from '../../config/fieldsConfig';

// ─── Module-level cache (survives remounts / navigation) ─────────────────────
const CACHE_TTL = 2 * 60 * 1000; // 2 min

type CacheEntry<T> = {
    data: T[];
    total: number;
    timestamp: number;
    loadedCount: number;      // how many rows are loaded
};

const indivCache: Record<string, CacheEntry<ParticipantsApplicationResponse>> = {};
const instCache:  Record<string, CacheEntry<InstitutionsResponse>>            = {};

function indivKey(search: string, cat: string, status: string) {
    return `${search}|${cat}|${status}`;
}
function instKey(search: string, status: string) {
    return `${search}|${status}`;
}
function isFresh(ts: number) {
    return Date.now() - ts < CACHE_TTL;
}

// ─── Session-storage helpers ──────────────────────────────────────────────────
function ss<T>(key: string, fallback: T): T {
    try { const v = sessionStorage.getItem(key); return v !== null ? (JSON.parse(v) as T) : fallback; }
    catch { return fallback; }
}
function ssSet(key: string, val: unknown) {
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
}

const BATCH_SIZES = [20, 50, 100] as const;
type BatchSize = typeof BATCH_SIZES[number];

type AppTab = 'individual' | 'institution';

/**
 * Returns a precise PocketBase filter for the search string.
 * Mirrors the classifier in track.ts to benefit from the same DB indexes.
 */
function buildIndivSearchFilter(raw: string): string {
    const q = raw.trim().replace(/"/g, '\\"');
    const upper = q.toUpperCase();
    if (upper.startsWith('APL-'))  return `participant_id = "${q}"`;
    if (upper.startsWith('INST-')) return `institution_ref.institution_id = "${q}"`;
    if (q.includes('@') && /\.[a-zA-Z]{2,}/.test(q.split('@')[1] || '')) return `email = "${q}"`;
    const digits = q.replace(/\D/g, '');
    if (digits === q) {
        if (q.length > 10) return `aadhaar_number = "${q}"`;
        if (q.length >= 6) return `whatsapp_number = "${q}"`;
        return `id = "${q}"`;
    }
    return `full_name ~ "${q}"`;
}

function buildInstSearchFilter(raw: string): string {
    const q = raw.trim().replace(/"/g, '\\"');
    const upper = q.toUpperCase();
    if (upper.startsWith('INST-')) return `institution_id = "${q}"`;
    if (q.includes('@') && /\.[a-zA-Z]{2,}/.test(q.split('@')[1] || '')) return `email = "${q}"`;
    const digits = q.replace(/\D/g, '');
    if (digits === q && q.length >= 6) return `whatsapp_number = "${q}" || phone_number = "${q}"`;
    return `name ~ "${q}"`;
}

// ─── Individual row ───────────────────────────────────────────────────────────
const JUZ_LABELS: Record<string, string> = { '5_juz': '5 Juz', '15_juz': '15 Juz', '30_juz': '30 Juz' };

function IndividualRow({ app, navigate }: { app: ParticipantsApplicationResponse; navigate: ReturnType<typeof useNavigate> }) {
    const instData = (app as any).expand?.institution_ref as InstitutionsResponse | undefined;
    const catClass =
        app.category === '5_juz'  ? styles.cat5  :
        app.category === '15_juz' ? styles.cat15 :
        app.category === '30_juz' ? styles.cat30 : '';
    const juzLabel = app.juz_options ? getJuzLabel(app.juz_options) : (app.selected_juz || '');
    return (
        <tr className={styles.tableRow}>
            <td className={styles.boldCell}>{app.full_name}</td>
            <td><span className={styles.monoCell}>{app.participant_id || app.id}</span></td>
            <td>{instData?.name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
            <td>
                {app.category
                    ? <span className={`${styles.categoryBadge} ${catClass}`}>
                        {JUZ_LABELS[app.category] || app.category}
                        {juzLabel ? ` (${juzLabel})` : ''}
                      </span>
                    : <span style={{ color: '#94a3b8' }}>—</span>}
            </td>
            <td>{app.allocated_venue || <span style={{ color: '#94a3b8' }}>—</span>}</td>
            <td><span className={`${styles.statusBadge} ${styles[app.status]}`}>{app.status.toUpperCase()}</span></td>
            <td>
                <button className={styles.trackBtn}
                    onClick={() => navigate(`/track?type=individual&query=${app.participant_id || app.id}`)}>
                    <ExternalLink size={12} /> Track
                </button>
            </td>
        </tr>
    );
}

// ─── Institution row ──────────────────────────────────────────────────────────
function InstitutionRow({ inst, navigate }: { inst: InstitutionsResponse; navigate: ReturnType<typeof useNavigate> }) {
    return (
        <tr className={styles.tableRow}>
            <td className={styles.boldCell}>{inst.name}</td>
            <td><span className={styles.monoCell}>{inst.institution_id || inst.id}</span></td>
            <td>{inst.contact_person}</td>
            <td>{inst.email || <span style={{ color: '#94a3b8' }}>—</span>}</td>
            <td>{inst.whatsapp_number || <span style={{ color: '#94a3b8' }}>—</span>}</td>
            <td><span className={`${styles.statusBadge} ${styles[inst.status]}`}>{inst.status.toUpperCase()}</span></td>
            <td>
                <button className={styles.trackBtn}
                    onClick={() => navigate(`/track?type=institution&query=${inst.institution_id || inst.id}`)}>
                    <ExternalLink size={12} /> Track
                </button>
            </td>
        </tr>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ApplicationsListPage() {
    const navigate = useNavigate();

    // ── Restore persisted state from sessionStorage ──────────────────────
    const [activeTab,   setActiveTabState]  = useState<AppTab>(ss('apps_tab', 'individual'));

    const [indivSearch, setIndivSearch]     = useState<string>(ss('apps_i_search', ''));
    const [indivCat,    setIndivCat]        = useState<string>(ss('apps_i_cat',    ''));
    const [indivStatus, setIndivStatus]     = useState<string>(ss('apps_i_status', ''));
    const [indivBatch,  setIndivBatch]      = useState<BatchSize>(ss('apps_i_batch', 20));

    const [instSearch,  setInstSearch]      = useState<string>(ss('apps_inst_search', ''));
    const [instStatus,  setInstStatus]      = useState<string>(ss('apps_inst_status', ''));
    const [instBatch,   setInstBatch]       = useState<BatchSize>(ss('apps_inst_batch', 20));

    // ── Display state ────────────────────────────────────────────────────
    const [indivRows,   setIndivRows]       = useState<ParticipantsApplicationResponse[]>([]);
    const [indivTotal,  setIndivTotal]      = useState(0);
    const [indivLoaded, setIndivLoaded]     = useState(0);

    const [instRows,    setInstRows]        = useState<InstitutionsResponse[]>([]);
    const [instTotal,   setInstTotal]       = useState(0);
    const [instLoaded,  setInstLoaded]      = useState(0);

    const [loading,     setLoading]         = useState(false);
    const [isSearching, setIsSearching]     = useState(false);
    const [loadingMore, setLoadingMore]     = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Skip first-mount fire in filter effects ─────────────────────────
    const isMounted = useRef(false);

    // ─── Persist tab ─────────────────────────────────────────────────────
    const setActiveTab = useCallback((tab: AppTab) => {
        setActiveTabState(tab);
        ssSet('apps_tab', tab);
    }, []);

    // ─── Helpers to check if a record matches current filters (for realtime) ──
    const indivMatchesFilter = useCallback((rec: ParticipantsApplicationResponse,
        search: string, cat: string, status: string): boolean => {
        if (cat    && rec.category !== cat)    return false;
        if (status && rec.status   !== status) return false;
        if (search.trim()) {
            // const f = buildIndivSearchFilter(search.trim());
            // Simple client-side check matching the same classifier logic
            const q = search.trim().toLowerCase();
            const upper = q.toUpperCase();
            if (upper.startsWith('APL-'))  return rec.participant_id?.toLowerCase() === q;
            if (upper.startsWith('INST-')) return false; // institution_ref join — skip client check, let it pass
            if (q.includes('@'))           return rec.email?.toLowerCase() === q;
            const digits = q.replace(/\D/g, '');
            if (digits === q && q.length > 10) return rec.aadhaar_number === q;
            if (digits === q && q.length >= 6) return rec.whatsapp_number === q;
            return rec.full_name.toLowerCase().includes(q);
        }
        return true;
    }, []);

    const instMatchesFilter = useCallback((rec: InstitutionsResponse,
        search: string, status: string): boolean => {
        if (status && rec.status !== status) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            const upper = q.toUpperCase();
            if (upper.startsWith('INST-')) return rec.institution_id?.toLowerCase() === q;
            if (q.includes('@'))           return rec.email?.toLowerCase() === q;
            const digits = q.replace(/\D/g, '');
            if (digits === q && q.length >= 6) return rec.whatsapp_number === q || (rec.phone_number || '') === q;
            return rec.name.toLowerCase().includes(q);
        }
        return true;
    }, []);

    // ─── Fetch individuals ────────────────────────────────────────────────
    const fetchIndividuals = useCallback(async (
        count: number, search: string, cat: string, status: string, append = false
    ) => {
        append ? setLoadingMore(true) : setLoading(true);
        try {
            const filters: string[] = [];
            if (search.trim()) filters.push(buildIndivSearchFilter(search.trim()));
            if (cat)    filters.push(`category = "${cat}"`);
            if (status) filters.push(`status = "${status}"`);

            const result = await pb.collection('participants_application')
                .getList<ParticipantsApplicationResponse>(1, count, {
                    filter: filters.join(' && ') || undefined,
                    sort: '-created',
                    expand: 'institution_ref',
                    requestKey: `indiv_${count}_${search}_${cat}_${status}`,
                });

            const key = indivKey(search, cat, status);
            indivCache[key] = { data: result.items, total: result.totalItems, timestamp: Date.now(), loadedCount: count };

            setIndivRows(result.items);
            setIndivTotal(result.totalItems);
            setIndivLoaded(count);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setIsSearching(false);
        }
    }, []);

    // ─── Fetch institutions ────────────────────────────────────────────────
    const fetchInstitutions = useCallback(async (
        count: number, search: string, status: string, append = false
    ) => {
        append ? setLoadingMore(true) : setLoading(true);
        try {
            const filters: string[] = [];
            if (search.trim()) filters.push(buildInstSearchFilter(search.trim()));
            if (status) filters.push(`status = "${status}"`);

            const result = await pb.collection('institutions')
                .getList<InstitutionsResponse>(1, count, {
                    filter: filters.join(' && ') || undefined,
                    sort: '-created',
                    requestKey: `inst_${count}_${search}_${status}`,
                });

            const key = instKey(search, status);
            instCache[key] = { data: result.items, total: result.totalItems, timestamp: Date.now(), loadedCount: count };

            setInstRows(result.items);
            setInstTotal(result.totalItems);
            setInstLoaded(count);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setIsSearching(false);
        }
    }, []);

    // ─── Load from cache or fetch (called once on mount) ──────────────────
    const initIndividuals = useCallback((search: string, cat: string, status: string, batch: BatchSize) => {
        const key = indivKey(search, cat, status);
        const cached = indivCache[key];
        if (cached && isFresh(cached.timestamp)) {
            setIndivRows(cached.data);
            setIndivTotal(cached.total);
            setIndivLoaded(cached.loadedCount);
        } else {
            fetchIndividuals(batch, search, cat, status);
        }
    }, [fetchIndividuals]);

    const initInstitutions = useCallback((search: string, status: string, batch: BatchSize) => {
        const key = instKey(search, status);
        const cached = instCache[key];
        if (cached && isFresh(cached.timestamp)) {
            setInstRows(cached.data);
            setInstTotal(cached.total);
            setInstLoaded(cached.loadedCount);
        } else {
            fetchInstitutions(batch, search, status);
        }
    }, [fetchInstitutions]);

    // ─── Mount effect: load + realtime ────────────────────────────────────
    useEffect(() => {
        // Load from cache (or fetch if stale)
        initIndividuals(indivSearch, indivCat, indivStatus, indivBatch);
        initInstitutions(instSearch, instStatus, instBatch);

        // Allow filter effects to fire after first mount
        setTimeout(() => { isMounted.current = true; }, 0);

        // ── Smart realtime — no full re-fetch, do record-level updates ────
        const handleIndivEvent = (e: { action: string; record: ParticipantsApplicationResponse }) => {
            const { action, record } = e;

            setIndivRows(prev => {
                let next: ParticipantsApplicationResponse[];

                if (action === 'delete') {
                    next = prev.filter(r => r.id !== record.id);
                    setIndivTotal(t => Math.max(0, t - 1));
                    setIndivLoaded(l => Math.max(0, l - 1));
                } else if (action === 'update') {
                    const idx = prev.findIndex(r => r.id === record.id);
                    if (idx === -1) return prev;
                    next = [...prev];
                    next[idx] = record;
                } else {
                    // create — only prepend if it matches current filters
                    // Use the snapshot of current filter values via closure
                    next = prev;
                    setIndivSearch(search => {
                        setIndivCat(cat => {
                            setIndivStatus(status => {
                                if (indivMatchesFilter(record, search, cat, status)) {
                                    setIndivRows(p => [record, ...p]);
                                    setIndivTotal(t => t + 1);
                                    setIndivLoaded(l => l + 1);
                                }
                                return status;
                            });
                            return cat;
                        });
                        return search;
                    });
                    return prev; // return early, state set inside above
                }

                // Update cache
                const key = indivKey('', '', ''); // invalidate broadly
                if (indivCache[key]) indivCache[key].timestamp = 0;

                return next;
            });
        };

        const handleInstEvent = (e: { action: string; record: InstitutionsResponse }) => {
            const { action, record } = e;

            setInstRows(prev => {
                let next: InstitutionsResponse[];

                if (action === 'delete') {
                    next = prev.filter(r => r.id !== record.id);
                    setInstTotal(t => Math.max(0, t - 1));
                    setInstLoaded(l => Math.max(0, l - 1));
                } else if (action === 'update') {
                    const idx = prev.findIndex(r => r.id === record.id);
                    if (idx === -1) return prev;
                    next = [...prev];
                    next[idx] = record;
                } else {
                    // create
                    setInstSearch(search => {
                        setInstStatus(status => {
                            if (instMatchesFilter(record, search, status)) {
                                setInstRows(p => [record, ...p]);
                                setInstTotal(t => t + 1);
                                setInstLoaded(l => l + 1);
                            }
                            return status;
                        });
                        return search;
                    });
                    return prev;
                }

                Object.keys(instCache).forEach(k => { instCache[k].timestamp = 0; });
                return next;
            });
        };

        pb.collection('participants_application').subscribe('*', handleIndivEvent as any).catch(console.error);
        pb.collection('institutions').subscribe('*', handleInstEvent as any).catch(console.error);

        return () => {
            pb.collection('participants_application').unsubscribe('*').catch(() => {});
            pb.collection('institutions').unsubscribe('*').catch(() => {});
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // only once on mount

    // ─── Debounced re-fetch when individual filters change (skips mount) ──
    useEffect(() => {
        ssSet('apps_i_search', indivSearch);
        ssSet('apps_i_cat',    indivCat);
        ssSet('apps_i_status', indivStatus);
        ssSet('apps_i_batch',  indivBatch);

        if (!isMounted.current) return; // skip first-mount fire
        setIsSearching(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchIndividuals(indivBatch, indivSearch, indivCat, indivStatus);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indivSearch, indivCat, indivStatus, indivBatch]);

    // ─── Debounced re-fetch when institution filters change (skips mount) ─
    useEffect(() => {
        ssSet('apps_inst_search', instSearch);
        ssSet('apps_inst_status', instStatus);
        ssSet('apps_inst_batch',  instBatch);

        if (!isMounted.current) return; // skip first-mount fire
        setIsSearching(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchInstitutions(instBatch, instSearch, instStatus);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instSearch, instStatus, instBatch]);


    const handleLoadMore = (extraBatch: BatchSize) => {
        if (activeTab === 'individual') {
            const nextCount = indivLoaded + extraBatch;
            fetchIndividuals(nextCount, indivSearch, indivCat, indivStatus, true);
        } else {
            const nextCount = instLoaded + extraBatch;
            fetchInstitutions(nextCount, instSearch, instStatus, true);
        }
    };

    const handleRefresh = () => {
        if (activeTab === 'individual') {
            Object.keys(indivCache).forEach(k => { indivCache[k].timestamp = 0; });
            fetchIndividuals(indivLoaded || indivBatch, indivSearch, indivCat, indivStatus);
        } else {
            Object.keys(instCache).forEach(k => { instCache[k].timestamp = 0; });
            fetchInstitutions(instLoaded || instBatch, instSearch, instStatus);
        }
    };

    // ─── Derived ─────────────────────────────────────────────────────────
    const currentTotal  = activeTab === 'individual' ? indivTotal  : instTotal;
    const currentLoaded = activeTab === 'individual' ? indivLoaded : instLoaded;
    const hasMore       = currentLoaded < currentTotal;

    // ─── Render ───────────────────────────────────────────────────────────
    return (
        <div className={styles.pageContainer}>

            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Applications</h1>
                    <p className={styles.pageSubtitle}>Browse, search and track all submitted applications</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={styles.totalBadge}>
                        {currentLoaded} / {currentTotal.toLocaleString()}
                        {' '}{activeTab === 'individual' ? 'Participants' : 'Institutions'}
                        {isSearching && <span className={styles.searchingDot} />}
                    </span>
                    <button className={styles.refreshBtn} onClick={handleRefresh} title="Force refresh">
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabsRow}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'individual' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('individual')}
                >
                    Individual Participants
                    <span className={styles.tabCount}>{indivTotal.toLocaleString()}</span>
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'institution' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('institution')}
                >
                    Institutions
                    <span className={styles.tabCount}>{instTotal.toLocaleString()}</span>
                </button>
            </div>

            {/* Controls */}
            {activeTab === 'individual' ? (
                <div className={styles.controlsBar}>
                    <div className={styles.searchWrapper}>
                        <Search size={15} className={styles.searchIcon} />
                        <input className={styles.searchInput}
                            placeholder="Name, ID, email, phone…"
                            value={indivSearch}
                            onChange={e => setIndivSearch(e.target.value)} />
                    </div>
                    <select className={styles.filterSelect} value={indivCat}
                        onChange={e => setIndivCat(e.target.value)}>
                        <option value="">All Categories</option>
                        <option value="5_juz">5 Juz</option>
                        <option value="15_juz">15 Juz</option>
                        <option value="30_juz">30 Juz</option>
                    </select>
                    <select className={styles.filterSelect} value={indivStatus}
                        onChange={e => setIndivStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="reapplied">Reapplied</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select className={styles.filterSelect}
                        disabled title="Venue filter — coming soon"
                        style={{ opacity: 0.45 }}>
                        <option>Venue (soon)</option>
                    </select>
                    <select className={styles.filterSelect} value={indivBatch}
                        onChange={e => setIndivBatch(Number(e.target.value) as BatchSize)}
                        title="Items per load">
                        <option value={20}>Load 20</option>
                        <option value={50}>Load 50</option>
                        <option value={100}>Load 100</option>
                    </select>
                </div>
            ) : (
                <div className={styles.controlsBar}>
                    <div className={styles.searchWrapper}>
                        <Search size={15} className={styles.searchIcon} />
                        <input className={styles.searchInput}
                            placeholder="Name, ID, email, contact…"
                            value={instSearch}
                            onChange={e => setInstSearch(e.target.value)} />
                    </div>
                    <select className={styles.filterSelect} value={instStatus}
                        onChange={e => setInstStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="reapplied">Reapplied</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select className={styles.filterSelect} value={instBatch}
                        onChange={e => setInstBatch(Number(e.target.value) as BatchSize)}
                        title="Items per load">
                        <option value={20}>Load 20</option>
                        <option value={50}>Load 50</option>
                        <option value={100}>Load 100</option>
                    </select>
                </div>
            )}

            {/* Table */}
            <div className={styles.listCard}>
                {loading ? (
                    <div className={styles.loading}>Loading applications…</div>
                ) : activeTab === 'individual' ? (
                    indivRows.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📋</div>
                            No applications match your filters.
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Full Name</th>
                                        <th>Participant ID</th>
                                        <th>Institution</th>
                                        <th>Juz Category</th>
                                        <th>Allocated Venue</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {indivRows.map(app => (
                                        <IndividualRow key={app.id} app={app} navigate={navigate} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    instRows.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>🏫</div>
                            No institutions match your filters.
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Institution Name</th>
                                        <th>Institution ID</th>
                                        <th>Contact Person</th>
                                        <th>Email</th>
                                        <th>WhatsApp</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {instRows.map(inst => (
                                        <InstitutionRow key={inst.id} inst={inst} navigate={navigate} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* Load More */}
                {!loading && hasMore && (
                    <div className={styles.loadMoreBar}>
                        <span className={styles.loadMoreInfo}>
                            Showing <strong>{currentLoaded}</strong> of <strong>{currentTotal.toLocaleString()}</strong>
                        </span>
                        <div className={styles.loadMoreBtns}>
                            {BATCH_SIZES.map(size => (
                                <button
                                    key={size}
                                    className={styles.loadMoreBtn}
                                    onClick={() => handleLoadMore(size)}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? '…' : <>
                                        <ChevronDown size={13} /> +{size} more
                                    </>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!loading && !hasMore && currentLoaded > 0 && (
                    <div className={styles.allLoadedBar}>
                        ✓ All {currentTotal.toLocaleString()} records loaded
                    </div>
                )}
            </div>
        </div>
    );
}
