Affiche le taux cible de boursiers pour chaque lycée à côté de son nom dans la liste des lycées de secteur.

Le taux cible est la proportion réglementaire d'élèves boursiers fixée par l'académie de Paris pour chaque lycée. C'est une information secondaire (pas un indicateur de performance), affichée par souci de complétude.

Données : champ `taux_cible_boursiers` (float entre 0 et 1) du dataset HuggingFace `fgaume/affelnet-paris-seuils-admission-lycees-boursiers` (joint sur UAI).

Affichage : petit badge discret "Cible boursiers : 25%" à droite du nom du lycée, avec un tooltip explicatif ("Cible réglementaire d'élèves boursiers fixée par l'académie"). Badge présent dans la liste des lycées des secteurs 0/2/3 et dans la liste "Collèges en concurrence" du secteur 1. Chargement non-bloquant. Pas de badge si la donnée est absente.
