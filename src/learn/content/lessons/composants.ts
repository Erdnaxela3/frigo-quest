import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'composants',
  title: 'Compresseurs, condenseurs, évaporateurs, détendeurs et accessoires',
  skills: [
    'A1:6.01', 'A1:6.02', 'A1:6.03', 'A1:6.04', 'A1:6.05', 'A1:6.06', 'A1:6.07', 'A1:6.08',
    'A1:7.01', 'A1:7.02', 'A1:7.03', 'A1:7.04', 'A1:7.05', 'A1:7.06', 'A1:7.07', 'A1:7.08', 'A1:7.09', 'A1:7.10',
    'A1:8.01', 'A1:8.02', 'A1:8.03', 'A1:8.04', 'A1:8.05', 'A1:8.06', 'A1:8.07', 'A1:8.08', 'A1:8.09', 'A1:8.10', 'A1:8.11',
    'A1:9.01', 'A1:9.02', 'A1:9.03', 'A1:9.04', 'A1:9.05', 'A1:9.06', 'A1:9.07', 'A1:9.08', 'A1:9.09', 'A1:9.10',
    'CAP:UP3.reglage', 'CAP:UP3.composants', 'CAP:UP3.mesure',
  ],
  sections: [
    {
      title: 'Pourquoi ces quatre groupes comptent à l\'examen',
      body: `À l'attestation **A1**, l'examinateur tire **un seul groupe parmi 6 (compresseurs), 7 (condenseurs), 8 (évaporateurs) et 9 (détendeurs et autres composants)**, sans te dire lequel à l'avance. Il faut donc tous les connaître. Pour chaque composant, retiens trois choses : **son rôle**, **ses points de fuite** et **comment on le contrôle / règle**.

Au CAP IFCA (EP3), on retrouve les mêmes composants en pratique : pressostats à régler, filtre à remplacer, relevés à interpréter.`,
    },
    {
      title: 'Compresseurs (groupe 6)',
      body: `Le compresseur aspire la vapeur basse pression surchauffée venant de l'évaporateur et la refoule en vapeur haute pression très chaude vers le condenseur. Il ne doit **jamais aspirer de liquide** (coup de liquide : casse des clapets ou des bielles).

### Technologies

| Type | Construction | Usage courant |
|---|---|---|
| Hermétique | moteur et compresseur dans une cloche soudée | petites puissances, splits, groupes de chambre froide |
| Semi-hermétique | carter boulonné, démontable | commerce, industrie |
| Ouvert | moteur extérieur, arbre traversant | NH₃, transport |

Principes : piston, scroll (spirales), rotatif, vis. Un **scroll triphasé** ne comprime que dans un sens : après raccordement électrique, contrôle le **sens de rotation** (bruit anormal, pas d'écart BP/HP).

### Points de fuite (6.01)

Joints de carter et de culasse (semi-hermétique), **garniture d'arbre** (compresseur ouvert), bouchons d'huile, vannes de service, raccords flare, piquages, tuyauteries qui vibrent et se fissurent près du compresseur.

### Installation (6.02) et retour d'huile (6.05)

- Plots antivibratoires, aucune contrainte sur les tuyauteries.
- **Résistance de carter** alimentée avant démarrage (le fluide migre dans l'huile froide → moussage au démarrage).
- Retour d'huile : vitesse suffisante dans les colonnes montantes, siphon en pied de colonne d'aspiration montante, pente de l'aspiration vers le compresseur.
- Niveau d'huile au voyant, généralement entre 1/4 et 3/4 du voyant selon le constructeur (à vérifier sur la notice).
- Huile adaptée au fluide : **POE** pour les HFC/HFO ; une huile minérale dans un circuit HFC retourne mal au compresseur.

### Vannes de service 3 positions (6.04)

- **Contre-siège arrière** (tige dévissée à fond) : prise de pression fermée, fonctionnement normal.
- **Position intermédiaire** (entrouverte) : lecture de pression au manifold, circuit ouvert.
- **Contre-siège avant** (tige vissée à fond) : le compresseur est isolé de la ligne.

### Démarrage et contrôle (6.06, 6.07)

Avant démarrage : vannes ouvertes (jamais de refoulement fermé), tension, résistance de carter. Après : intensité absorbée comparée à la plaque (pince ampèremétrique), bruit, BP/HP, température de refoulement, niveau d'huile. Le rapport (6.07) note ces valeurs et toute anomalie.`,
      widget: 'service-valve',
    },
    {
      title: 'Pressostats BP et HP : Danfoss KP1 et KP5',
      body: `Les pressostats protègent le compresseur (6.03, 7.04, 8.04, 9.06). Dans un montage en **pump-down**, le pressostat BP sert aussi de régulation : le thermostat ferme l'électrovanne liquide, la BP chute, le pressostat BP arrête le compresseur.

| Appareil | Molette « RANGE » | Molette « DIFF » | Valeur calculée |
|---|---|---|---|
| **KP1 (BP)** | **enclenchement** | différentiel | coupure = enclenchement − différentiel |
| **KP5 (HP)** | **coupure** | différentiel | réenclenchement = coupure − différentiel (version à réarmement auto) |

Exemple : on veut une coupure BP à 0,5 bar et un enclenchement à 2,0 bar → RANGE = 2,0 bar, DIFF = 1,5 bar.

- La plage du KP1 va d'environ −0,2 à 7,5 bar, le différentiel de 0,7 à 4 bar (à vérifier selon la référence exacte).
- **L'échelle est indicative** : on vérifie toujours les valeurs réelles au manifold. Le jury du CAP mesure les vraies valeurs.
- Un différentiel trop petit provoque des **courts cycles** (démarrages trop fréquents) qui usent le compresseur.
- Le pressostat HP doit couper **en dessous de la pression maximale admissible PS** du côté HP. Le réarmement manuel est la règle pour une sécurité HP.

Utilise le cadran ci-dessous pour t'entraîner : règle l'enclenchement et le différentiel, et lis la coupure obtenue.`,
      widget: 'pressostat',
    },
    {
      title: 'Condenseurs (groupe 7)',
      body: `Le condenseur évacue la chaleur : désurchauffe de la vapeur, condensation, puis léger sous-refroidissement du liquide. Types : **à air** (le plus courant), **à eau**, **évaporatif**.

- **Écart de condensation** typique d'un condenseur à air : environ 10 à 15 K entre l'air entrant et la température de condensation.
- **Surface propre** (7.08) : un condenseur encrassé ou un ventilateur à l'arrêt fait monter la HP et la température de refoulement.
- **Lignes** (7.05) : refoulement dimensionné pour entraîner l'huile ; ligne liquide sans perte de charge excessive (sinon flash gas avant le détendeur).
- **Régulation de pression de condensation** (7.02) : en hiver, avec un condenseur à air extérieur, la HP chute et le détendeur n'a plus assez d'écart de pression pour alimenter l'évaporateur. On maintient la HP avec un régulateur de type **Danfoss KVR**, souvent associé à un **KVD** qui maintient la pression du réservoir (à vérifier sur le schéma constructeur), ou par variation de vitesse des ventilateurs.

### Incondensables (7.06)

L'air entré dans le circuit (tirage au vide bâclé) s'accumule dans le condenseur : HP anormalement haute, refoulement chaud. **Test à l'arrêt** : compresseur arrêté, ventilateur du condenseur en marche jusqu'à équilibre ; si la pression (absolue) est nettement supérieure à la pression de saturation à la température ambiante, il y a des incondensables.

Remède sur une installation courante : **récupérer la charge, tirer au vide, recharger à la balance**. Les grosses installations disposent d'un **purgeur automatique**. « Purger au sommet du condenseur » en ouvrant une vanne à l'air est une **émission interdite** : on relâche du fluide avec l'air.

### Efficacité (7.10)

Chaque kelvin de condensation en moins améliore le COP (ordre de grandeur souvent cité : 2 à 4 % par kelvin, à vérifier). Ne règle donc pas un KVR plus haut que nécessaire « par sécurité ».`,
    },
    {
      title: 'Évaporateurs et dégivrage (groupe 8)',
      body: `L'évaporateur absorbe la chaleur de la chambre : le liquide s'évapore, puis la vapeur se surchauffe en fin d'échangeur.

- **Écart d'évaporation** typique en chambre positive : environ 6 à 10 K entre l'air de la chambre et la température d'évaporation. Un écart trop grand assèche les denrées et givre la batterie.
- **Installation** (8.03, 8.05) : liquide en entrée (distributeur), aspiration en sortie, pente vers le compresseur, évacuation des condensats avec pente (et cordon chauffant en chambre négative).
- **Surface** (8.09) : batterie propre, ailettes droites, ventilateurs en marche.

### Dégivrage (8.01, 8.06)

| Méthode | Principe |
|---|---|
| Naturel (arrêt) | ventilateurs en marche, compresseur arrêté ; chambres positives |
| Électrique | résistances dans la batterie |
| Gaz chauds | vapeur de refoulement envoyée dans l'évaporateur par une **ligne de dégivrage** dédiée |
| Inversion de cycle | la vanne 4 voies inverse le cycle (pompes à chaleur) |

Un évaporateur **pris en glace** ou un ventilateur d'évaporateur arrêté donne : BP très basse, surchauffe qui tend vers 0, retour de liquide possible, givre sur l'aspiration.

### Régulateur de pression d'évaporation (8.02, 8.07)

Le **Danfoss KVP** se monte en sortie d'évaporateur. Il **s'ouvre quand la pression amont monte** : il empêche la pression d'évaporation de descendre sous la consigne. Usage typique : deux chambres à températures différentes sur un même groupe ; la chambre « fruits et légumes » ne doit pas évaporer trop froid. On règle au manifold sur la prise de pression du régulateur, pas à l'échelle.`,
    },
    {
      title: 'Détendeurs, filtre, voyant, électrovanne, séparateur d\'huile (groupe 9)',
      body: `### Détendeur thermostatique (9.01, 9.03)

Il dose le liquide pour garder une **surchauffe** constante en sortie d'évaporateur. Le **bulbe** mesure la température de l'aspiration ; l'**égalisation de pression** (interne ou externe) lui donne la pression d'évaporation. L'égalisation externe sert quand la perte de charge de l'évaporateur ou du distributeur est importante.

Exemple Danfoss **TE2** : corps pour un fluide donné, **orifice interchangeable** (tailles 00 à 06) choisi selon la puissance. Le code lettre du corps indique le fluide (par exemple N = R134a, S = R404A/R507, X = R22/R407C — à vérifier dans la documentation Danfoss, ainsi que le type compatible R449A).

- Bulbe sur l'aspiration **horizontale**, près de la sortie de l'évaporateur, **avant** le piquage d'égalisation, bien serré, **isolé**. Jamais en dessous du tube (l'huile y circule) : petits diamètres vers 1 h, gros diamètres vers 4 h (recommandation Danfoss, à vérifier).
- Réglage : **sens horaire = surchauffe augmente** (le détendeur ferme), environ 4 K par tour sur un TE2. Par **quart de tour**, puis attendre 10 à 15 minutes la stabilisation. Cible courante : 5 à 8 K.
- Avant de remplacer : vérifier le voyant (charge), le contact du bulbe, chauffer le bulbe dans la main (aucune réaction de la BP = élément thermostatique mort).

Le **détendeur électronique** (EEV) est piloté par un régulateur à partir d'un transmetteur de pression et d'une sonde de température ; il régule plus finement et accepte une HP plus basse en hiver.

### Filtre déshydrateur (9.08)

Retient l'humidité et les particules. Pour les HFC/POE : tamis moléculaire (type **Danfoss DML**). **Flèche dans le sens du fluide**, bouchons retirés au dernier moment. Un **écart de température > 2 K** entre entrée et sortie signale un filtre colmaté (bulles après le filtre). On le remplace à chaque ouverture du circuit (bonne pratique).

### Voyant liquide (type SGN)

Voyant clair = liquide sans vapeur. **Bulles** : manque de charge, restriction en amont, ou phase transitoire au démarrage. **Indicateur d'humidité** : vert = sec, jaune = humide.

### Électrovanne (type EVR)

Normalement fermée hors tension, montée avec la flèche dans le sens du fluide, sur la ligne liquide avant le détendeur. Elle permet le pump-down. Bobine sous tension sans clic ni aimantation = bobine ou alimentation à contrôler.

### Séparateur d'huile (9.07)

Monté sur le refoulement, il renvoie l'huile au carter par un flotteur. Utile sur les longues tuyauteries, en basse température, sur les compresseurs à vis.

### Thermostats et régulateurs (9.04, 9.05)

Thermostat : consigne + différentiel sur la température de chambre. Régulateurs de pression (KVP, KVR, KVD) : réglage au manifold, tige dans le sens horaire = consigne plus haute (convention Danfoss, à vérifier selon le modèle).`,
    },
    {
      title: 'Diagnostic : la table des signatures',
      body: `Une panne se lit avec **BP, HP, surchauffe (SH) et sous-refroidissement (SC)**. SH et SC séparent les problèmes de **charge** des problèmes d'**alimentation** de l'évaporateur.

| Panne | BP | HP | SH | SC | Autre indice |
|---|---|---|---|---|---|
| Manque de charge (fuite) | ↓ | ↓ | ↑↑ | ↓ (0) | bulles au voyant |
| Surcharge | ↑ | ↑↑ | ↓ | ↑↑ | intensité élevée |
| Incondensables | ≈/↑ | ↑↑ | ≈ | ≈/↑ | HP à l'arrêt > Psat(T ambiante) |
| Condenseur encrassé / ventilateur HS | ↑ | ↑↑ | ≈ | ≈ | refoulement très chaud |
| Évaporateur pris en glace / ventilateur HS | ↓↓ | ↓ | ↓ (→ 0) | ≈ | givre sur l'aspiration |
| Filtre déshydrateur colmaté | ↓ | ≈/↓ | ↑↑ | ↑ | ΔT filtre > 2 K, bulles après le filtre |
| Détendeur trop ouvert | ↑ | ≈ | ↓ (→ 0) | ↓ | risque de retour de liquide |
| Détendeur trop fermé / bulbe vidé | ↓↓ | ↓ | ↑↑ | ↑ | |
| Compresseur usé (clapets) | ↑ | ↓ | ↑ | ≈ | intensité faible, BP et HP se rapprochent |

Méthode : regarder avant de brancher (ventilateurs, givre, encrassement), puis mesurer, puis comparer à la table. Un manque de charge se traite en **cherchant et réparant la fuite** avant de recharger ; « compléter la charge » sans réparer est contraire au règlement F-gas.

### Compresseur grillé

Disjonction, odeur de brûlé : consigner, contrôler les enroulements et l'isolement à la masse (ce peut être le contacteur !), test d'acidité de l'huile. Si l'huile est acide : récupérer dans une bouteille **« contaminé »** séparée, vidanger l'huile en déchet dangereux, nouveau compresseur avec la bonne huile, **filtre anti-acide à l'aspiration** et nouveau filtre liquide, test azote, tirage au vide, charge à la balance, nouveau test d'acidité après quelques jours de fonctionnement.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- Un groupe parmi 6, 7, 8, 9 est tiré au sort à l'A1 : révise les quatre.
- **KP1 : RANGE = enclenchement**, coupure = enclenchement − différentiel. **KP5 : RANGE = coupure.** Toujours vérifier au manifold.
- Pressostat HP : coupure inférieure à PS.
- Vanne de service : arrière = normal, intermédiaire = mesure, avant = compresseur isolé.
- Détendeur : sens horaire = plus de surchauffe, quart de tour, attendre. Bulbe avant l'égalisation, jamais en dessous.
- Filtre : flèche, bouchons au dernier moment, ΔT > 2 K = colmaté.
- Incondensables : test à l'arrêt, puis récupérer, tirer au vide, recharger. Jamais de purge à l'air.
- KVP garde la pression d'évaporation au-dessus d'un minimum ; KVR garde la pression de condensation au-dessus d'un minimum.
- Efficacité : évaporer le plus haut et condenser le plus bas possible, surfaces propres.

### Erreurs fréquentes

- Croire que la molette RANGE du KP1 règle la coupure.
- Régler le pressostat « à l'échelle » sans vérifier la coupure et l'enclenchement réels.
- Tourner le détendeur d'un tour entier puis conclure tout de suite.
- Remplacer un détendeur alors que le bulbe était simplement décroché.
- Démarrer avec la vanne de refoulement fermée ou sans résistance de carter.
- Remplacer un compresseur sans avoir vérifié le contacteur et le relais thermique.
- Mélanger un fluide acide récupéré avec du fluide propre.`,
    },
  ],
};

export default lesson;
