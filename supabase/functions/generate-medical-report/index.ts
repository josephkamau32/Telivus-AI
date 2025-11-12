import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const getCorsHeaders = (req: Request) => {
  const requestOrigin = req.headers.get('origin') || '*';
  const requestHeaders = req.headers.get('access-control-request-headers') || 'authorization, x-client-info, apikey, content-type';
  return {
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': requestHeaders,
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  } as Record<string, string>;
};

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

const generateCacheKey = async (symptoms: string[], feelings: string, age: number) => {
  // Normalize inputs to maximize cache hits without changing report content
  const normalizedSymptoms = [...symptoms]
    .map(s => (s || '').toString().trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(',');
  const normalizedFeelings = (feelings || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const cacheString = `${normalizedSymptoms}|${normalizedFeelings}|${Math.floor(age / 5) * 5}`;

  const msgUint8 = new TextEncoder().encode(cacheString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
};

const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 2) => {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error instanceof Error) {
        if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let healthReportId: string | null = null;

  try {
    console.log('Function started - processing request');

    const requestBody = await req.json();
    const { feelings, symptoms, age, name, gender, medicalHistory, surgicalHistory, currentMedications, allergies, userId } = requestBody;

    console.log('Request body received:', { feelings: feelings?.substring(0, 50), symptomsCount: symptoms?.length, age, userId });
    
    const validationErrors = validateInput({ feelings, symptoms, age, name, gender, medicalHistory, surgicalHistory, currentMedications, allergies });
    if (validationErrors.length > 0) {
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

    // Check cache FIRST to return immediately on hits
    const cacheKey = await generateCacheKey(symptoms, feelings, age);
    const { data: cachedReport } = await supabase
      .from('report_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedReport) {
      console.log(`Cache HIT for key: ${cacheKey}`);

      const cachedData = cachedReport.report_data;

      cachedData.demographic_header = {
        name: name || 'Not provided',
        age: age,
        gender: gender || 'Not provided',
        date: new Date().toISOString().split('T')[0]
      };

      if (medicalHistory) cachedData.past_medical_history = medicalHistory;
      if (surgicalHistory) cachedData.past_surgical_history = surgicalHistory;
      if (currentMedications) cachedData.medications = currentMedications;
      if (allergies) cachedData.allergies = allergies;

      return new Response(JSON.stringify({
        ...cachedData,
        timestamp: new Date().toISOString(),
        health_report_id: null,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Cache MISS for key: ${cacheKey} - generating new report`);

    // Only if cache missed, create DB record and proceed
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

    await supabase.from('report_logs').insert({
      health_report_id: healthReportId,
      event_type: 'request_started',
      payload: { feelings, symptoms, age, userId },
      user_id: userId || null
    });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Debug: Log API key status (remove in production)
    console.log('OpenAI API key configured:', OPENAI_API_KEY ? 'Yes' : 'No');
    console.log('API key length:', OPENAI_API_KEY?.length || 0);
    console.log('API key starts with:', OPENAI_API_KEY?.substring(0, 10) + '...' || 'No key');

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

    const prompt = `You are Dr. Sarah Mitchell, MD, PharmD - a board-certified physician with 20+ years experience and clinical pharmacist certification.

${patientProfile}

CRITICAL RULES:
- Use ONLY the symptoms explicitly stated above
- Base all assessments strictly on provided patient data
- Recommend only FDA-approved OTC medications for stated symptoms
- No hallucinations, no invented symptoms, no speculation
- Return ONLY valid JSON (no markdown, no code blocks)

JSON OUTPUT (be concise):

{
  "demographic_header": {
    "name": "${name || 'Not provided'}",
    "age": ${age},
    "gender": "${gender || 'Not provided'}",
    "date": "${new Date().toISOString().split('T')[0]}"
  },
  "chief_complaint": "Brief primary symptoms from patient report",
  "history_present_illness": "Concise narrative: symptoms + how patient feels + age/gender context (3-4 sentences max)",
  "past_medical_history": "${medicalHistory || 'None reported'}",
  "past_surgical_history": "${surgicalHistory || 'None reported'}",
  "medications": "${currentMedications || 'None reported'}",
  "allergies": "${allergies || 'None reported'}",
  "assessment": "Clinical assessment: Most likely diagnosis + 2 differential diagnoses + reasoning from symptoms only (4-5 sentences)",
  "diagnostic_plan": "**Consultations**: Specialists to see | **Tests**: Diagnostic tests needed | **RED FLAGS**: 4 warning signs for ER | **Follow-up**: When to seek care",
  "otc_recommendations": [
    {
      "medicine": "FDA-approved OTC medication (generic + brand)",
      "dosage": "Age-appropriate for ${age}yo",
      "purpose": "Treats [specific symptom]",
      "instructions": "How/when to take",
      "precautions": "Warnings, contraindications. ${currentMedications ? 'Checked vs: ' + currentMedications : ''}${allergies ? ' Safe with: ' + allergies : ''}",
      "max_duration": "Days before doctor visit"
    }
  ]
}

Provide 2-3 OTC medications for reported symptoms. Age ${age} dosing. Cross-ref: ${currentMedications || 'none'} & ${allergies || 'none'}. Return pure JSON only.`;

    const openaiResponse = await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 1500,
          temperature: 0.2,
          response_format: { type: "json_object" }
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);

        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('OpenAI API quota exceeded. Please try again later.');
        } else if (response.status === 400) {
          throw new Error('Invalid request to AI service. Please check your input.');
        } else if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key.');
        } else if (response.status >= 500) {
          throw new Error('AI service temporarily unavailable. Please try again.');
        }

        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      return response;
    });

    const data = await openaiResponse.json();
    const reportText = data.choices?.[0]?.message?.content;

    if (!reportText) {
      throw new Error('No response from Gemini AI');
    }

    let parsedReport;
    try {
      let cleanedText = reportText.trim();
      
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\n?/gi, '').replace(/\n?```$/g, '');
      }
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      
      const jsonString = jsonMatch[0];
      parsedReport = JSON.parse(jsonString);
      
      const validationErrors = [];

      if (!parsedReport.chief_complaint || typeof parsedReport.chief_complaint !== 'string') {
        validationErrors.push('Missing or invalid chief_complaint');
      }

      if (!parsedReport.assessment || typeof parsedReport.assessment !== 'string') {
        validationErrors.push('Missing or invalid assessment');
      }

      if (!parsedReport.history_present_illness || typeof parsedReport.history_present_illness !== 'string') {
        validationErrors.push('Missing or invalid history_present_illness');
      }

      if (!parsedReport.diagnostic_plan || typeof parsedReport.diagnostic_plan !== 'string') {
        validationErrors.push('Missing or invalid diagnostic_plan');
      }

      const reportedSymptoms = symptoms.map((s: string) => s.toLowerCase());
      const assessmentText = (parsedReport.assessment || '').toLowerCase();
      const complaintText = (parsedReport.chief_complaint || '').toLowerCase();

      let symptomMatchCount = 0;
      reportedSymptoms.forEach((symptom: string) => {
        if (assessmentText.includes(symptom) || complaintText.includes(symptom)) {
          symptomMatchCount++;
        }
      });

      if (symptomMatchCount === 0 && reportedSymptoms.length > 0) {
        validationErrors.push('Assessment does not reference any reported symptoms - possible hallucination');
      }

      if (!Array.isArray(parsedReport.otc_recommendations)) {
        parsedReport.otc_recommendations = [];
      }

      parsedReport.otc_recommendations.forEach((otc: any, index: number) => {
        if (!otc.medicine || typeof otc.medicine !== 'string') {
          validationErrors.push(`OTC recommendation ${index + 1}: Missing medicine name`);
        }
        if (!otc.dosage || typeof otc.dosage !== 'string') {
          validationErrors.push(`OTC recommendation ${index + 1}: Missing dosage`);
        }
        if (!otc.purpose || typeof otc.purpose !== 'string') {
          validationErrors.push(`OTC recommendation ${index + 1}: Missing purpose`);
        }
        if (!otc.precautions || typeof otc.precautions !== 'string') {
          validationErrors.push(`OTC recommendation ${index + 1}: Missing precautions`);
        }
      });

      if (!parsedReport.demographic_header) {
        parsedReport.demographic_header = {
          name: name || 'Not provided',
          age: age,
          gender: gender || 'Not provided',
          date: new Date().toISOString().split('T')[0]
        };
      }

      if (validationErrors.length > 0) {
        console.error('Report validation failed:', validationErrors);
        console.error('Partial report received. This may indicate response truncation.');
        throw new Error(`AI response incomplete or truncated. Please try again. Missing: ${validationErrors.join(', ')}`);
      }

      console.log(`Successfully parsed and validated medical report (symptom match: ${symptomMatchCount}/${reportedSymptoms.length})`);
      
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw response (first 1000 chars):', reportText.substring(0, 1000));
      
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

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

    const cacheData = {
      chief_complaint: parsedReport.chief_complaint,
      history_present_illness: parsedReport.history_present_illness,
      assessment: parsedReport.assessment,
      diagnostic_plan: parsedReport.diagnostic_plan,
      otc_recommendations: parsedReport.otc_recommendations
    };

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase.from('report_cache').upsert({
      cache_key: cacheKey,
      report_data: cacheData,
      expires_at: expiresAt.toISOString(),
      hit_count: 0
    }, {
      onConflict: 'cache_key'
    });

    await supabase.from('report_logs').insert({
      health_report_id: healthReportId,
      event_type: 'request_completed',
      payload: { success: true, reportLength: reportText.length, cacheKey },
      user_id: userId || null
    });

    console.log(`Successfully generated medical report for health_report_id: ${healthReportId}`);

    return new Response(JSON.stringify({
      ...parsedReport,
      timestamp: new Date().toISOString(),
      health_report_id: healthReportId,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-medical-report:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate medical report';
    
    let errorUserId: string | null = null;
    try {
      const errorBody = await req.clone().json();
      errorUserId = errorBody.userId || null;
    } catch {
    }
    
    if (healthReportId) {
      await supabase
        .from('health_reports')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', healthReportId);

      await supabase.from('report_logs').insert({
        health_report_id: healthReportId,
        event_type: 'request_failed',
        payload: { error: errorMessage, stack: error instanceof Error ? error.stack : undefined },
        user_id: errorUserId
      });
    }

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