La seconde structure de données que l'utilisateur pourra contribuer en upload textuel est la liste des notes des champs disciplinaires brutes (sur 20) et harmonisées (autour de 100)
Par exemple :

ARTS 14.00 97.169
EPS 15.00 102.069
FRANCAIS 11.33 96.997
HISTOIRE-GEO 11.33 95.979
LANGUES VIVANTES 12.67 98.295
MATHEMATIQUES 11.33 98.611
SCIENCES-TECHNO-DP 12.78 99.496

La connaissance de ces paires de valeurs va permettre de déduire la moyenne et l'écart-type académiques.
Ajoute donc sur upload textuel le traitement suivant :

- distinguer si l'upload est une liste de champs disciplinaire ou bien un extrait de résultats de voeux comme on a déjà traité
- si champs disciplinaires alors on consolide un fichier CSV global qui a la structure : "timestamp" "nom du champ" "note brute" "note harmonisée"
- sinon on effectue les traitements deja codés pour la fiche bareme de resultats d'affectation.

Précision : le "timestamp" sera sous la concatenation de annee,mois en chiffres,jour en nombre,heure,min,sec,msecs