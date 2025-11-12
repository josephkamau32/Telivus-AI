// Security utilities for input validation and sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting utility
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) { // 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // Auth attempts
export const apiRateLimiter = new RateLimiter(100, 60 * 1000); // API calls per minute

export const sanitizeMedicalData = (data: any): any => {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeMedicalData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeMedicalData(value);
    }
    return sanitized;
  }

  return data;
};

// Enhanced input validation for medical terms
export const validateMedicalInput = (input: string): { isValid: boolean; sanitized: string; warnings: string[] } => {
  const warnings: string[] = [];
  let sanitized = sanitizeInput(input);

  // Check for potentially sensitive information
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(input)) {
    warnings.push('SSN-like pattern detected - please avoid sharing sensitive personal information');
  }

  if (/\b\d{16}\b/.test(input)) {
    warnings.push('Credit card-like pattern detected - please avoid sharing financial information');
  }

  // Limit length for medical descriptions
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
    warnings.push('Input truncated to 2000 characters');
  }

  return {
    isValid: warnings.length === 0,
    sanitized,
    warnings
  };
};
