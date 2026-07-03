"""
Unit Tests for CCEE Explainability Engine

Tests evidence mapping and explanation summary generation:
- Symptom-to-source mapping
- RAG source extraction
- Explanation summary generation
- Edge cases (empty inputs, no RAG results)
"""

import pytest
from app.services.ccee.explainability_engine import (
    ExplainabilityEngine,
    EvidenceItem,
)


class TestEvidenceMapGeneration:
    """Tests for generate_evidence_map."""

    @pytest.fixture
    def engine(self) -> ExplainabilityEngine:
        return ExplainabilityEngine()

    @pytest.mark.unit
    def test_no_rag_results_returns_basic_evidence(self, engine: ExplainabilityEngine) -> None:
        result = engine.generate_evidence_map(["headache", "fever"], [], "Assessment")
        assert len(result) == 2
        assert all(isinstance(item, EvidenceItem) for item in result)
        assert result[0].symptom == "headache"
        assert "General medical knowledge" in result[0].supporting_sources

    @pytest.mark.unit
    def test_none_rag_results_returns_basic_evidence(self, engine: ExplainabilityEngine) -> None:
        result = engine.generate_evidence_map(["headache"], None, "Assessment")
        assert len(result) == 1

    @pytest.mark.unit
    def test_with_rag_results_maps_sources(self, engine: ExplainabilityEngine) -> None:
        rag_results = [
            {"content": "Headache can be caused by tension", "metadata": {"topic": "headache_guide"}},
            {"content": "Fever indicates infection", "metadata": {"topic": "fever_management"}},
        ]
        result = engine.generate_evidence_map(["headache", "fever"], rag_results, "Assessment")
        assert len(result) == 2
        # At least one should have a non-general source
        all_sources = []
        for item in result:
            all_sources.extend(item.supporting_sources)
        assert any(s != "General medical knowledge" for s in all_sources)

    @pytest.mark.unit
    def test_limits_to_five_symptoms(self, engine: ExplainabilityEngine) -> None:
        symptoms = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"]
        result = engine.generate_evidence_map(symptoms, [], "Assessment")
        assert len(result) == 5

    @pytest.mark.unit
    def test_confidence_contribution_sums_to_one(self, engine: ExplainabilityEngine) -> None:
        symptoms = ["headache", "fever", "cough"]
        result = engine.generate_evidence_map(symptoms, [], "Assessment")
        total = sum(item.confidence_contribution for item in result)
        assert abs(total - 1.0) < 0.01


