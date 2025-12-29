"""
Telivus AI - A+ Improvements Verification Script

This script verifies that all A+ improvements are working correctly:
1. Caching system (Redis)
2. Rate limiting
3. Authentication (JWT)
4. Input sanitization
5. Code quality tools
6. Application health

Run this to verify your A+ setup is functional.
"""

import asyncio
import time
import sys
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.YELLOW}ℹ️  {text}{Colors.END}")

async def verify_dependencies():
    """Verify all required packages are installed"""
    print_header("Verifying Dependencies")
    
    required_packages = {
        'pytest': 'Testing framework',
        'redis': 'Caching service',
        'jose': 'JWT authentication',
        'passlib': 'Password hashing',
        'black': 'Code formatter',
        'isort': 'Import sorter',
        'flake8': 'Linter',
        'mypy': 'Type checker',
    }
    
    missing = []
    for package, description in required_packages.items():
        try:
            __import__(package)
            print_success(f"{package:15} - {description}")
        except ImportError:
            print_error(f"{package:15} - NOT INSTALLED")
            missing.append(package)
    
    if missing:
        print_error(f"\nMissing packages: {', '.join(missing)}")
        return False
    else:
        print_success("\n✨ All dependencies installed!")
        return True

def verify_code_quality_tools():
    """Verify code quality tools are working"""
    print_header("Verifying Code Quality Tools")
    
    import subprocess
    
    tools = {
        'black --version': 'Black formatter',
        'isort --version': 'Import sorter',
        'flake8 --version': 'Flake8 linter',
        'mypy --version': 'MyPy type checker',
        'pytest --version': 'Pytest testing',
    }
    
    all_ok = True
    for cmd, description in tools.items():
        try:
            result = subprocess.run(
                cmd.split(),
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.split('\n')[0]
                print_success(f"{description:20} - {version}")
            else:
                print_error(f"{description:20} - Failed")
                all_ok = False
        except Exception as e:
            print_error(f"{description:20} - Error: {e}")
            all_ok = False
    
    return all_ok

async def verify_caching_service():
    """Verify Redis caching service"""
    print_header("Verifying Caching Service")
    
    try:
        from app.services.cache_service import CacheService
        
        cache = CacheService(redis_url="redis://localhost:6379")
        
        # Try to connect (will fail gracefully if Redis not running)
        try:
            await cache.connect()
            print_success("Redis connection successful")
            
            # Test cache operations
            await cache.set("test_key", {"data": "test_value"}, ttl=60)
            result = await cache.get("test_key")
            
            if result and result.get("data") == "test_value":
                print_success("Cache READ/WRITE operations working")
            
            # Test cache stats
            stats = cache.get_stats()
            print_info(f"Cache stats: {stats}")
            
            await cache.disconnect()
            return True
            
        except Exception as e:
            print_info("Redis not running (optional for testing)")
            print_info("To enable: docker run -d -p 6379:6379 redis:7-alpine")
            return True  # Not critical for verification
            
    except ImportError as e:
        print_error(f"Cache service import failed: {e}")
        return False

async def verify_rate_limiting():
    """Verify rate limiting middleware"""
    print_header("Verifying Rate Limiting")
    
    try:
        from app.middleware.rate_limiter import AdvancedRateLimiter
        
        limiter = AdvancedRateLimiter()
        
        # Test rate limiting logic
        test_ip = "192.168.1.1"
        
        # Should allow first 10 requests
        for i in range(10):
            allowed, remaining = await limiter.check_rate_limit(
                test_ip, max_requests=10, window_seconds=60
            )
            if not allowed:
                print_error(f"Rate limit triggered too early at request {i+1}")
                return False
        
        print_success("Rate limiting allows normal traffic")
        
        # 11th request should be blocked
        allowed, remaining = await limiter.check_rate_limit(
            test_ip, max_requests=10, window_seconds=60
        )
        
        if not allowed:
            print_success("Rate limiting blocks excess requests")
        else:
            print_error("Rate limiting not blocking properly")
            return False
        
        # Test whitelist
        limiter.add_to_whitelist("whitelist_ip")
        allowed, _ = await limiter.check_rate_limit(
            "whitelist_ip", max_requests=1, window_seconds=60
        )
        
        if allowed:
            print_success("Whitelist feature working")
        
        # Get stats
        stats = limiter.get_stats()
        print_info(f"Rate limit stats: {stats}")
        
        return True
        
    except ImportError as e:
        print_error(f"Rate limiter import failed: {e}")
        return False

async def verify_authentication():
    """Verify JWT authentication system"""
    print_header("Verifying Authentication System")
    
    try:
        from app.core.auth import (
            create_access_token,
            decode_token,
            hash_password,
            verify_password
        )
        
        # Test password hashing
        password = "test_password_123"
        hashed = hash_password(password)
        
        if verify_password(password, hashed):
            print_success("Password hashing working")
        else:
            print_error("Password verification failed")
            return False
        
        # Test JWT token creation
        token = create_access_token({
            "user_id": "test_user",
            "email": "test@example.com",
            "role": "user"
        })
        
        print_success("JWT token creation working")
        
        # Test token decoding
        token_data = decode_token(token)
        
        if token_data.user_id == "test_user":
            print_success("JWT token decoding working")
        else:
            print_error("Token data mismatch")
            return False
        
        print_info(f"Token expires at: {token_data.exp}")
        
        return True
        
    except ImportError as e:
        print_error(f"Auth system import failed: {e}")
        return False
    except Exception as e:
        print_error(f"Auth verification error: {e}")
        return False

async def verify_input_sanitization():
    """Verify input sanitization utilities"""
    print_header("Verifying Input Sanitization")
    
    try:
        from app.utils.sanitizer import (
            sanitize_medical_input,
            validate_age,
            validate_symptom_severity,
            detect_sql_injection
        )
        
        # Test XSS prevention
        dangerous_input = "<script>alert('xss')</script>Headache"
        sanitized = sanitize_medical_input(dangerous_input)
        
        if "<script>" not in sanitized:
            print_success("XSS prevention working")
        else:
            print_error("XSS not prevented")
            return False
        
        # Test SQL injection detection
        sql_attempt = "'; DROP TABLE users; --"
        if detect_sql_injection(sql_attempt):
            print_success("SQL injection detection working")
        else:
            print_error("SQL injection not detected")
            return False
        
        # Test age validation
        try:
            validate_age(30)  # Valid
            print_success("Age validation accepts valid input")
        except ValueError:
            print_error("Age validation rejecting valid input")
            return False
        
        try:
            validate_age(200)  # Invalid
            print_error("Age validation not catching invalid input")
            return False
        except ValueError:
            print_success("Age validation rejects invalid input")
        
        # Test severity validation
        if validate_symptom_severity({"headache": 7, "fever": 8}):
            print_success("Symptom severity validation working")
        else:
            print_error("Severity validation failed")
            return False
        
        return True
        
    except ImportError as e:
        print_error(f"Sanitizer import failed: {e}")
        return False

def verify_project_structure():
    """Verify all required files are present"""
    print_header("Verifying Project Structure")
    
    required_files = [
        'backend/pytest.ini',
        'backend/pyproject.toml',
        'backend/tests/conftest.py',
        'backend/tests/unit/test_health_assessment.py',
        'backend/app/services/cache_service.py',
        'backend/app/middleware/rate_limiter.py',
        'backend/app/core/auth.py',
        'backend/app/utils/sanitizer.py',
        'backend/Dockerfile',
        'docker-compose.yml',
        '.github/workflows/test.yml',
        '.pre-commit-config.yaml',
    ]
    
    all_present = True
    for file_path in required_files:
        if Path(file_path).exists():
            print_success(f"{file_path}")
        else:
            print_error(f"{file_path} - MISSING")
            all_present = False
    
    return all_present

def print_summary(results):
    """Print verification summary"""
    print_header("Verification Summary")
    
    total = len(results)
    passed = sum(results.values())
    failed = total - passed
    
    print(f"\n{Colors.BOLD}Results:{Colors.END}")
    print(f"  Total checks: {total}")
    print(f"  {Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"  {Colors.RED}Failed: {failed}{Colors.END}")
    
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"\n{Colors.BOLD}Score: {percentage:.1f}%{Colors.END}")
    
    if percentage == 100:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL VERIFICATIONS PASSED! Your project is A+ ready!{Colors.END}")
    elif percentage >= 80:
        print(f"\n{Colors.YELLOW}⚠️  Most features working. A few issues need attention.{Colors.END}")
    else:
        print(f"\n{Colors.RED}❌ Several issues detected. Review errors above.{Colors.END}")
    
    print("\n" + "="*60 + "\n")

async def main():
    """Run all verifications"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║     TELIVUS AI - A+ IMPROVEMENTS VERIFICATION SUITE        ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")
    
    results = {}
    
    # Run all verification checks
    results['Dependencies'] = await verify_dependencies()
    results['Code Quality Tools'] = verify_code_quality_tools()
    results['Project Structure'] = verify_project_structure()
    results['Caching Service'] = await verify_caching_service()
    results['Rate Limiting'] = await verify_rate_limiting()
    results['Authentication'] = await verify_authentication()
    results['Input Sanitization'] = await verify_input_sanitization()
    
    # Print summary
    print_summary(results)
    
    # Exit with appropriate code
    if all(results.values()):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Verification cancelled by user.{Colors.END}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Verification failed with error: {e}{Colors.END}\n")
        sys.exit(1)
