import { MapPin, Settings, Shield, Award } from 'lucide-react';
import styles from '../VenuePanelPage.module.css';

interface Venue {
    id: string;
    name: string;
    allocatedCount?: number;
    capacity: number;
    round?: string;
}

interface VenueTabsProps {
    venues: Venue[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    showSettings: boolean;
    loadVenues: () => void;
}

export default function VenueTabs({ venues, activeTab, setActiveTab, showSettings, loadVenues }: VenueTabsProps) {
    const preliminaryVenues = venues.filter(v => v.round !== 'final');
    const finalVenues = venues.filter(v => v.round === 'final');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '24px' }}>
            {/* Top Row: Venue Settings & Allocator (Only for Admins) */}
            {showSettings && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '8px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    width: 'fit-content'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Settings size={14} /> Control
                    </div>
                    <div style={{ height: '16px', width: '1px', backgroundColor: '#cbd5e1' }}></div>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTab : ''}`}
                        onClick={() => { setActiveTab('settings'); loadVenues(); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: activeTab === 'settings' ? '1px solid #059669' : '1px solid transparent',
                            fontSize: '13.5px'
                        }}
                    >
                        Venue Settings &amp; Allocator
                    </button>
                </div>
            )}

            {/* Middle Row: Preliminary Round Venues */}
            {preliminaryVenues.length > 0 && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '150px' }}>
                        <Shield size={14} /> Preliminary Round
                    </div>
                    <div style={{ height: '20px', width: '1px', backgroundColor: '#cbd5e1' }}></div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                        {preliminaryVenues.map(v => (
                            <button
                                key={v.id}
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === v.name ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab(v.name)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: activeTab === v.name ? '1px solid #059669' : '1px solid #cbd5e1',
                                    backgroundColor: activeTab === v.name ? '#f0fdf4' : '#ffffff',
                                    color: activeTab === v.name ? '#065f46' : '#475569',
                                    fontSize: '13px'
                                }}
                            >
                                <MapPin size={13} /> {v.name}
                                <span style={{
                                    fontSize: '10.5px',
                                    backgroundColor: activeTab === v.name ? '#059669' : '#cbd5e1',
                                    color: activeTab === v.name ? '#ffffff' : '#475569',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontWeight: 'bold'
                                }}>{v.allocatedCount || 0}/{v.capacity}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Row: Final Round Venues */}
            {finalVenues.length > 0 && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '150px' }}>
                        <Award size={14} /> Final Round
                    </div>
                    <div style={{ height: '20px', width: '1px', backgroundColor: '#cbd5e1' }}></div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                        {finalVenues.map(v => (
                            <button
                                key={v.id}
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === v.name ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab(v.name)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: activeTab === v.name ? '1px solid #d97706' : '1px solid #cbd5e1',
                                    backgroundColor: activeTab === v.name ? '#fffbeb' : '#ffffff',
                                    color: activeTab === v.name ? '#92400e' : '#475569',
                                    fontSize: '13px'
                                }}
                            >
                                <MapPin size={13} /> {v.name}
                                <span style={{
                                    fontSize: '10.5px',
                                    backgroundColor: activeTab === v.name ? '#d97706' : '#cbd5e1',
                                    color: activeTab === v.name ? '#ffffff' : '#475569',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontWeight: 'bold'
                                }}>{v.allocatedCount || 0}/{v.capacity}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}