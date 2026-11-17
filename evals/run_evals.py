"""Repository entry point; requires the frozen server Python environment."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))

from sofia_evals.runner import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
