import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import { useApp } from './context/AppContext.jsx';
import ComparisonPage from './pages/ComparisonPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DatasetsPage from './pages/DatasetsPage.jsx';
import ExperimentStudioPage from './pages/ExperimentStudioPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';

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
