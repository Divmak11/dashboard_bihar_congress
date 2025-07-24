// components/hierarchical/HierarchicalErrorBoundary.tsx
// Specialized error boundary for hierarchical dashboard components
import React from 'react';
import ErrorBoundary from '../ErrorBoundary';

interface Props {
  children: React.ReactNode;
  componentName?: string;
}

const HierarchicalErrorBoundary: React.FC<Props> = ({ children, componentName = 'Dashboard Component' }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log specific hierarchical dashboard errors
    console.error(`[${componentName}] Error:`, error);
    console.error(`[${componentName}] Component Stack:`, errorInfo.componentStack);
    
    // Could send to error tracking service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
  };

  const fallbackUI = (
    <div className="flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          {componentName} Error
        </h3>
        <p className="text-sm text-red-600 mb-4">
          There was an error loading this component. Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallbackUI} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

export default HierarchicalErrorBoundary;
