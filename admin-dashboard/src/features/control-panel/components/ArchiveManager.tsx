import { useState } from 'react';
import { pb } from '../../../api/db';
import styles from '../ControlPanelPage.module.css';

export default function ArchiveManager() {
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [archiveForm, setArchiveForm] = useState({
        year: '',
        password: ''
    });

    const [deleteForm, setDeleteForm] = useState({
        year: '',
        password: ''
    });

    const handleArchive = async (e: React.FormEvent) => {
        e.preventDefault();
        const yearTrimmed = archiveForm.year.trim();
        if (!yearTrimmed) return;

        const confirmText = `Are you absolutely sure you want to archive current data under the year "${yearTrimmed}"?\n\nThis will copy all current participants, institutions, venues, judges, marks, and templates to the archive.`;
        if (!window.confirm(confirmText)) return;

        setArchiveLoading(true);
        try {
            await pb.send('/api/admin/archive-year', {
                method: 'POST',
                body: {
                    year: yearTrimmed,
                    password: archiveForm.password
                }
            });
            alert(`Successfully archived active data under year ${yearTrimmed}!`);
            setArchiveForm({ year: '', password: '' });
        } catch (err: any) {
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
        try {
            await pb.send('/api/admin/delete-archive-year', {
                method: 'POST',
                body: {
                    year: yearTrimmed,
                    password: deleteForm.password
                }
            });
            alert(`Successfully deleted historical archive for year ${yearTrimmed}.`);
            setDeleteForm({ year: '', password: '' });
        } catch (err: any) {
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
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className={styles.btnPrimary} 
                        disabled={archiveLoading} 
                        style={{ alignSelf: 'flex-start', backgroundColor: '#059669', borderColor: '#059669' }}
                    >
                        {archiveLoading ? 'Archiving...' : 'Archive Current Year'}
                    </button>
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
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className={styles.btnPrimary} 
                        disabled={deleteLoading} 
                        style={{ alignSelf: 'flex-start', backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                    >
                        {deleteLoading ? 'Deleting...' : 'Delete Past Year Archive'}
                    </button>
                </form>
            </div>
        </div>
    );
}
