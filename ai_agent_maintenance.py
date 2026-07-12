#!/usr/bin/env python3
"""
Checks yesterdayScores.txt for scraper failures (empty leaderboards).
If any failures are found, runs pi to fix them per AGENTS.md.
"""

import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
SCORES_FILE = PROJECT_DIR / "yesterdayScores.txt"
AGENTS_FILE = PROJECT_DIR / "AGENTS.md"
PI_CMD = "/home/piefast/.nvm/versions/node/v24.18.0/bin/pi"

# All active scraper sections that should appear in the file
EXPECTED_SECTIONS = [
    "LiveBench Leaderboard",
    "SimpleBench Leaderboard",
    "ARC-AGI-1 Leaderboard",
    "ARC-AGI-2 Leaderboard",
    "Humanity Last Exam Leaderboard",
    "DeepSWE Leaderboard",
    "TerminalBench v2.1 Leaderboard",
    "CRIPt Leaderboard",
    "MMMU-Pro Leaderboard",
]


def parse_scores(filepath: Path) -> dict[str, list[str]]:
    """Parse yesterdayScores.txt into {section_name: [line_content, ...]}."""
    if not filepath.exists():
        return {}

    sections: dict[str, list[str]] = {}
    current_section = None

    with open(filepath) as f:
        for raw_line in f:
            line = raw_line.strip()
            if line.startswith("=== ") and line.endswith(" ==="):
                current_section = line[4:-4]
                sections[current_section] = []
            elif current_section is not None:
                sections[current_section].append(line)

    return sections


def is_valid_entry(line: str) -> bool:
    """Check if a leaderboard entry has valid model name and score."""
    if not line.strip():
        return False
    # Replacement character for undisplayed Unicode
    if "\ufffd" in line:
        return False
    # Model names should be meaningful text, not just symbols
    # Extract the model name (everything before " - ")
    parts = line.split(" - ", 1)
    if len(parts) < 2:
        return False
    model_name = parts[0].strip()
    # Remove leading rank number and dot (e.g., "1. ")
    import re
    model_name = re.sub(r"^\d+\.\s*", "", model_name)
    # Model name should have some alphabetic content
    if not re.search(r"[a-zA-Z\u00C0-\u024F]", model_name):
        return False
    # Score should be a valid percentage
    score = parts[1].strip()
    if score in ("N/A", "", "0%"):
        return False
    if not re.search(r"[\d.]+\s*%", score):
        return False
    return True


def find_failures(sections: dict[str, list[str]]) -> list[tuple[str, str]]:
    """Return list of (section_name, failure_reason) for any failures found."""
    failures = []

    for section in EXPECTED_SECTIONS:
        if section not in sections:
            failures.append((section, "missing from file"))
            continue

        entries = [l for l in sections[section] if l.strip()]
        if not entries:
            failures.append((section, "empty (no model entries)"))
            continue

        invalid_entries = [e for e in entries if not is_valid_entry(e)]
        if len(invalid_entries) == len(entries):
            failures.append((section, "all entries corrupt (no valid model data)"))
        elif len(invalid_entries) > len(entries) * 0.5:
            failures.append((section, "majority of entries corrupt"))

    return failures


def run_pi_fix(failures: list[tuple[str, str]]) -> int:
    """Run pi with AGENTS.md instructions to fix the failures."""
    section_list = ", ".join(name for name, _ in failures)
    message = (
        f"The scraper maintenance cron found failures in yesterdayScores.txt. "
        f"Please follow the instructions in AGENTS.md to diagnose and fix any failing scrapers. "
        f"Failed sections: {section_list}. "
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
    sections = parse_scores(SCORES_FILE)

    if not sections:
        print("yesterdayScores.txt is missing or empty. Nothing to check.")
        return 0

    failures = find_failures(sections)

    if not failures:
        print("All scraper sections are healthy. No action needed.")
        return 0

    print(f"Found {len(failures)} failure(s) in yesterdayScores.txt:")
    for name, reason in failures:
        print(f"  - {name}: {reason}")
    print()

    print("Running pi to fix...\n")
    rc = run_pi_fix(failures)
    print()

    if rc == 0:
        print("Pi completed successfully.")
    else:
        print(f"Pi exited with code {rc}.")

    return rc


if __name__ == "__main__":
    sys.exit(main())
