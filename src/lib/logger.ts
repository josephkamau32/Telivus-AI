/**
 * Production-safe logging utility
 * 
 * Provides conditional logging that only outputs in development mode.
 * In production, logs are suppressed to keep console clean.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
    /**
     * Log informational messages (only in development)
     */
    info: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Log warning messages (only in development)
     */
    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    /**
     * Log error messages (always logged, even in production)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Log debug messages (only in development)
     */
    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },

    /**
     * Group logging (only in development)
     */
    group: (label: string) => {
        if (isDevelopment) {
            console.group(label);
        }
    },

    groupEnd: () => {
        if (isDevelopment) {
            console.groupEnd();
        }
    },

    /**
     * Table logging for structured data (only in development)
     */
    table: (data: any) => {
        if (isDevelopment) {
            console.table(data);
        }
    },
};

/**
 * Performance logging helper
 */
export const perfLogger = {
    start: (label: string): number => {
        if (isDevelopment) {
            return performance.now();
        }
        return 0;
    },

    end: (label: string, startTime: number) => {
        if (isDevelopment) {
            const duration = performance.now() - startTime;
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        }
    },
};

export default logger;
