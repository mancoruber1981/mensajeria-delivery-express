// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoansPage from './pages/LoansPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthInitializer from './components/AuthInitializer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import RegisterEmployeePage from './pages/RegisterEmployeePage';
import AuxiliarDashboardPage from './pages/AuxiliarDashboardPage';
import RepartidorDashboardPage from './pages/RepartidorDashboardPage';
import TimeEntriesPage from './pages/TimeEntriesPage';
import MyProfilePage from './pages/MyProfilePage';
import EmployeesPage from './pages/EmployeesPage';
import ClientsPage from './pages/ClientsPage';
import RepartidorSummaryDashboardPage from './pages/RepartidorSummaryDashboardPage';
import AdminEmployeeHistoryPage from './pages/AdminEmployeeHistoryPage';
import ContadorPage from './pages/ContadorPage';
import UserApprovalPage from './pages/UserApprovalPage';
import './index.css';

function App() {
    return (
        <Router>
            <AuthProvider>
                <Navbar />
                <main>
                    <AuthInitializer>
                        <Routes>
                            {/* Rutas Públicas */}
                            <Route path="/" element={<HomePage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />

                            {/* --- Rutas SOLO para el Administrador --- */}
                            <Route element={<ProtectedRoute requiredRole="admin" />}>
                                <Route path="/dashboard-admin" element={<AdminDashboardPage />} />
                                <Route path="/admin/employees" element={<EmployeesPage />} />
                                <Route path="/admin/clients" element={<ClientsPage />} />
                                <Route path="/admin/view-client-dashboard/:clientId" element={<DashboardPage />} />
                                <Route path="/admin/register-employee-for/:clientId" element={<RegisterEmployeePage />} />
                                <Route path="/admin/view-courier-dashboard/:employeeId" element={<RepartidorDashboardPage />} />
                                <Route path="/admin/view-employee-history/:employeeId" element={<AdminEmployeeHistoryPage />} />
                                <Route path="/accountant-report" element={<ContadorPage />} />
                                <Route path="/admin/approve-users" element={<UserApprovalPage />} />
                            </Route>

                            {/* --- Rutas compartidas por Cliente y Auxiliar --- */}
                            <Route element={<ProtectedRoute requiredRole={['cliente', 'auxiliar']} />}>
                                <Route path="/register-employee" element={<RegisterEmployeePage />} />
                                <Route path="/time-entries/employee/:employeeId" element={<TimeEntriesPage />} />
                                <Route path="/my-profile" element={<MyProfilePage />} />
                                <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
                            </Route>

                            {/* ✅ --- INICIO DE LA CORRECCIÓN --- */}
                            {/* Nuevo Bloque para Rutas compartidas por Admin y Repartidor */}
                            <Route element={<ProtectedRoute requiredRole={['admin', 'repartidor']} />}>
                                <Route path="/admin/loans" element={<LoansPage />} />
                            </Route>
                            {/* --- FIN DE LA CORRECCIÓN --- */}

                            {/* Rutas SOLO para el Cliente */}
                            <Route element={<ProtectedRoute requiredRole="cliente" />}>
                                <Route path="/dashboard-cliente" element={<DashboardPage />} />
                            </Route>

                            {/* Rutas SOLO para el Auxiliar */}
                            <Route element={<ProtectedRoute requiredRole="auxiliar" />}>
                                <Route path="/auxiliar-home" element={<AuxiliarDashboardPage />} />
                            </Route>

                            {/* Rutas SOLO para el Repartidor */}
                            <Route element={<ProtectedRoute requiredRole="repartidor" />}>
                                <Route path="/dashboard-repartidor" element={<RepartidorSummaryDashboardPage />} />
                                <Route path="/repartidor-summary" element={<RepartidorDashboardPage />} />
                            </Route>

                            {/* Ruta Catch-all */}
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </AuthInitializer>
                </main>
                <ToastContainer position="bottom-right" autoClose={3000} />
            </AuthProvider>
        </Router>
    );
}

export default App;