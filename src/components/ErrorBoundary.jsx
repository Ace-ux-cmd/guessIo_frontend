import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import { ServerError } from '../screens/errors/ErrorScreens';

/**
 * Catches render-time exceptions below it so a single broken screen shows the
 * existing "Something broke" page instead of leaving a blank white window.
 * `resetKey` clears the error when it changes (here: on navigation), which is
 * what lets the page's own "Back home" button recover.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, resetKey: props.resetKey };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { failed: false, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    console.error('Render error', error, info?.componentStack);
  }

  render() {
    return this.state.failed ? <ServerError /> : this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.key}>{children}</ErrorBoundary>;
}
