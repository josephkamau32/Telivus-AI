import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ArrowLeft, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import PaymentModal from './PaymentModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  onBack: () => void;
  autoSendMessage?: string | null;
  onAutoSendComplete?: () => void;
}

const ChatInterface = ({ onBack, autoSendMessage, onAutoSendComplete }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initFailed, setInitFailed] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeChat();
    checkSubscription();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-send the pending message after payment redirect + chat init
  useEffect(() => {
    if (autoSendMessage && sessionId && !isInitializing && !loading) {
      onAutoSendComplete?.();
      handleSendMessageDirect(autoSendMessage);
    }
  }, [autoSendMessage, sessionId, isInitializing, loading]);

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
      setIsInitializing(true);
      setInitFailed(false);
      console.log('Initializing chat...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsInitializing(false);
        setInitFailed(true);
        return;
      }

      // Check for existing active session
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentSessionId: string;

      if (existingSession) {
        // Use existing session
        currentSessionId = existingSession.id;
        setSessionId(currentSessionId);

        // Load existing messages
        const { data: existingMessages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', currentSessionId)
          .order('created_at', { ascending: true });

        if (existingMessages && existingMessages.length > 0) {
          console.log('Found existing messages:', existingMessages.length);
          const formattedMessages: Message[] = existingMessages.map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            created_at: msg.created_at
          }));
          setMessages(formattedMessages);
          setIsInitializing(false);
          return; // Don't add greeting if there are existing messages
        }
      } else {
        // Create new chat session
        console.log('Creating new chat session...');
        const { data: session, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: 'Health Chat'
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating session:', error);
          throw error;
        }
        currentSessionId = session.id;
        setSessionId(currentSessionId);
      }

      // Load initial greeting only for new sessions
      console.log('Setting greeting message...');
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: 'Hello! I\'m Telivus AI, your personal health assistant. I can help you with personalized nutrition plans, symptom follow-ups, and daily health check-ins. How can I assist you today?',
        created_at: new Date().toISOString()
      }]);
      console.log('Greeting message set');
      setIsInitializing(false);
    } catch (error: any) {
      console.error('Error initializing chat:', error);
      setIsInitializing(false);
      setInitFailed(true);
      toast({
        title: 'Error',
        description: 'Failed to initialize chat session. Use the Retry button to try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessageDirect = async (messageText: string) => {
    if (!messageText.trim() || !sessionId || loading) return;

    const userMessage = messageText.trim();
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

      // Real errors (network failure, 500, etc.) — surface them
      if (response.error) {
        throw response.error;
      }

      // Check if payment is required (the edge function returns 200 with needsPayment flag)
      if (response.data?.needsPayment) {
        setShowPayment(true);
        setPendingMessage(userMessage);
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
        return;
      }

      // Check if AI provider is unavailable (auth/quota/billing error on OpenAI)
      if (response.data?.aiUnavailable) {
        setAiUnavailable(true);
        // User's message was saved server-side; keep it visible in the UI.
        // Don't show an error toast — the inline banner handles this state.
        return;
      }

      // AI responded successfully — clear any previous unavailable state
      if (aiUnavailable) setAiUnavailable(false);

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
        description: error.message || 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      // Keep the user's message visible — it was likely saved to DB already.
      // Only the payment-required path removes it (since it was never sent).
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    // If sessionId is null (init failed or never completed), show a visible
    // error and auto-retry initialization once instead of silently no-oping.
    if (!sessionId) {
      toast({
        title: 'Chat session not ready',
        description: 'Your chat session didn\'t load properly — retrying now…',
        variant: 'destructive',
      });
      await initializeChat();
      return;
    }

    await handleSendMessageDirect(input.trim());
  };


  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    await checkSubscription();

    // If there's a pending message, retry sending it
    if (pendingMessage && sessionId) {
      const messageToSend = pendingMessage;
      setPendingMessage(null); // Clear pending message

      // Add the user message back to UI
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageToSend,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const response = await supabase.functions.invoke('chat-with-ai', {
          body: { sessionId, message: messageToSend },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (response.error) {
          throw response.error;
        }

        // Check if AI provider is unavailable after payment
        if (response.data?.aiUnavailable) {
          setAiUnavailable(true);
          return;
        }

        if (aiUnavailable) setAiUnavailable(false);

        // Add AI response to UI
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: response.data.message,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);

        toast({
          title: 'Message Sent',
          description: 'Continuing your conversation!',
        });
      } catch (error: any) {
        console.error('Error retrying message:', error);
        toast({
          title: 'Error',
          description: 'Failed to send message after payment',
          variant: 'destructive',
        });
        // Remove the user message on error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      } finally {
        setLoading(false);
      }
    } else {
      toast({
        title: 'Payment Successful',
        description: 'You can now continue chatting!',
      });
    }
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
                // Check expires_at to avoid showing "Active" for an expired unlimited plan
                !subscriptionInfo.expires_at || new Date(subscriptionInfo.expires_at) > new Date() ? (
                  <span className="text-primary font-medium">Unlimited Plan Active</span>
                ) : (
                  <span className="text-destructive font-medium">Plan Expired — renew to continue</span>
                )
              ) : (
                subscriptionInfo.chats_remaining > 0 ? (
                  <span className="text-primary font-medium">
                    {subscriptionInfo.chats_remaining} chat{subscriptionInfo.chats_remaining !== 1 ? 's' : ''} remaining
                  </span>
                ) : (
                  <span className="text-destructive font-medium">No chats remaining — purchase more</span>
                )
              )
            ) : (
              <span>No active plan</span>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="h-[calc(100dvh-200px)] flex flex-col overflow-hidden shadow-glow border-primary/20">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isInitializing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading your chat session...</p>
                </div>
              </div>
            ) : initFailed ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-destructive font-medium mb-2">Failed to load chat session</p>
                  <p className="text-muted-foreground text-sm mb-4">Something went wrong while setting up your chat. Please try again.</p>
                  <Button onClick={initializeChat} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
                {loading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-secondary/50 rounded-2xl px-4 py-3 border border-primary/10 max-w-[80%]">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Telivus AI is thinking...</p>
                    </div>
                  </div>
                )}
                {aiUnavailable && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="max-w-[90%] rounded-2xl px-5 py-4 bg-amber-500/10 border border-amber-500/30 text-foreground">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium mb-1">AI assistant temporarily unavailable</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            This is a demo environment — the AI provider is not currently responding to requests.
                            Your message has been saved. The assistant will resume automatically when the provider
                            connection is restored; no action is needed on your end.
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            This project demonstrates production security practices (RLS, payment verification, authorization).
                            See the{' '}
                            <a
                              href="https://github.com/josephkamau32/Telivus-AI/blob/main/docs/security-case-study.md"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2 hover:text-primary/80"
                            >
                              security case study
                            </a>
                            {' '}for details.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
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
          Telivus AI provides general health information only. Always consult healthcare professionals for medical advice.
        </p>
      </div>

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        pendingMessage={pendingMessage}
        sessionId={sessionId}
      />
    </div>
  );
};

export default memo(ChatInterface);