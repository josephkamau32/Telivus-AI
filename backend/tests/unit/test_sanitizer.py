"""
Unit Tests for Input Sanitization Utilities

Tests all sanitization functions for security:
- XSS prevention
- SQL injection detection
- Command injection detection
- Input validation (email, name, age, filename)
- Recursive JSON sanitization
"""

import pytest
from app.utils.sanitizer import (
    sanitize_html,
    sanitize_medical_input,
    sanitize_email,
    sanitize_name,
    validate_and_sanitize_json,
    detect_sql_injection,
    detect_command_injection,
    sanitize_filename,
    validate_age,
    validate_symptom_severity,
)


class TestSanitizeHtml:
    """Tests for HTML sanitization (XSS prevention)."""

    @pytest.mark.unit
    def test_strips_script_tags(self) -> None:
        result = sanitize_html("<script>alert('xss')</script>Hello")
        assert "<script>" not in result
        assert "Hello" in result

    @pytest.mark.unit
    def test_empty_string_returns_empty(self) -> None:
        assert sanitize_html("") == ""

    @pytest.mark.unit
    def test_none_returns_empty(self) -> None:
        assert sanitize_html(None) == ""

    @pytest.mark.unit
    def test_plain_text_unchanged(self) -> None:
        assert sanitize_html("plain text here") == "plain text here"

    @pytest.mark.unit
    def test_allowed_tags_preserved(self) -> None:
        result = sanitize_html("<b>bold</b> <i>italic</i>", allowed_tags=["b"])
        assert "<b>" in result
        assert "<i>" not in result


class TestSanitizeMedicalInput:
    """Tests for medical text sanitization."""

    @pytest.mark.unit
    def test_removes_html_tags(self) -> None:
        result = sanitize_medical_input("<p>Patient has fever</p>")
        assert "<p>" not in result
        assert "Patient has fever" in result

    @pytest.mark.unit
    def test_removes_sql_injection_attempts(self) -> None:
        result = sanitize_medical_input("headache; DROP TABLE users;--")
        assert "DROP" not in result
        assert "TABLE" not in result

    @pytest.mark.unit
    def test_empty_returns_empty(self) -> None:
        assert sanitize_medical_input("") == ""
        assert sanitize_medical_input(None) == ""

    @pytest.mark.unit
    def test_truncates_long_input(self) -> None:
        long_text = "A" * 6000
        result = sanitize_medical_input(long_text)
        assert len(result) <= 5000

    @pytest.mark.unit
    def test_preserves_normal_medical_text(self) -> None:
        text = "Patient reports chronic headache for 3 days with mild nausea"
        result = sanitize_medical_input(text)
        assert "headache" in result
        assert "nausea" in result

    @pytest.mark.unit
    def test_removes_excessive_whitespace(self) -> None:
        result = sanitize_medical_input("fever   and   chills")
        assert "  " not in result


class TestSanitizeEmail:
    """Tests for email validation and sanitization."""

    @pytest.mark.unit
    def test_valid_email(self) -> None:
        assert sanitize_email("user@example.com") == "user@example.com"

    @pytest.mark.unit
    def test_strips_whitespace(self) -> None:
        assert sanitize_email("  user@example.com  ") == "user@example.com"

    @pytest.mark.unit
    def test_converts_to_lowercase(self) -> None:
        assert sanitize_email("User@Example.COM") == "user@example.com"

    @pytest.mark.unit
    def test_empty_email_raises(self) -> None:
        with pytest.raises(ValueError, match="Email is required"):
            sanitize_email("")

    @pytest.mark.unit
    def test_invalid_format_raises(self) -> None:
        with pytest.raises(ValueError, match="Invalid email format"):
            sanitize_email("not-an-email")

    @pytest.mark.unit
    def test_too_long_raises(self) -> None:
        with pytest.raises(ValueError, match="Email too long"):
            sanitize_email("a" * 250 + "@b.com")


class TestSanitizeName:
    """Tests for name validation and sanitization."""

    @pytest.mark.unit
    def test_valid_name(self) -> None:
        assert sanitize_name("John Doe") == "John Doe"

    @pytest.mark.unit
    def test_allows_hyphens_and_apostrophes(self) -> None:
        assert sanitize_name("O'Brien") == "O'Brien"
        assert sanitize_name("Mary-Jane") == "Mary-Jane"

    @pytest.mark.unit
    def test_removes_numbers_and_special_chars(self) -> None:
        result = sanitize_name("John123!@#")
        assert "123" not in result
        assert "!" not in result

    @pytest.mark.unit
    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError, match="Name is required"):
            sanitize_name("")

    @pytest.mark.unit
    def test_too_short_raises(self) -> None:
        with pytest.raises(ValueError, match="at least 2 characters"):
            sanitize_name("A")

    @pytest.mark.unit
    def test_too_long_raises(self) -> None:
        with pytest.raises(ValueError, match="less than 100"):
            sanitize_name("A" * 101)


