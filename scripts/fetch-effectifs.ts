/**
 * Récupère les effectifs de seconde GT de tous les lycées publics parisiens
 * via l'API OpenDataSoft de data.education.gouv.fr
 * Dataset : fr-en-lycee_gt-effectifs-niveau-sexe-lv
 *
 * Source des UAI : dataset HuggingFace fgaume/affelnet-paris-seuils-admission-lycees
 * + 2 lycées supplémentaires sans score (Henri IV, Louis Le Grand)
 *
 * Usage : npx tsx scripts/fetch-effectifs.ts
 * Output : data/effectifs-seconde.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'effectifs-seconde.json');

const HF_DATASET_URL =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume/affelnet-paris-seuils-admission-lycees&config=default&split=train&offset=0&length=100';

const ODS_API =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-lycee_gt-effectifs-niveau-sexe-lv/records';

interface LyceeEffectif {
  uai: string;
  nom: string;
  effectif2nde: number | null;
  annee: string | null;
  historique: Record<string, number>;
}

async function fetchLyceeList(): Promise<Array<{ code: string; nom: string }>> {
  const resp = await fetch(HF_DATASET_URL);
  const data = await resp.json();
  return data.rows.map((r: { row: { code: string; nom: string } }) => ({
    code: r.row.code,
    nom: r.row.nom,
  }));
}

async function fetchEffectifsForLycee(uai: string): Promise<{
  effectif2nde: number | null;
  annee: string | null;
  historique: Record<string, number>;
}> {
  const params = new URLSearchParams({
    where: `numero_lycee='${uai}'`,
    order_by: 'rentree_scolaire desc',
    select: 'rentree_scolaire,`2ndes_gt`,patronyme',
    limit: '10',
  });

  const resp = await fetch(`${ODS_API}?${params}`);
  const data = await resp.json();
  const results: Array<{ rentree_scolaire: string; '2ndes_gt': number }> = data.results || [];

  if (results.length === 0) {
    return { effectif2nde: null, annee: null, historique: {} };
  }

  const historique: Record<string, number> = {};
  for (const r of results) {
    historique[r.rentree_scolaire] = r['2ndes_gt'];
  }

  const latest = results[0];
  return {
    effectif2nde: latest['2ndes_gt'],
    annee: latest.rentree_scolaire,
    historique,
  };
}

async function main() {
  console.log('Récupération de la liste des lycées depuis HuggingFace...');
  const lycees = await fetchLyceeList();
  console.log(`${lycees.length} lycées trouvés\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results: LyceeEffectif[] = [];
  let errors = 0;

  for (let i = 0; i < lycees.length; i++) {
    const { code, nom } = lycees[i];
    process.stdout.write(`[${i + 1}/${lycees.length}] ${nom} (${code})... `);

    try {
      const data = await fetchEffectifsForLycee(code);
      results.push({ uai: code, nom, ...data });

      if (data.effectif2nde != null) {
        console.log(`${data.effectif2nde} élèves (${data.annee})`);
      } else {
        console.log('⚠ pas de données');
      }
    } catch (err) {
      console.log(`✗ erreur: ${err instanceof Error ? err.message : err}`);
      results.push({ uai: code, nom, effectif2nde: null, annee: null, historique: {} });
      errors++;
    }
  }

  // Tri par nom
  results.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'data.education.gouv.fr - dataset fr-en-lycee_gt-effectifs-niveau-sexe-lv',
    count: results.length,
    lycees: results,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nTerminé : ${results.length} lycées, ${errors} erreurs`);
  console.log(`Fichier : ${OUTPUT_FILE}`);
}

main().catch(console.error);
