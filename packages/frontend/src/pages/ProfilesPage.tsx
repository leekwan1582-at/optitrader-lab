import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext';
import type { CreateProfileInput, Profile, StrategyType, Objective } from '../types/domain';

export function ProfilesPage() {
  const { profiles, createProfile, updateProfile, cloneProfile, removeProfile } = useApp();
  const navigate = useNavigate();

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [strategyType, setStrategyType] = useState<StrategyType>('sma_crossover');
  const [objective, setObjective] = useState<Objective>('sharpe');
  const [maxDrawdown, setMaxDrawdown] = useState(0.2);
  const [fastMin, setFastMin] = useState(5);
  const [fastMax, setFastMax] = useState(25);
  const [fastStep, setFastStep] = useState(5);
  const [slowMin, setSlowMin] = useState(30);
  const [slowMax, setSlowMax] = useState(100);
  const [slowStep, setSlowStep] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  function openCreateModal() {
    setEditingProfile(null);
    setName('');
    setStrategyType('sma_crossover');
    setObjective('sharpe');
    setMaxDrawdown(0.2);
    setFastMin(5);
    setFastMax(25);
    setFastStep(5);
    setSlowMin(30);
    setSlowMax(100);
    setSlowStep(10);
    setModalOpen(true);
  }

  function openEditModal(profile: Profile) {
    setEditingProfile(profile);
    setName(profile.name);
    setStrategyType(profile.strategy_type);
    setObjective(profile.objective);
    setMaxDrawdown(profile.max_drawdown_limit);
    setFastMin(profile.params.fast_ma.min);
    setFastMax(profile.params.fast_ma.max);
    setFastStep(profile.params.fast_ma.step);
    setSlowMin(profile.params.slow_ma.min);
    setSlowMax(profile.params.slow_ma.max);
    setSlowStep(profile.params.slow_ma.step);
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fastMax >= slowMin) {
      void Swal.fire({
        icon: 'error',
        title: 'Invalid parameter range',
        text: 'Fast MA max must stay strictly below Slow MA min.',
      });
      return;
    }

    const payload: CreateProfileInput = {
      name: name.trim(),
      strategy_type: strategyType,
      objective,
      max_drawdown_limit: Number(maxDrawdown),
      params: {
        fast_ma: { min: Number(fastMin), max: Number(fastMax), step: Number(fastStep) },
        slow_ma: { min: Number(slowMin), max: Number(slowMax), step: Number(slowStep) },
      },
    };

    setSubmitting(true);
    try {
      if (editingProfile) {
        await updateProfile(editingProfile.profile_id, payload);
        void Swal.fire({ icon: 'success', title: 'Profile updated', timer: 1200, showConfirmButton: false });
      } else {
        await createProfile(payload);
        void Swal.fire({ icon: 'success', title: 'Profile created', timer: 1200, showConfirmButton: false });
      }
      setModalOpen(false);
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: editingProfile ? 'Update failed' : 'Creation failed',
        text: error instanceof Error ? error.message : 'Please check your inputs.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClone(profile: Profile) {
    try {
      const cloned = await cloneProfile(profile.profile_id);
      void Swal.fire({
        icon: 'success',
        title: 'Profile cloned',
        text: `Created "${cloned.name}"`,
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: 'Clone failed',
        text: error instanceof Error ? error.message : 'Could not clone profile.',
      });
    }
  }

  async function handleDelete(profile: Profile) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete profile?',
      text: `Are you sure you want to delete "${profile.name}"? Historical runs referencing this profile will preserve their snapshot name.`,
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#e55353',
    });

    if (result.isConfirmed) {
      try {
        await removeProfile(profile.profile_id);
        void Swal.fire({ icon: 'success', title: 'Profile deleted', timer: 1200, showConfirmButton: false });
      } catch (error) {
        void Swal.fire({
          icon: 'error',
          title: 'Delete failed',
          text: error instanceof Error ? error.message : 'Could not delete profile.',
        });
      }
    }
  }

  function handleLaunch(profile: Profile) {
    navigate('/experiments/new', { state: { profileId: profile.profile_id } });
  }

  return (
    <div className="profiles-page">
      <div className="page-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Strategy Profiles</h1>
          <p className="text-muted small mb-0">Pre-configured parameter search spaces, risk limits, and optimization targets.</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          + New Profile
        </Button>
      </div>

      <Card className="panel">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Profile Name</th>
                <th>Strategy</th>
                <th>Objective</th>
                <th>Max DD</th>
                <th>Fast MA Grid</th>
                <th>Slow MA Grid</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    No strategy profiles saved yet. Click &quot;+ New Profile&quot; to create one.
                  </td>
                </tr>
              ) : (

                profiles.map((profile) => (
                  <tr key={profile.profile_id}>
                    <td className="fw-semibold text-light">{profile.name}</td>
                    <td>
                      <Badge bg="secondary" className="font-monospace">
                        {profile.strategy_type === 'ema_momentum' ? 'EMA' : 'SMA'}
                      </Badge>
                    </td>
                    <td className="text-capitalize">{profile.objective}</td>
                    <td>{(profile.max_drawdown_limit * 100).toFixed(0)}%</td>
                    <td className="font-monospace small text-muted">
                      {profile.params.fast_ma.min}..{profile.params.fast_ma.max} (step {profile.params.fast_ma.step})
                    </td>
                    <td className="font-monospace small text-muted">
                      {profile.params.slow_ma.min}..{profile.params.slow_ma.max} (step {profile.params.slow_ma.step})
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleLaunch(profile)}
                          title="Launch in Experiment Studio"
                        >
                          Launch
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => openEditModal(profile)}
                          title="Edit Profile"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => void handleClone(profile)}
                          title="Clone Profile"
                        >
                          Clone
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => void handleDelete(profile)}
                          title="Delete Profile"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal for Create/Edit Profile */}
      <Modal show={modalOpen} onHide={() => setModalOpen(false)} centered size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton className="border-secondary">
            <Modal.Title>{editingProfile ? 'Edit Profile' : 'Create Strategy Profile'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="profileName">
              <Form.Label>Profile Name</Form.Label>
              <Form.Control
                className="dark-input"
                type="text"
                placeholder="e.g. Trend Momentum Scalp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Group controlId="profileStrategy">
                  <Form.Label>Strategy Type</Form.Label>
                  <Form.Select
                    className="dark-input"
                    value={strategyType}
                    onChange={(e) => setStrategyType(e.target.value as StrategyType)}
                  >
                    <option value="sma_crossover">SMA Crossover</option>
                    <option value="ema_momentum">EMA Momentum</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="profileObjective">
                  <Form.Label>Objective</Form.Label>
                  <Form.Select
                    className="dark-input"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value as Objective)}
                  >
                    <option value="sharpe">Sharpe Ratio</option>
                    <option value="total_return">Total Return</option>
                    <option value="calmar">Calmar Ratio</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group controlId="profileMaxDrawdown">
                  <Form.Label>Max Drawdown Limit</Form.Label>
                  <Form.Select
                    className="dark-input"
                    value={maxDrawdown}
                    onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                  >
                    <option value={0.1}>10%</option>
                    <option value={0.15}>15%</option>
                    <option value={0.2}>20%</option>
                    <option value={0.25}>25%</option>
                    <option value={0.3}>30%</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <h3 className="h6 mb-2 mt-4 text-light">Fast MA Parameter Search Range</h3>
            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Group controlId="fastMin">
                  <Form.Label className="small text-muted">Min</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="number"
                    value={fastMin}
                    onChange={(e) => setFastMin(Number(e.target.value))}
                    min={2}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="fastMax">
                  <Form.Label className="small text-muted">Max</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="number"
                    value={fastMax}
                    onChange={(e) => setFastMax(Number(e.target.value))}
                    min={2}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="fastStep">
                  <Form.Label className="small text-muted">Step</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="number"
                    value={fastStep}
                    onChange={(e) => setFastStep(Number(e.target.value))}
                    min={1}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <h3 className="h6 mb-2 mt-4 text-light">Slow MA Parameter Search Range</h3>
            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Group controlId="slowMin">
                  <Form.Label className="small text-muted">Min</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="number"
                    value={slowMin}
                    onChange={(e) => setSlowMin(Number(e.target.value))}
                    min={3}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="slowMax">
                  <Form.Label className="small text-muted">Max</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="number"
                    value={slowMax}
                    onChange={(e) => setSlowMax(Number(e.target.value))}
                    min={3}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="slowStep">
                  <Form.Label className="small text-muted">Step</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="number"
                    value={slowStep}
                    onChange={(e) => setSlowStep(Number(e.target.value))}
                    min={1}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-secondary">
            <Button variant="outline-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingProfile ? 'Update Profile' : 'Save Profile'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
export default ProfilesPage;
