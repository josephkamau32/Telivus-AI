import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
      retryCount: 0
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}`;

    // Enhanced error logging
    console.error('🚨 Uncaught error:', {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // reportError({
      //   errorId,
      //   error: error.message,
      //   stack: error.stack,
      //   componentStack: errorInfo.componentStack,
      //   url: window.location.href,
      //   userAgent: navigator.userAgent
      // });
    }
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    if (newRetryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorId: undefined,
        retryCount: newRetryCount
      });
    } else {
      // Max retries reached, suggest page refresh
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount, errorId } = this.state;
      const canRetry = retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                  <AlertTriangle className="w-12 h-12 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription>
                We encountered an unexpected error. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error ID for support */}
              {errorId && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Error ID: <code className="text-xs">{errorId}</code>
                    <br />
                    Please include this ID when contacting support.
                  </AlertDescription>
                </Alert>
              )}

              {/* Retry information */}
              {retryCount > 0 && (
                <Alert>
                  <RefreshCw className="h-4 w-4" />
                  <AlertDescription>
                    Retry attempts: {retryCount}/{this.maxRetries}
                  </AlertDescription>
                </Alert>
              )}

              {/* Development error details */}
              {process.env.NODE_ENV === 'development' && error && (
                <div className="text-left p-4 bg-muted rounded-lg border">
                  <p className="text-sm font-semibold text-destructive mb-2">Error Details:</p>
                  <p className="text-sm font-mono text-destructive break-all">
                    {error.message}
                  </p>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer">Stack Trace</summary>
                      <pre className="text-xs mt-2 whitespace-pre-wrap break-all">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                {canRetry ? (
                  <Button onClick={this.handleRetry} className="gap-2 w-full">
                    <RefreshCw className="w-4 h-4" />
                    Try Again ({this.maxRetries - retryCount} attempts left)
                  </Button>
                ) : (
                  <Button onClick={() => window.location.reload()} className="gap-2 w-full">
                    <RefreshCw className="w-4 h-4" />
                    Refresh Page
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="gap-2 w-full"
                >
                  <Home className="w-4 h-4" />
                  Go to Home
                </Button>
              </div>

              {/* Help text */}
              <div className="text-center text-sm text-muted-foreground">
                <p>If this problem persists, please contact our support team.</p>
                <p className="mt-1">
                  <a
                    href="mailto:support@telivus.ai"
                    className="text-primary hover:underline"
                  >
                    support@telivus.ai
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}