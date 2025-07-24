// app/utils/errorUtils.ts
// Utilities for error handling and user-friendly error messages

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export const ERROR_CODES = {
  // Network/Firebase errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  FIREBASE_ERROR: 'FIREBASE_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Data errors
  DATA_FETCH_ERROR: 'DATA_FETCH_ERROR',
  DATA_VALIDATION_ERROR: 'DATA_VALIDATION_ERROR',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  
  // Component errors
  COMPONENT_RENDER_ERROR: 'COMPONENT_RENDER_ERROR',
  STATE_UPDATE_ERROR: 'STATE_UPDATE_ERROR',
  
  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export const createAppError = (
  code: keyof typeof ERROR_CODES,
  originalError: Error,
  context?: Record<string, any>
): AppError => {
  const errorMappings: Record<string, Omit<AppError, 'context'>> = {
    [ERROR_CODES.NETWORK_ERROR]: {
      code: ERROR_CODES.NETWORK_ERROR,
      message: originalError.message,
      userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
      severity: 'high'
    },
    [ERROR_CODES.FIREBASE_ERROR]: {
      code: ERROR_CODES.FIREBASE_ERROR,
      message: originalError.message,
      userMessage: 'There was an issue accessing the database. Please try again in a moment.',
      severity: 'high'
    },
    [ERROR_CODES.PERMISSION_DENIED]: {
      code: ERROR_CODES.PERMISSION_DENIED,
      message: originalError.message,
      userMessage: 'You don\'t have permission to access this data. Please contact your administrator.',
      severity: 'critical'
    },
    [ERROR_CODES.DATA_FETCH_ERROR]: {
      code: ERROR_CODES.DATA_FETCH_ERROR,
      message: originalError.message,
      userMessage: 'Failed to load data. Please refresh the page or try again later.',
      severity: 'medium'
    },
    [ERROR_CODES.DATA_VALIDATION_ERROR]: {
      code: ERROR_CODES.DATA_VALIDATION_ERROR,
      message: originalError.message,
      userMessage: 'The data received is invalid. Please refresh the page.',
      severity: 'medium'
    },
    [ERROR_CODES.INVALID_DATE_RANGE]: {
      code: ERROR_CODES.INVALID_DATE_RANGE,
      message: originalError.message,
      userMessage: 'Please select a valid date range.',
      severity: 'low'
    },
    [ERROR_CODES.COMPONENT_RENDER_ERROR]: {
      code: ERROR_CODES.COMPONENT_RENDER_ERROR,
      message: originalError.message,
      userMessage: 'There was an error displaying this component. Please refresh the page.',
      severity: 'medium'
    },
    [ERROR_CODES.STATE_UPDATE_ERROR]: {
      code: ERROR_CODES.STATE_UPDATE_ERROR,
      message: originalError.message,
      userMessage: 'Failed to update the interface. Please try your action again.',
      severity: 'low'
    },
    [ERROR_CODES.UNKNOWN_ERROR]: {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: originalError.message,
      userMessage: 'An unexpected error occurred. Please refresh the page or contact support.',
      severity: 'medium'
    }
  };

  const errorInfo = errorMappings[code] || errorMappings[ERROR_CODES.UNKNOWN_ERROR];
  
  return {
    ...errorInfo,
    context: {
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      ...context
    }
  };
};

export const logError = (appError: AppError) => {
  const logLevel = appError.severity === 'critical' ? 'error' : 
                   appError.severity === 'high' ? 'error' :
                   appError.severity === 'medium' ? 'warn' : 'info';
  
  console[logLevel](`[${appError.code}] ${appError.message}`, {
    userMessage: appError.userMessage,
    severity: appError.severity,
    context: appError.context
  });
};

export const getFirebaseErrorCode = (error: any): keyof typeof ERROR_CODES => {
  if (!error) return ERROR_CODES.UNKNOWN_ERROR;
  
  const errorCode = error.code || error.message || '';
  
  if (errorCode.includes('permission-denied')) {
    return ERROR_CODES.PERMISSION_DENIED;
  }
  
  if (errorCode.includes('network') || errorCode.includes('offline')) {
    return ERROR_CODES.NETWORK_ERROR;
  }
  
  if (errorCode.includes('firebase') || errorCode.includes('firestore')) {
    return ERROR_CODES.FIREBASE_ERROR;
  }
  
  return ERROR_CODES.UNKNOWN_ERROR;
};

export const validateDateRange = (startDate: string, endDate: string): void => {
  if (!startDate || !endDate) {
    throw new Error('Both start and end dates are required');
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }
  
  if (start > end) {
    throw new Error('Start date cannot be after end date');
  }
  
  // Check if date range is too large (more than 2 years)
  const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > twoYearsInMs) {
    throw new Error('Date range cannot exceed 2 years');
  }
};

export const validateAssemblyData = (assemblies: string[]): void => {
  if (!Array.isArray(assemblies)) {
    throw new Error('Assemblies must be an array');
  }
  
  if (assemblies.length === 0) {
    throw new Error('At least one assembly must be selected');
  }
  
  assemblies.forEach((assembly, index) => {
    if (typeof assembly !== 'string' || assembly.trim() === '') {
      throw new Error(`Invalid assembly at index ${index}`);
    }
  });
};
