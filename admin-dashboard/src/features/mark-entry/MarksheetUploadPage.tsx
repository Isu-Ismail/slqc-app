import { useState, useEffect, useRef } from 'react';
import { pb } from '../../api/db';
import { marksApi } from '../../api/marks';
import { Camera, Upload, X, CheckCircle, AlertTriangle, Search, Loader2, Image, Zap, Award } from 'lucide-react';
import styles from './MarksheetUploadPage.module.css';

export default function MarksheetUploadPage() {
    const user = pb.authStore.model;

    const [round, setRound] = useState<'preliminary' | 'final'>('preliminary');
    const [selectedVenue, setSelectedVenue] = useState<string>('all');
    const [venues, setVenues] = useState<any[]>([]);

    // Student search / selection
    const [searchQuery, setSearchQuery] = useState('');
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // File selection
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Load venues on mount
    useEffect(() => {
        pb.collection('venue_detail').getFullList({ sort: 'name' }).then(setVenues).catch(console.error);
    }, []);

    // Load students whenever round or venue changes
    useEffect(() => {
        const load = async () => {
            if (!selectedVenue) return;
            setLoadingStudents(true);
            try {
                const data = await marksApi.getStudentsStatus(selectedVenue, round);
                const all = [...(data.pending || []), ...(data.completed || [])];
                setAllStudents(all);
            } catch (err) {
                console.error('Failed to load students:', err);
            } finally {
                setLoadingStudents(false);
            }
        };
        load();
    }, [round, selectedVenue]);

    // Filter students by search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredStudents([]);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredStudents(
                allStudents.filter(s =>
                    (s.full_name || '').toLowerCase().includes(q) ||
                    (s.register_id || '').toLowerCase().includes(q)
                )
            );
        }
    }, [searchQuery, allStudents]);

    const handleSelectStudent = (student: any) => {
        setSelectedStudent(student);
        setSearchQuery('');
        setFilteredStudents([]);
        setSelectedFiles([]);
        setPreviews([]);
        setUploadSuccess(false);
        setUploadError('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Append to existing selection
        const combined = [...selectedFiles, ...files].slice(0, 20); // cap at 20
        setSelectedFiles(combined);

        // Generate previews
        const newPreviews = combined.map(f => URL.createObjectURL(f));
        // Revoke old preview URLs to avoid memory leaks
        previews.forEach(url => URL.revokeObjectURL(url));
        setPreviews(newPreviews);

        setUploadSuccess(false);
        setUploadError('');

        // Reset input so same files can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (idx: number) => {
        URL.revokeObjectURL(previews[idx]);
        const newFiles = selectedFiles.filter((_, i) => i !== idx);
        const newPreviews = previews.filter((_, i) => i !== idx);
        setSelectedFiles(newFiles);
        setPreviews(newPreviews);
    };

    const handleUpload = async () => {
        if (!selectedStudent || selectedFiles.length === 0) return;
        setUploading(true);
        setUploadError('');
        setUploadSuccess(false);
        try {
            await marksApi.uploadMarksheets(selectedStudent.participant_id, round, selectedFiles);
            setUploadSuccess(true);
            // Clear files after successful upload
            previews.forEach(url => URL.revokeObjectURL(url));
            setSelectedFiles([]);
            setPreviews([]);
        } catch (err: any) {
            setUploadError('Upload failed: ' + (err?.message || err));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* Page header */}
            <div className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    <Camera size={22} className={styles.topBarIcon} />
                    <div>
                        <h1 className={styles.pageTitle}>Marksheet Upload</h1>
                        <p className={styles.pageSubtitle}>Upload participant answer sheet photos</p>
                    </div>
                </div>

                {/* Round selector */}
                <div className={styles.topBarRight}>
                    <div className={styles.segmentGroup}>
                        <button
                            className={`${styles.segBtn} ${round === 'preliminary' ? styles.segBtnActive : ''}`}
                            onClick={() => { setRound('preliminary'); setSelectedStudent(null); }}
                        >
                            <Zap size={14} /> Preliminary
                        </button>
                        <button
                            className={`${styles.segBtn} ${round === 'final' ? styles.segBtnActive : ''}`}
                            onClick={() => { setRound('final'); setSelectedStudent(null); }}
                        >
                            <Award size={14} /> Final
                        </button>
                    </div>

                    {/* Venue filter */}
                    <select
                        value={selectedVenue}
                        onChange={e => { setSelectedVenue(e.target.value); setSelectedStudent(null); }}
                        className={styles.venueSelect}
                    >
                        <option value="all">All Venues</option>
                        {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.content}>
                {/* ── Left: Student Search Panel ── */}
                <div className={styles.searchPanel}>
                    <h2 className={styles.sectionTitle}>
                        <Search size={16} /> Select Participant
                    </h2>

                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search by name or registration ID…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && filteredStudents.length > 0) {
                                    handleSelectStudent(filteredStudents[0]);
                                }
                            }}
                        />
                    </div>

                    {/* Autocomplete dropdown */}
                    {filteredStudents.length > 0 && (
                        <div className={styles.dropdown}>
                            {filteredStudents.map(s => (
                                <div key={s.participant_id} className={styles.dropdownItem} onClick={() => handleSelectStudent(s)}>
                                    <div className={styles.dropdownName}>{s.full_name}</div>
                                    <div className={styles.dropdownMeta}>ID: {s.register_id} · {s.category}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {searchQuery.trim() !== '' && filteredStudents.length === 0 && !loadingStudents && (
                        <div className={styles.noMatch}>No participants found matching "{searchQuery}"</div>
                    )}

                    {loadingStudents && (
                        <div className={styles.loadingRow}>
                            <Loader2 size={16} className={styles.spin} /> Loading participants…
                        </div>
                    )}

                    {/* Student list quick-scroll */}
                    {!loadingStudents && searchQuery === '' && (
                        <div className={styles.studentList}>
                            <p className={styles.listHint}>All participants ({allStudents.length})</p>
                            {allStudents.map(s => (
                                <div
                                    key={s.participant_id}
                                    className={`${styles.studentRow} ${selectedStudent?.participant_id === s.participant_id ? styles.studentRowActive : ''}`}
                                    onClick={() => handleSelectStudent(s)}
                                >
                                    <div className={styles.studentRowName}>{s.full_name}</div>
                                    <div className={styles.studentRowMeta}>{s.register_id}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right: Upload Panel ── */}
                <div className={styles.uploadPanel}>
                    {!selectedStudent ? (
                        <div className={styles.emptyState}>
                            <Image size={52} className={styles.emptyIcon} />
                            <h3>Select a Participant</h3>
                            <p>Search and click a participant on the left to upload their marksheet photos.</p>
                        </div>
                    ) : (
                        <>
                            {/* Selected student card */}
                            <div className={styles.studentCard}>
                                <div className={styles.studentCardName}>{selectedStudent.full_name}</div>
                                <div className={styles.studentCardMeta}>
                                    <span>ID: {selectedStudent.register_id}</span>
                                    <span>Category: {selectedStudent.category}</span>
                                    <span>Round: {round.charAt(0).toUpperCase() + round.slice(1)}</span>
                                </div>
                                <button className={styles.changeBtn} onClick={() => setSelectedStudent(null)}>
                                    Change
                                </button>
                            </div>

                            {/* Success banner */}
                            {uploadSuccess && (
                                <div className={styles.successBanner}>
                                    <CheckCircle size={18} />
                                    Marksheets uploaded successfully! You can upload more photos below.
                                </div>
                            )}

                            {/* Error banner */}
                            {uploadError && (
                                <div className={styles.errorBanner}>
                                    <AlertTriangle size={18} />
                                    {uploadError}
                                </div>
                            )}

                            {/* Drop zone / file picker */}
                            <div
                                className={styles.dropZone}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera size={36} className={styles.dropZoneIcon} />
                                <p className={styles.dropZoneTitle}>
                                    Tap to capture or choose photos
                                </p>
                                <p className={styles.dropZoneHint}>
                                    On mobile this opens your camera · On desktop opens file picker<br />
                                    JPEG, PNG, WEBP, HEIC · Max 15 MB per file · Up to 20 photos
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    capture="environment"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Preview grid */}
                            {previews.length > 0 && (
                                <div className={styles.previewSection}>
                                    <div className={styles.previewHeader}>
                                        <span className={styles.previewCount}>{selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''} selected</span>
                                        <button className={styles.clearAllBtn} onClick={() => {
                                            previews.forEach(url => URL.revokeObjectURL(url));
                                            setSelectedFiles([]);
                                            setPreviews([]);
                                        }}>
                                            Clear all
                                        </button>
                                    </div>
                                    <div className={styles.previewGrid}>
                                        {previews.map((url, idx) => (
                                            <div key={idx} className={styles.previewThumb}>
                                                <img src={url} alt={`preview ${idx + 1}`} className={styles.previewImg} />
                                                <button className={styles.removeThumbBtn} onClick={() => removeFile(idx)} aria-label="Remove">
                                                    <X size={13} />
                                                </button>
                                                <span className={styles.previewThumbLabel}>
                                                    {selectedFiles[idx]?.name?.split('.')[0]?.slice(0, 10) || `Photo ${idx + 1}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Upload button */}
                                    <button
                                        className={styles.uploadBtn}
                                        onClick={handleUpload}
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <><Loader2 size={18} className={styles.spin} /> Uploading…</>
                                        ) : (
                                            <><Upload size={18} /> Upload {selectedFiles.length} Photo{selectedFiles.length !== 1 ? 's' : ''}</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
