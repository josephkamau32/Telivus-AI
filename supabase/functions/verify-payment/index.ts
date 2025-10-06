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

    const { reference } = await req.json();

    if (!reference) {
      throw new Error('Payment reference is required');
    }

    // Verify transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.text();
      console.error('Paystack verification error:', errorData);
      throw new Error('Failed to verify payment');
    }

    const verifyData = await verifyResponse.json();

    if (verifyData.data.status !== 'success') {
      throw new Error('Payment was not successful');
    }

    // Update subscription status
    const { data: subscription } = await supabaseAdmin
      .from('chat_subscriptions')
      .select('*')
      .eq('payment_reference', reference)
      .single();

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updateData: any = {
      status: 'active',
    };

    // Set expiry for unlimited plan (30 days from now)
    if (subscription.subscription_type === 'unlimited') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      updateData.expires_at = expiryDate.toISOString();
    }

    await supabaseAdmin
      .from('chat_subscriptions')
      .update(updateData)
      .eq('id', subscription.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription_type: subscription.subscription_type 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});