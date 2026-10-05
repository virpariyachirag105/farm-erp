import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { theme } from './theme/theme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import ProtectedRoute from './layouts/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import RequirePermission from './layouts/RequirePermission';

import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import FarmsPage from './pages/farms/FarmsPage';
import SeasonsPage from './pages/seasons/SeasonsPage';
import PartnersPage from './pages/partners/PartnersPage';
import DealersPage from './pages/dealers/DealersPage';
import ProductsPage from './pages/products/ProductsPage';
import DispatchesPage from './pages/dispatches/DispatchesPage';
import DispatchFormPage from './pages/dispatches/DispatchFormPage';
import DispatchDetailPage from './pages/dispatches/DispatchDetailPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import BoxCostsPage from './pages/boxCosts/BoxCostsPage';
import SettlementsPage from './pages/settlements/SettlementsPage';
import UsersPage from './pages/users/UsersPage';
import RolesPage from './pages/roles/RolesPage';
import ProfilePage from './pages/profile/ProfilePage';
import DealerCalculationPage from './pages/calculations/DealerCalculationPage';
import DealerInvoicePage from './pages/calculations/DealerInvoicePage';
import SeasonFarmDispatchListPage from './pages/calculations/SeasonFarmDispatchListPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route
                    path="/farms"
                    element={
                      <RequirePermission module="farm">
                        <FarmsPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/seasons"
                    element={
                      <RequirePermission module="season">
                        <SeasonsPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/partners"
                    element={
                      <RequirePermission module="season_partner">
                        <PartnersPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dealers"
                    element={
                      <RequirePermission module="dealer">
                        <DealersPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/products"
                    element={
                      <RequirePermission module="product">
                        <ProductsPage />
                      </RequirePermission>
                    }
                  />

                  {/* Dispatches Sub-routes */}
                  <Route
                    path="/dispatches"
                    element={
                      <RequirePermission module="dispatch">
                        <DispatchesPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dispatches/create"
                    element={
                      <RequirePermission action="create" module="dispatch">
                        <DispatchFormPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dispatches/edit/:id"
                    element={
                      <RequirePermission action="update" module="dispatch">
                        <DispatchFormPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dispatches/:id"
                    element={
                      <RequirePermission action="view" module="dispatch">
                        <DispatchDetailPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dispatches/season-farm"
                    element={
                      <RequirePermission permission={['dealer_calculation.view', 'dispatch.list']}>
                        <SeasonFarmDispatchListPage />
                      </RequirePermission>
                    }
                  />

                  <Route
                    path="/payments"
                    element={
                      <RequirePermission module="dealer_payment">
                        <PaymentsPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/expenses"
                    element={
                      <RequirePermission module="expense">
                        <ExpensesPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/box-costs"
                    element={
                      <RequirePermission module="season_box_cost">
                        <BoxCostsPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/settlements"
                    element={
                      <RequirePermission module="partner_settlement">
                        <SettlementsPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <RequirePermission module="user">
                        <UsersPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/roles"
                    element={
                      <RequirePermission module="role">
                        <RolesPage />
                      </RequirePermission>
                    }
                  />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route
                    path="/calculations/dealer"
                    element={
                      <RequirePermission permission="dealer_calculation.view">
                        <DealerCalculationPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/calculations/dealer/:dealerId/invoice"
                    element={
                      <RequirePermission permission="dealer_calculation.view">
                        <DealerInvoicePage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/calculations/farm-dispatches"
                    element={
                      <RequirePermission permission={['dealer_calculation.view', 'dispatch.list']}>
                        <SeasonFarmDispatchListPage />
                      </RequirePermission>
                    }
                  />
                </Route>
              </Route>

              {/* Wildcard redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;