import os
import sys
import asyncio

# Add src to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_path = os.path.join(project_root, "src")
sys.path.append(src_path)

from backend.dual_runner import DualSimRunner

async def test_setup():
    print("Testing DualSimRunner setup...")
    runner = DualSimRunner()
    try:
        await runner.setup()
        print("Setup successful!")
        print("Stepping...")
        telemetry = await runner.step()
        print("Step successful!")
        print(f"Telemetry keys: {telemetry.keys()}")
    except Exception as e:
        print(f"Setup/Step failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        runner.stop()

if __name__ == "__main__":
    asyncio.run(test_setup())
