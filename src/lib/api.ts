/**
 * API client for Telivus AI Python backend
 *
 * Handles all communication with the FastAPI backend server.
 */

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-production-api-url.com'  // Replace with actual production URL
  : 'http://127.0.0.1:8000';  // Local development

export interface PatientData {
  feelings: string;
  symptoms: string[];
  age: number;
  name?: string;
  gender?: string;
  medicalHistory?: string;
  surgicalHistory?: string;
  currentMedications?: string;
  allergies?: string;
}

export interface HealthReport {
  id: string;
  patient_info: {
    name?: string;
    age: number;
    gender?: string;
  };
  medical_assessment: {
    chief_complaint: string;
    history_present_illness: string;
    assessment: string;
    diagnostic_plan: {
      consultations?: string[];
      tests?: string[];
      red_flags?: string[];
      follow_up?: string;
    };
    otc_recommendations: Array<{
      medicine: string;
      dosage: string;
      purpose: string;
      instructions: string;
      precautions: string;
      max_duration: string;
      alternatives?: string[];
    }>;
    lifestyle_recommendations?: string[];
    when_to_seek_help?: string;
  };
  generated_at: string;
  ai_model_used: string;
  confidence_score?: number;
  disclaimer: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  /**
   * Generate a health assessment report
   */
  async generateHealthReport(data: PatientData): Promise<HealthReport> {
    // Transform frontend data to match backend expectations
    const requestData = {
      feeling: data.feelings,
      symptom_assessment: {
        symptoms: data.symptoms,
        severity: {}, // Could be extended later
        duration: {}, // Could be extended later
        additional_notes: "" // Could be extended later
      },
      patient_info: {
        name: data.name,
        age: data.age,
        gender: data.gender
      },
      medical_history: data.medicalHistory || data.surgicalHistory || data.currentMedications || data.allergies ? {
        past_medical_conditions: data.medicalHistory || undefined,
        past_surgical_history: data.surgicalHistory || undefined,
        current_medications: data.currentMedications || undefined,
        allergies: data.allergies || undefined
      } : undefined,
      additional_context: "" // Could be extended later
    };

    return this.request<HealthReport>('/api/v1/health/assess', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  /**
   * Get symptom suggestions
   */
  async getSymptomSuggestions(
    symptoms: string,
    age: number,
    gender?: string,
    medicalHistory?: string
  ): Promise<{ suggestions: string[]; confidence: string }> {
    const params = new URLSearchParams({
      symptoms,
      age: age.toString(),
      ...(gender && { gender }),
      ...(medicalHistory && { medical_history: medicalHistory }),
    });

    return this.request<{ suggestions: string[]; confidence: string }>(
      `/api/v1/health/symptoms/suggestions?${params}`
    );
  }

  /**
   * Validate symptom data
   */
  async validateSymptoms(symptomData: any): Promise<any> {
    return this.request('/api/v1/health/validate-symptoms', {
      method: 'POST',
      body: JSON.stringify({ symptoms: symptomData }),
    });
  }

  /**
   * Check for emergency symptoms
   */
  async checkEmergencySymptoms(
    symptoms: string,
    age: number,
    additionalContext?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      symptoms,
      age: age.toString(),
      ...(additionalContext && { additional_context: additionalContext }),
    });

    return this.request(`/api/v1/health/emergency-check?${params}`);
  }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<{ status: string; version: string; service: string }> {
    return this.request('/health');
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiClient };