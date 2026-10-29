import { Component, type ErrorInfo, type ReactNode } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="container py-5">
          <Alert variant="danger" role="alert" aria-live="assertive" className="panel p-4">
            <h4 className="alert-heading fw-bold">Something went wrong</h4>
            <p className="text-muted">
              {this.state.error?.message || 'An unexpected error occurred in this view.'}
            </p>
            <hr />
            <div className="d-flex gap-2">
              <Button variant="danger" onClick={this.handleReset}>
                Reload page
              </Button>
              <Button variant="outline-secondary" onClick={() => (window.location.href = '/')}>
                Go to Dashboard
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

