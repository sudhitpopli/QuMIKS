import os
import sys
import uvicorn



if __name__ == "__main__":
    project_root = os.path.dirname(os.path.abspath(__file__))
    src_path = os.path.join(project_root, "src")
    sys.path.append(src_path)
    
    print("[SYSTEM] Starting SIH 2025 Backend Server...")
    print(f"[SYSTEM] Project Root: {project_root}")
    

    port = int(os.environ.get("PORT", 8000))
    

    uvicorn.run("backend.app:app", host="0.0.0.0", port=port, reload=False)
