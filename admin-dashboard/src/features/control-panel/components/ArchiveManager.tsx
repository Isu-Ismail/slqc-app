import { useState } from 'react';
import { pb } from '../../../api/db';
import styles from '../ControlPanelPage.module.css';

export default function ArchiveManager() {
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [activeAction, setActiveAction] = useState<'archive' | 'delete' | null>(null);

    const [archiveForm, setArchiveForm] = useState({
        year: '',
        password: ''
    });

    const [deleteForm, setDeleteForm] = useState({
        year: '',
        password: ''
    });

    const startSimulatedProgress = (action: 'archive' | 'delete') => {
        setActiveAction(action);
        setProgress(5);
        
        const steps = action === 'archive' 
            ? [
                { limit: 15, msg: 'Authenticating administrator credentials...' },
                { limit: 30, msg: 'Initializing database archive transaction...' },
                { limit: 45, msg: 'Archiving institution and category profiles...' },
                { limit: 60, msg: 'Copying applicant list and finalist details...' },
                { limit: 75, msg: 'Archiving mark sheets and assessment templates...' },
                { limit: 90, msg: 'Duplicating uploaded candidate media and files...' },
                { limit: 95, msg: 'Finalizing database transaction & creating indexes...' }
              ]
            : [
                { limit: 20, msg: 'Authenticating administrator credentials...' },
                { limit: 40, msg: 'Scanning archive tables for target year...' },
                { limit: 65, msg: 'Removing archived candidate marks and profiles...' },
                { limit: 85, msg: 'Purging archived venues, judges and media...' },
                { limit: 95, msg: 'Finalizing storage cleanup and disk pruning...' }
              ];

        setProgressMessage(steps[0].msg);

        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) {
                    return prev;
                }
                const nextVal = prev + Math.floor(Math.random() * 5) + 1;
                const capped = nextVal > 95 ? 95 : nextVal;
                
                // Find matching message
                const currentStep = steps.find(s => capped <= s.limit);
                if (currentStep) {
                    setProgressMessage(currentStep.msg);
                }
                
                return capped;
            });
        }, 600);

        return interval;
    };

    const handleArchive = async (e: React.FormEvent) => {
        e.preventDefault();
        const yearTrimmed = archiveForm.year.trim();
        if (!yearTrimmed) return;

        const confirmText = `Are you absolutely sure you want to archive current data under the year "${yearTrimmed}"?\n\nThis will copy all current participants, institutions, venues, judges, marks, and templates to the archive.`;
        if (!window.confirm(confirmText)) return;

        setArchiveLoading(true);
        const interval = startSimulatedProgress('archive');
        try {
            await pb.send('/api/admin/archive-year', {
                method: 'POST',
                body: {
                    year: yearTrimmed,
                    password: archiveForm.password
                }
            });
            clearInterval(interval);
            setProgress(100);
            setProgressMessage('Successfully completed year archiving!');
            setTimeout(() => {
                alert(`Successfully archived active data under year ${yearTrimmed}!`);
                setArchiveForm({ year: '', password: '' });
                setActiveAction(null);
            }, 500);
        } catch (err: any) {
            clearInterval(interval);
            setActiveAction(null);
            console.error('Failed to archive:', err);
            alert(`Archiving failed: ${err.message || err.toString()}`);
        } finally {
            setArchiveLoading(false);
        }
    };

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        const yearTrimmed = deleteForm.year.trim();
        if (!yearTrimmed) return;

        const confirmText = `⚠️ WARNING: This will PERMANENTLY delete all historical records (candidates, marks, venues, etc.) archived for the year "${yearTrimmed}".\n\nThis action cannot be undone. Are you sure you want to proceed?`;
        if (!window.confirm(confirmText)) return;

        setDeleteLoading(true);
        const interval = startSimulatedProgress('delete');
        try {
            await pb.send('/api/admin/delete-archive-year', {
                method: 'POST',
                body: {
                    year: yearTrimmed,
                    password: deleteForm.password
                }
            });
            clearInterval(interval);
            setProgress(100);
            setProgressMessage('Successfully purged archive year records!');
            setTimeout(() => {
                alert(`Successfully deleted historical archive for year ${yearTrimmed}.`);
                setDeleteForm({ year: '', password: '' });
                setActiveAction(null);
            }, 500);
        } catch (err: any) {
            clearInterval(interval);
            setActiveAction(null);
            console.error('Failed to delete archive:', err);
            alert(`Deletion failed: ${err.message || err.toString()}`);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', gridColumn: '1 / -1' }}>
            {/* Archive Section */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Archive Current Competition Year</h2>
                </div>
                
                <form onSubmit={handleArchive} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '14px' }}>
                        This copies all active data (participants, institutions, venues, judges, marks, and mark templates) 
                        into read-only archive collections under the specified year. Active tables are NOT deleted.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                                Year Name (e.g. 2026)
                            </label>
                            <input 
                                type="text"
                                value={archiveForm.year}
                                onChange={(e) => setArchiveForm({ ...archiveForm, year: e.target.value })}
                                className={styles.formInput}
                                placeholder="Enter year name"
                                required
                                disabled={archiveLoading}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                                Confirm Password
                            </label>
                            <input 
                                type="password"
                                value={archiveForm.password}
                                onChange={(e) => setArchiveForm({ ...archiveForm, password: e.target.value })}
                                className={styles.formInput}
                                placeholder="Enter admin password"
                                required
                                disabled={archiveLoading}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button 
                            type="submit" 
                            className={styles.btnPrimary} 
                            disabled={archiveLoading || deleteLoading} 
                            style={{ alignSelf: 'flex-start', backgroundColor: '#059669', borderColor: '#059669' }}
                        >
                            {archiveLoading ? 'Archiving...' : 'Archive Current Year'}
                        </button>

                        {activeAction === 'archive' && (
                            <div style={{
                                padding: '16px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: '#166534' }}>
                                    <span>{progressMessage}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#dcfce7', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #10b981, #059669)',
                                        transition: 'width 0.3s ease-out',
                                        borderRadius: '4px'
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Delete Section */}
            <div className={styles.card} style={{ borderTop: '4px solid #ef4444' }}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle} style={{ color: '#dc2626' }}>Delete Past Year Archive</h2>
                </div>
                
                <form onSubmit={handleDelete} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '14px' }}>
                        Permanently deletes historical archive data of a specific year from all archive tables. 
                        <strong> This action is irreversible.</strong>
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                                Year to Delete (e.g. 2025)
                            </label>
                            <input 
                                type="text"
                                value={deleteForm.year}
                                onChange={(e) => setDeleteForm({ ...deleteForm, year: e.target.value })}
                                className={styles.formInput}
                                placeholder="Enter year to delete"
                                required
                                disabled={deleteLoading}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                                Confirm Password
                            </label>
                            <input 
                                type="password"
                                value={deleteForm.password}
                                onChange={(e) => setDeleteForm({ ...deleteForm, password: e.target.value })}
                                className={styles.formInput}
                                placeholder="Enter admin password"
                                required
                                disabled={deleteLoading}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button 
                            type="submit" 
                            className={styles.btnPrimary} 
                            disabled={deleteLoading || archiveLoading} 
                            style={{ alignSelf: 'flex-start', backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete Past Year Archive'}
                        </button>

                        {activeAction === 'delete' && (
                            <div style={{
                                padding: '16px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                                    <span>{progressMessage}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#fee2e2', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #f87171, #dc2626)',
                                        transition: 'width 0.3s ease-out',
                                        borderRadius: '4px'
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

