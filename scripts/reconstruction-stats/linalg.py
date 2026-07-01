"""Petite algèbre linéaire sans dépendance (pas de numpy).

Suffisant pour résoudre le système 14x14 de reconstruction des stats, et le
cas surdéterminé (N > 14 fiches) par les équations normales / moindres carrés.
"""

from __future__ import annotations

Matrix = list[list[float]]
Vector = list[float]


def solve_square(a: Matrix, b: Vector) -> Vector:
    """Résout A x = b (A carrée) par élimination de Gauss + pivot partiel."""
    n = len(a)
    # Matrice augmentée, copie profonde.
    m = [row[:] + [b[i]] for i, row in enumerate(a)]

    for col in range(n):
        # Pivot partiel : ligne au plus grand |coef| dans la colonne.
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        if abs(m[pivot][col]) < 1e-12:
            raise ValueError(
                f"Système singulier (colonne {col}) : fiches non indépendantes."
            )
        m[col], m[pivot] = m[pivot], m[col]

        # Élimination.
        for r in range(n):
            if r == col:
                continue
            factor = m[r][col] / m[col][col]
            if factor == 0.0:
                continue
            for c in range(col, n + 1):
                m[r][c] -= factor * m[col][c]

    return [m[i][n] / m[i][i] for i in range(n)]


def solve_least_squares(a: Matrix, b: Vector) -> Vector:
    """Résout min ||A x - b|| via les équations normales A^T A x = A^T b.

    Utilisé quand on dispose de plus de 14 fiches : chaque fiche
    supplémentaire réduit l'impact des arrondis / bruit sur le résultat.
    """
    rows = len(a)
    cols = len(a[0])
    # ata[i][j] = sum_k a[k][i] * a[k][j]
    ata = [[0.0] * cols for _ in range(cols)]
    atb = [0.0] * cols
    for k in range(rows):
        row = a[k]
        bk = b[k]
        for i in range(cols):
            ri = row[i]
            atb[i] += ri * bk
            ata_i = ata[i]
            for j in range(cols):
                ata_i[j] += ri * row[j]
    return solve_square(ata, atb)


def solve(a: Matrix, b: Vector) -> Vector:
    """Résolution exacte si carré, moindres carrés si surdéterminé."""
    if len(a) == len(a[0]):
        return solve_square(a, b)
    return solve_least_squares(a, b)
