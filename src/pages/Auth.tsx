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
import { useTranslation } from "@/contexts/LanguageContext";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
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
        title: t.validationError,
        description: t.pleaseFillAllFields,
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t.validationError,
        description: t.passwordMin6Chars,
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
        title: t.success,
        description: t.checkEmailConfirm,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setCurrentUser(null);
      toast({
        title: t.signedOut,
        description: t.signedOutSuccessfully,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: t.signOutError,
        description: t.failedToSignOut,
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
        title: t.validationError,
        description: t.emailAndPasswordRequired,
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
          title: t.authenticationError,
          description: error.message,
          variant: "destructive",
        });
      }
      // Don't navigate here - let onAuthStateChange handle it
    } catch (error) {
      console.error('Sign-in error:', error);
      toast({
        title: t.signInFailed,
        description: t.unexpectedError,
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
              {t.welcomeToTelivus}
            </CardTitle>
            <CardDescription className="text-center">
              {currentUser ? `${t.alreadySignedIn} ${currentUser.email}` : t.signInOrCreateAccount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentUser ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    ✅ {t.alreadySignedIn}
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
                    {t.goToDashboard}
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
                        {t.signingOut}
                      </>
                    ) : (
                      t.signOut
                    )}
                  </Button>
                </div>
              </div>
            ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t.signIn}</TabsTrigger>
                <TabsTrigger value="signup">{t.signUp}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t.email}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t.youExampleCom}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t.password}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t.sixCharacters}
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
                        {t.signingIn}
                      </>
                    ) : (
                      t.signIn
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">{t.usernameOptional}</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder={t.johndoe}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t.email}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t.youExampleCom}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t.password}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t.sixCharacters}
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
                        {t.creatingAccount}
                      </>
                    ) : (
                      t.signUp
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