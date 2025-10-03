import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const validateInput = (data: any) => {
  const errors: string[] = [];
  
  if (!data.feelings || typeof data.feelings !== 'string' || data.feelings.trim().length === 0) {
    errors.push('Feeling is required');
  }
  
  if (!Array.isArray(data.symptoms) || data.symptoms.length === 0) {
    errors.push('At least one symptom is required');
  }
  
  if (!data.age || typeof data.age !== 'number' || data.age < 0 || data.age > 130) {
    errors.push('Age must be a number between 0 and 130');
  }
  
  return errors;
};

// Retry function with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 2) => {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) or if it's an Error with message
      if (error instanceof Error) {
        if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let healthReportId: string | null = null;

  try {
    const requestBody = await req.json();
    const { feelings, symptoms, age, name, gender, medicalHistory, surgicalHistory, currentMedications, allergies, userId } = requestBody;
    
    // Input validation
    const validationErrors = validateInput({ feelings, symptoms, age, name, gender, medicalHistory, surgicalHistory, currentMedications, allergies });
    if (validationErrors.length > 0) {
      // Log validation failure
      await supabase.from('report_logs').insert({
        event_type: 'validation_failed',
        payload: { validationErrors, requestBody },
        user_id: userId || null
      });
      
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validationErrors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create initial health report record
    const { data: healthReport, error: insertError } = await supabase
      .from('health_reports')
      .insert({
        user_id: userId || null,
        age,
        feeling: feelings,
        symptoms,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating health report:', insertError);
      throw new Error('Failed to create health report record');
    }

    healthReportId = healthReport.id;

    // Log request start
    await supabase.from('report_logs').insert({
      health_report_id: healthReportId,
      event_type: 'request_started',
      payload: { feelings, symptoms, age, userId },
      user_id: userId || null
    });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Build comprehensive patient profile
    const patientProfile = `
PATIENT INFORMATION:
- Age: ${age} years old
- Gender: ${gender || 'Not specified'}
- Name: ${name || 'Not provided'}
- Current Symptoms: ${symptoms.join(', ')}
- How they feel: ${feelings}
${medicalHistory ? `- Past Medical History: ${medicalHistory}` : ''}
${surgicalHistory ? `- Past Surgical History: ${surgicalHistory}` : ''}
${currentMedications ? `- Current Medications: ${currentMedications}` : ''}
${allergies ? `- Known Allergies: ${allergies}` : ''}
`;

    const prompt = `You are Dr. Sarah Mitchell, MD, PharmD - a board-certified internal medicine physician with 20+ years of clinical experience and dual certification as a clinical pharmacist. You are known for your thorough diagnostic assessments, evidence-based treatment recommendations, and exceptional patient communication skills. Your approach combines clinical excellence with compassionate care.

${patientProfile}

TASK: Generate a comprehensive, professional medical assessment report based on the patient information above. This report should demonstrate your expertise while being accessible to the patient.

REQUIREMENTS:
1. Provide a thorough clinical assessment considering all patient factors
2. Offer evidence-based OTC medication recommendations with precise dosing
3. Check for drug interactions and contraindications
4. Include clear red flag symptoms requiring immediate care
5. Write in a professional yet patient-friendly tone

CRITICAL OUTPUT FORMAT: Return ONLY a valid JSON object. No markdown, no code blocks, no extra text. Start with { and end with }.

Generate a JSON response with this EXACT structure:

{
  "demographic_header": {
    "name": "${name || 'Not provided'}",
    "age": ${age},
    "gender": "${gender || 'Not provided'}",
    "date": "${new Date().toISOString().split('T')[0]}"
  },
  "chief_complaint": "Brief, clear statement of the primary presenting symptom (e.g., 'Acute onset headache and persistent cough')",
  "history_present_illness": "Professional narrative describing: 1) Symptom onset and duration, 2) Severity and character, 3) Impact on daily activities, 4) Associated symptoms. Write 3-5 clear sentences in professional medical language but understandable to patients.",
  "past_medical_history": "${medicalHistory || 'No significant past medical history reported'}",
  "past_surgical_history": "${surgicalHistory || 'No surgical history reported'}",
  "medications": "${currentMedications || 'No current medications reported'}",
  "allergies": "${allergies || 'No known allergies reported'}",
  "assessment": "Provide a thorough clinical assessment in 4-6 well-structured sentences. Include: 1) Most likely diagnosis based on symptoms and patient factors, 2) 2-3 differential diagnoses with brief rationale, 3) Clinical reasoning for your assessment, 4) Risk factors or considerations from patient history. Use professional medical language while remaining clear.",
  "diagnostic_plan": "Structured plan with clear sections: 1) **Recommended Consultations**: Which specialist to see and when, 2) **Suggested Diagnostic Tests**: What tests or exams would help confirm diagnosis, 3) **RED FLAG SYMPTOMS**: List 4-5 symptoms that require IMMEDIATE emergency care, 4) **Follow-up Timeline**: When to seek care if symptoms persist or worsen.",
  "otc_recommendations": [
    {
      "medicine": "Specific OTC medication name (generic and common brand)",
      "dosage": "Age-appropriate dosage with frequency (e.g., Adults: 200-400mg every 4-6 hours)",
      "purpose": "Therapeutic indication and mechanism of action",
      "instructions": "Detailed administration instructions: timing, with/without food, duration",
      "precautions": "Important warnings, contraindications, potential side effects, and drug interactions${currentMedications ? ' (checked against current medications)' : ''}${allergies ? ' (verified against known allergies)' : ''}",
      "max_duration": "Maximum self-treatment duration before medical consultation required"
    }
  ]
}

CRITICAL INSTRUCTIONS FOR DR. MITCHELL:
- Write as a senior physician - thorough, evidence-based, professional, and caring
- Provide 2-4 specific OTC medications most appropriate for the symptoms
- MANDATORY: Consider patient age, gender, medical history, current medications, and allergies
- Check for drug interactions and contraindications explicitly
- Use professional medical language but ensure patient comprehension
- Be appropriately conservative - emphasize when professional care is needed
- Include age-appropriate dosing with clear instructions
- Make recommendations realistic and practical
- Write in complete, well-structured sentences
- CRITICAL: Return ONLY a pure JSON object. No markdown. No code blocks. No extra text. Start with { end with }.`;

    // Call Gemini API with retry logic - using Gemini 2.5 Flash
    const geminiResponse = await retryWithBackoff(async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
            temperature: 0.3,
            maxOutputTokens: 3048,
            topP: 0.9,
            topK: 20,
            responseMimeType: "application/json"
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      return response;
    });

    const data = await geminiResponse.json();
    const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reportText) {
      throw new Error('No response from Gemini AI');
    }

    // Parse JSON response with robust error handling
    let parsedReport;
    try {
      // Clean the response - remove any markdown or extra formatting
      let cleanedText = reportText.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\n?/gi, '').replace(/\n?```$/g, '');
      }
      
      // Extract the first complete JSON object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      
      const jsonString = jsonMatch[0];
      parsedReport = JSON.parse(jsonString);
      
      // Validate required fields
      if (!parsedReport.chief_complaint || !parsedReport.assessment) {
        throw new Error('Missing required fields in parsed report');
      }
      
      // Ensure otc_recommendations exists and is an array
      if (!Array.isArray(parsedReport.otc_recommendations)) {
        parsedReport.otc_recommendations = [];
      }
      
      // Ensure demographic_header exists
      if (!parsedReport.demographic_header) {
        parsedReport.demographic_header = {
          name: name || 'Not provided',
          age: age,
          gender: gender || 'Not provided',
          date: new Date().toISOString().split('T')[0]
        };
      }
      
      console.log('Successfully parsed medical report');
      
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw response (first 1000 chars):', reportText.substring(0, 1000));
      
      // Return a proper error report instead of falling back
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Update health report with success
    const { error: updateError } = await supabase
      .from('health_reports')
      .update({
        status: 'completed',
        report: parsedReport,
        otc_medicines: parsedReport.otc_medicines || []
      })
      .eq('id', healthReportId);

    if (updateError) {
      console.error('Error updating health report:', updateError);
    }

    // Log successful completion
    await supabase.from('report_logs').insert({
      health_report_id: healthReportId,
      event_type: 'request_completed',
      payload: { success: true, reportLength: reportText.length },
      user_id: userId || null
    });

    console.log(`Successfully generated medical report for health_report_id: ${healthReportId}`);

    return new Response(JSON.stringify({ 
      ...parsedReport,
      timestamp: new Date().toISOString(),
      health_report_id: healthReportId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-medical-report:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate medical report';
    
    // Extract userId from request for error logging
    let errorUserId: string | null = null;
    try {
      const errorBody = await req.clone().json();
      errorUserId = errorBody.userId || null;
    } catch {
      // If we can't parse the request body, proceed without userId
    }
    
    // Update health report with error if we have an ID
    if (healthReportId) {
      await supabase
        .from('health_reports')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', healthReportId);

      // Log error
      await supabase.from('report_logs').insert({
        health_report_id: healthReportId,
        event_type: 'request_failed',
        payload: { error: errorMessage, stack: error instanceof Error ? error.stack : undefined },
        user_id: errorUserId
      });
    }

    // Provide specific guidance for quota issues
    const isQuotaError = error instanceof Error && error.message.includes('429');
    const errorResponse = {
      error: isQuotaError 
        ? 'Gemini API quota exceeded. Please upgrade to a paid plan or try again later.'
        : errorMessage,
      error_code: isQuotaError ? 'QUOTA_EXCEEDED' : 'GENERATION_FAILED',
      ...(isQuotaError && {
        retry_after: '1 hour',
        upgrade_info: 'Consider upgrading to Gemini API Pro for higher quotas'
      })
    };

    return new Response(JSON.stringify(errorResponse), {
      status: isQuotaError ? 429 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});