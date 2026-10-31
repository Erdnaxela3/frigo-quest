import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'etancheite',
  title: 'Contrôle d\'étanchéité : méthodes et fréquences',
  skills: ['A1:4.01', 'A1:4.02', 'A1:4.03', 'A1:4.04', 'A1:4.05', 'A1:4.06', 'A1:4.07', 'A1:4.08', 'A1:4.09', 'A1:2.02'],
  level: 'L02',
  sections: [
    {
      title: 'Qui contrôle, quand, et pourquoi',
      body: `Le **détenteur** de l'équipement (le client exploitant) est responsable de faire contrôler l'étanchéité. Le contrôle est réalisé par une entreprise titulaire de l'**attestation de capacité**, par un technicien titulaire d'une attestation d'aptitude (A1, A2 ou E selon le cas ; la catégorie E ne permet pas d'intervenir sur le circuit).

La fréquence dépend de la charge en **t CO₂e = kg × PRP / 1000** (fréquences issues de sources secondaires concordantes, à vérifier sur le texte officiel) :

| Charge HFC | Sans détection | Avec système de détection |
|---|---|---|
| ≥ 5 et < 50 t CO₂e | 12 mois | 24 mois |
| ≥ 50 et < 500 t CO₂e | 6 mois | 12 mois |
| ≥ 500 t CO₂e | 3 mois | 6 mois, détection obligatoire |

Cas particuliers :
- **HFO** (R1234yf, R1234ze…) : seuils en kg, ≥ 1 kg → 12 mois, ≥ 10 kg → 6 mois, ≥ 100 kg → 3 mois (à vérifier).
- Équipement **hermétique** étiqueté < 10 t CO₂e : exempté (à vérifier).
- Contrôle à la **mise en service** et après toute modification du circuit (à vérifier).
- Après réparation d'une fuite : **nouveau contrôle dans le mois** qui suit (à vérifier).

Exemple du niveau L02 : R404A, 8 kg → 8 × 3922 / 1000 = 31,4 t CO₂e → **12 mois**. Dernier contrôle il y a 13 mois : le contrôle est **en retard**, il faut le noter.`,
    },
    {
      title: 'Préparer : le registre et les points de fuite',
      body: `**Avant toute mesure, on lit le registre** (item 4.02) : fluide, charge nominale, date du dernier contrôle, fuites déjà réparées, quantités ajoutées. Un appoint régulier est déjà un signe de fuite. Les anciens points de fuite sont les **premiers suspects**.

Les **points de fuite probables** (item 4.01) :
- Raccords **dudgeon** (flare), surtout soumis aux vibrations et aux cycles thermiques.
- **Valves Schrader** (obus) et vannes de service, en particulier quand le **bouchon** manque.
- **Presse-étoupes** des vannes et tiges de vanne.
- **Capillaires** qui vibrent et frottent sur le châssis (pressostats, détendeur).
- **Brasures**, surtout près des compresseurs et des supports.
- Joints de compresseur, bouchons de carter, voyants, filtres, soupapes.
- Échangeurs : corrosion des ailettes et des coudes, chocs.

L'**inspection visuelle et manuelle** (item 4.03) cherche : traces d'**huile** (le fluide qui fuit entraîne de l'huile, une tache grasse avec de la poussière collée), corrosion, vibrations anormales, frottements, bouchons absents, isolation abîmée. Touchez, regardez sous les raccords, utilisez une lampe et un miroir.`,
    },
    {
      title: 'La méthode indirecte',
      body: `La méthode indirecte (items 4.04 et 4.05) détecte la fuite par ses **effets sur le fonctionnement**, sans chercher le point précis. On l'utilise d'abord, idéalement **sans se raccorder** : manomètres fixes, régulateur électronique, sondes déjà en place.

On analyse :
- **Pressions** BP et HP comparées aux valeurs normales du registre.
- **Surchauffe** et **sous-refroidissement** : une fuite donne une surchauffe élevée et un sous-refroidissement faible.
- **Voyant liquide** : bulles ou mousse en marche stable.
- Niveau de liquide dans la bouteille, intensité absorbée par le compresseur, température de la chambre.

Si la méthode indirecte fait suspecter une fuite, on passe à la **méthode directe** pour la localiser.

Ne vous raccordez pas au manifold sans nécessité : chaque raccordement et chaque déconnexion relâche un peu de fluide.`,
    },
    {
      title: 'La méthode directe et le détecteur électronique',
      body: `La méthode directe localise la fuite. Sans intervention sur le circuit (item 4.07), on utilise :
- le **détecteur électronique** (item 4.08) ;
- le **produit moussant** pour confirmer et localiser précisément (item 4.06 lorsqu'on intervient sur le circuit) ;
- un **traceur UV** seulement s'il est compatible et autorisé par le fabricant (à vérifier).

Sur un circuit vide ou ouvert, la méthode directe avec intervention passe par une mise sous pression d'**azote** (voir la leçon Tirage au vide et tests de pression), éventuellement avec un gaz traceur azote/hydrogène.

Bien utiliser le détecteur électronique :
- **Préchauffage** du capteur, puis **vérification avec la fuite de référence** : sans cette vérification, un résultat négatif ne prouve rien. Sensibilité attendue de l'ordre de 5 g/an (à vérifier).
- Couper la ventilation et les ventilateurs dans les volumes confinés : le courant d'air dilue le fluide.
- Balayer **lentement**, environ **5 cm/s**, à moins de 5 mm de la surface.
- Sonder **sous** les raccords : les HFC sont **plus lourds que l'air**.
- Suivre l'ordre des points probables, en commençant par ceux du registre.
- Se méfier des **fausses alertes** : produits de nettoyage, solvants, aérosols, humidité.

Toute alarme se **confirme au produit moussant** au point exact : des bulles qui grossissent signent la fuite.`,
    },
    {
      title: 'Après le contrôle : réparer et consigner',
      body: `Fuite trouvée :
- Informer le détenteur. La fuite doit être **réparée sans délai**.
- Après réparation, **nouveau contrôle** pour vérifier l'efficacité, dans le mois qui suit (à vérifier).
- Si la fuite n'est pas réparée tout de suite, l'équipement reçoit un marquage « défaut d'étanchéité » (à vérifier).

Dans tous les cas, on **consigne** (item 4.09) :
- dans le **registre** de l'équipement : date, résultat, fuites trouvées et réparées, quantités ajoutées ;
- sur la **fiche d'intervention Cerfa n° 15497** ;
- sur l'**étiquette** apposée sur l'équipement : date du contrôle et date du **prochain contrôle** (à vérifier pour le format).

Les documents sont conservés **5 ans** (à vérifier). Un contrôle non consigné est, pour l'administration, un contrôle non fait.

Zéro fuite est un résultat possible : ne déclarez pas une fuite sans l'avoir confirmée par une deuxième méthode.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- **t CO₂e = kg × PRP / 1000** → seuils 5 / 50 / 500 → 12 / 6 / 3 mois, doublé avec détection.
- Toujours commencer par **le registre**.
- Ordre : inspection visuelle → méthode **indirecte** → méthode **directe** → confirmation au produit moussant → consignation.
- Détecteur : préchauffé, **vérifié sur fuite de référence**, balayage lent (5 cm/s), sonde **sous** les raccords.
- Fuite réparée → **recontrôle** ; tout est consigné sur la fiche Cerfa et le registre.
- Points de fuite classiques : **dudgeons, Schrader sans bouchon, capillaires qui frottent, presse-étoupes**.`,
    },
    {
      title: 'Erreurs fréquentes',
      body: `- Se tromper de fréquence parce qu'on a raisonné en kg au lieu de t CO₂e.
- Commencer à détecter avant d'avoir lu le registre.
- Utiliser un détecteur sans contrôle sur fuite de référence : un « rien trouvé » n'a alors aucune valeur.
- Balayer trop vite ou trop loin : le capteur n'a pas le temps de réagir.
- Sonder uniquement au-dessus des raccords.
- Déclarer une fuite sur une alarme près d'un flacon de nettoyant sans confirmation au produit moussant.
- Oublier la consignation : c'est une obligation légale, même quand il n'y a aucune fuite.
- Se raccorder au manifold « par habitude » lors d'un contrôle périodique.`,
    },
  ],
};

export default lesson;
