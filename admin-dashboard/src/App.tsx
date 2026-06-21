import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import AdminDashboardPage from './features/dashboard/AdminDashboardPage';
import ControlPanelPage from './features/control-panel/ControlPanelPage';
import OrganisersPage from './features/organisers/OrganisersPage';
import VenuePanelPage from './features/venue-panel/VenuePanelPage';
import VenueFinalPage from './features/venue-final/VenueFinalPage'; // <-- Imported
import TrackPage from './features/track/TrackPage';
import ApprovalsListPage from './features/approvals/ApprovalsListPage';
import ApprovalReviewPage from './features/approvals/ApprovalReviewPage';
import ApplicationsListPage from './features/applications/ApplicationsListPage';
import JudgesPage from './features/judges/JudgesPage';
import ArrivalCheckingPage from './features/arrivals/ArrivalCheckingPage';
import StatsDashboardPage from './features/stats/StatsDashboardPage';
import MainLayout from './shared/components/Layout/MainLayout';
import MarkEntryPage from './features/mark-entry/MarkEntryPage';
import MarksheetUploadPage from './features/mark-entry/MarksheetUploadPage';
import { pb } from './api/db';

function RequireAuth({ children }: { children: React.ReactNode }) {
    if (!pb.authStore.isValid) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
    if (!pb.authStore.isValid) {
        return <Navigate to="/login" replace />;
    }
    const user = pb.authStore.model;
    const isAdmin = user?.designation === 'admin' || !user?.collectionId;
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }
    return children;
}

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
                    path="/stats"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <StatsDashboardPage />
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
                        <RequireAuth>
                            <MainLayout>
                                <VenuePanelPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/venue-final"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <VenueFinalPage />
                            </MainLayout>
                        </RequireAuth>
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
                <Route
                    path="/arrival-checking"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <ArrivalCheckingPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/mark-entry"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <MarkEntryPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/marksheet-upload"
                    element={
                        <RequireAuth>
                            <MainLayout>
                                <MarksheetUploadPage />
                            </MainLayout>
                        </RequireAuth>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;