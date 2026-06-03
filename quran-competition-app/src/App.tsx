// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './shared/components/Layout/MainLayout';
import DashboardPage from './features/registration/views/dashboard/DashboardPage';
import RegisterPage from './features/registration/views/register/RegisterPage';
import TrackPage from './features/registration/views/track/TrackPage';
import InstitutionRegisterPage from './features/registration/views/institution/InstitutionRegisterPage';
import { StatusProvider } from './shared/context/StatusContext';

export default function App() {
    return (
        <BrowserRouter basename="/slqc">
            <StatusProvider>
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/institution-register" element={<InstitutionRegisterPage />} />
                        <Route path="/track" element={<TrackPage />} />
                    </Routes>
                </MainLayout>
            </StatusProvider>
        </BrowserRouter>
    );
}