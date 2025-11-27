// Advanced error handling utilities for production-ready applications

export interface AppError {
  id: string;
  type: 'network' | 'api' | 'validation' | 'auth' | 'unknown';
  message: string;
  userMessage: string;
  statusCode?: number;
  retryable: boolean;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: AppError) => void;
  onFailure?: (error: AppError) => void;
}

// Error classification and user-friendly messages
export const classifyError = (error: any): AppError => {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
    return {
      id: errorId,
      type: 'network',
      message: error.message || 'Network request failed',
      userMessage: 'Connection problem. Please check your internet and try again.',
      retryable: true,
      timestamp: new Date(),
      context: { originalError: error }
    };
  }

  // API errors with status codes
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;

    switch (status) {
      case 400:
        return {
          id: errorId,
          type: 'validation',
          message: error.message || 'Bad request',
          userMessage: 'Please check your input and try again.',
          statusCode: status,
          retryable: false,
          timestamp: new Date(),
          context: error
        };

      case 401:
      case 403:
        return {
          id: errorId,
          type: 'auth',
          message: error.message || 'Authentication failed',
          userMessage: 'Please sign in again to continue.',
          statusCode: status,
          retryable: false,
          timestamp: new Date(),
          context: error
        };

      case 404:
        return {
          id: errorId,
          type: 'api',
          message: error.message || 'Resource not found',
          userMessage: 'The requested information is not available.',
          statusCode: status,
          retryable: false,
          timestamp: new Date(),
          context: error
        };

      case 429:
        return {
          id: errorId,
          type: 'api',
          message: error.message || 'Too many requests',
          userMessage: 'Please wait a moment before trying again.',
          statusCode: status,
          retryable: true,
          timestamp: new Date(),
          context: error
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          id: errorId,
          type: 'api',
          message: error.message || 'Server error',
          userMessage: 'Our servers are experiencing issues. Please try again later.',
          statusCode: status,
          retryable: true,
          timestamp: new Date(),
          context: error
        };

      default:
        return {
          id: errorId,
          type: 'api',
          message: error.message || `HTTP ${status}`,
          userMessage: 'Something went wrong. Please try again.',
          statusCode: status,
          retryable: status >= 500,
          timestamp: new Date(),
          context: error
        };
    }
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return {
      id: errorId,
      type: 'network',
      message: error.message || 'Request timed out',
      userMessage: 'The request took too long. Please try again.',
      retryable: true,
      timestamp: new Date(),
      context: error
    };
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return {
      id: errorId,
      type: 'validation',
      message: error.message || 'Validation failed',
      userMessage: 'Please check your input and try again.',
      retryable: false,
      timestamp: new Date(),
      context: error
    };
  }

  // Default unknown error
  return {
    id: errorId,
    type: 'unknown',
    message: error.message || 'An unexpected error occurred',
    userMessage: 'Something unexpected happened. Please try again.',
    retryable: true,
    timestamp: new Date(),
    context: error
  };
};

// Error recovery with retry logic
export const withErrorRecovery = async <T>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
    onFailure
  } = options;

  let lastError: AppError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = classifyError(error);

      // Don't retry if error is not retryable
      if (!lastError.retryable && attempt > 0) {
        break;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        if (onFailure) {
          onFailure(lastError);
        }
        throw lastError;
      }

      // Calculate delay for next retry
      const delay = exponentialBackoff
        ? retryDelay * Math.pow(2, attempt)
        : retryDelay;

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Global error handler for unhandled errors
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = classifyError(event.reason);
    console.error('🚨 Unhandled promise rejection:', error);

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // reportError(error);
    }

    // Prevent default browser handling for cleaner UX
    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = classifyError(event.error || event.message);
    console.error('🚨 Uncaught error:', error);

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // reportError(error);
    }
  });

  // Handle service worker errors
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'error') {
        const error = classifyError(event.data.error);
        console.error('🚨 Service Worker error:', error);
      }
    });
  }
};

// Error reporting (placeholder for integration with services like Sentry, LogRocket, etc.)
export const reportError = (error: AppError) => {
  // In a real implementation, this would send to error reporting service
  console.log('📊 Error reported:', {
    id: error.id,
    type: error.type,
    message: error.message,
    userMessage: error.userMessage,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    context: error.context
  });

  // Example integrations:
  // - Sentry: Sentry.captureException(error);
  // - LogRocket: LogRocket.captureException(error);
  // - Custom analytics: analytics.track('error', error);
};

// User-friendly error toast messages
export const getErrorToastConfig = (error: AppError) => {
  const baseConfig = {
    title: 'Error',
    description: error.userMessage,
    variant: 'destructive' as const,
  };

  // Customize based on error type
  switch (error.type) {
    case 'network':
      return {
        ...baseConfig,
        title: 'Connection Issue',
        action: {
          label: 'Retry',
          onClick: () => window.location.reload()
        }
      };

    case 'auth':
      return {
        ...baseConfig,
        title: 'Authentication Required',
        action: {
          label: 'Sign In',
          onClick: () => window.location.href = '/auth'
        }
      };

    case 'validation':
      return {
        ...baseConfig,
        title: 'Please Check Your Input',
        variant: 'default' as const
      };

    default:
      return baseConfig;
  }
};

// Network status monitoring
export const createNetworkMonitor = () => {
  let isOnline = navigator.onLine;
  const listeners: ((online: boolean) => void)[] = [];

  const notifyListeners = (online: boolean) => {
    listeners.forEach(listener => listener(online));
  };

  window.addEventListener('online', () => {
    isOnline = true;
    notifyListeners(true);
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    notifyListeners(false);
  });

  return {
    get isOnline() { return isOnline; },
    subscribe(listener: (online: boolean) => void) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    }
  };
};