// src/services/collegesConcurrenceApi.ts

const ARCGIS_BASE = 'https://services9.arcgis.com/ekT8MJFiVh8nvlV5/arcgis/rest/services/Affectation_Lyc%C3%A9es/FeatureServer/0/query';

interface CollegeRef {
  uai: string;
  nom: string;
}

export async function fetchCollegesForLycee(uaiLycee: string): Promise<CollegeRef[]> {
  const params = new URLSearchParams({
    outFields: 'Réseau,Nom_Tete',
    returnGeometry: 'false',
    f: 'pjson',
    orderByFields: 'Nom_Tete',
  });
  const whereClause = `secteur='1' and UAI='${uaiLycee}'`;
  const url = `${ARCGIS_BASE}?${params}&where=${encodeURIComponent(whereClause).replace(/%27/g, "'").replace(/%3D/g, '=')}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Erreur de connexion à l\'annuaire Affelnet');

  const data = await response.json();
  return (data.features || []).map(
    (f: { attributes: { Réseau: string; Nom_Tete: string } }) => ({
      uai: f.attributes.Réseau,
      nom: f.attributes.Nom_Tete,
    })
  );
}
