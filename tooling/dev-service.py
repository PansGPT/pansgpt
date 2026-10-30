"""Start an API service with the same root environment as the quiz worker."""

import sys
from pathlib import Path

from dotenv import load_dotenv


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    load_dotenv(root / ".env", override=True)
    sys.path.insert(0, str(root / "apps" / "api"))
    if sys.argv[1] == "api":
        import uvicorn

        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
    elif sys.argv[1] == "worker":
        from workers.runner import main as run_worker

        run_worker()
    else:
        raise SystemExit("Expected api or worker")


if __name__ == "__main__":
    main()
