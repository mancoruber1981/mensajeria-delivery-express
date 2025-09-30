// frontend/src/App.js (VERSIÓN FINAL Y DEFINITIVA)

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

// --- Componentes y Páginas ---
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AuthInitializer from './components/AuthInitializer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import ClientsPage from './pages/ClientsPage';
import UserApprovalPage from './pages/UserApprovalPage';
import AdminViewCourierSummaryPage from './pages/AdminViewCourierSummaryPage';
import AdminEmployeeHistoryPage from './pages/AdminEmployeeHistoryPage';
import ContadorPage from './pages/ContadorPage';
import DashboardPage from './pages/DashboardPage';
import RegisterEmployeePage from './pages/RegisterEmployeePage';
import AuxiliarDashboardPage from './pages/AuxiliarDashboardPage';
import MyProfilePage from './pages/MyProfilePage';
import TimeEntriesPage from './pages/TimeEntriesPage';
import RepartidorSummaryDashboardPage from './pages/RepartidorSummaryDashboardPage';
import RepartidorDashboardPage from './pages/RepartidorDashboardPage';
import LoansPage from './pages/LoansPage';
import ExpensesPage from './pages/ExpensesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
    return (
        <AuthProvider>
            <Navbar />
            <main>
                <AuthInitializer>
                    <Routes>
                        {/* === RUTAS PÚBLICAS === */}
                        {/* Estas rutas solo son accesibles si NO has iniciado sesión */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                        <Route path="/resetpassword/:resetToken" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

                        {/* === RUTAS PROTEGIDAS === */}
                        {/* Administrador */}
                        <Route element={<ProtectedRoute requiredRole="admin" />}>
                            <Route path="/dashboard-admin" element={<AdminDashboardPage />} />
                            <Route path="/admin/employees" element={<EmployeesPage />} />
                            <Route path="/admin/clients" element={<ClientsPage />} />
                            <Route path="/admin/approve-users" element={<UserApprovalPage />} />
                            <Route path="/admin/expenses" element={<ExpensesPage />} />
                            <Route path="/accountant-report" element={<ContadorPage />} />
                            <Route path="/admin/view-client-dashboard/:clientId" element={<DashboardPage />} />
                            <Route path="/admin/view-courier-dashboard/:employeeId" element={<AdminViewCourierSummaryPage />} />
                            <Route path="/admin/view-employee-history/:employeeId" element={<AdminEmployeeHistoryPage />} />
                        </Route>

                        {/* Cliente */}
                        <Route element={<ProtectedRoute requiredRole={'cliente'} />}>
                            <Route path="/dashboard-cliente" element={<DashboardPage />} />
                            <Route path="/register-employee" element={<RegisterEmployeePage />} />
                        </Route>

                        {/* Auxiliar */}
                        <Route element={<ProtectedRoute requiredRole={'auxiliar'} />}>
                            <Route path="/auxiliar-home" element={<AuxiliarDashboardPage />} />
                        </Route>
                        
                        {/* Repartidor */}
                        <Route element={<ProtectedRoute requiredRole="repartidor" />}>
                            <Route path="/dashboard-repartidor" element={<RepartidorSummaryDashboardPage />} />
                            <Route path="/repartidor-records" element={<RepartidorDashboardPage />} />
                        </Route>
                        
                        {/* Rutas Compartidas */}
                        <Route element={<ProtectedRoute requiredRole={['admin', 'repartidor']} />}>
                            <Route path="/loans" element={<LoansPage />} />
                        </Route>
                        <Route element={<ProtectedRoute requiredRole={['admin', 'cliente', 'auxiliar']} />}>
                            <Route path="/my-profile" element={<MyProfilePage />} />
                            <Route path="/time-entries/employee/:employeeId" element={<TimeEntriesPage />} />
                            <Route path="/admin/register-employee-for/:clientId" element={<RegisterEmployeePage />} />
                        </Route>

                        {/* Ruta para página no encontrada */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </AuthInitializer>
            </main>
            <ToastContainer position="bottom-right" autoClose={3000} />
        </AuthProvider>
    );
}

export default App;