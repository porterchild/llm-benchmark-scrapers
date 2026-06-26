#!/usr/bin/env python3
"""
Checks yesterdayScores.txt for scraper failures (empty leaderboards).
If any failures are found, runs opencode to fix them per AGENTS.md.
"""

import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
SCORES_FILE = PROJECT_DIR / "yesterdayScores.txt"
AGENTS_FILE = PROJECT_DIR / "AGENTS.md"
OPENCODE_CMD = "/home/piefast/.opencode/bin/opencode"

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

    return failures


def run_opencode_fix(failures: list[tuple[str, str]]) -> int:
    """Run opencode with AGENTS.md instructions to fix the failures."""
    section_list = ", ".join(name for name, _ in failures)
    message = (
        f"The scraper maintenance cron found failures in yesterdayScores.txt. "
        f"Please follow the instructions in AGENTS.md to diagnose and fix any failing scrapers. "
        f"Failed sections: {section_list}. "
    )

    result = subprocess.run(
        [
            OPENCODE_CMD,
            "run",
            message,
            "-m", "llamacpp4/default",
            "--pure",
            "--thinking",
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

    print("Running opencode to fix...\n")
    rc = run_opencode_fix(failures)
    print()

    if rc == 0:
        print("Opencode completed successfully.")
    else:
        print(f"Opencode exited with code {rc}.")

    return rc


if __name__ == "__main__":
    sys.exit(main())
