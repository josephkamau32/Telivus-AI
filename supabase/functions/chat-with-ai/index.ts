import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { sessionId, message } = await req.json();

    if (!sessionId || !message) {
      throw new Error('Missing sessionId or message');
    }

    // Check if user has access (either active subscription or remaining chats)
    const { data: subscription } = await supabaseAdmin
      .from('chat_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let hasAccess = false;
    let needsPayment = false;

    if (subscription) {
      if (subscription.subscription_type === 'unlimited') {
        // Check if subscription hasn't expired
        if (!subscription.expires_at || new Date(subscription.expires_at) > new Date()) {
          hasAccess = true;
        }
      } else if (subscription.subscription_type === 'pay_per_chat') {
        // Check if user has remaining chats
        if (subscription.chats_remaining > 0) {
          hasAccess = true;
          // Decrement remaining chats
          await supabaseAdmin
            .from('chat_subscriptions')
            .update({ chats_remaining: subscription.chats_remaining - 1 })
            .eq('id', subscription.id);
        } else {
          needsPayment = true;
        }
      }
    } else {
      needsPayment = true;
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Payment required', needsPayment: true }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save user message
    await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: message
    });

    // Get chat history for context
    const { data: messages } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Build conversation history for Gemini
    const conversationHistory = messages?.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })) || [];

    // System prompt for health assistant
    const systemPrompt = `You are MediSense AI, a compassionate and knowledgeable health assistant. Your role is to:

1. **Personalized Nutrition Plans**: Provide tailored nutrition advice based on user's health conditions, age, dietary preferences, and goals.

2. **Symptom Follow-ups**: Ask relevant follow-up questions about symptoms, their duration, severity, and associated factors. Help users understand when to seek medical attention.

3. **Daily Health Check-ins**: Conduct friendly daily check-ins about sleep, mood, exercise, water intake, and overall wellbeing.

Guidelines:
- Always be empathetic and supportive
- Provide evidence-based health information
- Encourage users to consult healthcare professionals for serious concerns
- Ask clarifying questions when needed
- Keep responses concise yet informative
- Use simple, easy-to-understand language
- Remember context from previous messages in the conversation

IMPORTANT: You are NOT a replacement for professional medical advice. Always remind users to consult with healthcare providers for diagnosis and treatment.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error('Failed to get response from AI');
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response. Please try again.';

    // Save AI response
    await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'assistant',
      content: aiResponse
    });

    return new Response(
      JSON.stringify({ message: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-with-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});