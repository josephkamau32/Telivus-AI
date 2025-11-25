"""
Consultation Agent for real-time health advice and chat.

Provides conversational AI health consultations with memory and context awareness.
"""

from typing import Dict, List, Any, Optional
import logging

from langchain.tools import BaseTool
from langchain.memory import ConversationBufferWindowMemory

from app.agents.base_agent import BaseHealthAgent
from app.services.vector_store import vector_store_service
from app.core.logging import get_logger

# Get logger
logger = get_logger(__name__)


class HealthKnowledgeTool(BaseTool):
    """Tool for retrieving health information during consultation."""

    name = "health_information_search"
    description = "Search for relevant health information and advice"

    def _run(self, query: str) -> str:
        """Search health knowledge base."""
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            results = loop.run_until_complete(
                vector_store_service.search_medical_knowledge(query, top_k=2)
            )

            if results:
                info = "\n".join([f"- {doc['content'][:200]}..." for doc in results])
                return f"Relevant health information:\n{info}"
            else:
                return "General health advice: Consult healthcare professionals for personalized recommendations."

        except Exception as e:
            logger.error(f"Error retrieving health information: {e}")
            return "Unable to retrieve specific health information."

    async def _arun(self, query: str) -> str:
        """Async version of health information search."""
        try:
            results = await vector_store_service.search_medical_knowledge(query, top_k=2)

            if results:
                info = "\n".join([f"- {doc['content'][:200]}..." for doc in results])
                return f"Relevant health information:\n{info}"
            else:
                return "General health advice: Consult healthcare professionals for personalized recommendations."

        except Exception as e:
            logger.error(f"Error retrieving health information: {e}")
            return "Unable to retrieve specific health information."


class EmergencyAssessmentTool(BaseTool):
    """Tool for assessing if symptoms require immediate attention."""

    name = "emergency_assessment"
    description = "Assess if symptoms indicate a medical emergency"

    def _run(self, symptoms_description: str) -> str:
        """Assess emergency level of symptoms."""
        emergency_keywords = [
            'chest pain', 'difficulty breathing', 'shortness of breath',
            'severe headache', 'confusion', 'fainting', 'unconscious',
            'severe bleeding', 'broken bone', 'high fever', 'seizure'
        ]

        urgent_keywords = [
            'persistent vomiting', 'severe abdominal pain', 'sudden vision changes',
            'severe dizziness', 'uncontrolled bleeding', 'deep cuts'
        ]

        symptoms_lower = symptoms_description.lower()

        # Check for emergency symptoms
        if any(keyword in symptoms_lower for keyword in emergency_keywords):
            return "EMERGENCY: These symptoms may indicate a serious medical condition requiring immediate attention. Call emergency services (911) or go to the nearest emergency room immediately."

        # Check for urgent symptoms
        if any(keyword in symptoms_lower for keyword in urgent_keywords):
            return "URGENT: These symptoms require prompt medical attention. Contact your healthcare provider or visit an urgent care center within the next few hours."

        return "ROUTINE: These symptoms appear manageable at home, but monitor closely. Contact a healthcare provider if symptoms worsen or persist."

    async def _arun(self, symptoms_description: str) -> str:
        """Async version of emergency assessment."""
        return self._run(symptoms_description)


