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
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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

    const { planType } = await req.json();

    if (!planType || !['pay_per_chat', 'unlimited'].includes(planType)) {
      throw new Error('Invalid plan type');
    }

    // Get user profile for email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const email = user.email || `${profile?.username}@medisense.ai`;
    const amount = planType === 'pay_per_chat' ? 5000 : 30000; // In kobo (50 KES and 300 KES)

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        metadata: {
          user_id: user.id,
          plan_type: planType,
        },
        callback_url: `${req.headers.get('origin') || 'https://medisense.app'}/chat?payment=success`,
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.text();
      console.error('Paystack error:', errorData);
      throw new Error('Failed to initialize payment');
    }

    const paystackData = await paystackResponse.json();

    // Create subscription record
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('chat_subscriptions')
      .insert({
        user_id: user.id,
        subscription_type: planType,
        status: 'pending',
        payment_reference: paystackData.data.reference,
        amount: amount / 100, // Convert kobo to KES
        chats_remaining: planType === 'pay_per_chat' ? 1 : 0,
      })
      .select()
      .single();

    if (subError) {
      console.error('Subscription creation error:', subError);
      throw new Error('Failed to create subscription record');
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in initialize-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});