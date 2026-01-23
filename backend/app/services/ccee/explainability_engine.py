"""
Explainability Engine for Clinical Confidence & Explainability Engine (CCEE).

Generates evidence mapping and explanation summaries to show reasoning
without exposing internal chain-of-thought.
"""

from typing import List, Dict, Any
from dataclasses import dataclass
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class EvidenceItem:
    """Evidence mapping for a symptom."""
    symptom: str
    supporting_sources: List[str]
    confidence_contribution: float  # 0.0-1.0


class ExplainabilityEngine:
    """
    Generates evidence maps and explanation summaries.
    
    Shows symptoms → sources → conclusions without leaking
    chain-of-thought or raw document content.
    """
    
    def generate_evidence_map(
        self,
        symptoms: List[str],
        rag_results: List[Dict[str, Any]],
        assessment: str
    ) -> List[EvidenceItem]:
        """
        Map symptoms to supporting medical sources.
        
        Args:
            symptoms: List of reported symptoms
            rag_results: RAG retrieval results
            assessment: Generated assessment text
            
        Returns:
            List of EvidenceItem showing symptom → source mappings
        """
        evidence_items = []
        
        if not rag_results or len(rag_results) == 0:
            # No RAG results - generate basic evidence
            for symptom in symptoms[:5]:  # Limit to top 5 symptoms
                evidence_items.append(EvidenceItem(
                    symptom=symptom,
                    supporting_sources=["General medical knowledge"],
                    confidence_contribution=1.0 / len(symptoms) if len(symptoms) > 0 else 0.0
                ))
            return evidence_items
        
        # Extract sources from RAG results
        sources = self._extract_rag_sources(rag_results)
        
        # Map each symptom to relevant sources
        for symptom in symptoms[:5]:  # Limit to top 5 symptoms
            relevant_sources = self._find_relevant_sources(symptom, sources, rag_results)
            
            evidence_items.append(EvidenceItem(
                symptom=symptom,
                supporting_sources=relevant_sources if relevant_sources else ["General medical knowledge"],
                confidence_contribution=1.0 / len(symptoms) if len(symptoms) > 0 else 0.0
            ))
        
        return evidence_items
    
    def generate_explanation_summary(
        self,
        evidence: List[EvidenceItem],
        confidence: float,
        data_completeness: float = 0.0
    ) -> str:
        """
        Generate concise explanation of assessment reasoning.
        
        Args:
            evidence: Evidence items from generate_evidence_map
            confidence: Overall confidence score (0.0-1.0)
            data_completeness: Data completeness score (0.0-1.0)
            
        Returns:
            Human-readable explanation summary
        """
        # Count unique sources
        all_sources = []
        for item in evidence:
            all_sources.extend(item.supporting_sources)
        unique_sources = list(set(all_sources))
        unique_sources = [s for s in unique_sources if s != "General medical knowledge"]
        
        # Build explanation
        parts = []
        
        # Symptom count
        symptom_count = len(evidence)
        if symptom_count > 0:
            parts.append(f"Assessment based on {symptom_count} reported symptom{'s' if symptom_count != 1 else ''}")
        
        # Data quality
        if data_completeness >= 0.8:
            parts.append("with comprehensive medical details")
        elif data_completeness >= 0.5:
            parts.append("with moderate detail")
        else:
            parts.append("with limited detail")
        
        # Sources consulted
        if unique_sources:
            if len(unique_sources) == 1:
                parts.append(f"Medical source consulted: {unique_sources[0]}")
            elif len(unique_sources) <= 3 :
                parts.append(f"Medical sources consulted: {', '.join(unique_sources[:3])}")
            else:
                parts.append(f"Referenced {len(unique_sources)} medical knowledge sources")
        
        # Confidence impact
        if data_completeness < 0.7:
            missing_percent = int((1.0 - data_completeness) * 100)
            parts.append(f"Confidence limited by incomplete data (-{missing_percent}%)")
        
        # Join with periods
        summary = ". ".join(parts)
        if not summary.endswith('.'):
            summary += '.'
        
        return summary
    
    def _extract_rag_sources(self, rag_results: List[Dict[str, Any]]) -> List[str]:
        """Extract clean source names from RAG results."""
        sources = []
        
        for result in rag_results:
            if isinstance(result, dict):
                # Look for source in metadata
                if 'metadata' in result and isinstance(result['metadata'], dict):
                    metadata = result['metadata']
                    if 'topic' in metadata:
                        sources.append(self._clean_source_name(metadata['topic']))
                    elif 'source' in metadata:
                        sources.append(self._clean_source_name(metadata['source']))
                    elif 'title' in metadata:
                        sources.append(self._clean_source_name(metadata['title']))
                
                # Look for topic at top level
                elif 'topic' in result:
                    sources.append(self._clean_source_name(result['topic']))
                elif 'source' in result:
                    sources.append(self._clean_source_name(result['source']))
        
        return sources[:10]  # Limit to top 10 sources
    
    def _clean_source_name(self, source: str) -> str:
        """Clean source name for display."""
        # Remove file extensions
        source = source.replace('.pdf', '').replace('.txt', '').replace('.md', '')
        
        # Replace underscores and dashes with spaces
        source = source.replace('_', ' ').replace('-', ' ')
        
        # Capitalize first letter of each word
        source = ' '.join(word.capitalize() for word in source.split())
        
        return source
    
    def _find_relevant_sources(
        self,
        symptom: str,
        sources: List[str],
        rag_results: List[Dict[str, Any]]
    ) -> List[str]:
        """Find sources most relevant to a specific symptom."""
        relevant = []
        symptom_lower = symptom.lower()
        
        for i, result in enumerate(rag_results):
            if i >= len(sources):
                break
            
            # Check if result content mentions symptom
            content = ""
            if isinstance(result, dict):
                if 'content' in result:
                    content = str(result['content']).lower()
                elif 'text' in result:
                    content = str(result['text']).lower()
            
            if symptom_lower in content or any(word in content for word in symptom_lower.split()):
                if sources[i] not in relevant:
                    relevant.append(sources[i])
            
            if len(relevant) >= 3:  # Limit to 3 sources per symptom
                break
        
        # If no specific matches, return first few general sources
        if not relevant and sources:
            relevant = sources[:2]
        
        return relevant
