"""
Confidence Engine for Clinical Confidence & Explainability Engine (CCEE).

Calculates confidence scores using a weighted, deterministic formula based on:
- Data completeness (30%)
- Symptom signal strength (25%)
- RAG retrieval relevance (25%)
- Agent agreement (10%)
- Model consistency (10%)
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from app.models.health import HealthAssessmentRequest
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ConfidenceBreakdownData:
    """Detailed breakdown of confidence score components."""
    data_completeness: float  # 0.0-1.0
    symptom_signal_strength: float  # 0.0-1.0
    rag_relevance: float  # 0.0-1.0
    agent_agreement: float  # 0.0-1.0
    model_consistency: float  # 0.0-1.0
    overall_score: float  # 0.0-1.0
    level: str  # "low", "medium", "high"


class ConfidenceEngine:
    """
    Calculates confidence scores for AI health assessments.
    
    Uses a weighted, explainable formula that is deterministic and testable.
    No black-box ML - all calculations are transparent and auditable.
    """
    
    # Weights for confidence calculation
    WEIGHT_DATA_COMPLETENESS = 0.30
    WEIGHT_SYMPTOM_SIGNAL = 0.25
    WEIGHT_RAG_RELEVANCE = 0.25
    WEIGHT_AGENT_AGREEMENT = 0.10
    WEIGHT_MODEL_CONSISTENCY = 0.10
    
    def calculate_confidence_score(
        self,
        request: HealthAssessmentRequest,
        assessment_data: Dict[str, Any],
        rag_results: Optional[List[Dict[str, Any]]] = None,
        emergency_check: Optional[Dict[str, Any]] = None
    ) -> ConfidenceBreakdownData:
        """
        Calculate overall confidence score with detailed breakdown.
        
        Args:
            request: The original health assessment request
            assessment_data: Generated assessment data from AI
            rag_results: RAG retrieval results (optional)
            emergency_check: Emergency assessment results (optional)
            
        Returns:
            ConfidenceBreakdownData with overall score and component breakdown
        """
        try:
            # Calculate individual components
            data_completeness = self._calculate_data_completeness(request)
            symptom_signal = self._calculate_symptom_signal_strength(
                request.symptom_assessment.symptoms,
                getattr(request.symptom_assessment, 'severity', None),
                getattr(request.symptom_assessment, 'duration', None)
            )
            rag_relevance = self._calculate_rag_relevance(rag_results)
            agent_agreement = self._calculate_agent_agreement(assessment_data, emergency_check)
            model_consistency = self._calculate_model_consistency(assessment_data)
            
            # Calculate weighted overall score
            overall_score = (
                self.WEIGHT_DATA_COMPLETENESS * data_completeness +
                self.WEIGHT_SYMPTOM_SIGNAL * symptom_signal +
                self.WEIGHT_RAG_RELEVANCE * rag_relevance +
                self.WEIGHT_AGENT_AGREEMENT * agent_agreement +
                self.WEIGHT_MODEL_CONSISTENCY * model_consistency
            )
            
            # Determine confidence level
            if overall_score >= 0.80:
                level = "high"
            elif overall_score >= 0.60:
                level = "medium"
            else:
                level = "low"
            
            logger.info(
                f"Confidence calculated: {overall_score:.2f} ({level})",
                extra={
                    "data_completeness": f"{data_completeness:.2f}",
                    "symptom_signal": f"{symptom_signal:.2f}",
                    "rag_relevance": f"{rag_relevance:.2f}",
                    "agent_agreement": f"{agent_agreement:.2f}",
                    "model_consistency": f"{model_consistency:.2f}"
                }
            )
            
            return ConfidenceBreakdownData(
                data_completeness=data_completeness,
                symptom_signal_strength=symptom_signal,
                rag_relevance=rag_relevance,
                agent_agreement=agent_agreement,
                model_consistency=model_consistency,
                overall_score=overall_score,
                level=level
            )
            
        except Exception as e:
            logger.error(f"Error calculating confidence score: {e}", exc_info=True)
            # Return conservative fallback
            return ConfidenceBreakdownData(
                data_completeness=0.5,
                symptom_signal_strength=0.5,
                rag_relevance=0.5,
                agent_agreement=0.5,
                model_consistency=0.5,
                overall_score=0.5,
                level="medium"
            )
    
    def _calculate_data_completeness(self, request: HealthAssessmentRequest) -> float:
        """
        Calculate data completeness score (0.0-1.0).
        
        Components:
        - Age provided: +0.2
        - Gender provided: +0.1
        - Medical history provided: +0.3
        - Symptom severity provided: +0.2
        - Symptom duration provided: +0.2
        """
        score = 0.0
        
        # Age is always required, so it's always present
        score += 0.2
        
        # Gender
        if request.patient_info.gender:
            score += 0.1
        
        # Medical history
        if request.medical_history:
            history = request.medical_history
            if (history.past_medical_conditions or 
                history.current_medications or 
                history.allergies):
                score += 0.3
        
        # Symptom severity
        if hasattr(request.symptom_assessment, 'severity') and request.symptom_assessment.severity:
            if len(request.symptom_assessment.severity) > 0:
                score += 0.2
        
        # Symptom duration
        if hasattr(request.symptom_assessment, 'duration') and request.symptom_assessment.duration:
            if len(request.symptom_assessment.duration) > 0:
                score += 0.2
        
        return min(score, 1.0)
    
    def _calculate_symptom_signal_strength(
        self,
        symptoms: List[str],
        severity: Optional[Dict[str, int]],
        duration: Optional[Dict[str, str]]
    ) -> float:
        """
        Calculate symptom signal strength (0.0-1.0).
        
        Components:
        - Number of symptoms: 0.3 × min(count / 5, 1.0)
        - Average severity: 0.4 × (avg_severity / 10)
        - Duration specificity: 0.3 × (has_duration ? 1.0 : 0.5)
        """
        if not symptoms:
            return 0.0
        
        # Number of symptoms (more symptoms = better signal, up to 5)
        symptom_count_score = 0.3 * min(len(symptoms) / 5.0, 1.0)
        
        # Average severity
        severity_score = 0.0
        if severity and len(severity) > 0:
            avg_severity = sum(severity.values()) / len(severity)
            severity_score = 0.4 * (avg_severity / 10.0)
        else:
            # No severity data - assume medium (5/10)
            severity_score = 0.4 * 0.5
        
        # Duration specificity
        duration_score = 0.0
        if duration and len(duration) > 0:
            duration_score = 0.3 * 1.0
        else:
            duration_score = 0.3 * 0.5
        
        return min(symptom_count_score + severity_score + duration_score, 1.0)
    
    def _calculate_rag_relevance(self, rag_results: Optional[List[Dict[str, Any]]]) -> float:
        """
        Calculate RAG retrieval relevance (0.0-1.0).
        
        Uses average vector similarity score from top-3 retrievals.
        Defaults to 0.5 if RAG not used.
        """
        if not rag_results or len(rag_results) == 0:
            # No RAG used - return neutral score
            return 0.5
        
        # Extract similarity scores from top-3 results
        similarities = []
        for result in rag_results[:3]:
            # Look for similarity score in metadata or result
            if isinstance(result, dict):
                if 'similarity' in result:
                    similarities.append(result['similarity'])
                elif 'score' in result:
                    similarities.append(result['score'])
                elif 'metadata' in result and isinstance(result['metadata'], dict):
                    if 'similarity' in result['metadata']:
                        similarities.append(result['metadata']['similarity'])
                    elif 'confidence' in result['metadata']:
                        similarities.append(result['metadata']['confidence'])
        
        if not similarities:
            # Couldn't extract scores - assume moderate relevance
            return 0.65
        
        # Return average similarity
        return min(sum(similarities) / len(similarities), 1.0)
    
    def _calculate_agent_agreement(
        self,
        assessment_data: Dict[str, Any],
        emergency_check: Optional[Dict[str, Any]]
    ) -> float:
        """
        Calculate agent agreement score (0.0-1.0).
        
        Compares assessment tone vs emergency check.
        High agreement = 1.0, low agreement = 0.3
        """
        if not emergency_check:
            # No emergency check performed - assume neutral agreement
            return 0.7
        
        # Extract urgency from emergency check
        emergency_level = emergency_check.get('urgency_level', 'routine')
        
        # Extract red flags from assessment
        red_flags = []
        if 'diagnostic_plan' in assessment_data:
            diagnostic_plan = assessment_data['diagnostic_plan']
            if isinstance(diagnostic_plan, dict):
                red_flags = diagnostic_plan.get('red_flags', [])
        
        # Check for agreement
        if emergency_level == 'emergency':
            # Emergency detected - should have red flags
            if red_flags and len(red_flags) > 0:
                return 1.0  # Strong agreement
            else:
                return 0.3  # Disagreement
        elif emergency_level == 'routine':
            # No emergency - should have few/no red flags
            if not red_flags or len(red_flags) == 0:
                return 1.0  # Strong agreement
            elif len(red_flags) <= 2:
                return 0.7  # Moderate agreement (some caution flags OK)
            else:
                return 0.5  # Mild disagreement
        else:
            # Moderate urgency - neutral
            return 0.7
    
    def _calculate_model_consistency(self, assessment_data: Dict[str, Any]) -> float:
        """
        Calculate model consistency score (0.0-1.0).
        
        Checks if AI response contains all required fields.
        Complete response = 1.0, incomplete = 0.6
        """
        required_fields = [
            'chief_complaint',
            'history_present_illness',
            'assessment',
            'diagnostic_plan',
            'otc_recommendations'
        ]
        
        present_fields = sum(1 for field in required_fields if field in assessment_data)
        
        if present_fields == len(required_fields):
            return 1.0  # All fields present
        elif present_fields >= len(required_fields) - 1:
            return 0.9  # One field missing
        elif present_fields >= len(required_fields) - 2:
            return 0.7  # Two fields missing
        else:
            return 0.6  # More than two fields missing
