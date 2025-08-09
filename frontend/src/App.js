// Bloque 1: Importaciones principales de React y librerías esenciales para el enrutamiento y UI 
 import React from 'react'; 
 import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; 
 import { AuthProvider } from './contexts/AuthContext'; 
 import { ToastContainer } from 'react-toastify'; 
 // import ContadorPage from './pages/ContadorPage'; // <--- ELIMINAR O COMENTAR esta línea 
 import 'react-toastify/dist/ReactToastify.css';
  
// Bloque 2: Importación de Componentes Reutilizables y de Lógica Global de la UI 
 import Navbar from './components/Navbar'; 
 import ProtectedRoute from './components/ProtectedRoute'; 
 import AuthInitializer from './components/AuthInitializer'; 

 // Bloque 3: Importación de las Páginas de la Aplicación (Vistas principales) 
 import HomePage from './pages/HomePage'; 
 import LoginPage from './pages/LoginPage'; 
 import RegisterPage from './pages/RegisterPage'; 
 import NotFoundPage from './pages/NotFoundPage'; 

 // Bloque 4: Importación de Páginas Específicas por Rol de Usuario o Funcionalidad del Negocio 
 import DashboardPage from './pages/DashboardPage'; // Dashboard para el cliente 
 import AdminDashboardPage from './pages/AdminDashboardPage'; // Dashboard para el administrador 
 import RegisterEmployeePage from './pages/RegisterEmployeePage'; // Registro de empleados por cliente 
 import AuxiliarDashboardPage from './pages/AuxiliarDashboardPage'; // Dashboard para el auxiliar 
 import RepartidorDashboardPage from './pages/RepartidorDashboardPage'; // <-- EL componente de registro de horario 
 import TimeEntriesPage from './pages/TimeEntriesPage'; // Entradas de tiempo (común) 
 import MyProfilePage from './pages/MyProfilePage'; // Perfil de usuario (común) 
 import EmployeesPage from './pages/EmployeesPage'; // Gestión de empleados (admin) 
 import ClientsPage from './pages/ClientsPage'; // Gestión de clientes (admin) 
 import RepartidorSummaryDashboardPage from './pages/RepartidorSummaryDashboardPage'; // Resumen de repartidor 
 import AdminEmployeeHistoryPage from './pages/AdminEmployeeHistoryPage'; // <-- ¡NUEVA IMPORTACIÓN! 
 import ContadorPage from './pages/ContadorPage'; // <--- ¡MANTENER! Esta es la importación correcta para tu componente del contador. 
 import UserApprovalPage from './pages/UserApprovalPage'; 

 // Bloque 5: Importación de Estilos Globales 
 import './index.css'; 

 // Bloque 6: Definición del Componente Principal de la Aplicación `App` 
 // frontend/src/App.js 
 function App() { 
     return ( 
         <Router> 
             <AuthProvider> 
                 <Navbar /> 
                 <main> 
                     <AuthInitializer> 
                         <Routes> 
                             {/* Bloque 6.1: Rutas Públicas (sin cambios) */} 
                             <Route path="/" element={<HomePage />} /> 
                             <Route path="/login" element={<LoginPage />} /> 
                             <Route path="/register" element={<RegisterPage />} /> 

                             {/* Bloque 6.2: Rutas Protegidas */} 

                             {/* Rutas para el Administrador */} 
                             <Route element={<ProtectedRoute requiredRole="admin" />}> 
                                 <Route path="/dashboard-admin" element={<AdminDashboardPage />} /> 
                                 <Route path="/admin/employees" element={<EmployeesPage />} /> 
                                 <Route path="/admin/clients" element={<ClientsPage />} /> 
                                 <Route path="/admin/view-client-dashboard/:clientId" element={<DashboardPage />} /> 
                                 <Route path="/admin/register-employee-for/:clientId" element={<RegisterEmployeePage />} /> 
                                 <Route path="/admin/view-courier-dashboard/:employeeId" element={<RepartidorDashboardPage />} /> 
                                 <Route path="/admin/view-employee-history/:employeeId" element={<AdminEmployeeHistoryPage />} /> 
                                 {/* Aquí está el punto clave: */} 
                                 <Route path="/accountant-report" element={<ContadorPage />} /> 
                                 {/* <Route path="/admin/contador" element={<ContadorPage />} /> // <--- ELIMINAR O COMENTAR esta línea */} 
                                 <Route path="/admin/approve-users" element={<UserApprovalPage />} /> 
                             </Route> 

                             {/* --- INICIO DE LA CORRECCIÓN --- */} 
                             {/* Nuevo Bloque para Rutas compartidas por Cliente y Auxiliar */} 
                             <Route element={<ProtectedRoute requiredRole={['cliente', 'auxiliar']} />}> 
                                 <Route path="/register-employee" element={<RegisterEmployeePage />} /> 
                                 <Route path="/time-entries/employee/:employeeId" element={<TimeEntriesPage />} /> 
                                 <Route path="/my-profile" element={<MyProfilePage />} /> 
                                 <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
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

                             {/* Rutas para el Repartidor */} 
                             <Route element={<ProtectedRoute requiredRole="repartidor" />}> 
                                 <Route path="/dashboard-repartidor" element={<RepartidorSummaryDashboardPage />} /> 
                                 <Route path="/repartidor-summary" element={<RepartidorDashboardPage />} /> 
                             </Route> 

                             {/* Ruta Catch-all (sin cambios) */} 
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