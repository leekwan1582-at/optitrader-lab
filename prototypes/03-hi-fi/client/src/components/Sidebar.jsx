import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '01', end: true },
  { to: '/experiments/new', label: 'New Experiment', icon: '02' },
  { to: '/datasets', label: 'Datasets', icon: '03' },
  { to: '/results', label: 'Results', icon: '04' },
  { to: '/comparison', label: 'Comparison', icon: '05' },
];

export default function Sidebar({ open, onNavigate }) {
  return (
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="logo-box">OT</div>
        <div>
          <div className="sidebar-title">OptiTrader Lab</div>
          <div className="sidebar-subtitle">Research · Optimize · Validate</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-card">
          <div className="text-muted small">Every optimization</div>
          <div className="fw-semibold">is an experiment</div>
        </div>
      </div>
    </aside>
  );
}
