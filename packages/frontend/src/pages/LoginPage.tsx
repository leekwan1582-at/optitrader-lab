import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { login, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('marcus@optitrader.dev');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [destination, isAuthenticated, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login({ email, password });
      await Swal.fire({
        icon: 'success',
        title: 'Welcome back',
        text: 'Your research workspace is ready.',
        timer: 1300,
        showConfirmButton: false,
      });
      navigate(destination, { replace: true });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Login failed',
        text: error instanceof Error ? error.message : 'Check your email and password.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    Swal.fire({
      icon: 'info',
      title: 'Google Sign-In',
      text: 'OAuth2 with Google will be enabled in production deployment.',
      timer: 2000,
      showConfirmButton: false,
    });
  }

  function handleForgotPassword(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    Swal.fire({
      icon: 'info',
      title: 'Password Recovery',
      text: 'For local/demo access, use the seeded credentials: marcus@optitrader.dev / demo1234',
    });
  }

  return (
    <div className="login-page">
      <div className="login-orbit login-orbit-one" />
      <div className="login-orbit login-orbit-two" />

      <div className="login-card panel text-center">
        {/* Brand Header with Bar Chart Logo */}
        <div className="d-flex align-items-center justify-content-center gap-2 mb-4">
          <svg
            className="brand-bars-icon"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="2" y="16" width="4.5" height="10" rx="1.5" fill="#0080FF" />
            <rect x="9" y="10" width="4.5" height="16" rx="1.5" fill="#0099FF" />
            <rect x="16" y="5" width="4.5" height="21" rx="1.5" fill="#00B4D8" />
            <rect x="23" y="1" width="4.5" height="25" rx="1.5" fill="#00D2FF" />
          </svg>
          <div className="h3 mb-0 fw-bold tracking-tight">
            OptiTrader <span className="text-cyan">Lab</span>
          </div>
        </div>

        <h1 className="login-welcome-title">Welcome Back</h1>
        <p className="login-welcome-subtitle">Sign in to your workspace</p>

        <Form onSubmit={handleSubmit} className="text-start mt-4">
          <Form.Group className="mb-3" controlId="loginEmail">
            <Form.Label className="login-field-label">Email Address</Form.Label>
            <div className="login-input-group">
              <span className="login-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <Form.Control
                className="dark-input login-icon-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </Form.Group>

          <Form.Group className="mb-3" controlId="loginPassword">
            <Form.Label className="login-field-label">Password</Form.Label>
            <div className="login-input-group">
              <span className="login-input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <Form.Control
                className="dark-input login-icon-input login-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}
              </button>
            </div>
          </Form.Group>

          <div className="d-flex justify-content-between align-items-center mb-4 text-sm">
            <Form.Check
              type="checkbox"
              id="rememberMe"
              label="Remember me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="login-remember-check"
            />
            <a
              href="#forgot-password"
              onClick={handleForgotPassword}
              className="login-forgot-link"
            >
              Forgot password?
            </a>
          </div>

          <Button
            className="btn-primary-blue w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
            type="submit"
            disabled={submitting}
          >
            <span>{submitting ? 'Signing In…' : 'Sign In'}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>

          <div className="login-divider my-3">
            <span>or</span>
          </div>

          <Button
            type="button"
            variant="outline-secondary"
            className="btn-google-oauth w-100 mb-4 d-flex align-items-center justify-content-center gap-2"
            onClick={handleGoogleLogin}
          >
            {/* Google Multicolor "G" Logo */}
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </Button>

          <div className="text-center text-muted small">
            New to OptiTrader Lab?{' '}
            <Link to="/register" className="text-cyan text-decoration-none fw-semibold">
              Create an account
            </Link>
          </div>
        </Form>
      </div>

      {/* Bottom Feature Card Preview as in image */}
      <div className="login-footer-card panel d-none d-md-flex align-items-center gap-3">
        <div className="feature-icon-circle">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
        </div>
        <div className="text-start">
          <div className="fw-semibold text-main small">Built for Independent Traders</div>
          <div className="text-muted text-xs">Professional-grade tools without the enterprise complexity.</div>
        </div>
      </div>
    </div>
  );
}
