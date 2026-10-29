import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';

export function RegisterPage() {
  const { register } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      void Swal.fire({
        icon: 'error',
        title: 'Validation error',
        text: 'Passwords do not match.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        workspaceName: workspaceName.trim() || undefined,
      });

      await Swal.fire({
        icon: 'success',
        title: 'Account created',
        text: 'Welcome to OptiTrader Lab! Your research workspace is ready.',
        timer: 1500,
        showConfirmButton: false,
      });

      navigate('/', { replace: true });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: 'Registration failed',
        text: error instanceof Error ? error.message : 'Please check your information.',
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

        <h1 className="login-title">Create your quantitative research account.</h1>
        <p className="text-muted mb-4">
          Start building institutional-grade, backtested strategy experiments.
        </p>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="registerName">
            <Form.Label>Full Name</Form.Label>
            <Form.Control
              className="dark-input"
              type="text"
              placeholder="e.g. Marcus Lim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="registerEmail">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              className="dark-input"
              type="email"
              placeholder="trader@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="registerWorkspace">
            <Form.Label>Workspace Name (Optional)</Form.Label>
            <Form.Control
              className="dark-input"
              type="text"
              placeholder="e.g. Alpha_Research"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="registerPassword">
            <Form.Label>Password (min 8 chars)</Form.Label>
            <Form.Control
              className="dark-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="registerConfirmPassword">
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              className="dark-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            className="w-100 mb-3"
            disabled={submitting}
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </Button>

          <div className="text-center text-muted small">
            Already have an account?{' '}
            <Link to="/login" className="text-decoration-none">
              Sign In
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
export default RegisterPage;

