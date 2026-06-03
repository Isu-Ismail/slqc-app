// admin-dashboard/src/features/control-panel/components/StatsRecalculator.tsx

import { useState } from 'react';
import { RefreshCw, BarChart3, CheckCircle2, AlertCircle, Timer } from 'lucide-react';
import { pb } from '../../../api/db';
import styles from '../ControlPanelPage.module.css';

interface Props {
    onUpdate: () => void;
}

export default function StatsRecalculator({ onUpdate }: Props) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

    const handleRecalculate = async () => {
        setLoading(true);
        setResult(null);
        try {
            await pb.send('/api/admin-recalculate-stats', { method: 'POST' });
            setResult({ ok: true, msg: 'Recalculated at ' + new Date().toLocaleTimeString() });
            onUpdate();
        } catch (err: any) {
            setResult({ ok: false, msg: err?.message || 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} color="#0f766e" />
                    Stats Recalculator
                </h2>
            </div>

            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0', lineHeight: '1.55' }}>
                Recalculates <strong>total_applicant</strong>, <strong>today_count</strong>, and{' '}
                <strong>institution_count</strong> by counting all records from scratch.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                    onClick={handleRecalculate}
                    disabled={loading}
                    className={styles.btnPrimary}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}
                >
                    <RefreshCw
                        size={15}
                        style={loading ? { animation: 'spin 1s linear infinite' } : undefined}
                    />
                    {loading ? 'Recalculating…' : 'Recalculate All Stats Now'}
                </button>

                {result && (
                    result.ok ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 14px', background: '#f0fdf4',
                            border: '1px solid #bbf7d0', borderRadius: '8px',
                            color: '#166534', fontSize: '13px', fontWeight: 500
                        }}>
                            <CheckCircle2 size={15} /> {result.msg}
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 14px', background: '#fef2f2',
                            border: '1px solid #fecaca', borderRadius: '8px',
                            color: '#991b1b', fontSize: '13px'
                        }}>
                            <AlertCircle size={15} /> {result.msg}
                        </div>
                    )
                )}

                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Timer size={12} /> Auto-runs via cron at 01:00 AM daily
                </p>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
