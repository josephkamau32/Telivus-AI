// Image optimization utilities for better performance

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  lazy?: boolean;
  placeholder?: string;
}

// Generate optimized image URLs (for future CDN integration)
export const getOptimizedImageUrl = (
  src: string,
  options: ImageOptimizationOptions = {}
): string => {
  // In a real implementation, this would integrate with a CDN like Cloudinary, Imgix, etc.
  // For now, we'll return the original src but add query parameters for future optimization

  const params = new URLSearchParams();

  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  if (options.format) params.set('f', options.format);

  const paramString = params.toString();
  return paramString ? `${src}?${paramString}` : src;
};

// Preload critical images
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Preload critical images on app start
export const preloadCriticalImages = async () => {
  const criticalImages = [
    // Add paths to critical images that should be preloaded
    // Note: telivus-logo.png is in assets and imported directly, not in public folder
    '/favicon.svg',
  ];

  const preloadPromises = criticalImages.map(preloadImage);

  try {
    await Promise.all(preloadPromises);
    console.log('Critical images preloaded successfully');
  } catch (error) {
    console.warn('Some critical images failed to preload:', error);
  }
};

// Generate responsive image srcSet
export const generateSrcSet = (
  src: string,
  widths: number[] = [480, 768, 1024, 1280, 1920]
): string => {
  return widths
    .map(width => `${getOptimizedImageUrl(src, { width })},w ${width}w`)
    .join(', ');
};

// Generate responsive image sizes attribute
export const getResponsiveSizes = (
  breakpoints: { [key: string]: string } = {
    '(max-width: 480px)': '100vw',
    '(max-width: 768px)': '100vw',
    '(max-width: 1024px)': '50vw',
    '(max-width: 1280px)': '33vw',
    'default': '25vw'
  }
): string => {
  const sizes = Object.entries(breakpoints)
    .map(([query, size]) => query === 'default' ? size : `${query} ${size}`)
    .join(', ');

  return sizes;
};

// Image lazy loading hook
export const useLazyImage = (src: string, options: ImageOptimizationOptions = {}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imgElement = entry.target as HTMLImageElement;
            imgElement.src = getOptimizedImageUrl(src, options);
            imgElement.classList.remove('lazy');
            observer.unobserve(imgElement);
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (img) {
      observer.observe(img);
    }

    return () => {
      if (img) {
        observer.unobserve(img);
      }
    };
  }, [src, options]);

  const handleLoad = () => setLoaded(true);
  const handleError = () => setError(true);

  return {
    imgRef,
    loaded,
    error,
    src: options.lazy ? '' : getOptimizedImageUrl(src, options),
    onLoad: handleLoad,
    onError: handleError,
  };
};

// WebP support detection
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

// AVIF support detection
export const supportsAVIF = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
};

// Get best supported image format
export const getBestImageFormat = async (): Promise<'avif' | 'webp' | 'jpg'> => {
  if (await supportsAVIF()) return 'avif';
  if (await supportsWebP()) return 'webp';
  return 'jpg';
};

// Image optimization component props
export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  lazy?: boolean;
  placeholder?: string;
  responsive?: boolean;
  breakpoints?: number[];
}

// React.lazy is not available here, so we'll use React import
import React from 'react';