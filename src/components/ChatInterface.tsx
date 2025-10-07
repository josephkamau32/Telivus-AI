import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ArrowLeft, Sparkles } from 'lucide-react';
import PaymentModal from './PaymentModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  onBack: () => void;
}

const ChatInterface = ({ onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeChat();
    checkSubscription();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('chat_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscriptionInfo(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const initializeChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create new chat session
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({ 
          user_id: user.id,
          title: 'Health Chat'
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(session.id);

      // Load initial greeting
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: 'Hello! I\'m MediSense AI, your personal health assistant. I can help you with personalized nutrition plans, symptom follow-ups, and daily health check-ins. How can I assist you today?',
        created_at: new Date().toISOString()
      }]);
    } catch (error: any) {
      console.error('Error initializing chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize chat session',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message to UI
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('chat-with-ai', {
        body: { sessionId, message: userMessage },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      // Check if payment is required (402 status)
      if (response.error || response.data?.needsPayment) {
        setShowPayment(true);
        // Remove the temporary user message
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
        return;
      }

      if (response.error) {
        throw response.error;
      }

      // Add AI response to UI
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.data.message,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Refresh subscription info
      await checkSubscription();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    checkSubscription();
    toast({
      title: 'Payment Successful',
      description: 'You can now continue chatting!',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={onBack}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {subscriptionInfo ? (
              subscriptionInfo.subscription_type === 'unlimited' ? (
                <span className="text-primary font-medium">Unlimited Plan Active</span>
              ) : (
                <span className="text-primary font-medium">
                  {subscriptionInfo.chats_remaining} chat{subscriptionInfo.chats_remaining !== 1 ? 's' : ''} remaining
                </span>
              )
            ) : (
              <span>No active plan</span>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="h-[calc(100vh-200px)] flex flex-col overflow-hidden shadow-glow border-primary/20">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-foreground border border-primary/10'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-secondary/50 rounded-2xl px-4 py-3 border border-primary/10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-background/50 backdrop-blur">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type your health question..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                size="icon"
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          MediSense AI provides general health information only. Always consult healthcare professionals for medical advice.
        </p>
      </div>

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default ChatInterface;