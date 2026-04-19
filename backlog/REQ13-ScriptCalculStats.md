Tu dois développer un script Python qui sera executé en ligne de commande manuellement sur mon Mac (ou via crontab). Il ne fait donc pas partie du backend existant, c'est un script à part, que tu placeras dans un nouveau dossier "scripts" à la racine du repo.

Ce script exploite en entrée le fichier des notes harmonisées précédent (notes-harmonisees.csv) produit par le backend et qui évolue régulièrement au fur et à mesure que des données sont upload.

Pour chacun des champs disciplinaire, le script va effectuer une régression linéaire : la variable X sera la note brute, la variable Y sera la note harmonisée.
Tu calculeras pour chaque champ disciplinaire le coefficient directeur a et l'ordonnée à l'origine b de la droite de régression. De là tu pourras en déduire la moyenne et l'écart-type académique de chaque champ diciplinaire à l'aide des formules suivantes :

- ecart-type = 1 / (10a)
- moyenne = -[10 + (b / 10a)]

Tu consolideras un fichier global des statistiques sous forme JSON affelnet-paris-statistiques-champs-disciplinaires.json de la forme suivante :

[
  {
    "annee": <annee courante>,
    "champ": "MATHEMATIQUES",
    "moyenne": 11.985,
    "ecart-type": 3.82599
    "precision": 3
    "mis_a_jour": <date mis à jour>
  },
 ...

pour lequel le champ "précision" correspond au nombre de mesures dont tu as disposé pour faire la regression, et "mis_a_jour" la date/heure de dernière mise à jour de ce record.

A chaque execution, pour chaque champ disciplinaire, tu regardes dans notes-harmonisees.csv si tu as une mesure de plus que celle présente dans le fichier affelnet-paris-statistiques-champs-disciplinaires.json. Si c'est le cas, tu refais le calcul avec les nouveaux points, et tu mets à jour le fichier affelnet-paris-statistiques-champs-disciplinaires.json.

Une fois la boucle sur les champ disciplinaire terminée, si le fichier affelnet-paris-statistiques-champs-disciplinaires.json a été modifié, alors déploie la mise à jour sur hugging face en t'appuyant sur le skill huggingface-datasets. 

Voici des données de test :

ARTS 14.00 97.169
EPS 15.00 102.069
FRANCAIS 11.33 96.997
HISTOIRE-GEO 11.33 95.979
LANGUES VIVANTES 12.67 98.295
MATHEMATIQUES 11.33 98.611
SCIENCES-TECHNO-DP 12.78 99.496

ARTS 15.00 102.269
EPS 16.00 107.165
FRANCAIS 13.00 102.108
HISTOIRE-GEO 13.00 101.242
LANGUES VIVANTES 13.67 101.616
MATHEMATIQUES 14.00 105.369
SCIENCES-TECHNO-DP 14.00 103.845

