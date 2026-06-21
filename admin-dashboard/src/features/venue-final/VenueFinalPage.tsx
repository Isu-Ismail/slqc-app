import styles from '../venue-panel/VenuePanelPage.module.css';

export default function VenueFinalPage() {
    return (
        <div className={styles.container}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: '20px',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    boxShadow: '0 8px 24px rgba(5,150,105,0.3)'
                }}>
                    🏆
                </div>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                        Final Round — Coming Soon
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px', maxWidth: '440px', lineHeight: '1.6' }}>
                        The Final Round venue panel will be available after the Preliminary Round is complete and finalists have been determined.
                        It will show one venue with three category sittings and finalist participants grouped by category.
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    marginTop: '8px'
                }}>
                    {['5 Juz Finals', '15 Juz Finals', '30 Juz Finals'].map(label => (
                        <span key={label} style={{
                            padding: '6px 16px',
                            borderRadius: '20px',
                            border: '1.5px solid #a7f3d0',
                            background: '#ecfdf5',
                            color: '#065f46',
                            fontWeight: '600',
                            fontSize: '13px'
                        }}>
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
