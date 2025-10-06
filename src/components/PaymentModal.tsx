import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Sparkles, MessageSquare } from 'lucide-react';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal = ({ open, onClose, onSuccess }: PaymentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pay_per_chat' | 'unlimited' | null>(null);
  const { toast } = useToast();

  const handlePayment = async (planType: 'pay_per_chat' | 'unlimited') => {
    setLoading(true);
    setSelectedPlan(planType);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('initialize-payment', {
        body: { planType },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      // Redirect to Paystack payment page
      window.location.href = response.data.authorization_url;
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initialize payment',
        variant: 'destructive',
      });
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const plans = [
    {
      id: 'pay_per_chat' as const,
      name: 'Pay Per Chat',
      price: 'KES 50',
      description: 'Single chat session',
      features: [
        '1 chat session',
        'Full AI assistance',
        'No expiry',
      ],
      icon: MessageSquare,
    },
    {
      id: 'unlimited' as const,
      name: 'Unlimited Plan',
      price: 'KES 300',
      description: '30 days of unlimited access',
      features: [
        'Unlimited chats',
        'Priority responses',
        'Valid for 30 days',
        'Best value',
      ],
      icon: Sparkles,
      popular: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-ai bg-clip-text text-transparent">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Select a payment option to continue chatting with MediSense AI
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.id}
                className={`relative p-6 cursor-pointer transition-all hover:shadow-glow ${
                  plan.popular ? 'border-primary shadow-glow' : 'border-border'
                }`}
                onClick={() => !loading && handlePayment(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </div>
                )}
                
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`p-3 rounded-full ${plan.popular ? 'bg-primary/20' : 'bg-secondary'}`}>
                    <Icon className={`h-6 w-6 ${plan.popular ? 'text-primary' : 'text-foreground'}`} />
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-2xl font-bold text-primary mt-1">{plan.price}</p>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  <ul className="space-y-2 w-full text-left">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={loading}
                  >
                    {loading && selectedPlan === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Select Plan'
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Secure payment powered by Paystack. Your payment information is encrypted and secure.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;