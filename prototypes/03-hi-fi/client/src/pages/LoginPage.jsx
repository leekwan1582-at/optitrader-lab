import { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext.jsx';

export default function LoginPage() {
  const { login, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('marcus@optitrader.dev');
  const [password, setPassword] = useState('demo1234');
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [destination, isAuthenticated, navigate]);

  async function handleSubmit(event) {
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
        text: error.message || 'Check your email and password.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-orbit login-orbit-one" />
      <div className="login-orbit login-orbit-two" />

      <div className="login-card panel">
        <div className="login-brand">
          <div className="logo-box">OT</div>
          <div>
            <div className="h4 mb-0">OptiTrader Lab</div>
            <div className="text-muted small">Research · Optimize · Validate · Deploy</div>
          </div>
        </div>

        <h1 className="login-title">Turn strategy tuning into reproducible experiments.</h1>
        <p className="text-muted mb-4">
          Sign in to your private workspace. This high-fidelity PoC uses local mock data by default.
        </p>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="loginEmail">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              className="dark-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="loginPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              className="dark-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Form.Group>

          <Button className="btn-cyan w-100" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Login'}
          </Button>
        </Form>

        <div className="login-hint">
          Demo credentials are pre-filled. Data is stored in your browser.
        </div>
      </div>
    </div>
  );
}
