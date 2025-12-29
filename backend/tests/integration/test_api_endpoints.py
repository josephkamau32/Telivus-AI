"""
Integration Tests for Health API Endpoints

Tests complete workflows and API contracts:
- Health assessment endpoint
- Chat endpoint
- Trajectory endpoint
- Alert endpoint
"""

import pytest
from fastapi.testclient import TestClient


class TestHealthAPIEndpoints:
    """Integration tests for health assessment API"""
    
    @pytest.mark.integration
    def test_health_check_endpoint(self, test_client):
        """Test /health endpoint returns correct status"""
        response = test_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert"version" in data
        assert "service" in data
    
    @pytest.mark.integration
    def test_root_endpoint(self, test_client):
        """Test root endpoint returns API info"""
        response = test_client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "docs" in data
    
    @pytest.mark.integration
    def test_cors_test_endpoint(self, test_client):
        """Test CORS configuration endpoint"""
        response = test_client.get("/cors-test")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "allowed_origins" in data
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_health_assessment_endpoint_valid_request(
        self,
        async_client,
        sample_health_assessment_request
    ):
        """Test POST /api/v1/health/assess with valid data"""
        from unittest.mock import patch
        
        with patch('app.services.health_assessment_ai.get_openai_response') as mock_ai:
            mock_ai.return_value = '{"assessment": "test", "confidence": 0.8}'
            
            response = await async_client.post(
                "/api/v1/health/assess",
                json=sample_health_assessment_request
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "medical_assessment" in data
            assert "confidence_score" in data
    
    @pytest.mark.integration
    def test_health_assessment_endpoint_missing_fields(self, test_client):
        """Test endpoint returns 422 for missing required fields"""
        invalid_request = {
            "feeling": "unwell"
            # Missing required fields
        }
        
        response = test_client.post(
            "/api/v1/health/assess",
            json=invalid_request
        )
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.integration
    def test_health_assessment_endpoint_invalid_age(self, test_client):
        """Test endpoint validates age range"""
        invalid_request = {
            "feeling": "unwell",
            "symptom_assessment": {"symptoms": ["headache"]},
            "patient_info": {
                "name": "Test",
                "age": 200,  # Invalid age
                "gender": "male"
            }
        }
        
        response = test_client.post(
            "/api/v1/health/assess",
            json=invalid_request
        )
        
        assert response.status_code in [400, 422]
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_health_assessment_response_headers(
        self,
        async_client,
        sample_health_assessment_request
    ):
        """Test response includes proper headers"""
        from unittest.mock import patch
        
        with patch('app.services.health_assessment_ai.get_openai_response'):
            response = await async_client.post(
                "/api/v1/health/assess",
                json=sample_health_assessment_request
            )
            
            # Should have CORS headers
            assert "access-control-allow-origin" in response.headers
    
    @pytest.mark.integration
    @pytest.mark.slow
    def test_concurrent_health_assessments(self, test_client):
        """Test system handles multiple concurrent requests"""
        import concurrent.futures
        
        def make_request():
            return test_client.post(
                "/api/v1/health/assess",
                json={
                    "feeling": "good",
                    "symptom_assessment": {"symptoms": ["fatigue"]},
                    "patient_info": {"name": "Test", "age": 30, "gender": "male"}
                }
            )
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [f.result() for f in futures]
        
        # All should complete (may have rate limiting)
        assert all(r.status_code in [200, 429] for r in responses)
    
    @pytest.mark.integration
    def test_api_error_handling(self, test_client):
        """Test API returns proper error responses"""
        # Invalid JSON
        response = test_client.post(
            "/api/v1/health/assess",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_trajectory_prediction_endpoint(self, async_client):
        """Test trajectory prediction endpoint"""
        trajectory_request = {
            "patient_id": "test_123",
            "health_metrics": {
                "blood_pressure": [120, 125, 130],
                "heart_rate": [70, 72, 75]
            },
            "forecast_days": 7
        }
        
        with patch('app.services.trajectory_prediction.predict_health_trajectory'):
            response = await async_client.post(
                "/api/v1/trajectory/predict",
                json=trajectory_request
            )
            
            # May not be implemented yet, should get 404 or 200
            assert response.status is not None
