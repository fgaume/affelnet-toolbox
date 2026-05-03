import { useState, useEffect } from 'react';
import './DataSourcesPanel.css';

const SOURCES = [
  {
    category: 'Géolocalisation',
    items: [
      {
        name: 'Base Adresse Nationale',
        url: 'https://api-adresse.data.gouv.fr',
        description: 'Recherche et géocodage des adresses',
      },
    ],
  },
  {
    category: 'Carte scolaire',
    items: [
      {
        name: 'CapGeo Paris (DASCO)',
        url: 'https://capgeo2.paris.fr',
        description: 'Collège de secteur par adresse',
      },
      {
        name: 'Rectorat de Paris (ArcGIS)',
        url: 'https://services9.arcgis.com',
        description: 'Lycées de secteur, codes UAI, réseau de collèges',
      },
    ],
  },
  {
    category: 'Statistiques scolaires',
    items: [
      {
        name: 'IPS des lycées',
        url: 'https://data.education.gouv.fr/explore/dataset/fr-en-ips-lycees-ap2023/',
        description: 'Indice de Position Sociale et écart-type',
      },
      {
        name: 'Résultats des lycées',
        url: 'https://data.education.gouv.fr/explore/dataset/fr-en-indicateurs-de-resultat-des-lycees-gt_v2/',
        description: "Taux de mentions TB et taux d'accès en terminale",
      },
      {
        name: 'Liste des collèges',
        url: 'https://data.education.gouv.fr/explore/dataset/fr-en-college-effectifs-niveau-sexe-lv/',
        description: 'Annuaire des collèges publics parisiens',
      },
    ],
  },
  {
    category: 'Données Affelnet',
    items: [
      {
        name: 'Bonus IPS des collèges',
        url: 'https://huggingface.co/datasets/fgaume/affelnet-paris-bonus-ips-colleges',
        description: 'Bonus de points IPS par collège (0 à 1200 pts)',
      },
      {
        name: "Seuils d'admission",
        url: 'https://huggingface.co/datasets/fgaume/affelnet-paris-seuils-admission-lycees',
        description: "Barres d'admission par lycée et par année",
      },
      {
        name: 'Effectifs de 2nde des lycées',
        url: 'https://huggingface.co/datasets/fgaume/affelnet-paris-lycees-effectifs-2nde',
        description: "Nombre d'élèves en 2nde GT par lycée (rentrée 2025)",
      },
      {
        name: 'Effectifs de 3ème des collèges',
        url: 'https://huggingface.co/datasets/fgaume/affelnet-paris-colleges-effectifs-3eme',
        description: "Nombre d'élèves en 3ème par collège (rentrée 2025)",
      },
      {
        name: 'Secteurs année précédente',
        url: 'https://huggingface.co/datasets/fgaume/affelnet-paris-secteurs-2025',
        description: 'Affectations secteur 1 de 2025 (détection des changements)',
      },
      {
        name: 'Hétérogénéité sociale des lycées',
        url: 'https://huggingface.co/datasets/fgaume/affelnet-paris-lycees-heterogeneite-sociale',
        description: 'Indice d\'Hétérogénéité Sociale Relative (IHS) par lycée et par année',
      },
      {
        name: 'Statistiques par champ disciplinaire (2025)',
        url: 'https://huggingface.co/datasets/fgaume/affelnet-paris-statistiques-champs-disciplinaires',
        description: 'Moyennes et écarts-types historiques par année',
      },
      {
        name: "Modèles de statistiques d'harmonisation",
        url: 'https://huggingface.co/datasets/fgaume/affelnet-paris-stats-models',
        description: 'Modèles V1 et V2 pour le calcul du score harmonisé',
      },
    ],
  },
  {
    category: 'Projet open source',
    items: [
      {
        name: 'Code source (GitHub)',
        url: 'https://github.com/fgaume/affelnet-toolbox',
        description: 'Dépôt du projet Affelnet Toolbox',
      },
    ],
  },
];

export function DataSourcesPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="data-sources">
      <button className="data-sources-toggle" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path d="M20 6H12l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
        </svg>
        Sources de données
      </button>

      {open && (
        <div className="data-sources-overlay" onClick={() => setOpen(false)}>
          <div className="data-sources-modal" onClick={(e) => e.stopPropagation()}>
            <div className="data-sources-modal-header">
              <h3>Sources de données</h3>
              <button className="data-sources-close" onClick={() => setOpen(false)} aria-label="Fermer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="data-sources-modal-body">
              {SOURCES.map((group) => (
                <div key={group.category} className="data-sources-group">
                  <h4>{group.category}</h4>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.url}>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.name}
                        </a>
                        <span className="data-source-desc"> — {item.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
