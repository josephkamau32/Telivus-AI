import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        // First, check if there's an existing session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session check error:", error);
          // If refresh token is invalid, clear the session
          if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
            console.log("Invalid refresh token detected, clearing session");
            await supabase.auth.signOut({ scope: 'local' });
          }
        }

        // Only redirect if there's a valid session AND we're not coming from a direct auth URL
        if (session && mounted) {
          // Check if this is a direct navigation to /auth (user wants to see login form)
          const currentPath = window.location.pathname;
          const searchParams = new URLSearchParams(window.location.search);

          // If user directly navigated to /auth, show the form instead of auto-redirecting
          if (currentPath === '/auth' && !searchParams.has('redirected')) {
            console.log("User navigated directly to auth page, showing login form");
            setCurrentUser(session.user);
            setIsCheckingAuth(false);
            return;
          }

          // Session exists and not direct navigation, redirect to dashboard
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch (error) {
        console.error("Error checking session:", error);
        // If there's an unexpected error, clear local session
        if (error instanceof Error && (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found'))) {
          await supabase.auth.signOut({ scope: 'local' });
        }
      } finally {
        if (mounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkSession();

    // Listen for auth state changes (handles OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      if (event === 'SIGNED_IN' && session && mounted) {
        // User just signed in, redirect to dashboard
        navigate("/dashboard", { replace: true });
      } else if (event === 'SIGNED_OUT' && mounted) {
        // Clear user state and redirect to home
        setCurrentUser(null);
        setIsCheckingAuth(false);
        navigate("/", { replace: true });
      } else if (event === 'TOKEN_REFRESHED' && session && mounted) {
        // Token was successfully refreshed, update user state
        setCurrentUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username || email.split('@')[0],
        },
      },
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "Check your email to confirm your account",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setCurrentUser(null);
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign Out Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      }
      // Don't navigate here - let onAuthStateChange handle it
    } catch (error) {
      console.error('Sign-in error:', error);
      toast({
        title: "Sign In Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary-light via-background to-secondary-light dark:from-primary-light/10 dark:via-background dark:to-secondary-light/10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome to Telivus
            </CardTitle>
            <CardDescription className="text-center">
              {currentUser ? `Already signed in as ${currentUser.email}` : "Sign in or create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentUser ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    ✅ You are already signed in
                  </p>
                  <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                    {currentUser.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1"
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    onClick={handleSignOut}
                    variant="outline"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      "Sign Out"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username (optional)</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}