"""Tests for compute_stats.py — regression, formulas, and JSON update logic."""

import csv
import json
from pathlib import Path

import pytest

# Add scripts/ to path so we can import compute_stats
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from compute_stats import (
    linear_regression,
    compute_moyenne_ecart_type,
    read_notes_csv,
    update_stats,
    find_record,
    CURRENT_YEAR,
)

# ----- Test data from REQ13 -----

SAMPLE_1 = [
    ("ARTS", 14.00, 97.169),
    ("EPS", 15.00, 102.069),
    ("FRANCAIS", 11.33, 96.997),
    ("HISTOIRE-GEO", 11.33, 95.979),
    ("LANGUES VIVANTES", 12.67, 98.295),
    ("MATHEMATIQUES", 11.33, 98.611),
    ("SCIENCES-TECHNO-DP", 12.78, 99.496),
]

SAMPLE_2 = [
    ("ARTS", 15.00, 102.269),
    ("EPS", 16.00, 107.165),
    ("FRANCAIS", 13.00, 102.108),
    ("HISTOIRE-GEO", 13.00, 101.242),
    ("LANGUES VIVANTES", 13.67, 101.616),
    ("MATHEMATIQUES", 14.00, 105.369),
    ("SCIENCES-TECHNO-DP", 14.00, 103.845),
]


class TestLinearRegression:
    def test_two_points(self) -> None:
        """Simple 2-point regression for ARTS: (14, 97.169) and (15, 102.269)."""
        points = [(14.00, 97.169), (15.00, 102.269)]
        a, b = linear_regression(points)
        assert a == pytest.approx(5.1, rel=1e-3)
        assert b == pytest.approx(97.169 - 5.1 * 14.00, rel=1e-3)

    def test_perfect_line(self) -> None:
        """Exact linear data: y = 2x + 1."""
        points = [(1.0, 3.0), (2.0, 5.0), (3.0, 7.0)]
        a, b = linear_regression(points)
        assert a == pytest.approx(2.0)
        assert b == pytest.approx(1.0)

    def test_insufficient_points(self) -> None:
        with pytest.raises(ValueError, match="at least 2"):
            linear_regression([(1.0, 2.0)])

    def test_identical_x_values(self) -> None:
        with pytest.raises(ValueError, match="identical"):
            linear_regression([(5.0, 1.0), (5.0, 2.0)])


class TestMoyenneEcartType:
    def test_known_values(self) -> None:
        """Verify formulas: sigma = 10/a, mu = (100-b)/a."""
        a, b = 5.1, 25.769
        moyenne, ecart_type = compute_moyenne_ecart_type(a, b)
        assert ecart_type == pytest.approx(10.0 / 5.1, rel=1e-5)
        assert moyenne == pytest.approx((100.0 - 25.769) / 5.1, rel=1e-5)

    def test_zero_slope(self) -> None:
        with pytest.raises(ValueError, match="zero"):
            compute_moyenne_ecart_type(0.0, 5.0)


class TestReadNotesCsv:
    def test_reads_and_groups(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "notes.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["timestamp", "discipline", "note_brute", "note_harmonisee"])
            writer.writeheader()
            for disc, nb, nh in SAMPLE_1 + SAMPLE_2:
                writer.writerow({
                    "timestamp": "2026-04-18T00:00:00Z",
                    "discipline": disc,
                    "note_brute": nb,
                    "note_harmonisee": nh,
                })
        groups = read_notes_csv(csv_path)
        assert len(groups) == 7
        assert len(groups["ARTS"]) == 2
        assert len(groups["MATHEMATIQUES"]) == 2


def _write_test_csv(path: Path, samples: list[list[tuple[str, float, float]]]) -> None:
    """Write one or more sample sets to a CSV file."""
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "discipline", "note_brute", "note_harmonisee"])
        writer.writeheader()
        for sample in samples:
            for disc, nb, nh in sample:
                writer.writerow({
                    "timestamp": "2026-04-18T00:00:00Z",
                    "discipline": disc,
                    "note_brute": nb,
                    "note_harmonisee": nh,
                })


