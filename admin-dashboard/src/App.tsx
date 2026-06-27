// src/App.tsx
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { pb } from './api/db';

import LoginPage from './features/auth/LoginPage';
import MainLayout from './shared/components/Layout/MainLayout';
import DashboardPage from './features/dashboard/AdminDashboardPage';
import StatsPage from './features/stats/StatsDashboardPage';
import ApprovalsListPage from './features/approvals/ApprovalsListPage';
import ApprovalReviewPage from './features/approvals/ApprovalReviewPage';
import ApplicationsListPage from './features/applications/ApplicationsListPage';
import ArrivalCheckingPage from './features/arrivals/ArrivalCheckingPage';
import TrackPage from './features/track/TrackPage';
import VenuePanelPage from './features/venue-panel/VenuePanelPage';
import MarkEntryPage from './features/mark-entry/MarkEntryPage';
import MarksheetUploadPage from './features/mark-entry/MarksheetUploadPage';
import FinalistsPage from './features/finalists/FinalistsPage';
import HistoryPage from './features/history/HistoryPage';
import OrganisersPage from './features/organisers/OrganisersPage';
import JudgesPage from './features/judges/JudgesPage';
import ControlPanelPage from './features/control-panel/ControlPanelPage';

// Simple Route Guards using Outlet wrapper
function RequireAuth() {
    const isLoggedIn = pb.authStore.isValid;
    return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

function RequireAdmin() {
    const user = pb.authStore.model;
    const isAdmin = user?.designation === 'admin' || !user?.collectionId;
    return pb.authStore.isValid && isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
    return (
        // Restored the critical basename subpath prefix parameter here
        <BrowserRouter basename="/slqc-admin">
            <Routes>
                {/* Public Routes outside MainLayout wrapper */}
                <Route path="/login" element={<LoginPage />} />

                {/* Secure Route Trees Sharing a Single MainLayout Instance State */}
                <Route element={<RequireAuth />}>
                    <Route element={<MainLayout />}>

                        {/* Routes accessible by all authorized logged-in profiles */}
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/stats" element={<StatsPage />} />
                        <Route path="/approvals" element={<ApprovalsListPage />} />
                        <Route path="/approvals/:id" element={<ApprovalReviewPage />} />
                        <Route path="/applications" element={<ApplicationsListPage />} />
                        <Route path="/arrival-checking" element={<ArrivalCheckingPage />} />
                        <Route path="/track" element={<TrackPage />} />
                        <Route path="/mark-entry" element={<MarkEntryPage />} />
                        <Route path="/marksheet-upload" element={<MarksheetUploadPage />} />
                        <Route path="/venue-panel" element={<VenuePanelPage />} />



                        {/* Restricted Admin Sub-Group Nested perfectly inside the layout context */}
                        <Route element={<RequireAdmin />}>
                            <Route path="/history" element={<HistoryPage />} />
                            <Route path="/finalist-selection" element={<FinalistsPage />} />
                            <Route path="/organisers" element={<OrganisersPage />} />
                            <Route path="/judges" element={<JudgesPage />} />
                            <Route path="/control-panel" element={<ControlPanelPage />} />
                        </Route>

                    </Route>
                </Route>

                {/* Fallback Catch-All Redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}