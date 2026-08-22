import { useMutation, useQueryClient } from "@tanstack/react-query";
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

/**
 * Hook to sync all historical health data to digital twin
 */
export const useSyncHistoricalData = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/v1/twin/sync`, {
                method: "POST",
                headers,
            });
            if (!response.ok) {
                throw new Error("Failed to sync historical data");
            }
            return response.json();
        },
        onSuccess: () => {
            // Invalidate all twin-related queries
            queryClient.invalidateQueries({ queryKey: ["digitalTwin"] });
            queryClient.invalidateQueries({ queryKey: ["twinStats"] });
            queryClient.invalidateQueries({ queryKey: ["healthTimeline"] });
            queryClient.invalidateQueries({ queryKey: ["learnedPatterns"] });
            queryClient.invalidateQueries({ queryKey: ["proactiveAlerts"] });
            queryClient.invalidateQueries({ queryKey: ["twinInsights"] });
        },
    });
};
