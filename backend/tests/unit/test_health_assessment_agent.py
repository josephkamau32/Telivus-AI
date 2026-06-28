"""
Unit Tests for Health Assessment Agent

Tests the LangChain-based health assessment agent functionality.
These tests are skipped if langchain dependencies are not properly installed.
"""
import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock

# Guard against langchain import errors (version conflicts)
try:
    from app.agents.health_assessment_agent import (
        HealthAssessmentAgent,
        SymptomValidationTool,
    )
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False

pytestmark = pytest.mark.skipif(
    not HAS_LANGCHAIN,
    reason="langchain dependencies not available or have version conflicts",
)


@pytest.fixture
def sample_health_assessment_data():
    return {
        "symptoms": ["headache", "fever"],
        "age": 30,
        "gender": "male",
        "medical_history": {
            "past_medical_conditions": "None",
            "current_medications": "None",
        },
        "allergies": [],
    }


@pytest.fixture
def sample_agent_response():
    return json.dumps({
        "chief_complaint": "Headache and fever",
        "history_present_illness": "Patient reports 2 days of headache.",
        "assessment": "Likely viral infection.",
        "diagnostic_plan": {
            "consultations": [],
            "tests": [],
            "red_flags": ["Severe headache"],
            "follow_up": "In 3 days",
        },
        "otc_recommendations": [
            {
                "medicine": "Acetaminophen",
                "dosage": "500mg",
                "purpose": "Pain relief",
                "instructions": "Take every 6 hours",
                "precautions": "Do not exceed 4000mg/day",
                "max_duration": "3 days",
            }
        ],
        "lifestyle_recommendations": ["Rest", "Hydrate"],
        "when_to_seek_help": "If fever exceeds 103F",
        "reasoning_graph": {
            "nodes": [],
            "edges": [],
            "root_symptoms": [],
            "triage_level": "routine",
            "reasoning_summary": "Test",
        },
    })


@pytest.mark.asyncio
async def test_health_assessment_agent_process_request(
    sample_health_assessment_data, sample_agent_response
):
    agent = HealthAssessmentAgent()

    with patch.object(agent, 'validate_health_context', new_callable=AsyncMock) as mock_validate, \
         patch.object(agent, '_execute_agent', new_callable=AsyncMock) as mock_execute:

        mock_validate.return_value = True
        mock_execute.return_value = sample_agent_response

        result = await agent.process_request(sample_health_assessment_data)

        assert "assessment" in result
        assert result["generated_by"] == "HealthAssessmentAgent"
        mock_execute.assert_called_once()


@pytest.mark.asyncio
async def test_health_assessment_agent_process_request_invalid(
    sample_health_assessment_data,
):
    agent = HealthAssessmentAgent()

    with patch.object(agent, 'validate_health_context', new_callable=AsyncMock) as mock_validate:
        mock_validate.return_value = False

        result = await agent.process_request(sample_health_assessment_data)

        assert "error" in result
        assert result["error"] == "Invalid health assessment data provided"


@pytest.mark.asyncio
async def test_symptom_validator_tool():
    tool = SymptomValidationTool()

    # Valid symptom
    result1 = tool._run("fever, headache")
    assert "Validated symptoms" in result1
    assert "fever" in result1

    # Invalid symptom
    result2 = tool._run("fever, some_unknown_symptom")
    assert "Unrecognized symptoms" in result2
    assert "some_unknown_symptom" in result2
