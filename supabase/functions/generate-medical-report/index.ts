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

    const prompt = `You are Dr. MediSense AI, an experienced medical doctor with a PhD in Medicine and Pharmacy, with over 20 years of clinical experience. Based on the comprehensive patient information provided, generate a detailed professional medical assessment report.

PATIENT PRESENTATION:
- Current Symptoms: ${symptoms.join(', ')}
- Patient's Subjective Feeling: ${feelings}
- Age: ${age} years old

Please provide a structured, professional medical assessment report with the following sections:

**CLINICAL ASSESSMENT:**
1. **Primary Differential Diagnoses** (3-4 most likely conditions based on symptoms)
   - List conditions in order of clinical probability
   - Provide brief rationale for each diagnosis

2. **PHARMACEUTICAL RECOMMENDATIONS:**
   - **Over-the-Counter Medications:** Specific brand names, dosages, and administration instructions
   - **Symptomatic Relief Options:** Include alternatives for different severity levels
   - **Drug Interactions & Contraindications:** Important safety considerations

3. **CLINICAL RECOMMENDATIONS:**
   - **Immediate Care Instructions:** What to do in the next 24-48 hours
   - **Lifestyle Modifications:** Diet, activity, rest recommendations
   - **Monitoring Guidelines:** Symptoms to watch for, when to seek emergency care
   - **Follow-up Timeline:** When to see a healthcare provider

4. **PREVENTIVE MEASURES:**
   - Risk factor modifications
   - Health maintenance recommendations

5. **RED FLAG SYMPTOMS:**
   - Critical symptoms requiring immediate medical attention
   - Emergency department criteria

Format the response professionally as a medical consultation report. Be specific with medication names, dosages, and instructions while maintaining appropriate medical disclaimers.

**IMPORTANT MEDICAL DISCLAIMER:** This assessment is for informational purposes only and does not replace professional medical consultation, diagnosis, or treatment.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
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
      error: error instanceof Error ? error.message : 'Failed to generate medical report' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});