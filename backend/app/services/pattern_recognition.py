"""
Pattern Recognition and Learning Engine

Analyzes health data to discover causal patterns and correlations
in the user's health journey.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
from scipy import stats
from sklearn.preprocessing import StandardScaler
import networkx as nx

from app.models.digital_twin import HealthEvent, LearnedPattern

logger = logging.getLogger(__name__)


class PatternRecognitionEngine:
    """
    Engine for discovering health patterns from longitudinal data.
    
    Uses statistical analysis and causal inference to identify
    meaningful relationships in user health data.
    """
    
    def __init__(self, min_confidence: float = 0.70, min_evidence: int = 3):
        """
        Initialize pattern recognition engine.
        
        Args:
            min_confidence: Minimum confidence threshold (0-1)
            min_evidence: Minimum number of occurrences to consider
        """
        self.min_confidence = min_confidence
        self.min_evidence = min_evidence
    
    def analyze_health_events(
        self,
        events: List[HealthEvent]
    ) -> List[Dict[str, Any]]:
        """
        Analyze health events to discover patterns.
        
        Args:
            events: List of health events from timeline
            
        Returns:
            List of discovered patterns with metadata
        """
        patterns = []
        
        try:
            # Extract symptom-lifestyle correlations
            symptom_patterns = self._find_symptom_triggers(events)
            patterns.extend(symptom_patterns)
            
            # Find temporal patterns
            temporal_patterns = self._find_temporal_patterns(events)
            patterns.extend(temporal_patterns)
            
            # Detect improvement/worsening trends
            trend_patterns = self._find_health_trends(events)
            patterns.extend(trend_patterns)
            
            logger.info(f"Discovered {len(patterns)} patterns from {len(events)} events")
            return patterns
            
        except Exception as e:
            logger.error(f"Error analyzing health events: {e}")
            return []
    
    def _find_symptom_triggers(
        self,
        events: List[HealthEvent]
    ) -> List[Dict[str, Any]]:
        """
        Find what triggers specific symptoms.
        
        Analyzes correlations between lifestyle factors/environmental
        conditions and symptom occurrence.
        """
        patterns = []
        
        try:
            # Build cause-effect pairs
            symptom_occurrences = defaultdict(list)
            
            for event in events:
                if not event.symptoms:
                    continue
                
                symptoms = event.symptoms.get("list", []) if isinstance(event.symptoms, dict) else event.symptoms
                
                for symptom in symptoms:
                    symptom_occurrences[symptom].append({
                        "date": event.event_date,
                        "feeling": event.feeling_state,
                        "severity": event.severity,
                        "metadata": event.metadata or {}
                    })
            
            # Analyze each symptom
            for symptom, occurrences in symptom_occurrences.items():
                if len(occurrences) < self.min_evidence:
                    continue
                
                # Check for temporal clusters (specific times of day/week)
                temporal_pattern = self._check_temporal_clustering(occurrences)
                if temporal_pattern:
                    patterns.append({
                        "pattern_type": "temporal",
                        "category": "symptom",
                        "cause": temporal_pattern["trigger"],
                        "effect": symptom,
                        "confidence_score": temporal_pattern["confidence"] * 100,
                        "evidence_count": len(occurrences),
                        "effect_direction": "negative",
                        "time_lag": temporal_pattern.get("time_lag"),
                        "seasonality": temporal_pattern.get("seasonality"),
                        "supporting_data": occurrences[:5]  # Sample data
                    })
                
                # Check for feeling state correlation
                feeling_correlation = self._check_feeling_correlation(occurrences)
                if feeling_correlation:
                    patterns.append(feeling_correlation)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error finding symptom triggers: {e}")
            return []
    
    def _check_temporal_clustering(
        self,
        occurrences: List[Dict]
    ) -> Optional[Dict[str, Any]]:
        """Check if symptom occurrences cluster at specific times."""
        try:
            dates = [occ["date"] for occ in occurrences]
            
            # Check day of week clustering
            weekdays = [d.weekday() for d in dates]
            weekday_counts = np.bincount(weekdays, minlength=7)
            max_weekday = np.argmax(weekday_counts)
            weekday_ratio = weekday_counts[max_weekday] / len(weekdays)
            
            if weekday_ratio > 0.6:  # 60%+ occur on same weekday
                day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                return {
                    "trigger": f"{day_names[max_weekday]}s",
                    "confidence": weekday_ratio,
                    "seasonality": "weekly"
                }
            
            # Check time of day clustering
            hours = [d.hour for d in dates if d.hour is not None]
            if hours:
                hour_counts = np.bincount(hours, minlength=24)
                max_hour = np.argmax(hour_counts)
                hour_ratio = hour_counts[max_hour] / len(hours)
                
                if hour_ratio > 0.5:
                    time_label = self._get_time_of_day_label(max_hour)
                    return {
                        "trigger": f"{time_label}",
                        "confidence": hour_ratio,
                        "time_lag": f"typically at {max_hour}:00"
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking temporal clustering: {e}")
            return None
    
    def _get_time_of_day_label(self, hour: int) -> str:
        """Get human-readable time of day label."""
        if 5 <= hour < 12:
            return "Morning"
        elif 12 <= hour < 17:
            return "Afternoon"
        elif 17 <= hour < 21:
            return "Evening"
        else:
            return "Night"
    
    def _check_feeling_correlation(
        self,
        occurrences: List[Dict]
    ) -> Optional[Dict[str, Any]]:
        """Check correlation between feeling states and symptom."""
        try:
            # Count by feeling state
            feeling_counts = defaultdict(int)
            total_count = 0
            
            for occ in occurrences:
                if occ.get("feeling"):
                    feeling_counts[occ["feeling"]] += 1
                    total_count += 1
            
            if total_count < self.min_evidence:
                return None
            
            # Find dominant feeling
            max_feeling = max(feeling_counts, key=feeling_counts.get)
            feeling_ratio = feeling_counts[max_feeling] / total_count
            
            if feeling_ratio > 0.7:  # 70%+ correlation
                return {
                    "pattern_type": "correlation",
                    "category": "symptom",
                    "cause": f"Feeling {max_feeling}",
                    "effect": "symptom occurrence",
                    "confidence_score": feeling_ratio * 100,
                    "evidence_count": total_count,
                    "effect_direction": "negative",
                    "supporting_data": occurrences[:5]
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking feeling correlation: {e}")
            return None
    
    def _find_temporal_patterns(
        self,
        events: List[HealthEvent]
    ) -> List[Dict[str, Any]]:
        """Find time-based patterns (seasonal, cyclical, etc.)."""
        patterns = []
        
        try:
            if len(events) < 30:  # Need sufficient data
                return patterns
            
            # Group events by month
            monthly_severity = defaultdict(list)
            
            for event in events:
                if event.severity is not None:
                    month = event.event_date.month
                    monthly_severity[month].append(event.severity)
            
            # Check for seasonal patterns
            if len(monthly_severity) >= 3:
                monthly_avg = {
                    month: np.mean(severities)
                    for month, severities in monthly_severity.items()
                }
                
                # Find peak and low months
                peak_month = max(monthly_avg, key=monthly_avg.get)
                low_month = min(monthly_avg, key=monthly_avg.get)
                
                month_names = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ]
                
                # If there's a significant difference
                if monthly_avg[peak_month] - monthly_avg[low_month] > 2.0:
                    patterns.append({
                        "pattern_type": "seasonal",
                        "category": "temporal",
                        "cause": f"{month_names[peak_month - 1]} season",
                        "effect": "Increased symptom severity",
                        "confidence_score": 75.0,
                        "evidence_count": len(monthly_severity[peak_month]),
                        "effect_direction": "negative",
                        "seasonality": "annual",
                        "metadata": {
"peak_month": month_names[peak_month - 1],
                            "low_month": month_names[low_month - 1]
                        }
                    })
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error finding temporal patterns: {e}")
            return []
    
    def _find_health_trends(
        self,
        events: List[HealthEvent]
    ) -> List[Dict[str, Any]]:
        """Detect improving or worsening health trends."""
        patterns = []
        
        try:
            if len(events) < 10:
                return patterns
            
            # Sort by date
            sorted_events = sorted(events, key=lambda e: e.event_date)
            
            # Extract severity over time
            severities = [e.severity for e in sorted_events if e.severity is not None]
            
            if len(severities) < 5:
                return patterns
            
            # Calculate trend using linear regression
            x = np.arange(len(severities))
            y = np.array(severities)
            
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
            
            # Significant trend if p-value < 0.05 and R² > 0.3
            if p_value < 0.05 and r_value ** 2 > 0.3:
                if slope < -0.1:  # Improving (severity decreasing)
                    patterns.append({
                        "pattern_type": "trend",
                        "category": "health_trajectory",
                        "cause": "Recent interventions or lifestyle changes",
                        "effect": "Health improvement trend",
                        "confidence_score": (r_value ** 2) * 100,
                        "evidence_count": len(severities),
                        "effect_direction": "positive",
                        "effect_strength": abs(slope),
                        "metadata": {
                            "trend": "improving",
                            "r_squared": r_value ** 2,
                            "p_value": p_value
                        }
                    })
                elif slope > 0.1:  # Worsening (severity increasing)
                    patterns.append({
                        "pattern_type": "trend",
                        "category": "health_trajectory",
                        "cause": "Progressive condition or unmanaged factors",
                        "effect": "Health decline trend",
                        "confidence_score": (r_value ** 2) * 100,
                        "evidence_count": len(severities),
                        "effect_direction": "negative",
                        "effect_strength": abs(slope),
                        "metadata": {
                            "trend": "worsening",
                            "r_squared": r_value ** 2,
                            "p_value": p_value
                        }
                    })
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error finding health trends: {e}")
            return []
    
    def predict_symptom_risk(
        self,
        events: List[HealthEvent],
        patterns: List[LearnedPattern],
        current_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Predict risk of symptom occurrence based on learned patterns.
        
        Args:
            events: Historical health events
            patterns: Learned patterns
            current_context: Current user context (time, feeling, etc.)
            
        Returns:
            List of risk predictions with probabilities
        """
        predictions = []
        
        try:
            current_time = current_context.get("time", datetime.now())
            current_feeling = current_context.get("feeling")
            
            # Check each active pattern
            for pattern in patterns:
                if not pattern.is_active:
                    continue
                
                risk_score = 0.0
                matching_factors = []
                
                # Temporal pattern matching
                if pattern.pattern_type == "temporal" or pattern.seasonality:
                    if self._matches_temporal_pattern(pattern, current_time):
                        risk_score += pattern.confidence_score
                        matching_factors.append(f"Time matches pattern: {pattern.cause}")
                
                # Feeling state matching
                if pattern.pattern_type == "correlation" and current_feeling:
                    if current_feeling.lower() in pattern.cause.lower():
                        risk_score += pattern.confidence_score
                        matching_factors.append(f"Feeling state matches: {current_feeling}")
                
                # If we have a risk prediction
                if risk_score > 50.0:
                    predictions.append({
                        "predicted_condition": pattern.effect,
                        "risk_score": min(risk_score, 95.0),
                        "timeframe": pattern.time_lag or "soon",
                        "confidence": pattern.confidence_score,
                        "matching_factors": matching_factors,
                        "pattern_id": pattern.id
                    })
            
            # Sort by risk score
            predictions.sort(key=lambda p: p["risk_score"], reverse=True)
            
            return predictions[:5]  # Top 5 risks
            
        except Exception as e:
            logger.error(f"Error predicting symptom risk: {e}")
            return []
    
    def _matches_temporal_pattern(
        self,
        pattern: LearnedPattern,
        current_time: datetime
    ) -> bool:
        """Check if current time matches a temporal pattern."""
        try:
            if "Monday" in pattern.cause and current_time.weekday() == 0:
                return True
            if "Tuesday" in pattern.cause and current_time.weekday() == 1:
                return True
            if "Wednesday" in pattern.cause and current_time.weekday() == 2:
                return True
            if "Thursday" in pattern.cause and current_time.weekday() == 3:
                return True
            if "Friday" in pattern.cause and current_time.weekday() == 4:
                return True
            if "Saturday" in pattern.cause and current_time.weekday() == 5:
                return True
            if "Sunday" in pattern.cause and current_time.weekday() == 6:
                return True
            
            # Check time of day
            hour = current_time.hour
            if "Morning" in pattern.cause and 5 <= hour < 12:
                return True
            if "Afternoon" in pattern.cause and 12 <= hour < 17:
                return True
            if "Evening" in pattern.cause and 17 <= hour < 21:
                return True
            if "Night" in pattern.cause and (hour >= 21 or hour < 5):
                return True
            
            # Check month/season
            month = current_time.month
            if pattern.seasonality == "annual":
                # Extract month from cause if present
                month_names = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ]
                for i, month_name in enumerate(month_names, 1):
                    if month_name in pattern.cause and month == i:
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error matching temporal pattern: {e}")
            return False
    
    def generate_health_insights(
        self,
        events: List[HealthEvent],
        patterns: List[LearnedPattern]
    ) -> List[Dict[str, Any]]:
        """
        Generate high-level health insights from events and patterns.
        
        Args:
            events: Health events
            patterns: Learned patterns
            
        Returns:
            List of actionable insights
        """
        insights = []
        
        try:
            # Find protective factors (things that help)
            protective = [p for p in patterns if p.effect_direction == "positive"]
            if protective:
                for pattern in protective[:3]:  # Top 3
                    insights.append({
                        "insight_type": "protective_factor",
                        "category": pattern.category,
                        "title": f"{pattern.cause} improves your health",
                        "description": f"Your digital twin learned that {pattern.cause.lower()} leads to {pattern.effect.lower()}. Confidence: {pattern.confidence_score:.0f}%",
                        "confidence_level": pattern.confidence_score,
                        "evidence_strength": self._get_evidence_strength(pattern.confidence_score),
                        "data_points_used": pattern.evidence_count,
                        "health_impact": "positive",
                        "impact_score": pattern.effect_strength,
                        "is_actionable": True,
                        "suggested_actions": [f"Continue or increase: {pattern.cause}"],
                        "priority": 8
                    })
            
            # Find risk factors (things that hurt)
            risk_factors = [p for p in patterns if p.effect_direction == "negative" and p.confidence_score > 70]
            if risk_factors:
                for pattern in risk_factors[:3]:  # Top 3
                    insights.append({
                        "insight_type": "risk_factor",
                        "category": pattern.category,
                        "title": f"{pattern.cause} may trigger symptoms",
                        "description": f"Your twin noticed that {pattern.cause.lower()} often leads to {pattern.effect.lower()}. Observed {pattern.evidence_count} times with {pattern.confidence_score:.0f}% confidence.",
                        "confidence_level": pattern.confidence_score,
                        "evidence_strength": self._get_evidence_strength(pattern.confidence_score),
                        "data_points_used": pattern.evidence_count,
                        "health_impact": "negative",
                        "impact_score": pattern.effect_strength,
                        "is_actionable": True,
                        "suggested_actions": [f"Try to avoid: {pattern.cause}", "Track if avoiding this helps"],
                        "priority": 9,
                        "is_highlighted": True
                    })
            
            # Overall health trend
            if len(events) >= 10:
                trend_insight = self._get_overall_trend_insight(events)
                if trend_insight:
                    insights.append(trend_insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating health insights: {e}")
            return []
    
    def _get_evidence_strength(self, confidence: float) -> str:
        """Convert confidence score to evidence strength label."""
        if confidence >= 85:
            return "strong"
        elif confidence >= 70:
            return "moderate"
        else:
            return "weak"
    
    def _get_overall_trend_insight(
        self,
        events: List[HealthEvent]
    ) -> Optional[Dict[str, Any]]:
        """Generate insight about overall health trend."""
        try:
            sorted_events = sorted(events, key=lambda e: e.event_date)
            recent_events = sorted_events[-10:]  # Last 10 events
            older_events = sorted_events[:10]  # First 10 events
            
            recent_avg_severity = np.mean([e.severity for e in recent_events if e.severity is not None] or [5])
            older_avg_severity = np.mean([e.severity for e in older_events if e.severity is not None] or [5])
            
            change = older_avg_severity - recent_avg_severity
            
            if change > 1.0:  # Improving
                return {
                    "insight_type": "health_pattern",
                    "category": "overall_health",
                    "title": "Your health is improving!",
                    "description": f"Your symptom severity has decreased by {change:.1f} points on average over time. The interventions and lifestyle changes you've made are working.",
                    "confidence_level": 80.0,
                    "evidence_strength": "strong",
                    "data_points_used": len(events),
                    "health_impact": "positive",
                    "impact_score": change,
                    "is_actionable": True,
                    "suggested_actions": ["Keep up your current health practices", "Continue tracking to maintain progress"],
                    "priority": 10,
                    "is_highlighted": True
                }
            elif change < -1.0:  # Worsening
                return {
                    "insight_type": "health_pattern",
                    "category": "overall_health",
                    "title": "Health trend needs attention",
                    "description": f"Your symptom severity has increased by {abs(change):.1f} points on average. Consider consulting a healthcare provider to review your treatment plan.",
                    "confidence_level": 80.0,
                    "evidence_strength": "strong",
                    "data_points_used": len(events),
                    "health_impact": "negative",
                    "impact_score": abs(change),
                    "is_actionable": True,
                    "suggested_actions": ["Schedule a healthcare consultation", "Review recent lifestyle changes"],
                    "priority": 10,
                    "is_highlighted": True
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting overall trend insight: {e}")
            return None
