import { MapPin, Settings } from 'lucide-react';
import styles from '../VenuePanelPage.module.css';

interface Venue {
    id: string;
    name: string;
    allocatedCount?: number;
    capacity: number;
}

interface VenueTabsProps {
    venues: Venue[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    showSettings: boolean;
    loadVenues: () => void;
}

export default function VenueTabs({ venues, activeTab, setActiveTab, showSettings, loadVenues }: VenueTabsProps) {
    return (
        <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {showSettings && (
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTab : ''}`}
                        onClick={() => { setActiveTab('settings'); loadVenues(); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 16px',
                            borderRadius: '8px 8px 0 0',
                            borderBottom: activeTab === 'settings' ? '3px solid #059669' : '3px solid transparent'
                        }}
                    >
                        <Settings size={16} /> Venue Settings &amp; Allocator
                    </button>
                )}

                {venues.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0',
                        borderRadius: '8px 8px 0 0',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        borderBottom: 'none',
                        marginLeft: '8px'
                    }}>
                        {venues.map(v => (
                            <button
                                key={v.id}
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === v.name ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab(v.name)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 14px',
                                    borderRadius: '0',
                                    borderBottom: activeTab === v.name ? '3px solid #059669' : '3px solid transparent',
                                    backgroundColor: activeTab === v.name ? '#f0fdf4' : 'transparent',
                                    color: activeTab === v.name ? '#065f46' : '#475569'
                                }}
                            >
                                <MapPin size={14} /> {v.name}
                                <span style={{
                                    fontSize: '11px',
                                    backgroundColor: activeTab === v.name ? '#059669' : '#e2e8f0',
                                    color: '#ffffff',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    fontWeight: 'bold'
                                }}>{v.allocatedCount || 0}/{v.capacity}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}