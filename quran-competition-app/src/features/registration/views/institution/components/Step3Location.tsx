// @ts-ignore
import styles from '../InstitutionRegisterPage.module.css';

interface Step3LocationProps {
    location: string;
    setLocation: (val: string) => void;
}

export default function Step3Location({
    location,
    setLocation
}: Step3LocationProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Institution Google Maps Link *</label>
                <input
                    type="url"
                    className={styles.input}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. https://maps.app.goo.gl/XXXXXX or https://share.google/..."
                    required
                />
                
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.5', marginTop: '10px' }}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '600' }}>How to get the link:</p>
                    <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li>Open Google Maps on your phone or computer.</li>
                        <li>Search for your Madrasa, School or Institution.</li>
                        <li>Click the <strong>Share</strong> button.</li>
                        <li>Click <strong>Copy link</strong> and paste it in the box above.</li>
                    </ol>
                </div>

                {location && (
                    <div className={styles.locationMapPreview} style={{ marginTop: '16px' }}>
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                            <a
                                href={location}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.locationMapLink}
                            >
                                Verify Entered Link ↗
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
