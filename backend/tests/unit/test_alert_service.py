"""
Unit Tests for Alert Service

Tests predictive alert system including:
- Alert generation
- Risk detection
- Multi-channel notifications
- Alert management
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta


class TestAlertService:
    """Test suite for predictive alert system"""
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_health_alert(self):
        """Test alert generation from health data"""
        from app.services.alert_service import generate_health_alert
        
        health_data = {
            "metric": "blood_pressure",
            "current_value": 160,
            "threshold": 140,
            "trend": "increasing"
        }
        
        alert = await generate_health_alert(health_data)
        
        assert alert is not None
        assert alert["severity"] in ["low", "medium", "high", "critical"]
        assert alert["metric"] == "blood_pressure"
        assert alert["message"] is not None
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_alert_severity_calculation(self):
        """Test alert severity is correctly calculated"""
        from app.services.alert_service import calculate_alert_severity
        
        # Critical alert (very high value, rapid increase)
        critical = calculate_alert_severity(
            current_value=180,
            threshold=140,
            rate_of_change=10,  # Rapid increase
            metric="blood_pressure"
        )
        assert critical == "critical"
        
        # Low alert (slightly above threshold, stable)
        low = calculate_alert_severity(
            current_value=145,
            threshold=140,
            rate_of_change=1,  # Slow increase
            metric="blood_pressure"
        )
        assert low == "low"
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_early_warning_detection(self):
        """Test early warning system detects patterns before critical"""
        from app.services.alert_service import detect_early_warning
        
        # Gradually increasing values (should trigger early warning)
        time_series = {
            "dates": [
                datetime.now() - timedelta(days=i)
                for i in range(7, 0, -1)
            ],
            "values": [130, 135, 140, 145, 150, 155, 160]
        }
        
        warning = await detect_early_warning(time_series, threshold=140)
        
        assert warning["early_warning"] == True
        assert "trend" in warning
        assert warning["trend"] == "increasing"
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_multi_channel_notification(self):
        """Test alerts can be sent via multiple channels"""
        from app.services.alert_service import send_alert_notification
        
        alert = {
            "id": "alert_123",
            "severity": "high",
            "message": "Blood pressure elevated"
        }
        
        channels = ["email", "sms", "push", "in_app"]
        
        with patch('app.services.alert_service.send_email') as mock_email, \
             patch('app.services.alert_service.send_sms') as mock_sms, \
             patch('app.services.alert_service.send_push') as mock_push:
            
            await send_alert_notification(alert, channels=channels)
            
            # Should attempt all channels
            mock_email.assert_called_once()
            mock_sms.assert_called_once()
            mock_push.assert_called_once()
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_alert_deduplication(self):
        """Test that duplicate alerts are not sent"""
        from app.services.alert_service import should_send_alert
        
        alert = {
            "metric": "blood_pressure",
            "severity": "high",
            "value": 160
        }
        
        # First alert should send
        assert await should_send_alert(alert, user_id="user_123") == True
        
        # Duplicate alert within time window should not send
        assert await should_send_alert(alert, user_id="user_123") == False
        
        # Different user should send
        assert await should_send_alert(alert, user_id="user_456") == True
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_alert_acknowledge(self):
        """Test alert acknowledgment workflow"""
        from app.services.alert_service import acknowledge_alert
        
        alert_id = "alert_123"
        user_id = "user_456"
        
        result = await acknowledge_alert(alert_id, user_id)
        
        assert result["status"] == "acknowledged"
        assert result["acknowledged_at"] is not None
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_alert_settings_customization(self):
        """Test user can customize alert preferences"""
        from app.services.alert_service import update_alert_settings
        
        user_settings = {
            "user_id": "user_123",
            "channels": {
                "email": True,
                "sms": False,
                "push": True
            },
            "thresholds": {
                "blood_pressure": 140,
                "heart_rate": 100
            },
            "quiet_hours": {
                "enabled": True,
                "start": "22:00",
                "end": "08:00"
            }
        }
       
        result = await update_alert_settings(user_settings)
        
        assert result["success"] == True
        assert result["settings"] == user_settings
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_alert_escalation(self):
        """Test alert escalation for unacknowledged critical alerts"""
        from app.services.alert_service import check_alert_escalation
        
        unacknowledged_alert = {
            "id": "alert_789",
            "severity": "critical",
            "sent_at": datetime.now() - timedelta(hours=2),
            "acknowledged": False
        }
        
        should_escalate = await check_alert_escalation(unacknowledged_alert)
        
        # Critical alerts unacknowledged for >1 hour should escalate
        assert should_escalate == True
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_alert_analytics(self):
        """Test alert performance analytics"""
        from app.services.alert_service import get_alert_analytics
        
        user_id = "user_123"
        
        with patch('app.services.alert_service.fetch_user_alerts') as mock_fetch:
            mock_fetch.return_value = [
                {"severity": "high", "acknowledged": True, "response_time": 300},
                {"severity": "low", "acknowledged": True, "response_time": 600},
                {"severity": "high", "acknowledged": False}
            ]
            
            analytics = await get_alert_analytics(user_id)
            
            assert "total_alerts" in analytics
            assert "acknowledgment_rate" in analytics
            assert "average_response_time" in analytics
            assert analytics["total_alerts"] == 3
