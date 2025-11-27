import { useEffect } from 'react';

// Performance monitoring component for Core Web Vitals and other metrics
export const PerformanceMonitor = () => {
  useEffect(() => {
    // Only run in production or when explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !localStorage.getItem('enable-performance-monitoring')) {
      return;
    }

    // Core Web Vitals monitoring
    const reportWebVitals = (metric: any) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Web Vital:', metric);
      }

      // In production, you would send to analytics service
      // Example: sendToAnalytics(metric);

      // Store in localStorage for debugging
      const vitals = JSON.parse(localStorage.getItem('web-vitals') || '{}');
      vitals[metric.name] = {
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now()
      };
      localStorage.setItem('web-vitals', JSON.stringify(vitals));
    };

    // Largest Contentful Paint (LCP)
    const observeLCP = () => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          reportWebVitals({
            name: 'LCP',
            value: lastEntry.startTime,
            rating: lastEntry.startTime > 2500 ? 'poor' : lastEntry.startTime > 1200 ? 'needs-improvement' : 'good'
          });
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });

        // Cleanup after 10 seconds
        setTimeout(() => observer.disconnect(), 10000);
      }
    };

    // First Input Delay (FID)
    const observeFID = () => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            reportWebVitals({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              rating: (entry.processingStart - entry.startTime) > 100 ? 'poor' :
                     (entry.processingStart - entry.startTime) > 50 ? 'needs-improvement' : 'good'
            });
          });
        });
        observer.observe({ entryTypes: ['first-input'] });

        // Cleanup after 10 seconds
        setTimeout(() => observer.disconnect(), 10000);
      }
    };

    // Cumulative Layout Shift (CLS)
    const observeCLS = () => {
      let clsValue = 0;
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });

        // Report CLS after 5 seconds
        setTimeout(() => {
          observer.disconnect();
          reportWebVitals({
            name: 'CLS',
            value: clsValue,
            rating: clsValue > 0.25 ? 'poor' : clsValue > 0.1 ? 'needs-improvement' : 'good'
          });
        }, 5000);
      }
    };

    // Navigation Timing
    const reportNavigationTiming = () => {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const timing = {
            'Time to First Byte': navigation.responseStart - navigation.requestStart,
            'DOM Content Loaded': navigation.domContentLoadedEventEnd - navigation.startTime,
            'Page Load Complete': navigation.loadEventEnd - navigation.startTime,
            'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
            'TCP Connect': navigation.connectEnd - navigation.connectStart,
            'Server Response': navigation.responseEnd - navigation.requestStart,
          };

          Object.entries(timing).forEach(([metric, value]) => {
            if (value > 0) {
              reportWebVitals({
                name: metric,
                value: Math.round(value),
                rating: 'informational'
              });
            }
          });
        }
      }
    };

    // Resource loading performance
    const reportResourceTiming = () => {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const slowResources = resources.filter(resource =>
          (resource.responseEnd - resource.requestStart) > 1000
        );

        if (slowResources.length > 0) {
          reportWebVitals({
            name: 'Slow Resources',
            value: slowResources.length,
            rating: 'needs-improvement',
            details: slowResources.map(r => ({
              url: r.name,
              duration: r.responseEnd - r.requestStart
            }))
          });
        }
      }
    };

    // Memory usage (if available)
    const reportMemoryUsage = () => {
      if ('memory' in (performance as any)) {
        const memory = (performance as any).memory;
        reportWebVitals({
          name: 'Memory Usage',
          value: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          rating: 'informational',
          details: {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
          }
        });
      }
    };

    // Initialize monitoring
    const initMonitoring = () => {
      observeLCP();
      observeFID();
      observeCLS();

      // Report timing after page load
      if (document.readyState === 'complete') {
        setTimeout(() => {
          reportNavigationTiming();
          reportResourceTiming();
          reportMemoryUsage();
        }, 100);
      } else {
        window.addEventListener('load', () => {
          setTimeout(() => {
            reportNavigationTiming();
            reportResourceTiming();
            reportMemoryUsage();
          }, 100);
        });
      }
    };

    initMonitoring();

    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default PerformanceMonitor;