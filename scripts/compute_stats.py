#!/usr/bin/env python3
"""Compute academic stats (moyenne, ecart-type) from harmonized grades via linear regression.

Reads backend/data/notes-harmonisees.csv, computes per-discipline stats,
updates the HuggingFace dataset JSON, and pushes if changed.

Usage:
    uv run scripts/compute_stats.py
"""

import csv
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

# ----- Paths -----
REPO_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = REPO_ROOT / "backend" / "data" / "notes-harmonisees.csv"

HF_DATASET_DIR = Path.home() / "Code" / "college" / "hf" / "affelnet-paris-statistiques-champs-disciplinaires"
JSON_FILENAME = "affelnet-paris-statistiques-champs-disciplinaires.json"
JSON_PATH = HF_DATASET_DIR / JSON_FILENAME

HF_REPO_ID = "fgaume/affelnet-paris-statistiques-champs-disciplinaires"

CURRENT_YEAR = datetime.now().year


class StatsRecord(TypedDict, total=False):
    annee: int
    champ: str
    moyenne: float
    ecart_type: float  # JSON key is "ecart-type" but we use _ internally
    precision: int
    mis_a_jour: str


# ----- Linear regression -----

def linear_regression(points: list[tuple[float, float]]) -> tuple[float, float]:
    """Compute slope (a) and intercept (b) via least-squares regression.

    Returns (a, b) where y = a*x + b.
    Raises ValueError if fewer than 2 points or all x values are identical.
    """
    n = len(points)
    if n < 2:
        raise ValueError(f"Need at least 2 points, got {n}")

    sum_x = sum(x for x, _ in points)
    sum_y = sum(y for _, y in points)
    sum_xy = sum(x * y for x, y in points)
    sum_x2 = sum(x * x for x, _ in points)

    denom = n * sum_x2 - sum_x * sum_x
    if denom == 0:
        raise ValueError("All x values are identical — cannot compute regression")

    a = (n * sum_xy - sum_x * sum_y) / denom
    b = (sum_y - a * sum_x) / n
    return a, b


def compute_moyenne_ecart_type(a: float, b: float) -> tuple[float, float]:
    """Derive academic moyenne and ecart-type from regression coefficients.

    The harmonized grade formula is: H = 10 * (10 + (T - mu) / sigma)
    Expanding: H = 100 + (10/sigma)*T - (10*mu/sigma)
    So: a = 10/sigma and b = 100 - 10*mu/sigma

    Therefore:
        sigma = 10 / a
        mu = (100 - b) / a
    """
    if a == 0:
        raise ValueError("Slope is zero — cannot derive stats")
    ecart_type = 10.0 / a
    moyenne = (100.0 - b) / a
    return moyenne, ecart_type


# ----- CSV reading -----

def read_notes_csv(path: Path) -> dict[str, list[tuple[float, float]]]:
    """Read CSV and group (note_brute, note_harmonisee) by discipline."""
    groups: dict[str, list[tuple[float, float]]] = {}
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            discipline = row["discipline"]
            x = float(row["note_brute"])
            y = float(row["note_harmonisee"])
            groups.setdefault(discipline, []).append((x, y))
    return groups


# ----- JSON handling -----

def load_stats_json(path: Path) -> list[dict]:
    """Load existing stats JSON. Returns empty list if file doesn't exist."""
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def save_stats_json(path: Path, data: list[dict]) -> None:
    """Write stats JSON with consistent formatting."""
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def find_record(data: list[dict], annee: int, champ: str) -> dict | None:
    """Find existing record for (annee, champ). Returns None if not found."""
    return next((r for r in data if r.get("annee") == annee and r.get("champ") == champ), None)


# ----- Main logic -----

def update_stats(csv_path: Path = CSV_PATH, json_path: Path = JSON_PATH) -> list[str]:
    """Compute stats and update JSON. Returns list of updated discipline names."""
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}")
        return []

    groups = read_notes_csv(csv_path)
    if not groups:
        print("No data in CSV")
        return []

    data = load_stats_json(json_path)
    updated: list[str] = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for discipline, points in sorted(groups.items()):
        n = len(points)
        existing = find_record(data, CURRENT_YEAR, discipline)

        # Skip if precision hasn't increased
        if existing and existing.get("precision", 0) >= n:
            continue

        if n < 2:
            print(f"  {discipline}: only {n} point(s), skipping (need >= 2)")
            continue

        a, b = linear_regression(points)
        moyenne, ecart_type = compute_moyenne_ecart_type(a, b)

        record = {
            "annee": CURRENT_YEAR,
            "champ": discipline,
            "moyenne": round(moyenne, 5),
            "ecart-type": round(ecart_type, 5),
            "precision": n,
            "mis_a_jour": now,
        }

        if existing:
            # Update in place
            idx = data.index(existing)
            data[idx] = record
        else:
            data.append(record)

        updated.append(discipline)
        print(f"  {discipline}: moyenne={record['moyenne']}, ecart-type={record['ecart-type']} (n={n})")

    if updated:
        save_stats_json(json_path, data)
        print(f"\nUpdated {len(updated)} discipline(s) in {json_path.name}")

    return updated


def push_to_hf(updated: list[str], precision: int) -> None:
    """Push updated JSON to HuggingFace using hf CLI."""
    disciplines_str = ", ".join(updated)
    message = f"update stats: {disciplines_str} (precision: {precision})"

    print(f"\nPushing to HuggingFace: {message}")
    subprocess.run(
        [
            "hf", "upload", HF_REPO_ID, ".",
            "--type=dataset",
            f"--include={JSON_FILENAME}",
            f"--commit-message={message}",
        ],
        cwd=HF_DATASET_DIR,
        check=True,
    )
    print("Push successful!")


def main() -> None:
    print(f"Computing stats for {CURRENT_YEAR}...")
    print(f"CSV: {CSV_PATH}")
    print(f"JSON: {JSON_PATH}\n")

    updated = update_stats()

    if not updated:
        print("\nNo changes — nothing to push.")
        return

    # Read back precision from the updated JSON for commit message
    data = load_stats_json(JSON_PATH)
    precisions = [r.get("precision", 0) for r in data if r.get("annee") == CURRENT_YEAR and r.get("champ") in updated]
    max_precision = max(precisions) if precisions else 0

    push_to_hf(updated, max_precision)


if __name__ == "__main__":
    main()
