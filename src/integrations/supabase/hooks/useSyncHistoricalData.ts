import { useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Hook to sync all historical health data to digital twin
 */
export const useSyncHistoricalData = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await fetch(`${API_BASE_URL}/api/v1/twin/sync`, {
                method: "POST",
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
