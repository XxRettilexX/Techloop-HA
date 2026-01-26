"""
Quick test script to verify AI Boiler Service is working
Run this before docker deployment to check for basic issues
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_imports():
    """Test that all imports work correctly"""
    print("Testing imports...")
    try:
        from src.guardrail import SecurityGuardrail, CommandValidationRequest, CommandValidationResponse
        from src.maintenance import MaintenanceAnalyzer, MaintenanceReport
        print("✅ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False

def test_guardrail_init():
    """Test guardrail initialization"""
    print("\nTesting guardrail initialization...")
    try:
        from src.guardrail import SecurityGuardrail
        
        guardrail = SecurityGuardrail(
            ha_url="http://localhost:8123",
            ha_token="test_token",
            ollama_url="http://localhost:11434"
        )
        
        # Test hard limit check
        from src.guardrail import CommandValidationRequest
        request = CommandValidationRequest(
            entity_id="climate.test",
            action="set_temperature",
            value=30.0,
            user_input="Set to 30"
        )
        
        result = guardrail._check_hard_limits(request)
        if not result[0]:  # Should be blocked
            print("✅ Hard limits check working")
            return True
        else:
            print("❌ Hard limits check failed")
            return False
    except Exception as e:
        print(f"❌ Guardrail test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_maintenance_init():
    """Test maintenance analyzer initialization"""
    print("\nTesting maintenance analyzer initialization...")
    try:
        from src.maintenance import MaintenanceAnalyzer
        
        analyzer = MaintenanceAnalyzer(
            ha_url="http://localhost:8123",
            ha_token="test_token",
            ollama_url="http://localhost:11434"
        )
        
        print("✅ Maintenance analyzer initialization successful")
        return True
    except Exception as e:
        print(f"❌ Maintenance analyzer test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_models():
    """Test pydantic models"""
    print("\nTesting Pydantic models...")
    try:
        from src.guardrail import CommandValidationRequest, CommandValidationResponse
        
        # Test request model
        req = CommandValidationRequest(
            entity_id="climate.boiler",
            action="set_temperature",
            value=20.0,
            user_input="Set temperature to 20"
        )
        
        # Test response model
        resp = CommandValidationResponse(
            allowed=True,
            reason="Test",
            severity="safe"
        )
        
        print("✅ Pydantic models working")
        return True
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("="*60)
    print("AI BOILER SERVICE - UNIT TESTS")
    print("="*60)
    
    tests = [
        test_imports,
        test_models,
        test_guardrail_init,
        test_maintenance_init
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"❌ Test crashed: {e}")
            results.append(False)
    
    print("\n" + "="*60)
    print(f"RESULTS: {sum(results)}/{len(results)} tests passed")
    print("="*60)
    
    if all(results):
        print("✅ All tests passed! Ready for deployment.")
        return 0
    else:
        print("❌ Some tests failed. Fix issues before deploying.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
