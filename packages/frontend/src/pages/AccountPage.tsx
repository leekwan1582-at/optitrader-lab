import { useState, type FormEvent } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';

export function AccountPage() {
  const { user, workspace, updateAccount, changePassword } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || user?.workspaceName || '');
  const [updatingAccount, setUpdatingAccount] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdatingAccount(true);
    try {
      await updateAccount({ name, workspaceName });
      void Swal.fire({
        icon: 'success',
        title: 'Account updated',
        text: 'Your profile and workspace details have been saved.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: error instanceof Error ? error.message : 'Could not update profile.',
      });
    } finally {
      setUpdatingAccount(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      void Swal.fire({
        icon: 'error',
        title: 'Validation error',
        text: 'New passwords do not match.',
      });
      return;
    }

    setUpdatingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      void Swal.fire({
        icon: 'success',
        title: 'Password changed',
        text: 'Password updated successfully. Other active sessions have been revoked.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: 'Password change failed',
        text: error instanceof Error ? error.message : 'Could not change password.',
      });
    } finally {
      setUpdatingPassword(false);
    }
  }

  return (
    <div className="account-page">
      <div className="page-header mb-4">
        <h1 className="h3 mb-1">Account & Workspace Settings</h1>
        <p className="text-muted small">Manage your research profile, workspace title, and security credentials.</p>
      </div>

      <Row className="g-4">
        <Col md={6}>
          <Card className="panel h-100">
            <Card.Header className="bg-transparent border-0 pb-0">
              <h2 className="h5 mb-0">Profile Information</h2>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleAccountSubmit}>
                <Form.Group className="mb-3" controlId="accountEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                  <Form.Text className="text-muted">Email address cannot be changed.</Form.Text>
                </Form.Group>

                <Form.Group className="mb-3" controlId="accountName">
                  <Form.Label>Display Name</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="accountWorkspace">
                  <Form.Label>Workspace Title</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button type="submit" variant="primary" disabled={updatingAccount}>
                  {updatingAccount ? 'Saving...' : 'Save Profile'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="panel h-100">
            <Card.Header className="bg-transparent border-0 pb-0">
              <h2 className="h5 mb-0">Change Password</h2>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handlePasswordSubmit}>
                <Form.Group className="mb-3" controlId="currentPassword">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="newPassword">
                  <Form.Label>New Password (min 8 chars)</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="confirmNewPassword">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </Form.Group>

                <Button type="submit" variant="outline-warning" disabled={updatingPassword}>
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
export default AccountPage;

