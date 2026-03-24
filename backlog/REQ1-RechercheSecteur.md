Cette application "Affelnet Paris" va offrir un ensemble d'informations concernant la procédure d'affectation aux lycées publics parisiens.
La première exigence est de permettre à l'utilisateur de :

- déterminer son collège de secteur à partir de son adresse domicile parisienne
- déduire les lycées de secteur Affelnet à partir du collège de secteur précédent

N'affiche pas d'informations particulières concernant les établissements pour l'instant. Mets juste un lien vers la page officielle du Rectorat qui est https://data.education.gouv.fr/pages/fiche-etablissement/?code_etab=<UAI>
Par exemple : https://data.education.gouv.fr/pages/fiche-etablissement/?code_etab=0750667T pour Condorcet

Pour chaque lycée de secteur 1 affiche une pastille de couleur qui illustre la difficulté d'admission en fonction du dernier seuil d'admission :

- Noir : seuil > 40731 (inacessible sans bonus)
- Rouge : seuil > 40600 (difficilement accessible)
- Orange : seuil > 40250 (moyennement accessible)
- Bleu : seuil > 38000 (facilement accessible mais uniquement en secteur 1)
- Vert sinon (très facilemenet accessible, accessible en secteur > 1)

Ajoute la signification de ces couleurs quelque part (par exemple en mouseover sur la pastille, et un autre mode pour le mobile)