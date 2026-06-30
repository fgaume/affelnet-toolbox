import { describe, it, expect } from 'vitest';
import { parseGrades, normalizeLabel } from '../gradeParser';
import type { ParsedSubject } from '../gradeParser';

function bySubject(matched: ParsedSubject[]) {
  return Object.fromEntries(matched.map((m) => [m.subject, m]));
}

describe('normalizeLabel', () => {
  it('retire accents, ponctuation et casse', () => {
    expect(normalizeLabel('MATHÉMATIQUES')).toBe('mathematiques');
    expect(normalizeLabel('E.M.C.')).toBe('e m c');
    expect(normalizeLabel('Histoire-Géographie')).toBe('histoire geographie');
  });
});

describe('parseGrades — variance des libellés', () => {
  it('reconnaît maths sous différentes formes', () => {
    for (const label of ['Maths 14', 'MATHEMATIQUES 14', 'Mathématiques 14', 'math 14']) {
      const r = parseGrades(label);
      const m = bySubject(r.matched);
      expect(m.MATHEMATIQUES?.value).toBe(14);
    }
  });

  it('reconnaît EMC avec ou sans points', () => {
    expect(bySubject(parseGrades('EMC 15').matched).EMC?.value).toBe(15);
    expect(bySubject(parseGrades('E.M.C. 15').matched).EMC?.value).toBe(15);
    expect(
      bySubject(parseGrades('Enseignement moral et civique 15').matched).EMC?.value,
    ).toBe(15);
  });

  it('départage physique-chimie de chimie seule (alias le plus long gagne)', () => {
    const m = bySubject(parseGrades('Physique-Chimie 12').matched);
    expect(m.PHYSIQUE_CHIMIE?.value).toBe(12);
  });
});

describe('parseGrades — EPS et abréviations', () => {
  it('reconnaît EPS sous ses nombreuses formes', () => {
    for (const label of [
      'EPS 14',
      'E.P.S 14',
      'E.P.S. 14',
      'Sport 14',
      'ED. PHYS 14',
      'Éduc. Phys. 14',
      'Education physique et sportive 14',
    ]) {
      const m = bySubject(parseGrades(label).matched);
      expect(m.EPS?.value, label).toBe(14);
    }
  });

  it('tolère une faute de frappe (Levenshtein ≤ 1)', () => {
    expect(bySubject(parseGrades('Mathématqiues 14').matched).MATHEMATIQUES?.value).toBe(14);
    expect(bySubject(parseGrades('Technologei 13').matched).TECHNOLOGIE?.value).toBe(13);
  });

  it("ne confond pas éducation civique (EMC) et éducation physique (EPS)", () => {
    const m = bySubject(parseGrades('Education civique 15').matched);
    expect(m.EMC?.value).toBe(15);
    expect(m.EPS).toBeUndefined();
  });
});

describe('parseGrades — langues', () => {
  it('mappe anglais sur LV1', () => {
    const m = bySubject(parseGrades('Anglais 16').matched);
    expect(m.LV1?.value).toBe(16);
  });

  it('mappe une langue non-anglaise sur LV2', () => {
    const m = bySubject(parseGrades('Espagnol 13').matched);
    expect(m.LV2?.value).toBe(13);
  });

  it('anglais=LV1 et espagnol=LV2 ensemble', () => {
    const m = bySubject(parseGrades('Anglais 16\nEspagnol 13').matched);
    expect(m.LV1?.value).toBe(16);
    expect(m.LV2?.value).toBe(13);
  });

  it('signale un conflit si deux langues non-anglaises', () => {
    const r = parseGrades('Espagnol 13\nAllemand 11');
    expect(r.matched.find((m) => m.subject === 'LV2')).toBeUndefined();
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].kind).toBe('LV2_AMBIGUOUS');
    expect(r.conflicts[0].candidates).toHaveLength(2);
  });
});

describe('parseGrades — notes multiples et moyennes', () => {
  it('moyenne les notes trimestrielles sur plusieurs lignes', () => {
    const m = bySubject(parseGrades('Maths 12\nMaths 14\nMaths 13').matched);
    expect(m.MATHEMATIQUES?.rawValues).toEqual([12, 14, 13]);
    expect(m.MATHEMATIQUES?.value).toBe(13);
  });

  it('moyenne plusieurs notes sur une même ligne (colonnes trimestres)', () => {
    const m = bySubject(parseGrades('Français 10 12 14').matched);
    expect(m.FRANCAIS?.rawValues).toEqual([10, 12, 14]);
    expect(m.FRANCAIS?.value).toBe(12);
  });

  it('gère la virgule décimale et la forme /20', () => {
    const m = bySubject(parseGrades('SVT 14,5/20').matched);
    expect(m.SVT?.value).toBe(14.5);
  });
});

describe('parseGrades — lignes ignorées', () => {
  it('ignore les lignes sans matière ou sans note', () => {
    const r = parseGrades('Bulletin du 2e trimestre\nMaths 14\nAbsences : 3 demi-journées\nMoyenne générale');
    const m = bySubject(r.matched);
    expect(m.MATHEMATIQUES?.value).toBe(14);
    expect(r.ignoredLines).toContain('Bulletin du 2e trimestre');
    expect(r.ignoredLines).toContain('Moyenne générale');
  });

  it("n'inclut pas le coefficient comme une note", () => {
    const m = bySubject(parseGrades('Maths 14 coef 3').matched);
    expect(m.MATHEMATIQUES?.rawValues).toEqual([14]);
    expect(m.MATHEMATIQUES?.value).toBe(14);
  });
});
