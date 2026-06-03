import  { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import styles from './PrintPreviewModal.module.css';



// ─── Modal Component ───────────────────────────────────────────

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
}

export default function PrintPreviewModal({ isOpen, onClose, title, htmlContent }: PrintPreviewModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <span className={styles.modalTitle}>{title}</span>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <iframe
                    ref={iframeRef}
                    className={styles.previewFrame}
                    srcDoc={htmlContent}
                    title="Print Preview"
                />

                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={onClose}>Close</button>
                    <button className={styles.printBtn} onClick={handlePrint}>
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>
        </div>
    );
}