import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSecteur1LyceeCatalog,
  matchCollegesByLycees,
  __resetReverseLookupCache,
} from '../collegeReverseLookup';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Jeu de données minimal :
//  - COL_A : secteur = {L1,L2,L3,L4,L5}  (unique)
//  - COL_B / COL_C : secteur = {L1,L2,L6,L7,L8}  (identique -> ambigu)
//  - bruit : une année ancienne + un enregistrement secteur 2 à ignorer.
function makeRecord(
  uai_college: string,
  nom_college: string,
  uai_lycee: string,
  annee = 2025,
  secteur = 1,
) {
  return { uai_college, nom_college, uai_lycee, nom_lycee: `LYC ${uai_lycee}`, annee, secteur };
}

const DATA = [
  ...['L1', 'L2', 'L3', 'L4', 'L5'].map((l) => makeRecord('CA', 'COLLEGE A', l)),
  ...['L1', 'L2', 'L6', 'L7', 'L8'].map((l) => makeRecord('CB', 'COLLEGE B', l)),
  ...['L1', 'L2', 'L6', 'L7', 'L8'].map((l) => makeRecord('CC', 'COLLEGE C', l)),
  // À ignorer :
  makeRecord('CA', 'COLLEGE A', 'L9', 2024, 1), // année ancienne
  makeRecord('CA', 'COLLEGE A', 'LX', 2025, 2), // secteur 2
];

beforeEach(() => {
  mockFetch.mockReset();
  __resetReverseLookupCache();
  mockFetch.mockResolvedValue({ ok: true, json: async () => DATA });
});

describe('getSecteur1LyceeCatalog', () => {
  it('ne liste que les lycées de secteur 1 de la dernière année, dédupliqués et triés', async () => {
    const catalog = await getSecteur1LyceeCatalog();
    const uais = catalog.map((l) => l.uai);
    expect(uais).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']);
    expect(uais).not.toContain('L9'); // année 2024
    expect(uais).not.toContain('LX'); // secteur 2
  });
});

describe('matchCollegesByLycees', () => {
  it('retourne un résultat vide pour une sélection vide', async () => {
    const res = await matchCollegesByLycees([]);
    expect(res.candidates).toEqual([]);
    expect(res.ambiguous).toBe(false);
  });

  it('identifie un collège unique quand les 5 lycées correspondent', async () => {
    const res = await matchCollegesByLycees(['L1', 'L2', 'L3', 'L4', 'L5']);
    expect(res.containment).toBe(true);
    expect(res.ambiguous).toBe(false);
    expect(res.candidates).toHaveLength(1);
    expect(res.candidates[0].uai).toBe('CA');
    expect(res.candidates[0].matched).toBe(5);
    expect(res.candidates[0].missing).toEqual([]);
  });

  it('propose les collèges compatibles et les lycées manquants sur sélection partielle', async () => {
    const res = await matchCollegesByLycees(['L1', 'L2', 'L3']);
    expect(res.containment).toBe(true);
    expect(res.candidates).toHaveLength(1); // seul COL_A contient L3
    const cand = res.candidates[0];
    expect(cand.uai).toBe('CA');
    expect(cand.matched).toBe(3);
    expect(cand.missing.map((m) => m.uai)).toEqual(['L4', 'L5']);
  });

  it('signale un groupe ambigu quand plusieurs collèges partagent le même secteur', async () => {
    const res = await matchCollegesByLycees(['L1', 'L2', 'L6', 'L7', 'L8']);
    expect(res.containment).toBe(true);
    expect(res.ambiguous).toBe(true);
    expect(res.candidates.map((c) => c.uai).sort()).toEqual(['CB', 'CC']);
  });

  it('bascule sur le meilleur recouvrement quand aucun collège ne contient toute la sélection', async () => {
    // L3 (COL_A) + L6 (COL_B/C) : aucun collège ne contient les deux.
    const res = await matchCollegesByLycees(['L3', 'L6']);
    expect(res.containment).toBe(false);
    expect(res.candidates.length).toBeGreaterThan(0);
    expect(res.candidates.every((c) => c.matched >= 1)).toBe(true);
  });
});
