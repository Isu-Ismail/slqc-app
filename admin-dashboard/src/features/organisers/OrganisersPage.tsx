import { useState, useEffect } from 'react';
import { usersApi } from '../../api/users';
import type { UserRecord } from '../../api/users';
import AddOrganiserModal from './components/AddOrganiserModal';
import ConfirmModal from '../../shared/components/Modal/ConfirmModal';
import styles from './OrganisersPage.module.css';
import { Plus, Trash2, Shield, User, RefreshCw } from 'lucide-react';
import { pb } from '../../api/db';

export default function OrganisersPage() {
    const currentUser = pb.authStore.model;
    const initialCache = usersApi.getCachedOrganisers();
    const [users, setUsers] = useState<UserRecord[]>(initialCache || []);
    const [loading, setLoading] = useState(!initialCache);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, type: 'confirm'|'alert'|'success', onConfirm: () => void} | null>(null);

    const loadUsers = async (force = false) => {
        try {
            if (force || !usersApi.getCachedOrganisers()) setLoading(true);
            const data = await usersApi.getAllOrganisers(force);
            setUsers(data);
        } catch (err) {
            console.error("Failed to load users", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        Promise.resolve().then(() => loadUsers());
        
        // Subscribe to real-time updates for users collection
        pb.collection('users').subscribe('*', function () {
            loadUsers(true);
        });

        return () => {
            pb.collection('users').unsubscribe('*');
        };
    }, []);

    const handleDelete = (id: string, name: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Organiser",
            message: `Are you sure you want to remove ${name}? This action cannot be undone.`,
            type: 'confirm',
            onConfirm: async () => {
                setConfirmConfig(null);
                try {
                    await usersApi.deleteOrganiser(id);
                } catch (err) {
                    console.error("Failed to delete user", err);
                    setConfirmConfig({
                        isOpen: true,
                        title: "Error",
                        message: "Failed to delete user. Please check your permissions.",
                        type: 'alert',
                        onConfirm: () => setConfirmConfig(null)
                    });
                }
            }
        });
    };

    if (currentUser?.designation !== 'admin') {
        return (
            <div className={styles.restricted}>
                <h2>Access Denied</h2>
                <p>Only Administrators can manage organisers.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header} style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button className={styles.btnSecondary} onClick={() => loadUsers(true)} title="Refresh data">
                    <RefreshCw size={18} />
                </button>
                <button className={styles.btnPrimary} onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={18} /> Add Organiser
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>Loading users...</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Designation</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userInfo}>
                                            <div className={styles.avatar}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={styles.userName}>{user.name}</span>
                                            {user.id === currentUser?.id && <span className={styles.badgeSelf}>You</span>}
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <div className={styles.designationBadge} data-type={user.designation}>
                                            {user.designation === 'admin' ? <Shield size={14} /> : <User size={14} />}
                                            {user.designation}
                                        </div>
                                    </td>
                                    <td>
                                        <button 
                                            className={styles.btnDelete} 
                                            onClick={() => handleDelete(user.id, user.name)}
                                            disabled={user.id === currentUser?.id}
                                            title={user.id === currentUser?.id ? "You cannot delete yourself" : "Delete User"}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className={styles.emptyState}>No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isAddModalOpen && (
                <AddOrganiserModal 
                    onClose={() => setIsAddModalOpen(false)} 
                    onSuccess={() => setIsAddModalOpen(false)} 
                />
            )}

            {confirmConfig && (
                <ConfirmModal 
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    type={confirmConfig.type}
                    onConfirm={confirmConfig.onConfirm}
                    onClose={() => setConfirmConfig(null)}
                />
            )}
        </div>
    );
}
