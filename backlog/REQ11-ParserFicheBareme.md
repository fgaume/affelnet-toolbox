Les contributions textuelles de "fiches-barèmes" consistent en une liste hiérarchisée de voeux de lycée avec le résultat détaillé (affecté ou non, et certaines autres informations que je vais t'expliquer).
Les informations présentes pour chaque voeu sont les suivantes :

- rang du voeu (commence par 1, puis 2 etc...)
- bonus de secteur du voeu (0, 32640, 17760, 16800)
- un bonus boursier (0 ou 600)
- un score scolaire
- le score total du voeu
- _le nom du lycée visé_
- un type de formation (par ex. 2NDE GENERALE ET TECHNOLOGIQUE)
- un décision d'affectation (vide ou "Affecté(e)")
- _le seuil d'admission du lycée visé_

La problématique est que parfois les lignes ne sont pas bien structurées car le texte vient d'un copier/coller de tableau PDF et donc contient des sauts de lignes intempestifs. Par exemple tu vas recevoir quelque chose du genre :

1 0 0 0.000 0.000 0.000 HENRI IV
2NDE GENERALE ET
TECHNOLOGIQUE Affecté(e) 0
2 32640 0 600 3290.823 41330.823 VICTOR HUGO
2NDE GENERALE ET
TECHNOLOGIQUE
40738.994
3 17760 0 600 3290.823 26450.823 SOPHIE GERMAIN
2NDE GENERALE ET
TECHNOLOGIQUE
40730.823
4 32640 0 600 3290.823 41330.823 ARAGO
2NDE GENERALE ET
TECHNOLOGIQUE
40531.641
5 17760 0 600 3290.823 26450.823 HELENE BOUCHER
2NDE GENERALE ET
TECHNOLOGIQUE
40466.493
6 32640 0 600 3290.823 41330.823 MAURICE RAVEL
2NDE GENERALE ET
TECHNOLOGIQUE
25850.823
7 32640 0 600 3290.823 41330.823 PAUL VALERY
2NDE GENERALE ET
TECHNOLOGIQUE
16800.000
8 32640 0 600 3290.823 41330.823 SIMONE WEIL
2NDE GENERALE ET
TECHNOLOGIQUE
39154.499

au lieu de la structure attendue "propre" :

1 0 0 0.000 0.000 0.000 HENRI IV 2NDE GENERALE ET TECHNOLOGIQUE Affecté(e) 0
2 32640 0 600 3290.823 41330.823 VICTOR HUGO 2NDE GENERALE ET TECHNOLOGIQUE 40738.994
3 17760 0 600 3290.823 26450.823 SOPHIE GERMAIN 2NDE GENERALE ET TECHNOLOGIQUE 40730.823
4 32640 0 600 3290.823 41330.823 ARAGO 2NDE GENERALE ET TECHNOLOGIQUE 40531.641
5 17760 0 600 3290.823 26450.823 HELENE BOUCHER 2NDE GENERALE ET TECHNOLOGIQUE 40466.493
6 32640 0 600 3290.823 41330.823 MAURICE RAVEL 2NDE GENERALE ET TECHNOLOGIQUE 25850.823
7 32640 0 600 3290.823 41330.823 PAUL VALERY 2NDE GENERALE ET TECHNOLOGIQUE 16800.000
8 32640 0 600 3290.823 41330.823 SIMONE WEIL 2NDE GENERALE ET TECHNOLOGIQUE 39154.499

Et ce qui nous interesse c'est l'association entre le nom de lycée et le dernier champ qui est le seuil d'admission du lycée.

Ajoute du code Python pour que, à la réception de l'upload, les données soit "nettoyées" pour avoir des lignes cohérentes comme dans l'exemple puis sauvegarde le contenu de l'upload nettoyé. Ensuite extrais les seuils d'admission des lycées présents, que tu consolideras dans un autre fichier JSON unique global en ajoutant (append) le seuil dans le champ liste "seuils" qui correspond au lycée. Pour faire le rapprochement entre le nom du lycée reçu et son code (UAI), aides-toi du skill affelnet-uai.

La base du fichier JSON qui contiendra les nouveaux seuils est dans @backlog/affelnet-paris-seuils-admission-lycees.json, qu'il faut donc dupliquer initialement et consolider au fur et à mesure des uploads reçus.

Produis également un test avec l'exemple ci dessous.
