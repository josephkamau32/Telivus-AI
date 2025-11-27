/**
 * API client for Telivus AI Python backend
 *
 * Handles all communication with the FastAPI backend server.
 */

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? (import.meta.env.VITE_API_BASE_URL || 'https://telivus-ai.onrender.com')
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
    const startTime = Date.now();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`API Request: ${config.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      const responseTime = Date.now() - startTime;

      console.log(`API Response: ${response.status} ${response.statusText} (${responseTime}ms)`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = {};

        try {
          const errorData = await response.json();
          errorDetails = errorData;
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          // Response is not JSON, try to get text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            // Ignore text parsing errors
          }
        }

        // Log detailed error information
        console.error('API Error:', {
          url,
          method: config.method || 'GET',
          status: response.status,
          statusText: response.statusText,
          responseTime,
          errorDetails,
          timestamp: new Date().toISOString()
        });

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Log successful requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log('API Success:', { url, responseTime, dataSize: JSON.stringify(data).length });
      }

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof Error) {
        // Enhance error with context
        const enhancedError = new Error(error.message);
        enhancedError.name = 'APIError';
        (enhancedError as any).url = url;
        (enhancedError as any).responseTime = responseTime;
        (enhancedError as any).timestamp = new Date().toISOString();

        console.error('API Request Failed:', {
          url,
          method: config.method || 'GET',
          error: error.message,
          responseTime,
          timestamp: new Date().toISOString()
        });

        throw enhancedError;
      }

      // For non-Error objects
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      (networkError as any).url = url;
      (networkError as any).responseTime = responseTime;

      console.error('Network Error:', {
        url,
        method: config.method || 'GET',
        responseTime,
        timestamp: new Date().toISOString()
      });

      throw networkError;
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

  /**
   * Check if the service is available (with timeout)
   */
  async isServiceAvailable(): Promise<{ available: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { available: true, responseTime };
      } else {
        return {
          available: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        available: false,
        responseTime,
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Global error monitoring
if (typeof window !== 'undefined') {
  // Monitor unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // reportError({
      //   type: 'unhandledrejection',
      //   reason: event.reason,
      //   timestamp: new Date().toISOString(),
      //   url: window.location.href
      // });
    }
  });

  // Monitor global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // reportError({
      //   type: 'global_error',
      //   message: event.message,
      //   filename: event.filename,
      //   lineno: event.lineno,
      //   colno: event.colno,
      //   timestamp: new Date().toISOString(),
      //   url: window.location.href,
      //   userAgent: navigator.userAgent
      // });
    }
  });
}

// Export types
export type { ApiClient };