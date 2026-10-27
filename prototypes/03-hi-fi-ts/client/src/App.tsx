import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { useApp } from './context/AppContext';
import ComparisonPage from './pages/ComparisonPage';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import ExperimentStudioPage from './pages/ExperimentStudioPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ResultsPage from './pages/ResultsPage';

function ProtectedRoute() {
  const { isAuthenticated } = useApp();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="experiments/new" element={<ExperimentStudioPage />} />
          <Route path="datasets" element={<DatasetsPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="results/:runId" element={<ResultsPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
