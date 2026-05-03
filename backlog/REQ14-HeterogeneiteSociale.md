Ajoute un 4ème graphique à la section "Lycées du secteur 1" (après Mentions TB, Taux d'accès et IPS) : l'Indice d'Hétérogénéité Sociale Relative (IHS).

L'IHS mesure la mixité sociale d'un lycée en divisant l'écart-type observé de l'IPS par l'écart-type maximal théorique (inégalité de Popoviciu). Un IHS proche de 0 = population homogène, proche de 1 = mixité maximale.

Données : dataset HuggingFace `fgaume/affelnet-paris-lycees-heterogeneite-sociale` (UAI, Nom, Annee, IPS_Moyen, IPS_EcartType, IHS).

Affichage : LineChart Recharts avec une ligne par lycée du secteur 1 + médiane Paris en pointillés. Axe Y auto, tooltip à 3 décimales. La source est référencée dans le panneau "Sources de données".