class ConsultationAgent(BaseHealthAgent):
    """
    Specialized agent for real-time health consultations.

    Provides conversational health advice with context awareness,
    emergency assessment, and personalized recommendations.
    """

    def __init__(self):
        """Initialize the consultation agent."""
        # Define system prompt for health consultation
        system_prompt = """
        You are Telivus AI, a compassionate and knowledgeable health assistant.
        Your role is to provide supportive, evidence-based health information and guidance.

        CORE PRINCIPLES:
        1. Always prioritize patient safety and encourage professional medical care
        2. Use the health_information_search tool for accurate information
        3. Use emergency_assessment tool for any new symptom discussions
        4. Maintain conversation context and remember previous discussions
        5. Be empathetic, supportive, and non-judgmental
        6. Provide practical, actionable advice
        7. Clearly state limitations of AI health advice

        CONSULTATION GUIDELINES:
        - Ask clarifying questions when symptoms are unclear
        - Provide general health education and wellness tips
        - Suggest when to seek professional medical care
        - Respect cultural and personal health beliefs
        - Encourage healthy lifestyle choices
        - Direct to appropriate resources when needed

        EMERGENCY PROTOCOL:
        - Always assess for red flag symptoms
        - Direct to emergency services when appropriate
        - Never minimize serious symptoms
        - Advise calling healthcare providers for urgent concerns

        LIMITATIONS:
        - Cannot diagnose medical conditions
        - Cannot prescribe medications
        - Cannot replace professional medical care
        - Information is general and not personalized medical advice

        RESPONSE STYLE:
        - Warm and approachable
        - Clear and easy to understand
        - Structured when providing multiple recommendations
        - End with appropriate follow-up questions or advice
        """

        # Initialize tools
        tools = [
            HealthKnowledgeTool(),
            EmergencyAssessmentTool()
        ]

        super().__init__(
            agent_name="ConsultationAgent",
            system_prompt=system_prompt,
            tools=tools,
            memory_window=20  # Keep longer conversation history
        )

    async def process_request(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a consultation request.

        Args:
            input_data: Consultation request data

        Returns:
            Dict containing the consultation response
        """
        try:
            user_message = input_data.get('message', '')
            context = input_data.get('context', {})

            if not user_message:
                return {
                    "error": "No message provided",
                    "response": "Hello! How can I help you with your health questions today?"
                }

            # Add context to the message if available
            enhanced_message = user_message
            if context:
                context_str = f"Context: Age {context.get('age', 'unknown')}, "
                if context.get('recent_symptoms'):
                    context_str += f"Recent symptoms: {', '.join(context.get('recent_symptoms', []))}"
                enhanced_message = f"{context_str}\n\nUser: {user_message}"

            # Execute agent
            response = await self._execute_agent(enhanced_message)

            # Store in memory
            self.add_to_memory(user_message, response)

            logger.info("Consultation response generated successfully")

            return {
                "response": response,
                "agent": "ConsultationAgent",
                "conversation_context": self.get_memory_summary()
            }

        except Exception as e:
            logger.error(f"Error in consultation: {e}")
            return {
                "error": "Consultation failed",
                "response": "I apologize, but I'm having trouble processing your request right now. Please try again or contact a healthcare professional for urgent concerns."
            }

    async def assess_emergency(self, symptoms: str, age: int, context: str = "") -> Dict[str, Any]:
        """
        Assess if symptoms require emergency attention.

        Args:
            symptoms: Description of symptoms
            age: Patient age
            context: Additional context

        Returns:
            Dict containing emergency assessment
        """
        try:
            assessment_prompt = f"""
            Assess the following symptoms for emergency level:

            Patient Age: {age}
            Symptoms: {symptoms}
            Additional Context: {context}

            Please evaluate if these symptoms require immediate medical attention.
            Consider age, symptom severity, and progression.
            """

            response = await self._execute_agent(assessment_prompt)

            # Determine urgency level from response
            response_lower = response.lower()
            if any(word in response_lower for word in ['emergency', 'immediate', 'urgent', '911', 'call ambulance']):
                urgency = 'emergency'
            elif any(word in response_lower for word in ['urgent', 'soon', 'prompt']):
                urgency = 'urgent'
            else:
                urgency = 'routine'

            return {
                "assessment": response,
                "urgency_level": urgency,
                "recommendations": self._get_urgency_recommendations(urgency)
            }

        except Exception as e:
            logger.error(f"Error in emergency assessment: {e}")
            return {
                "assessment": "Unable to assess emergency level",
                "urgency_level": "unknown",
                "recommendations": ["Please consult a healthcare professional immediately"]
            }

    def _get_urgency_recommendations(self, urgency: str) -> List[str]:
        """Get recommendations based on urgency level."""
        recommendations = {
            "emergency": [
                "Call emergency services (911) immediately",
                "Go to the nearest emergency room",
                "Do not wait for symptoms to worsen"
            ],
            "urgent": [
                "Contact your healthcare provider within the next few hours",
                "Visit an urgent care center",
                "Monitor symptoms closely"
            ],
            "routine": [
                "Schedule an appointment with your healthcare provider",
                "Monitor symptoms and track any changes",
                "Practice self-care measures at home"
            ]
        }
        return recommendations.get(urgency, recommendations["routine"])

    async def get_follow_up_questions(self, symptoms: List[str], assessment: str) -> List[str]:
        """
        Generate relevant follow-up questions based on symptoms and assessment.

        Args:
            symptoms: List of reported symptoms
            assessment: Current assessment

        Returns:
            List of follow-up questions
        """
        try:
            question_prompt = f"""
            Based on these symptoms: {', '.join(symptoms)}

            And this assessment: {assessment[:200]}...

            Generate 3-5 relevant follow-up questions to better understand the patient's condition.
            Focus on symptom duration, severity, associated factors, and relevant medical history.
            Return as a numbered list.
            """

            response = await self._execute_agent(question_prompt)

            # Parse questions from response
            lines = response.strip().split('\n')
            questions = [line.strip() for line in lines if line.strip() and
                        (line.startswith(('1.', '2.', '3.', '4.', '5.', '-')) or
                         '?' in line)]

            return questions[:5]  # Limit to 5 questions

        except Exception as e:
            logger.error(f"Error generating follow-up questions: {e}")
            return [
                "How long have you been experiencing these symptoms?",
                "On a scale of 1-10, how severe are your symptoms?",
                "Are there any factors that make your symptoms better or worse?"
            ]