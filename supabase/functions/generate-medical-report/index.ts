import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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
  const sortedSymptoms = [...symptoms].sort().join(',');
  const cacheString = `${sortedSymptoms}|${feelings}|${Math.floor(age / 5) * 5}`;

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

    const cacheKey = await generateCacheKey(symptoms, feelings, age);
    const { data: cachedReport } = await supabase
      .from('report_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedReport) {
      console.log(`Cache HIT for key: ${cacheKey}`);

      await supabase
        .from('report_cache')
        .update({ hit_count: cachedReport.hit_count + 1 })
        .eq('id', cachedReport.id);

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

      await supabase
        .from('health_reports')
        .update({
          status: 'completed',
          report: cachedData,
          otc_medicines: cachedData.otc_recommendations || []
        })
        .eq('id', healthReportId);

      await supabase.from('report_logs').insert({
        health_report_id: healthReportId,
        event_type: 'cache_hit',
        payload: { cacheKey, success: true },
        user_id: userId || null
      });

      return new Response(JSON.stringify({
        ...cachedData,
        timestamp: new Date().toISOString(),
        health_report_id: healthReportId,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Cache MISS for key: ${cacheKey} - generating new report`);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

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

    const prompt = `You are Dr. Sarah Mitchell, MD, PharmD - a board-certified internal medicine physician with 20+ years of clinical experience and dual certification as a clinical pharmacist.

${patientProfile}

TASK: Generate a comprehensive, professional medical assessment report based STRICTLY on the patient information provided above.

ANTI-HALLUCINATION REQUIREMENTS (CRITICAL):
- Use ONLY the symptoms and information explicitly provided by the patient
- DO NOT invent or assume symptoms not mentioned
- DO NOT speculate about conditions without clear symptom evidence
- If information is limited, acknowledge this in your assessment
- Base your diagnosis ONLY on the presenting symptoms
- Recommend ONLY FDA-approved OTC medications appropriate for the specific symptoms listed
- DO NOT recommend prescription medications
- Provide differential diagnoses that are directly supported by the reported symptoms

OUTPUT REQUIREMENTS:
1. Base clinical assessment strictly on provided symptoms and patient data
2. Offer evidence-based OTC recommendations matching the specific symptoms
3. Check for drug interactions with listed medications and known allergies
4. Include clear red flag symptoms for the condition being assessed
5. Use professional yet patient-friendly language
6. Return ONLY valid JSON. No markdown, no code blocks, no extra text.

JSON STRUCTURE (match exactly):

{
  "demographic_header": {
    "name": "${name || 'Not provided'}",
    "age": ${age},
    "gender": "${gender || 'Not provided'}",
    "date": "${new Date().toISOString().split('T')[0]}"
  },
  "chief_complaint": "Brief statement of primary presenting symptoms from the patient's report",
  "history_present_illness": "Professional narrative based strictly on: 1) Reported symptoms, 2) Patient's stated feeling, 3) Age and gender context. Write 3-5 factual sentences. Do not invent details.",
  "past_medical_history": "${medicalHistory || 'No significant past medical history reported'}",
  "past_surgical_history": "${surgicalHistory || 'No surgical history reported'}",
  "medications": "${currentMedications || 'No current medications reported'}",
  "allergies": "${allergies || 'No known allergies reported'}",
  "assessment": "Clinical assessment in 4-6 sentences: 1) Most likely diagnosis based ONLY on reported symptoms, 2) 2-3 differential diagnoses that match the symptom pattern, 3) Clinical reasoning tied directly to reported symptoms, 4) Relevant risk factors from provided patient history. Stay factual and evidence-based.",
  "diagnostic_plan": "Structured plan: 1) **Recommended Consultations**: Appropriate specialist referrals, 2) **Suggested Diagnostic Tests**: Tests to confirm suspected conditions, 3) **RED FLAG SYMPTOMS**: 4-5 specific warning signs requiring emergency care, 4) **Follow-up Timeline**: When to seek care if symptoms worsen.",
  "otc_recommendations": [
    {
      "medicine": "Specific FDA-approved OTC medication (generic name and brand)",
      "dosage": "Age-appropriate dosage for ${age}-year-old (e.g., Adults: 200-400mg every 4-6 hours)",
      "purpose": "Treats [specific symptom from patient's list]",
      "instructions": "Detailed administration: timing, food requirements, duration",
      "precautions": "Warnings, contraindications, side effects. ${currentMedications ? 'CHECKED AGAINST: ' + currentMedications : ''}${allergies ? ' VERIFIED SAFE WITH: ' + allergies : ''}",
      "max_duration": "Maximum days before seeing a doctor"
    }
  ]
}

GUIDELINES:
- Provide 2-4 OTC medications directly targeting the reported symptoms
- For age ${age}: Use age-appropriate dosing and safety considerations
- Cross-reference all recommendations against: ${currentMedications || 'no current medications'} and ${allergies || 'no known allergies'}
- Be conservative: emphasize when professional medical evaluation is needed
- Return pure JSON only. Start with { and end with }.`;

    const geminiResponse = await retryWithBackoff(async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
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
            temperature: 0.2,
            maxOutputTokens: 3000,
            topP: 0.9,
            topK: 20,
            responseMimeType: "application/json"
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
          ]
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
        throw new Error(`Report validation failed: ${validationErrors.join(', ')}`);
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