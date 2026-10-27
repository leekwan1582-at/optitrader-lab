import { useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { Outlet, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getApiModeLabel } from '../api/index';
import { useApp } from '../context/AppContext';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const { user, workspace, logout, resetDemo, error, refresh } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Sign out?',
      text: 'Your demo data stays in local storage.',
      showCancelButton: true,
      confirmButtonText: 'Sign out',
      confirmButtonColor: '#00d2ff',
    });
    if (result.isConfirmed) {
      logout();
      navigate('/login');
    }
  }

  async function handleReset() {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Reset demo data?',
      text: 'This restores the original mock runs, datasets and profiles.',
      showCancelButton: true,
      confirmButtonText: 'Reset',
      confirmButtonColor: '#ffb020',
    });
    if (result.isConfirmed) {
      const reset = await resetDemo();
      if (reset) {
        await Swal.fire({ icon: 'success', title: 'Demo data restored', timer: 1400, showConfirmButton: false });
      } else {
        await Swal.fire({ icon: 'info', title: 'Live API mode', text: 'Mock data reset is only available in demo mode.' });
      }
    }
  }

  const initials = (user?.name || 'QT')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <div className="app-content">
        <header className="app-topbar">
          <Button
            variant="outline-secondary"
            className="menu-button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            ☰
          </Button>

          <div className="workspace-meta">
            <div className="text-muted small">Workspace</div>
            <div className="fw-semibold">{workspace?.name || 'Marcus_Lim_Research'}</div>
          </div>

          <div className="topbar-actions">
            <span className="api-pill">{getApiModeLabel()}</span>
            <Button variant="outline-secondary" size="sm" onClick={handleReset}>
              Reset demo
            </Button>
            <div className="user-avatar" title={user?.email || 'Demo user'}>{initials}</div>
            <Button variant="outline-secondary" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="app-main">
          {error && (
            <Alert variant="danger" className="soft-alert d-flex justify-content-between align-items-center gap-3">
              <span>{error}</span>
              <Button variant="outline-secondary" size="sm" onClick={refresh}>Retry</Button>
            </Alert>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
