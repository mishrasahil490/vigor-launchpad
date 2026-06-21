import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("React Error Boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center p-8 bg-white dark:bg-ink-950 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-ink-500 mb-6 max-w-md">
            The app encountered an unexpected error. Open the browser console (F12) to see details.
          </p>
          <pre className="text-left text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg max-w-2xl w-full overflow-auto mb-6">
            {this.state.error?.message}
            {"\n"}
            {this.state.error?.stack}
          </pre>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
