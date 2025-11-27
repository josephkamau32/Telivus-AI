import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifyError, withErrorRecovery, createNetworkMonitor } from './errorHandling';
import type { AppError } from './errorHandling';

describe('Error Handling System', () => {
  describe('classifyError', () => {
    it('should classify network errors', () => {
      const error = new Error('Network request failed');
      (error as any).name = 'NetworkError';

      const classified = classifyError(error);

      expect(classified.type).toBe('network');
      expect(classified.retryable).toBe(true);
      expect(classified.userMessage).toContain('Connection problem');
    });

    it('should classify HTTP errors', () => {
      const error = new Error('Bad Request');
      (error as any).status = 400;

      const classified = classifyError(error);

      expect(classified.type).toBe('validation');
      expect(classified.retryable).toBe(false);
      expect(classified.statusCode).toBe(400);
    });

    it('should classify server errors as retryable', () => {
      const error = new Error('Internal Server Error');
      (error as any).status = 500;

      const classified = classifyError(error);

      expect(classified.type).toBe('api');
      expect(classified.retryable).toBe(true);
      expect(classified.statusCode).toBe(500);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timeout');
      (error as any).name = 'TimeoutError';

      const classified = classifyError(error);

      expect(classified.type).toBe('network');
      expect(classified.retryable).toBe(true);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Something unexpected happened');

      const classified = classifyError(error);

      expect(classified.type).toBe('unknown');
      expect(classified.retryable).toBe(true);
      expect(classified.userMessage).toContain('Something unexpected');
    });
  });

  describe('withErrorRecovery', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should return successful result', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withErrorRecovery(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await withErrorRecovery(operation, {
        maxRetries: 2,
        retryDelay: 100
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('Bad Request');
      (error as any).status = 400;

      const operation = vi.fn().mockRejectedValue(error);

      await expect(withErrorRecovery(operation)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      await withErrorRecovery(operation, {
        maxRetries: 1,
        onRetry
      });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should call onFailure callback when retries exhausted', async () => {
      const onFailure = vi.fn();
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(withErrorRecovery(operation, {
        maxRetries: 1,
        onFailure
      })).rejects.toThrow();

      expect(onFailure).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should implement exponential backoff', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      const retryPromise = withErrorRecovery(operation, {
        maxRetries: 2,
        retryDelay: 100,
        exponentialBackoff: true
      });

      // Fast-forward timers
      await vi.advanceTimersByTimeAsync(100); // First retry delay
      await vi.advanceTimersByTimeAsync(200); // Second retry delay (exponential)

      await expect(retryPromise).rejects.toThrow();
    });
  });

  describe('createNetworkMonitor', () => {
    it('should create network monitor', () => {
      const monitor = createNetworkMonitor();

      expect(monitor.isOnline).toBe(true); // Default to online in tests
      expect(typeof monitor.subscribe).toBe('function');
    });

    it('should handle network status changes', () => {
      const monitor = createNetworkMonitor();
      const listener = vi.fn();

      const unsubscribe = monitor.subscribe(listener);

      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
      expect(listener).toHaveBeenCalledWith(false);

      // Simulate online event
      window.dispatchEvent(new Event('online'));
      expect(listener).toHaveBeenCalledWith(true);

      unsubscribe();
    });
  });
});