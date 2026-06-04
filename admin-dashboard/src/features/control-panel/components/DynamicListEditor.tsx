import { useState, useEffect } from 'react';
import { metadataApi } from '../../../api/metadata';
import type { MetadataRecord } from '../../../api/metadata';
import styles from '../ControlPanelPage.module.css';
import { Trash2, Plus, GripVertical } from 'lucide-react';

interface Props {
    title: string;
    metadataKey: string;
    metadata: Record<string, MetadataRecord>;
    onUpdate: () => void;
    template: Record<string, unknown>;
}

export default function DynamicListEditor({ title, metadataKey, metadata, onUpdate, template }: Props) {
    const [loading, setLoading] = useState(false);
    const record = metadata[metadataKey];
    const [items, setItems] = useState<Record<string, unknown>[]>(record && Array.isArray(record.value) ? record.value : []);

    useEffect(() => {
        const record = metadata[metadataKey];
        Promise.resolve().then(() => {
            if (record && Array.isArray(record.value)) {
                setItems(record.value);
            } else {
                setItems([]);
            }
        });
    }, [metadata, metadataKey]);

    const handleItemChange = (index: number, key: string, value: unknown) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [key]: value };
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { ...template }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleMoveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === items.length - 1) return;
        
        const newItems = [...items];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newItems[index];
        newItems[index] = newItems[swapIndex];
        newItems[swapIndex] = temp;
        setItems(newItems);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const dbRecord = await metadataApi.getMetadataByKey(metadataKey);
            if (dbRecord) {
                await metadataApi.updateMetadata(dbRecord.id, items);
            } else {
                await metadataApi.createMetadata(metadataKey, items);
            }
            alert(`${title} updated successfully!`);
            onUpdate();
        } catch (err) {
            console.error(`Failed to update ${metadataKey}`, err);
            alert(`Failed to update ${title}.`);
        } finally {
            setLoading(false);
        }
    };

    const keys = Object.keys(template);

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{title}</h2>
                <button onClick={handleAddItem} className={styles.btnOutline} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={16} /> <span className={styles.btnText}>Add Item</span>
                </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px', maxHeight: '280px', overflowY: 'auto', paddingRight: '8px' }}>
                {items.length === 0 && <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No items added yet.</div>}
                
                {items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', color: '#94a3b8' }}>
                            <GripVertical size={20} onClick={() => handleMoveItem(index, 'up')} style={{ transform: 'rotate(90deg)' }} />
                            <span style={{ fontSize: '12px', textAlign: 'center' }}>{index + 1}</span>
                            <GripVertical size={20} onClick={() => handleMoveItem(index, 'down')} style={{ transform: 'rotate(90deg)' }} />
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {keys.map(key => (
                                <div key={key}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px', textTransform: 'capitalize' }}>
                                        {key}
                                    </label>
                                    {typeof template[key] === 'boolean' ? (
                                        <select 
                                            value={item[key] ? 'true' : 'false'}
                                            onChange={(e) => handleItemChange(index, key, e.target.value === 'true')}
                                            style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'white' }}
                                        >
                                            <option value="true">True / Active</option>
                                            <option value="false">False / Inactive</option>
                                        </select>
                                    ) : (
                                        <input 
                                            type="text"
                                            value={String(item[key] || '')}
                                            onChange={(e) => handleItemChange(index, key, e.target.value)}
                                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={() => handleRemoveItem(index)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Remove"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                ))}
            </div>

            <button onClick={handleSave} className={styles.btnPrimary} disabled={loading}>
                {loading ? 'Saving...' : `Save ${title}`}
            </button>
        </div>
    );
}
