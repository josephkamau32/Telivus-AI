import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect, memo } from "react";
import { Loader2 } from "lucide-react";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { setupGlobalErrorHandling } from "@/lib/errorHandling";
import { preloadCriticalImages } from "@/lib/imageUtils";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load components for better performance
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Chat = lazy(() => import("./pages/Chat"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Trajectory = lazy(() => import("./pages/Trajectory"));
const DigitalTwin = lazy(() => import("./pages/DigitalTwin"));
const CCEEDemo = lazy(() => import("./pages/CCEEDemo"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

const App = () => {
  // Setup global error handling and preload critical resources on app start
  useEffect(() => {
    setupGlobalErrorHandling();
    // Preload critical images for better performance
    preloadCriticalImages();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <PerformanceMonitor />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/digital-twin" element={<DigitalTwin />} />
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/health-dashboard" element={<Dashboard />} />
                    <Route path="/trajectory" element={<Trajectory />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/ccee-demo" element={<CCEEDemo />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
            <PWAInstallPrompt />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
