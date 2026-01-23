import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';

const Chat = () => {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    handlePaymentCallback();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentCallback = async () => {
    const reference = searchParams.get('reference');
    const paymentStatus = searchParams.get('payment');

    if (paymentStatus === 'success' && reference) {
      setVerifying(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const response = await supabase.functions.invoke('verify-payment', {
          body: { reference },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (response.error) throw response.error;

        toast({
          title: 'Payment Successful',
          description: 'Your subscription is now active!',
        });

        // Remove query params from URL
        window.history.replaceState({}, '', '/chat');
      } catch (error: any) {
        console.error('Payment verification error:', error);
        toast({
          title: 'Verification Error',
          description: error.message || 'Failed to verify payment',
          variant: 'destructive',
        });
      } finally {
        setVerifying(false);
      }
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {verifying ? 'Verifying payment...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return <ChatInterface onBack={handleBack} />;
};

export default Chat;