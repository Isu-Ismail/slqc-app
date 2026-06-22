import { useState, useEffect, useRef, useCallback } from 'react';
import { marksApi } from '../../api/marks';
import { X, ZoomIn, ChevronLeft, ChevronRight, ImageOff, Loader2 } from 'lucide-react';
import styles from './MarksheetViewer.module.css';

interface MarksheetViewerProps {
    participantId: string;
    round: string;
    participantName?: string;
    onClose: () => void;
}

export default function MarksheetViewer({ participantId, round, participantName, onClose }: MarksheetViewerProps) {
    const [images, setImages] = useState<string[]>([]);
    const [, setFilenames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

    // Drag state for the lightbox popup
    const lightboxRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const position = useRef({ x: 0, y: 0 });

    const fetchMarksheets = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await marksApi.getMarksheets(participantId, round);
            setImages(data.images || []);
            setFilenames(data.filenames || []);
        } catch (err: any) {
            setError('Failed to load marksheets.');
        } finally {
            setLoading(false);
        }
    }, [participantId, round]);

    useEffect(() => {
        fetchMarksheets();
    }, [fetchMarksheets]);

    // Keyboard navigation inside lightbox
    useEffect(() => {
        if (lightboxIdx === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') setLightboxIdx(i => (i !== null && i < images.length - 1 ? i + 1 : i));
            if (e.key === 'ArrowLeft') setLightboxIdx(i => (i !== null && i > 0 ? i - 1 : i));
            if (e.key === 'Escape') setLightboxIdx(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxIdx, images.length]);

    // Drag handlers for the lightbox popup
    const onMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, img')) return;
        isDragging.current = true;
        dragOffset.current = { x: e.clientX - position.current.x, y: e.clientY - position.current.y };
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current || !lightboxRef.current) return;
        position.current = { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y };
        lightboxRef.current.style.transform = `translate(calc(-50% + ${position.current.x}px), calc(-50% + ${position.current.y}px))`;
    }, []);

    const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    // Reset position when lightbox changes
    useEffect(() => {
        position.current = { x: 0, y: 0 };
        if (lightboxRef.current) {
            lightboxRef.current.style.transform = 'translate(-50%, -50%)';
        }
    }, [lightboxIdx]);

    return (
        <>
            {/* Main viewer modal backdrop */}
            <div className={styles.backdrop} onClick={onClose}>
                <div className={styles.panel} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div>
                            <h3 className={styles.title}>Marksheet Photos</h3>
                            {participantName && (
                                <p className={styles.subtitle}>{participantName} — {round.charAt(0).toUpperCase() + round.slice(1)} Round</p>
                            )}
                        </div>
                        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className={styles.body}>
                        {loading ? (
                            <div className={styles.stateCenter}>
                                <Loader2 size={36} className={styles.spinner} />
                                <p>Loading marksheets…</p>
                            </div>
                        ) : error ? (
                            <div className={styles.stateCenter}>
                                <ImageOff size={36} style={{ color: '#ef4444', marginBottom: 8 }} />
                                <p style={{ color: '#ef4444' }}>{error}</p>
                                <button className={styles.retryBtn} onClick={fetchMarksheets}>Retry</button>
                            </div>
                        ) : images.length === 0 ? (
                            <div className={styles.stateCenter}>
                                <ImageOff size={48} style={{ color: '#94a3b8', marginBottom: 12 }} />
                                <p style={{ color: '#64748b', fontWeight: 600 }}>No marksheets uploaded yet</p>
                                <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                                    Use the Marksheet Upload page to add photos for this participant.
                                </p>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {images.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className={styles.thumbWrapper}
                                        onClick={() => setLightboxIdx(idx)}
                                        title={`View image ${idx + 1}`}
                                    >
                                        <img src={url} alt={`Marksheet ${idx + 1}`} className={styles.thumb} loading="lazy" />
                                        <div className={styles.thumbOverlay}>
                                            <ZoomIn size={22} />
                                        </div>
                                        <span className={styles.thumbLabel}>Photo {idx + 1}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox popup — draggable, does NOT auto-close on backdrop click */}
            {lightboxIdx !== null && (
                <div
                    className={styles.lightboxBackdrop}
                    onClick={() => setLightboxIdx(null)}
                >
                    <div
                        ref={lightboxRef}
                        className={styles.lightbox}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={onMouseDown}
                        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
                    >
                        {/* Lightbox header */}
                        <div className={styles.lbHeader}>
                            <span className={styles.lbCounter}>
                                Photo {lightboxIdx + 1} of {images.length}
                            </span>
                            <button
                                className={styles.lbCloseBtn}
                                onClick={() => setLightboxIdx(null)}
                                aria-label="Close image"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Main image */}
                        <div className={styles.lbImageWrap}>
                            <img
                                src={images[lightboxIdx]}
                                alt={`Marksheet ${lightboxIdx + 1}`}
                                className={styles.lbImage}
                                draggable={false}
                            />
                        </div>

                        {/* Prev / Next arrows */}
                        {lightboxIdx > 0 && (
                            <button
                                className={`${styles.lbArrow} ${styles.lbArrowLeft}`}
                                onClick={() => setLightboxIdx(i => (i !== null ? i - 1 : i))}
                                aria-label="Previous image"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        {lightboxIdx < images.length - 1 && (
                            <button
                                className={`${styles.lbArrow} ${styles.lbArrowRight}`}
                                onClick={() => setLightboxIdx(i => (i !== null ? i + 1 : i))}
                                aria-label="Next image"
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}

                        {/* Thumbnail strip at bottom */}
                        {images.length > 1 && (
                            <div className={styles.lbStrip}>
                                {images.map((url, idx) => (
                                    <img
                                        key={idx}
                                        src={url}
                                        alt={`thumb ${idx + 1}`}
                                        className={`${styles.lbStripThumb} ${idx === lightboxIdx ? styles.lbStripThumbActive : ''}`}
                                        onClick={() => setLightboxIdx(idx)}
                                        draggable={false}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
