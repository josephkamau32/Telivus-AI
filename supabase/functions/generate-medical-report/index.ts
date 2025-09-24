import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feelings, symptoms, age } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `You are a medical AI assistant. Based on the following information, provide a comprehensive medical assessment:

Feelings: ${feelings}
Symptoms: ${symptoms.join(', ')}
Age: ${age} years old

Please provide a structured response with:
1. Possible conditions (list 2-3 most likely conditions)
2. Recommendations (lifestyle adjustments, rest, hydration, when to see a doctor)
3. Over-the-counter medicines that might help (if applicable)

Important: Keep recommendations general and emphasize consulting a healthcare professional for proper diagnosis. Do not provide specific medical diagnoses.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reportText) {
      throw new Error('No response from Gemini AI');
    }

    console.log('Generated medical report for user:', { feelings, symptoms, age });

    return new Response(JSON.stringify({ 
      report: reportText,
      timestamp: new Date().toISOString(),
      disclaimer: "MediSense AI is not a substitute for professional medical advice. Please consult a licensed healthcare provider for diagnosis and treatment."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-medical-report:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate medical report' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});