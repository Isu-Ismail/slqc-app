// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './shared/components/Layout/MainLayout';
import DashboardPage from './features/registration/views/dashboard/DashboardPage';
import InstitutionRegisterPage from './features/registration/views/institution/InstitutionRegisterPage';
import InstitutionPortalPage from './features/registration/views/institution-portal/InstitutionPortalPage';
import TrackPage from './features/registration/views/track/TrackPage';
import { StatusProvider } from './shared/context/StatusContext';

export default function App() {
    return (
        <BrowserRouter basename="/slqc">
            <StatusProvider>
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/portal" element={<InstitutionPortalPage />} />
                        <Route path="/register" element={<Navigate to="/portal" replace />} />
                        <Route path="/track" element={<TrackPage />} />
                        <Route path="/institution-register" element={<InstitutionRegisterPage />} />
                    </Routes>
                </MainLayout>
            </StatusProvider>
        </BrowserRouter>
    );
}