class TestUpdateStats:
    def test_creates_json_from_scratch(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "notes.csv"
        json_path = tmp_path / "stats.json"
        _write_test_csv(csv_path, [SAMPLE_1, SAMPLE_2])

        updated = update_stats(csv_path, json_path)

        assert len(updated) == 7
        data = json.loads(json_path.read_text(encoding="utf-8"))
        assert len(data) == 7
        maths = find_record(data, CURRENT_YEAR, "MATHEMATIQUES")
        assert maths is not None
        assert maths["precision"] == 2
        assert "moyenne" in maths
        assert "ecart-type" in maths
        assert "mis_a_jour" in maths

    def test_skips_when_precision_unchanged(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "notes.csv"
        json_path = tmp_path / "stats.json"
        _write_test_csv(csv_path, [SAMPLE_1, SAMPLE_2])

        # First run
        update_stats(csv_path, json_path)
        data_after_first = json.loads(json_path.read_text(encoding="utf-8"))

        # Second run — same data
        updated = update_stats(csv_path, json_path)
        assert updated == []

        data_after_second = json.loads(json_path.read_text(encoding="utf-8"))
        assert data_after_first == data_after_second

    def test_updates_when_new_data_added(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "notes.csv"
        json_path = tmp_path / "stats.json"

        # First run with 2 points
        _write_test_csv(csv_path, [SAMPLE_1, SAMPLE_2])
        update_stats(csv_path, json_path)
        data1 = json.loads(json_path.read_text(encoding="utf-8"))
        maths1 = find_record(data1, CURRENT_YEAR, "MATHEMATIQUES")
        assert maths1 is not None
        assert maths1["precision"] == 2

        # Add a 3rd point for MATHS
        with csv_path.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["timestamp", "discipline", "note_brute", "note_harmonisee"])
            writer.writerow({
                "timestamp": "2026-04-19T00:00:00Z",
                "discipline": "MATHEMATIQUES",
                "note_brute": 12.5,
                "note_harmonisee": 101.5,
            })

        updated = update_stats(csv_path, json_path)
        assert "MATHEMATIQUES" in updated
        # Other disciplines should NOT be updated (still 2 points)
        assert len(updated) == 1

        data2 = json.loads(json_path.read_text(encoding="utf-8"))
        maths2 = find_record(data2, CURRENT_YEAR, "MATHEMATIQUES")
        assert maths2 is not None
        assert maths2["precision"] == 3

    def test_preserves_historical_records(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "notes.csv"
        json_path = tmp_path / "stats.json"

        # Seed with historical data
        historical = [
            {"annee": 2025, "champ": "MATHEMATIQUES", "moyenne": 11.985, "ecart-type": 3.826},
            {"annee": 2025, "champ": "ARTS", "moyenne": 12.5, "ecart-type": 1.98},
        ]
        json_path.write_text(json.dumps(historical), encoding="utf-8")

        _write_test_csv(csv_path, [SAMPLE_1, SAMPLE_2])
        update_stats(csv_path, json_path)

        data = json.loads(json_path.read_text(encoding="utf-8"))
        # 2 historical + 7 new
        assert len(data) == 9
        # Historical records preserved
        assert find_record(data, 2025, "MATHEMATIQUES") is not None
        assert find_record(data, 2025, "ARTS") is not None

    def test_no_csv_returns_empty(self, tmp_path: Path) -> None:
        csv_path = tmp_path / "nonexistent.csv"
        json_path = tmp_path / "stats.json"
        assert update_stats(csv_path, json_path) == []

    def test_maths_regression_values(self, tmp_path: Path) -> None:
        """Verify MATHEMATIQUES stats with the 2 test data points."""
        csv_path = tmp_path / "notes.csv"
        json_path = tmp_path / "stats.json"
        _write_test_csv(csv_path, [SAMPLE_1, SAMPLE_2])

        update_stats(csv_path, json_path)

        data = json.loads(json_path.read_text(encoding="utf-8"))
        maths = find_record(data, CURRENT_YEAR, "MATHEMATIQUES")
        assert maths is not None

        # Manual verification:
        # Points: (11.33, 98.611), (14.00, 105.369)
        # a = (105.369 - 98.611) / (14.00 - 11.33) = 6.758 / 2.67 ≈ 2.53109
        # b = 98.611 - 2.53109 * 11.33 ≈ 69.94
        # ecart-type = 1/(10*a) ≈ 0.03951 → that's very small...
        # Actually the harmonized note formula is H = 10*(10 + (T-mu)/sigma)
        # So H = 10*10 + 10*(T-mu)/sigma = 100 + 10/sigma * T - 10*mu/sigma
        # Therefore: a = 10/sigma, b = 100 - 10*mu/sigma
        # sigma = 10/a, mu = (100-b)*sigma/10 = (100-b)/a
        # H = 10*(10 + (T-mu)/sigma) → a = 10/sigma, b = 100 - 10*mu/sigma
        # sigma = 10/a, mu = (100-b)/a
        a = (105.369 - 98.611) / (14.00 - 11.33)
        b = 98.611 - a * 11.33
        expected_ecart = 10.0 / a
        expected_moyenne = (100.0 - b) / a

        assert maths["ecart-type"] == pytest.approx(expected_ecart, rel=1e-4)
        assert maths["moyenne"] == pytest.approx(expected_moyenne, rel=1e-4)
