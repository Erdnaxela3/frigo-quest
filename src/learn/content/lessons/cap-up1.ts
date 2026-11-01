import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'cap-up1',
  title: 'CAP UP1 : lire un dossier technique, quantitatifs, préparer l\'intervention',
  skills: ['CAP:UP1.dossier', 'CAP:UP1.quantitatif', 'CAP:UP1.securite'],
  sections: [
    {
      title: 'L\'épreuve EP1',
      body: `L'épreuve **EP1 « Préparation d'une réalisation »** (unité UP1, coefficient 2) est une épreuve **écrite de 3 h** en forme ponctuelle ; en lycée ou en CFA habilité, elle est évaluée en **CCF** (deux situations, en 1re et en 2e année). À partir d'un **dossier technique** (une chambre froide, une installation de climatisation…), tu dois :

- lire et exploiter les plans et schémas ;
- établir des **quantitatifs** (longueurs de tube, raccords, accessoires) ;
- **choisir le matériel** dans des documentations constructeurs ;
- **préparer et sécuriser l'intervention** (outillage, EPI, consignation, organisation).

C'est une épreuve de méthode : la plupart des réponses sont **dans le dossier**. Il faut savoir les trouver et justifier ses choix.`,
    },
    {
      title: 'Le contenu d\'un dossier technique',
      body: `| Document | Ce qu'on y cherche |
|---|---|
| Cahier des charges / CCTP | ce que le client demande : températures, denrées, contraintes |
| Plans du bâtiment (vue en plan, coupe, élévation) | emplacement des équipements, cheminement des tuyauteries, cotes |
| Schéma frigorifique (fluidique) | les composants, leur ordre, les diamètres de lignes |
| Schéma électrique | puissance et commande, protections, repérage des appareils |
| Nomenclature | liste des composants avec références et quantités |
| Bilan frigorifique | puissance nécessaire |
| Documentations constructeurs | caractéristiques, tableaux de sélection, notices de montage |

### Lire un plan

- Vérifier l'**échelle** (1/50 : 1 cm sur le plan = 50 cm réels ; 1/100 : 1 cm = 1 m).
- Les **cotes** sont en principe en millimètres sur les plans de bâtiment ; une cote écrite prime sur une mesure à la règle.
- Repérer le **nord**, les niveaux, les ouvertures, les zones techniques.
- Faire le lien entre la vue en plan (de dessus) et la coupe (de côté) pour les hauteurs.`,
    },
    {
      title: 'Symboles normalisés',
      body: `Les schémas frigorifiques suivent des symboles normalisés (NF EN 1861 pour les schémas de systèmes frigorifiques) ; les schémas électriques suivent la CEI 60617. Ce qu'il faut savoir reconnaître sur un schéma frigorifique :

- **Compresseur**, **condenseur** et **évaporateur** (échangeurs, souvent avec ventilateur).
- **Détendeur thermostatique** avec son bulbe (ligne pointillée vers l'aspiration) et son égalisation.
- **Électrovanne** (vanne avec bobine), **vanne manuelle**, **vanne de service**.
- **Filtre déshydrateur**, **voyant liquide**, **réservoir**, **séparateur d'huile**.
- **Pressostats** BP et HP, **thermostat**, souvent représentés par un cercle avec des lettres (P pour pression, T pour température, selon la légende du dossier), **soupape de sécurité**.
- Lignes : **refoulement**, **liquide**, **aspiration**, souvent différenciées par le trait ou la couleur dans le dossier.

Méthode : suivre le fluide depuis le refoulement du compresseur jusqu'à l'aspiration, en nommant chaque composant traversé. Si tu bloques sur un symbole, la **légende** du dossier est souvent là pour ça.`,
    },
    {
      title: 'Établir un quantitatif',
      body: `Un quantitatif liste **tout ce qu'il faut commander** pour réaliser le travail. On procède ligne par ligne sur le plan.

1. Relever chaque tronçon de tuyauterie avec son **diamètre** (sur le schéma frigorifique ou la notice du groupe).
2. Mesurer les longueurs (horizontal sur la vue en plan, vertical sur la coupe).
3. Ajouter une **marge de chute** si le sujet le demande (par exemple 10 %).
4. Compter les **raccords** : coudes, tés, manchons, réductions, raccords flare.
5. Compter les **supports** selon l'espacement imposé.
6. Ajouter l'**isolant** (ligne d'aspiration), les **accessoires** (filtre, voyant, électrovanne, vannes), la brasure, l'azote, le fluide.

### Exemple (hypothèses du sujet)

Liaison groupe → évaporateur : 8 m horizontaux + 2,5 m verticaux, en 3/8" (liquide) et 5/8" (aspiration), marge de chute 10 %, un support tous les 1 m sur l'horizontale.

| Article | Calcul | Quantité |
|---|---|---|
| Tube 3/8" | (8 + 2,5) × 1,10 | 11,55 m → 12 m |
| Tube 5/8" | (8 + 2,5) × 1,10 | 11,55 m → 12 m |
| Isolant 5/8" | longueur de l'aspiration | 12 m |
| Supports | 8 m / 1 m, + 1 | 9 |

Arrondis toujours **au-dessus**, à l'unité de vente (couronne, barre, boîte).`,
    },
    {
      title: 'Choisir le matériel',
      body: `On choisit dans les **tableaux de sélection constructeurs** à partir de quelques données :

- **Fluide** : il conditionne le détendeur (corps et orifice), l'huile, le filtre.
- **Puissance frigorifique** et **températures** (évaporation, condensation) : compresseur, évaporateur, condenseur, orifice du détendeur.
- **Diamètres des lignes** : raccords, vannes, filtre, voyant, électrovanne doivent correspondre.
- **Tension et puissance électrique** : contacteur, protections, câbles.
- **Pression maximale admissible (PS)** : les composants doivent la supporter.

Dans la réponse, **justifie** : « Je choisis le filtre X car il est prévu pour le R449A, en raccord 3/8" à braser, et sa capacité couvre la puissance de Y kW. » Un choix non justifié perd des points même s'il est juste.`,
    },
    {
      title: 'Préparer et sécuriser l\'intervention',
      body: `- **Liste d'outillage** : manifold, pompe à vide et vacuomètre, balance, station de récupération, bouteille d'azote avec détendeur, chalumeau, coupe-tube, ébavureur, cintreuse, dudgeonnière, clé dynamométrique, multimètre, pince ampèremétrique, détecteur de fuites.
- **EPI** : lunettes, gants (froid et chaleur), chaussures de sécurité, protection auditive si besoin.
- **Électricité** : intervenir avec une **habilitation** adaptée (NF C 18-510) et **consigner** avant tout travail. Le référentiel du CAP vise le niveau **B1V** (exécutant de travaux électriques, y compris au voisinage) ; en entreprise, un frigoriste dépanneur reçoit souvent **BR** (intervention BT générale) et **BC** (consignation). C'est l'employeur qui délivre l'habilitation.
- **Travaux par points chauds** : permis de feu si le site l'exige, extincteur, protection des matériaux combustibles.
- **Coactivité** : se coordonner avec les autres corps de métier (plan de prévention sur un site client).
- **Environnement** : prévoir les bouteilles de récupération, le tri des déchets (huile, cuivre, emballages), la fiche d'intervention.
- **Organisation** : ordre des tâches, approvisionnement, accès, horaires du client.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- EP1 = écrit de 3 h (coef 2) sur dossier technique, ou CCF : lecture, quantitatif, choix, préparation.
- Échelle : 1/50 → 1 cm = 50 cm. Cote écrite > mesure à la règle.
- Schéma frigorifique : suivre le fluide refoulement → condenseur → liquide → détendeur → évaporateur → aspiration.
- Quantitatif : longueurs par diamètre + chute, raccords, supports, isolant, accessoires, consommables ; arrondir au-dessus.
- Tout choix de matériel se **justifie** par le fluide, la puissance, le diamètre, la tension, la PS.
- Préparer : outillage, EPI, habilitation et consignation, permis de feu, déchets.

### Erreurs fréquentes

- Oublier les longueurs verticales (lues sur la coupe, pas sur la vue en plan).
- Confondre la ligne liquide (petit diamètre) et l'aspiration (gros diamètre).
- Choisir un composant au bon diamètre mais pour un autre fluide.
- Donner un résultat sans unité ou sans justification.
- Négliger la partie sécurité : elle rapporte des points faciles.`,
    },
  ],
};

export default lesson;
