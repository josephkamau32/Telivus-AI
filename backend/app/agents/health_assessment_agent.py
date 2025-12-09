"""
Health Assessment Agent for generating comprehensive medical reports.

Uses LangChain agents with medical knowledge RAG to provide detailed health assessments.
"""

from typing import Dict, List, Any, Optional
import json
import logging

from langchain.tools import BaseTool
from langchain.schema import Document

from app.agents.base_agent import BaseHealthAgent
from app.services.vector_store import vector_store_service
from app.models.health import (
    HealthAssessmentRequest,
    MedicalAssessment,
    OTCRecommendation,
    DiagnosticPlan
)
from app.core.logging import get_logger

# Get logger
logger = get_logger(__name__)


class MedicalKnowledgeTool(BaseTool):
    """Tool for retrieving medical knowledge from vector store."""

    name = "medical_knowledge_search"
    description = "Search medical knowledge base for relevant health information"

    def _run(self, query: str) -> str:
        """Search medical knowledge base."""
        try:
            # This would be async in a real implementation
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            results = loop.run_until_complete(
                vector_store_service.search_medical_knowledge(query, top_k=3)
            )

            if results:
                knowledge = "\n\n".join([doc['content'] for doc in results])
                return f"Relevant medical knowledge:\n{knowledge}"
            else:
                return "No specific medical knowledge found for this query."

        except Exception as e:
            logger.error(f"Error searching medical knowledge: {e}")
            return "Unable to retrieve medical knowledge at this time."

    async def _arun(self, query: str) -> str:
        """Async version of medical knowledge search."""
        try:
            results = await vector_store_service.search_medical_knowledge(query, top_k=3)

            if results:
                knowledge = "\n\n".join([doc['content'] for doc in results])
                return f"Relevant medical knowledge:\n{knowledge}"
            else:
                return "No specific medical knowledge found for this query."

        except Exception as e:
            logger.error(f"Error searching medical knowledge: {e}")
            return "Unable to retrieve medical knowledge at this time."


class SymptomValidationTool(BaseTool):
    """Tool for validating and normalizing symptoms."""

    name = "symptom_validator"
    description = "Validate and normalize reported symptoms"

    def _run(self, symptoms_text: str) -> str:
        """Validate symptoms."""
        # Basic symptom validation logic
        common_symptoms = [
            'fever', 'headache', 'cough', 'nausea', 'fatigue', 'pain',
            'dizziness', 'rash', 'sore throat', 'chest pain', 'shortness of breath'
        ]

        symptoms = [s.strip().lower() for s in symptoms_text.split(',')]
        validated = []
        invalid = []

        for symptom in symptoms:
            if any(common in symptom for common in common_symptoms):
                validated.append(symptom)
            else:
                invalid.append(symptom)

        result = f"Validated symptoms: {', '.join(validated)}"
        if invalid:
            result += f"\nUnrecognized symptoms (may need clarification): {', '.join(invalid)}"

        return result

    async def _arun(self, symptoms_text: str) -> str:
        """Async version of symptom validation."""
        return self._run(symptoms_text)


