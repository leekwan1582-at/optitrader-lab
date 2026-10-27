import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader eyebrow="404" title="Page not found" subtitle="That route is not part of the OptiTrader Lab workspace." />
      <div className="panel p-5 text-center">
        <p className="text-muted mb-4">Check the navigation or return to the dashboard.</p>
        <Button className="btn-cyan" onClick={() => navigate('/')}>Back to dashboard</Button>
      </div>
    </>
  );
}