class TestExplanationSummary:
    """Tests for generate_explanation_summary."""

    @pytest.fixture
    def engine(self) -> ExplainabilityEngine:
        return ExplainabilityEngine()

    @pytest.mark.unit
    def test_summary_mentions_symptom_count(self, engine: ExplainabilityEngine) -> None:
        evidence = [
            EvidenceItem(symptom="headache", supporting_sources=["General medical knowledge"], confidence_contribution=0.5),
            EvidenceItem(symptom="fever", supporting_sources=["General medical knowledge"], confidence_contribution=0.5),
        ]
        summary = engine.generate_explanation_summary(evidence, 0.75, 0.8)
        assert "2 reported symptoms" in summary

    @pytest.mark.unit
    def test_summary_singular_symptom(self, engine: ExplainabilityEngine) -> None:
        evidence = [
            EvidenceItem(symptom="headache", supporting_sources=["General medical knowledge"], confidence_contribution=1.0),
        ]
        summary = engine.generate_explanation_summary(evidence, 0.75, 0.8)
        assert "1 reported symptom" in summary

    @pytest.mark.unit
    def test_high_completeness_label(self, engine: ExplainabilityEngine) -> None:
        evidence = [EvidenceItem(symptom="headache", supporting_sources=[], confidence_contribution=1.0)]
        summary = engine.generate_explanation_summary(evidence, 0.8, 0.9)
        assert "comprehensive" in summary

    @pytest.mark.unit
    def test_moderate_completeness_label(self, engine: ExplainabilityEngine) -> None:
        evidence = [EvidenceItem(symptom="headache", supporting_sources=[], confidence_contribution=1.0)]
        summary = engine.generate_explanation_summary(evidence, 0.6, 0.6)
        assert "moderate" in summary

    @pytest.mark.unit
    def test_low_completeness_label(self, engine: ExplainabilityEngine) -> None:
        evidence = [EvidenceItem(symptom="headache", supporting_sources=[], confidence_contribution=1.0)]
        summary = engine.generate_explanation_summary(evidence, 0.4, 0.3)
        assert "limited" in summary

    @pytest.mark.unit
    def test_low_completeness_shows_missing_percent(self, engine: ExplainabilityEngine) -> None:
        evidence = [EvidenceItem(symptom="headache", supporting_sources=[], confidence_contribution=1.0)]
        summary = engine.generate_explanation_summary(evidence, 0.4, 0.5)
        assert "Confidence limited" in summary

    @pytest.mark.unit
    def test_summary_ends_with_period(self, engine: ExplainabilityEngine) -> None:
        evidence = [EvidenceItem(symptom="h", supporting_sources=[], confidence_contribution=1.0)]
        summary = engine.generate_explanation_summary(evidence, 0.5, 0.5)
        assert summary.endswith(".")

    @pytest.mark.unit
    def test_summary_with_unique_sources(self, engine: ExplainabilityEngine) -> None:
        evidence = [
            EvidenceItem(symptom="headache", supporting_sources=["Neurology Guide"], confidence_contribution=0.5),
            EvidenceItem(symptom="fever", supporting_sources=["Infection Manual"], confidence_contribution=0.5),
        ]
        summary = engine.generate_explanation_summary(evidence, 0.8, 0.8)
        assert "Medical sources consulted" in summary or "source" in summary.lower()

    @pytest.mark.unit
    def test_empty_evidence_list(self, engine: ExplainabilityEngine) -> None:
        summary = engine.generate_explanation_summary([], 0.5, 0.5)
        assert isinstance(summary, str)


class TestRagSourceExtraction:
    """Tests for _extract_rag_sources."""

    @pytest.fixture
    def engine(self) -> ExplainabilityEngine:
        return ExplainabilityEngine()

    @pytest.mark.unit
    def test_extracts_topic_from_metadata(self, engine: ExplainabilityEngine) -> None:
        rag = [{"metadata": {"topic": "cardiology_guide"}}]
        sources = engine._extract_rag_sources(rag)
        assert len(sources) == 1
        assert "Cardiology Guide" in sources[0]

    @pytest.mark.unit
    def test_extracts_source_from_metadata(self, engine: ExplainabilityEngine) -> None:
        rag = [{"metadata": {"source": "fever_management.pdf"}}]
        sources = engine._extract_rag_sources(rag)
        assert len(sources) == 1
        assert ".pdf" not in sources[0]

    @pytest.mark.unit
    def test_extracts_topic_at_top_level(self, engine: ExplainabilityEngine) -> None:
        rag = [{"topic": "diabetes_info"}]
        sources = engine._extract_rag_sources(rag)
        assert len(sources) == 1

    @pytest.mark.unit
    def test_limits_to_ten_sources(self, engine: ExplainabilityEngine) -> None:
        rag = [{"topic": f"src_{i}"} for i in range(15)]
        sources = engine._extract_rag_sources(rag)
        assert len(sources) <= 10


class TestCleanSourceName:
    """Tests for _clean_source_name."""

    @pytest.fixture
    def engine(self) -> ExplainabilityEngine:
        return ExplainabilityEngine()

    @pytest.mark.unit
    def test_removes_pdf_extension(self, engine: ExplainabilityEngine) -> None:
        assert ".pdf" not in engine._clean_source_name("guide.pdf")

    @pytest.mark.unit
    def test_removes_txt_extension(self, engine: ExplainabilityEngine) -> None:
        assert ".txt" not in engine._clean_source_name("notes.txt")

    @pytest.mark.unit
    def test_replaces_underscores(self, engine: ExplainabilityEngine) -> None:
        result = engine._clean_source_name("medical_guide")
        assert "_" not in result
        assert "Medical Guide" == result

    @pytest.mark.unit
    def test_capitalizes_words(self, engine: ExplainabilityEngine) -> None:
        result = engine._clean_source_name("fever management")
        assert result == "Fever Management"
