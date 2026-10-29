import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useApp } from './context/AppContext';
import ComparisonPage from './pages/ComparisonPage';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import ExperimentStudioPage from './pages/ExperimentStudioPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccountPage from './pages/AccountPage';
import ProfilesPage from './pages/ProfilesPage';
import NotFoundPage from './pages/NotFoundPage';
import ResultsPage from './pages/ResultsPage';

function ProtectedRoute() {
  const { isAuthenticated, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return <div className="panel p-5 text-center text-muted">Loading workspace…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="experiments/new" element={<ExperimentStudioPage />} />
            <Route path="profiles" element={<ProfilesPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="results/:runId" element={<ResultsPage />} />
            <Route path="comparison" element={<ComparisonPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

