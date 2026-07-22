#!/usr/bin/env python3
"""
Runs pi to check and fix scraper maintenance issues per AGENTS.md.
Always runs to catch issues that deterministic detection might miss.
"""

import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
PI_CMD = "/home/piefast/.nvm/versions/node/v24.18.0/bin/pi"


def run_pi_fix() -> int:
    """Run pi with AGENTS.md instructions to maintain scrapers."""
    message = (
        "Scraper maintenance cron running. Please follow the instructions in AGENTS.md "
        "to check for any failing scrapers, outdated sites, or issues with yesterdayScores.txt. "
    )

    result = subprocess.run(
        [
            PI_CMD,
            "-p",
            "--extension",
            str(PROJECT_DIR / ".pi/extensions/stream-output/index.ts"),
            "--stream=all",
            message,
        ],
        cwd=str(PROJECT_DIR),
        capture_output=False,
    )
    return result.returncode


def main() -> int:
    print("Running pi scraper maintenance...\n")
    rc = run_pi_fix()
    print()

    if rc == 0:
        print("Pi completed successfully.")
    else:
        print(f"Pi exited with code {rc}.")

    return rc


if __name__ == "__main__":
    sys.exit(main())
