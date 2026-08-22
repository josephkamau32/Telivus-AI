import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
}

interface DigitalTwin {
    id: string;
    user_id: string;
    twin_name: string;
    learning_level: string;
    data_points_count: number;
    interaction_count: number;
    accuracy_score: number;
    confidence_level: number;
    twin_age_days: number;
    last_updated: string | null;
}

interface TwinStats {
    twin_id: string;
    twin_name: string;
    learning_level: string;
    data_points: number;
    interactions: number;
    accuracy_score: number;
    confidence_level: number;
    patterns_learned: number;
    active_alerts: number;
    insights_generated: number;
    twin_age_days: number;
    last_updated: string | null;
}

interface HealthEvent {
    id: string;
    event_type: string;
    event_date: string;
    symptoms: Record<string, unknown> | null;
    severity: number | null;
    feeling_state: string | null;
}

interface LearnedPattern {
    id: string;
    pattern_type: string;
    cause: string;
    effect: string;
    confidence_score: number;
    evidence_count: number;
    effect_direction: string | null;
    discovered_at: string;
}

interface ProactiveAlert {
    id: string;
    alert_type: string;
    severity: string;
    title: string;
    description: string;
    confidence_score: number;
    predicted_condition: string | null;
    predicted_likelihood: number | null;
    recommended_actions: string[] | null;
    status: string;
    triggered_at: string;
}

interface TwinInsight {
    id: string;
    insight_type: string;
    title: string;
    description: string;
    confidence_level: number;
    evidence_strength: string;
    health_impact: string;
    is_actionable: boolean;
    is_highlighted: boolean;
    suggested_actions: string[] | null;
    priority: number;
}

// Get or create digital twin
export const useDigitalTwin = () => {
    return useQuery<DigitalTwin>({
        queryKey: ["digitalTwin"],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/twin/me`, { headers });
            if (!response.ok) {
                throw new Error("Failed to fetch digital twin");
            }
            return response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
        throwOnError: false,
    });
};

// Get twin statistics
export const useTwinStats = () => {
    return useQuery<TwinStats>({
        queryKey: ["twinStats"],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/twin/stats`, { headers });
            if (!response.ok) {
                throw new Error("Failed to fetch twin stats");
            }
            return response.json();
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });
};

// Get health timeline
export const useHealthTimeline = (limit: number = 50) => {
    return useQuery<HealthEvent[]>({
        queryKey: ["healthTimeline", limit],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await fetch(
                `${API_BASE_URL}/api/v1/twin/timeline?limit=${limit}`,
                { headers }
            );
            if (!response.ok) {
                throw new Error("Failed to fetch timeline");
            }
            return response.json();
        },
    });
};

// Get learned patterns
export const useLearnedPatterns = (minConfidence: number = 70) => {
    return useQuery<LearnedPattern[]>({
        queryKey: ["learnedPatterns", minConfidence],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await fetch(
                `${API_BASE_URL}/api/v1/twin/patterns?min_confidence=${minConfidence}`,
                { headers }
            );
            if (!response.ok) {
                throw new Error("Failed to fetch patterns");
            }
            return response.json();
        },
    });
};

// Get proactive alerts
export const useProactiveAlerts = (severity?: string) => {
    return useQuery<ProactiveAlert[]>({
        queryKey: ["proactiveAlerts", severity],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const url = severity
                ? `${API_BASE_URL}/api/v1/twin/alerts?severity=${severity}`
                : `${API_BASE_URL}/api/v1/twin/alerts`;
            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error("Failed to fetch alerts");
            }
            return response.json();
        },
        refetchInterval: 60000, // Refresh every minute
    });
};

// Get twin insights
export const useTwinInsights = (highlightedOnly: boolean = false) => {
    return useQuery<TwinInsight[]>({
        queryKey: ["twinInsights", highlightedOnly],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await fetch(
                `${API_BASE_URL}/api/v1/twin/insights?highlighted_only=${highlightedOnly}`,
                { headers }
            );
            if (!response.ok) {
                throw new Error("Failed to fetch insights");
            }
            return response.json();
        },
    });
};

// Update twin
export const useUpdateTwin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { twin_name?: string; settings?: Record<string, unknown> }) => {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/twin/update`, {
                method: "PUT",
                headers,
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error("Failed to update twin");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["digitalTwin"] });
            queryClient.invalidateQueries({ queryKey: ["twinStats"] });
        },
    });
};

// Record health event
export const useRecordHealthEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (event: {
            event_type: string;
            category?: string;
            symptoms?: Record<string, unknown>;
            vital_signs?: Record<string, unknown>;
            interventions?: Record<string, unknown>;
            outcomes?: Record<string, unknown>;
            severity?: number;
            feeling_state?: string;
            source?: string;
        }) => {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/twin/events`, {
                method: "POST",
                headers,
                body: JSON.stringify(event),
            });
            if (!response.ok) {
                throw new Error("Failed to record health event");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["healthTimeline"] });
            queryClient.invalidateQueries({ queryKey: ["twinStats"] });
        },
    });
};

// Trigger twin learning
export const useTriggerLearning = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/twin/learn`, {
                method: "POST",
                headers,
            });
            if (!response.ok) {
                throw new Error("Failed to trigger learning");
            }
            return response.json();
        },
        onSuccess: () => {
            // Invalidate all twin-related queries
            queryClient.invalidateQueries({ queryKey: ["digitalTwin"] });
            queryClient.invalidateQueries({ queryKey: ["twinStats"] });
            queryClient.invalidateQueries({ queryKey: ["learnedPatterns"] });
            queryClient.invalidateQueries({ queryKey: ["proactiveAlerts"] });
            queryClient.invalidateQueries({ queryKey: ["twinInsights"] });
        },
    });
};

// Acknowledge alert
export const useAcknowledgeAlert = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string) => {
            const headers = await getAuthHeaders();
            const response = await fetch(
                `${API_BASE_URL}/api/v1/twin/alerts/${alertId}/acknowledge`,
                {
                    method: "POST",
                    headers,
                }
            );
            if (!response.ok) {
                throw new Error("Failed to acknowledge alert");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["proactiveAlerts"] });
        },
    });
};

