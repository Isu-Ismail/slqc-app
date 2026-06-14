import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import AdminDashboardPage from './features/dashboard/AdminDashboardPage';
import ControlPanelPage from './features/control-panel/ControlPanelPage';
import OrganisersPage from './features/organisers/OrganisersPage';
import VenuePanelPage from './features/venue-panel/VenuePanelPage';
import TrackPage from './features/track/TrackPage';
import ApprovalsListPage from './features/approvals/ApprovalsListPage';
import ApprovalReviewPage from './features/approvals/ApprovalReviewPage';
import ApplicationsListPage from './features/applications/ApplicationsListPage';
import JudgesPage from './features/judges/JudgesPage';
import MainLayout from './shared/components/Layout/MainLayout';

// 1. IMPORTANT: Import pb at the top so the router can use it!
import { pb } from './api/db';

// 2. Updated RequireAuth to use PocketBase directly
function RequireAuth({ children }: { children: React.ReactNode }) {
    if (!pb.authStore.isValid) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

// 3. Updated RequireAdmin to use PocketBase directly
function RequireAdmin({ children }: { children: React.ReactNode }) {
    if (!pb.authStore.isValid) {
        return <Navigate to="/login" replace />;
    }

    const user = pb.authStore.model;

    // Check if they are an app admin OR a PocketBase superuser (superusers have no collectionId)
    const isAdmin = user?.designation === 'admin' || !user?.collectionId;

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
}

// 4. Router
function App() {
    return (
        <BrowserRouter basename="/slqc-admin">
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Routes inside MainLayout */}
                <Route
                    path="/"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <AdminDashboardPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/track"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <TrackPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/venue-panel"
                    element={
                        <RequireAdmin>
                            <MainLayout>
                                <VenuePanelPage />
                            </MainLayout>
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/control-panel"
                    element={
                        <RequireAdmin>
                            <MainLayout>
                                <ControlPanelPage />
                            </MainLayout>
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/organisers"
                    element={
                        <RequireAdmin>
                            <MainLayout>
                                <OrganisersPage />
                            </MainLayout>
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/judges"
                    element={
                        <RequireAdmin>
                            <MainLayout>
                                <JudgesPage />
                            </MainLayout>
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/approvals"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <ApprovalsListPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/approvals/:id"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <ApprovalReviewPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/applications"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <ApplicationsListPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;