class HealthAssessmentAgent(BaseHealthAgent):
    """
    Specialized agent for generating comprehensive health assessments.

    Uses medical knowledge RAG and structured assessment tools to provide
    detailed medical reports with diagnoses, recommendations, and OTC suggestions.
    """

    def __init__(self):
        """Initialize the health assessment agent."""
        # Define system prompt for medical assessment
        system_prompt = """
        You are Dr. Telivus, an experienced AI physician with 20+ years of medical practice.
        Your role is to provide comprehensive health assessments based on patient symptoms and history.

        CRITICAL GUIDELINES:
        1. ALWAYS use the medical_knowledge_search tool to gather relevant medical information
        2. Validate symptoms using the symptom_validator tool before assessment
        3. Provide evidence-based assessments with clear reasoning
        4. Include differential diagnoses when appropriate
        5. Recommend appropriate diagnostic tests and consultations
        6. Suggest FDA-approved OTC medications only
        7. Always emphasize when to seek immediate medical attention
        8. Be empathetic and supportive in your communication
        9. Clearly state limitations of AI medical assessment

        ASSESSMENT STRUCTURE:
        - Chief complaint summary
        - History of present illness
        - Medical assessment with differentials
        - Diagnostic plan (tests, consultations, red flags)
        - Treatment recommendations (OTC only)
        - Lifestyle and follow-up advice
        - When to seek immediate help

        IMPORTANT: You are NOT a replacement for professional medical care.
        Always advise consulting qualified healthcare providers.
        """

        # Initialize tools
        tools = [
            MedicalKnowledgeTool(),
            SymptomValidationTool()
        ]

        super().__init__(
            agent_name="HealthAssessmentAgent",
            system_prompt=system_prompt,
            tools=tools,
            memory_window=5  # Limited memory for assessments
        )

    async def process_request(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a health assessment request.

        Args:
            input_data: Health assessment request data

        Returns:
            Dict containing the medical assessment
        """
        try:
            # Validate input
            if not await self.validate_health_context(input_data):
                return {
                    "error": "Invalid health assessment data provided",
                    "message": "Please ensure all required fields are present and valid"
                }

            # Extract key information
            symptoms = input_data.get('symptoms', [])
            age = input_data.get('age', 0)
            gender = input_data.get('gender', 'not specified')
            medical_history = input_data.get('medical_history', {})
            allergies = input_data.get('allergies', [])

            # Format input for agent
            assessment_prompt = f"""
            Please provide a comprehensive health assessment for:

            Patient Profile:
            - Age: {age} years old
            - Gender: {gender}
            - Symptoms: {', '.join(symptoms) if symptoms else 'None reported'}

            Medical History:
            - Past conditions: {medical_history.get('past_medical_conditions', 'None reported')}
            - Previous surgeries: {medical_history.get('past_surgical_history', 'None reported')}
            - Current medications: {medical_history.get('current_medications', 'None reported')}
            - Allergies: {', '.join(allergies) if allergies else 'None reported'}

            CRITICAL: You must generate an explainable reasoning graph showing how you arrived at your conclusions.

            Please structure your assessment as a JSON object with the following fields:
            {{
                "chief_complaint": "Primary symptoms summary",
                "history_present_illness": "Detailed HPI (3-4 sentences)",
                "assessment": "Diagnosis + 2 differentials + reasoning (4-5 sentences)",
                "diagnostic_plan": {{
                    "consultations": ["Recommended specialists"],
                    "tests": ["Recommended diagnostic tests"],
                    "red_flags": ["Symptoms requiring immediate attention"],
                    "follow_up": "Follow-up recommendations"
                }},
                "otc_recommendations": [
                    {{
                        "medicine": "Generic (Brand)",
                        "dosage": "Age-appropriate dosage",
                        "purpose": "What it treats",
                        "instructions": "How/when to take",
                        "precautions": "Warnings, interactions",
                        "max_duration": "Maximum days to use"
                    }}
                ],
                "lifestyle_recommendations": ["Self-care advice"],
                "when_to_seek_help": "When to seek immediate medical attention",
                "reasoning_graph": {{
                    "nodes": [
                        {{
                            "id": "symptom_1",
                            "type": "symptom",
                            "label": "Fever",
                            "description": "Patient reports fever of 101°F",
                            "confidence_score": 0.95,
                            "evidence_sources": ["patient_report"],
                            "metadata": {{"severity": "moderate"}}
                        }},
                        {{
                            "id": "condition_1",
                            "type": "condition",
                            "label": "Viral Infection",
                            "description": "Common cause of fever with respiratory symptoms",
                            "confidence_score": 0.75,
                            "evidence_sources": ["medical_knowledge_base", "epidemiology"],
                            "metadata": {{"icd_code": "J06.9"}}
                        }}
                    ],
                    "edges": [
                        {{
                            "source_id": "symptom_1",
                            "target_id": "condition_1",
                            "relationship_type": "supports",
                            "strength": 0.8,
                            "explanation": "Fever is a common symptom of viral infections"
                        }}
                    ],
                    "root_symptoms": ["symptom_1"],
                    "final_diagnosis": "condition_1",
                    "triage_level": "routine",
                    "reasoning_summary": "Based on reported symptoms and medical knowledge, viral infection is the most likely cause"
                }}
            }}

            REASONING GRAPH REQUIREMENTS:
            1. Create nodes for each reported symptom (type: "symptom")
            2. Create nodes for possible conditions/diagnoses (type: "condition")
            3. Create nodes for risk factors or contributing factors (type: "factor")
            4. Create edges showing relationships between symptoms and conditions
            5. Include confidence scores based on medical knowledge and symptom patterns
            6. Set triage_level to: "emergency" (immediate ER), "urgent" (see doctor today), "routine" (see doctor within week)
            7. Provide evidence_sources for each conclusion
            """

            # Execute agent
            response = await self._execute_agent(assessment_prompt)

            # Parse JSON response
            try:
                assessment_data = json.loads(response)
                logger.info("Successfully generated health assessment with reasoning graph")

                # Validate reasoning graph structure if present
                if "reasoning_graph" in assessment_data:
                    graph = assessment_data["reasoning_graph"]
                    # Ensure required fields exist
                    if "nodes" not in graph:
                        graph["nodes"] = []
                    if "edges" not in graph:
                        graph["edges"] = []
                    if "root_symptoms" not in graph:
                        graph["root_symptoms"] = []
                    if "triage_level" not in graph:
                        graph["triage_level"] = "routine"
                    if "reasoning_summary" not in graph:
                        graph["reasoning_summary"] = "Assessment completed with AI reasoning"

                return {
                    "assessment": assessment_data,
                    "confidence_score": 0.85,  # Placeholder confidence score
                    "generated_by": "HealthAssessmentAgent"
                }

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse assessment JSON: {e}")
                return {
                    "error": "Failed to generate structured assessment",
                    "raw_response": response,
                    "message": "Assessment generated but could not be structured properly"
                }

        except Exception as e:
            logger.error(f"Error in health assessment: {e}")
            return {
                "error": "Assessment failed",
                "message": "Unable to complete health assessment. Please try again."
            }

    async def generate_medical_report(
        self,
        assessment_request: HealthAssessmentRequest
    ) -> MedicalAssessment:
        """
        Generate a complete medical assessment from request data.

        Args:
            assessment_request: Structured health assessment request

        Returns:
            MedicalAssessment: Complete medical assessment
        """
        # Convert request to dict for processing
        request_data = assessment_request.dict()

        # Process assessment
        result = await self.process_request(request_data)

        if "error" in result:
            # Return basic assessment on error
            return MedicalAssessment(
                chief_complaint="Assessment could not be completed",
                history_present_illness="Please consult a healthcare provider for proper evaluation",
                assessment="Unable to generate assessment due to technical issues",
                diagnostic_plan=DiagnosticPlan(),
                otc_recommendations=[],
                lifestyle_recommendations=["Please seek professional medical care"],
                when_to_seek_help="Contact a healthcare provider as soon as possible"
            )

        assessment_data = result["assessment"]

        # Build diagnostic plan
        diagnostic_plan_data = assessment_data.get("diagnostic_plan", {})
        diagnostic_plan = DiagnosticPlan(
            consultations=diagnostic_plan_data.get("consultations", []),
            tests=diagnostic_plan_data.get("tests", []),
            red_flags=diagnostic_plan_data.get("red_flags", []),
            follow_up=diagnostic_plan_data.get("follow_up", "")
        )

        # Build OTC recommendations
        otc_data = assessment_data.get("otc_recommendations", [])
        otc_recommendations = []
        for otc in otc_data:
            if isinstance(otc, dict):
                otc_recommendations.append(OTCRecommendation(**otc))

        # Build reasoning graph if present
        reasoning_graph = None
        if "reasoning_graph" in assessment_data:
            from app.models.health import ReasoningGraph
            try:
                reasoning_graph = ReasoningGraph(**assessment_data["reasoning_graph"])
            except Exception as e:
                logger.warning(f"Failed to parse reasoning graph: {e}")
                reasoning_graph = None

        return MedicalAssessment(
            chief_complaint=assessment_data.get("chief_complaint", ""),
            history_present_illness=assessment_data.get("history_present_illness", ""),
            assessment=assessment_data.get("assessment", ""),
            diagnostic_plan=diagnostic_plan,
            otc_recommendations=otc_recommendations,
            lifestyle_recommendations=assessment_data.get("lifestyle_recommendations", []),
            when_to_seek_help=assessment_data.get("when_to_seek_help", ""),
            reasoning_graph=reasoning_graph
        )