class TestValidateAndSanitizeJson:
    """Tests for recursive JSON sanitization."""

    @pytest.mark.unit
    def test_sanitizes_string_values(self) -> None:
        data = {"name": "<script>xss</script>John"}
        result = validate_and_sanitize_json(data)
        assert "<script>" not in result["name"]

    @pytest.mark.unit
    def test_handles_nested_dicts(self) -> None:
        data = {"outer": {"inner": "<b>test</b>"}}
        result = validate_and_sanitize_json(data)
        assert "<b>" not in result["outer"]["inner"]

    @pytest.mark.unit
    def test_handles_lists(self) -> None:
        data = {"items": ["<script>a</script>", "safe"]}
        result = validate_and_sanitize_json(data)
        assert "<script>" not in result["items"][0]
        assert result["items"][1] == "safe"

    @pytest.mark.unit
    def test_preserves_non_string_values(self) -> None:
        data = {"age": 30, "active": True, "score": 0.85}
        result = validate_and_sanitize_json(data)
        assert result["age"] == 30
        assert result["active"] is True
        assert result["score"] == 0.85


class TestDetectInjection:
    """Tests for SQL and command injection detection."""

    @pytest.mark.unit
    def test_detects_sql_select(self) -> None:
        assert detect_sql_injection("SELECT * FROM users") is True

    @pytest.mark.unit
    def test_detects_sql_drop(self) -> None:
        assert detect_sql_injection("DROP TABLE users") is True

    @pytest.mark.unit
    def test_normal_text_passes(self) -> None:
        assert detect_sql_injection("I have a headache") is False

    @pytest.mark.unit
    def test_detects_command_injection_semicolons(self) -> None:
        assert detect_command_injection("ls; rm -rf /") is True

    @pytest.mark.unit
    def test_detects_command_injection_pipes(self) -> None:
        assert detect_command_injection("cat /etc/passwd | grep root") is True

    @pytest.mark.unit
    def test_normal_text_passes_command_check(self) -> None:
        assert detect_command_injection("headache and fever") is False


class TestSanitizeFilename:
    """Tests for filename sanitization (path traversal prevention)."""

    @pytest.mark.unit
    def test_removes_path_traversal(self) -> None:
        result = sanitize_filename("../../etc/passwd")
        assert ".." not in result
        assert "/" not in result

    @pytest.mark.unit
    def test_strips_path_components(self) -> None:
        result = sanitize_filename("/var/log/secret.txt")
        assert result == "secret.txt"

    @pytest.mark.unit
    def test_replaces_special_chars(self) -> None:
        result = sanitize_filename("file name!@#.txt")
        assert " " not in result
        assert "!" not in result

    @pytest.mark.unit
    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError, match="Filename is required"):
            sanitize_filename("")


class TestValidateAge:
    """Tests for age validation."""

    @pytest.mark.unit
    def test_valid_age(self) -> None:
        assert validate_age(30) == 30

    @pytest.mark.unit
    def test_string_age_converted(self) -> None:
        assert validate_age("25") == 25

    @pytest.mark.unit
    def test_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="cannot be negative"):
            validate_age(-1)

    @pytest.mark.unit
    def test_too_old_raises(self) -> None:
        with pytest.raises(ValueError, match="less than 130"):
            validate_age(131)

    @pytest.mark.unit
    def test_non_numeric_raises(self) -> None:
        with pytest.raises(ValueError, match="must be a number"):
            validate_age("abc")

    @pytest.mark.unit
    def test_none_raises(self) -> None:
        with pytest.raises(ValueError, match="must be a number"):
            validate_age(None)


class TestValidateSymptomSeverity:
    """Tests for symptom severity validation."""

    @pytest.mark.unit
    def test_valid_severity(self) -> None:
        assert validate_symptom_severity(5) == 5

    @pytest.mark.unit
    def test_boundary_low(self) -> None:
        assert validate_symptom_severity(1) == 1

    @pytest.mark.unit
    def test_boundary_high(self) -> None:
        assert validate_symptom_severity(10) == 10

    @pytest.mark.unit
    def test_too_low_raises(self) -> None:
        with pytest.raises(ValueError, match="between 1 and 10"):
            validate_symptom_severity(0)

    @pytest.mark.unit
    def test_too_high_raises(self) -> None:
        with pytest.raises(ValueError, match="between 1 and 10"):
            validate_symptom_severity(11)

    @pytest.mark.unit
    def test_string_converted(self) -> None:
        assert validate_symptom_severity("7") == 7
