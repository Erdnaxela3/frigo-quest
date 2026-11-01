import type { Question } from '../types';

// CAP IFCA EP1 mock: fictitious dossier technique, split R32 3,5 kW in a small office.
export const EP1_DURATION = 3 * 3600;

export const EP1_DOSSIER: { title: string; body: string }[] = [
  {
    title: '1. Contexte',
    body: `Un cabinet d'expertise comptable (client fictif) fait climatiser le **bureau 2** de ses locaux, situés au rez-de-chaussée d'un immeuble de bureaux. Votre entreprise doit installer un **climatiseur split mural réversible R32 de 3,5 kW**.

Le bureau reste occupé pendant les travaux (2 personnes). Le local voisin est une **salle d'archives papier** dont les rayonnages sont adossés au mur du bureau. Les travaux sont programmés sur une journée, par un technicien titulaire de l'attestation d'aptitude et un apprenti.

- Liaisons frigorifiques en cuivre recuit en couronne, raccords **dudgeonnés** sur l'unité intérieure (UI) et l'unité extérieure (UE).
- Une **jonction brasée** (manchon) par ligne est prévue dans le bureau, au droit de la traversée de mur, pour raccorder les liaisons aux queues de cochon de l'UI.
- Brasage cuivre/cuivre à la **brasure cuivre-phosphore 6 % Ag**, sous balayage d'azote.`,
  },
  {
    title: '2. Plan et implantation',
    body: `| Élément | Donnée |
|---|---|
| Bureau 2 (dimensions intérieures) | 5,00 m × 4,00 m, hauteur sous plafond 2,60 m |
| Mur extérieur (façade nord) | parpaing + isolant, épaisseur 0,30 m |
| Unité intérieure | mur de façade, axe à 1,00 m de l'angle, dessus de l'UI à 2,30 m du sol |
| Unité extérieure | sur console murale, façade nord, à 0,50 m du sol, à 3,40 m à droite de la traversée |
| Traversée de mur | Ø 60 mm, avec fourreau PVC, légère pente vers l'extérieur |
| Condensats | tube PVC Ø 16 mm vers le siphon du lavabo des sanitaires, pente minimale 1 cm/m |

**Cheminement des liaisons frigorifiques** (identique pour la ligne liquide et la ligne gaz) :

| Tronçon | Description | Longueur |
|---|---|---|
| A | Sortie UI → traversée, dans goulotte intérieure | 1,20 m |
| B | Traversée de mur | 0,30 m |
| C | Descente verticale extérieure | 1,60 m |
| D | Horizontal le long de la façade jusqu'à l'UE | 3,40 m |
| E | Lyre et raccordement aux vannes de l'UE | 0,50 m |

Dénivelé UI/UE : environ 1,8 m (UE plus basse).`,
  },
  {
    title: '3. Nomenclature',
    body: `| Rep. | Désignation | Référence | Qté |
|---|---|---|---|
| 1 | Unité intérieure murale 3,5 kW R32 | UI-35R32 | 1 |
| 2 | Unité extérieure 3,5 kW R32 | UE-35R32 | 1 |
| 3 | Console murale UE, charge max 100 kg, plots antivibratiles | CM-450 | 1 |
| 4 | Tube cuivre recuit ¼" (6,35 mm), qualité frigorifique | CU-R-14 | à calculer |
| 5 | Tube cuivre recuit ⅜" (9,52 mm), qualité frigorifique | CU-R-38 | à calculer |
| 6 | Manchon isolant élastomère 9 mm, longueur 2 m (¼" et ⅜") | ISO-9-xx | à calculer |
| 7 | Collier double isophonique pour liaisons | COL-D | à calculer |
| 8 | Goulotte PVC 60 × 45 mm, longueur 2 m | GT-60 | 4 |
| 9 | Câble d'alimentation 3G2,5 mm² | — | 12 m |
| 10 | Câble de liaison UI/UE 4G1,5 mm² (H07RN-F) | — | 9 m |
| 11 | Tube PVC souple condensats Ø 16 mm | — | 6 m |

**Mise en œuvre des quantitatifs**
- Cuivre : longueur de la liaison + **10 % de chutes**, pour chaque diamètre.
- Isolant : ligne liquide et ligne gaz isolées **séparément** sur toute leur longueur (chutes non comprises) ; nombre de manchons arrondi à l'entier supérieur.
- Colliers sur les tronçons extérieurs C et D : nombre par tronçon = longueur ÷ entraxe (**1,00 m**), arrondi à l'entier supérieur, **+ 1**.`,
  },
  {
    title: '4. Plaque signalétique de l\'unité extérieure',
    body: `| Rubrique | Valeur |
|---|---|
| Modèle | UE-35R32 |
| Fluide frigorigène | R32 — classe de sécurité A2L — PRP 675 |
| Charge usine | 0,75 kg (précharge valable jusqu'à **5 m** de liaison) |
| Charge complémentaire | **20 g/m** au-delà de 5 m |
| Longueur de liaison | mini 3 m — maxi 20 m ; dénivelé maxi 10 m |
| Pression maximale admissible PS | HP 4,2 MPa — BP 2,5 MPa |
| Alimentation | 230 V ~ 1 ph 50 Hz |
| Intensité maximale | 7,5 A |
| Puissance frigorifique / absorbée (froid) | 3,5 kW / 1,05 kW |
| Diamètres de raccordement | liquide ¼" — gaz ⅜" (raccords flare) |

**Extraits de la notice d'installation**
- Couples de serrage des écrous flare : ¼" : 15 à 18 N·m — ⅜" : 33 à 42 N·m.
- Essai d'étanchéité des liaisons à l'**azote sec**, vannes de l'UE fermées : 40 bar pendant 30 min.
- Tirage au vide jusqu'à 0,67 mbar abs (500 µm Hg), puis test de remontée de 15 min.
- Surface minimale du local : aucune exigence tant que la charge totale reste ≤ 1,22 kg.
- Utiliser un détecteur de fuites, une pompe à vide et une station de récupération compatibles A2L.`,
  },
  {
    title: '5. Schéma de commande',
    body: `L'alimentation de l'UE est asservie à un coffret de commande 24 V (arrêt d'urgence et délestage demandés par le client). Liste des composants du schéma :

| Repère | Désignation | Rôle / raccordement |
|---|---|---|
| Q1 | Disjoncteur différentiel 2P 16 A, 30 mA, type A | Tableau divisionnaire, départ dédié climatisation |
| Q2 | Interrupteur-sectionneur 2P 20 A cadenassable | À proximité de l'UE, coupure locale |
| Q3 | Disjoncteur 2P 2 A | Protection du primaire de T1 |
| T1 | Transformateur 230 V / 24 V, 63 VA, de sécurité | Alimente le circuit de commande |
| F1 | Fusible 1 A gG | Protection du secondaire 24 V |
| S1 | Arrêt d'urgence coup-de-poing à accrochage (NF) | En série en tête du circuit de commande |
| S2 | Bouton-poussoir arrêt (NF), rouge | En série après S1 |
| S3 | Bouton-poussoir marche (NO), vert | En parallèle avec KM1 13-14 |
| KM1 | Contacteur 2P 25 A, bobine 24 V ~ | Pôles 1-2 / 3-4 : alimentation de l'UE ; contact 13-14 : auto-maintien ; contact 21-22 : signalisation |
| H1 | Voyant vert 24 V | Alimenté par un contact NO de KM1 : « climatisation en service » |
| H2 | Voyant rouge 24 V | Alimenté par KM1 21-22 : « climatisation à l'arrêt » |`,
  },
];

const S = (q: Omit<Extract<Question, { type: 'single' }>, 'type'>): Question => ({ type: 'single', ...q });
const M = (q: Omit<Extract<Question, { type: 'multi' }>, 'type'>): Question => ({ type: 'multi', ...q });
const N = (q: Omit<Extract<Question, { type: 'numeric' }>, 'type'>): Question => ({ type: 'numeric', ...q });
const O = (q: Omit<Extract<Question, { type: 'order' }>, 'type'>): Question => ({ type: 'order', ...q });

export const EP1_QUESTIONS: Question[] = [
  // ── Lecture du dossier ──
  N({
    id: 'ep1-volume-bureau', skills: ['CAP:UP1.dossier'], confidence: 'ok',
    prompt: 'D\'après le plan, quel est le volume intérieur du bureau 2 ?',
    answer: { value: 52, tol: 0.5 }, unit: 'm³',
    explain: '5,00 × 4,00 × 2,60 = 52 m³. Le volume sert notamment au bilan thermique et aux vérifications liées aux fluides inflammables.',
  }),
  N({
    id: 'ep1-longueur-liaison', skills: ['CAP:UP1.dossier'], confidence: 'ok',
    prompt: 'Quelle est la longueur d\'une liaison frigorifique (une ligne) entre l\'UI et l\'UE ?',
    answer: { value: 7, tol: 0.05 }, unit: 'm',
    explain: 'Somme des tronçons : 1,20 + 0,30 + 1,60 + 3,40 + 0,50 = 7,00 m. C\'est cette longueur qui sert au calcul de la charge complémentaire.',
  }),
  S({
    id: 'ep1-diametre-liquide', skills: ['CAP:UP1.dossier', 'A1:1.04'], confidence: 'ok',
    prompt: 'Sur ce split, quelle est la ligne de plus petit diamètre (¼") ?',
    choices: ['La ligne liquide', 'La ligne gaz (aspiration en froid)', 'La ligne de condensats', 'Les deux lignes ont le même diamètre'],
    answer: 0,
    explain: 'Plaque signalétique : liquide ¼", gaz ⅜". Le liquide, plus dense, circule dans le petit tube ; la vapeur, volumineuse, dans le gros.',
  }),
  S({
    id: 'ep1-lyre', skills: ['CAP:UP1.dossier', 'A1:10.02'], confidence: 'secondary',
    prompt: 'Le tronçon E comporte une « lyre » près de l\'UE. À quoi sert-elle ?',
    choices: [
      'Absorber les vibrations et dilatations entre la liaison fixe et l\'unité',
      'Augmenter la charge en fluide',
      'Servir de piège à huile obligatoire sur toutes les lignes liquide',
      'Faciliter le tirage au vide',
    ],
    answer: 0,
    explain: 'La boucle souple découple la liaison supportée de l\'UE posée sur plots antivibratiles : elle évite fissures et fuites aux raccords flare.',
  }),
  N({
    id: 'ep1-ps-bar', skills: ['CAP:UP1.dossier', 'A1:1.01'], confidence: 'ok',
    prompt: 'La plaque indique PS HP = 4,2 MPa. Quelle est cette pression en bar ?',
    answer: { value: 42, tol: 0.1 }, unit: 'bar',
    explain: '1 MPa = 10 bar, donc 4,2 MPa = 42 bar. L\'essai d\'étanchéité à 40 bar préconisé par la notice reste bien sous la PS.',
  }),
  N({
    id: 'ep1-eer', skills: ['CAP:UP1.dossier', 'A1:6.08'], confidence: 'ok',
    prompt: 'Calculez l\'EER de l\'appareil en mode froid (2 décimales).',
    answer: { value: 3.33, tol: 0.02 }, unit: '',
    explain: 'EER = puissance frigorifique / puissance électrique absorbée = 3,5 / 1,05 ≈ 3,33. Plus l\'EER est élevé, plus l\'appareil est efficace.',
  }),

  // ── Quantitatifs ──
  N({
    id: 'ep1-cuivre-14', skills: ['CAP:UP1.quantitatif'], confidence: 'ok',
    prompt: 'Quelle longueur de tube cuivre ¼" faut-il prévoir, chutes comprises ?',
    answer: { value: 7.7, tol: 0.05 }, unit: 'm',
    explain: '7,00 m de liaison + 10 % de chutes = 7,00 × 1,10 = 7,70 m. Même calcul pour le ⅜".',
  }),
  N({
    id: 'ep1-cuivre-total', skills: ['CAP:UP1.quantitatif'], confidence: 'ok',
    prompt: 'Quelle longueur totale de cuivre (¼" + ⅜") faut-il commander, chutes comprises ?',
    answer: { value: 15.4, tol: 0.05 }, unit: 'm',
    explain: '2 lignes × 7,70 m = 15,40 m (7,70 m de ¼" et 7,70 m de ⅜").',
  }),
  N({
    id: 'ep1-isolant', skills: ['CAP:UP1.quantitatif'], confidence: 'ok',
    prompt: 'Combien de manchons isolants de 2 m faut-il au total (les deux lignes) ?',
    answer: { value: 8, tol: 0 }, unit: 'manchons',
    explain: 'Par ligne : 7,00 / 2 = 3,5 → 4 manchons. Les lignes liquide et gaz sont isolées séparément : 2 × 4 = 8 manchons.',
  }),
  N({
    id: 'ep1-colliers', skills: ['CAP:UP1.quantitatif', 'A1:10.02'], confidence: 'ok',
    prompt: 'Selon la règle du dossier, combien de colliers doubles faut-il sur les tronçons extérieurs C et D ?',
    answer: { value: 8, tol: 0 }, unit: 'colliers',
    explain: 'C : 1,60 / 1,00 = 1,6 → 2, + 1 = 3. D : 3,40 / 1,00 = 3,4 → 4, + 1 = 5. Total : 3 + 5 = 8 colliers.',
  }),
  N({
    id: 'ep1-charge-compl', skills: ['CAP:UP1.quantitatif', 'A1:5.06'], confidence: 'ok',
    prompt: 'Quelle charge complémentaire de R32 faut-il ajouter après le tirage au vide ?',
    answer: { value: 40, tol: 1 }, unit: 'g',
    explain: 'Précharge valable jusqu\'à 5 m. Excédent : 7,00 − 5 = 2,00 m × 20 g/m = 40 g, pesés à la balance.',
  }),
  N({
    id: 'ep1-charge-totale', skills: ['CAP:UP1.quantitatif', 'A1:5.07'], confidence: 'ok',
    prompt: 'Quelle sera la charge totale de R32 de l\'installation ?',
    answer: { value: 0.79, tol: 0.005 }, unit: 'kg',
    explain: '0,75 kg (usine) + 0,040 kg = 0,79 kg. C\'est cette valeur qu\'on inscrit sur l\'étiquette et la fiche d\'intervention.',
  }),
  N({
    id: 'ep1-tco2e', skills: ['CAP:UP1.quantitatif', 'A1:2.02'], confidence: 'ok',
    prompt: 'Quelle est la charge totale exprimée en tonnes équivalent CO₂ (3 décimales) ?',
    answer: { value: 0.533, tol: 0.003 }, unit: 't CO₂e',
    explain: '0,79 kg × 675 / 1000 ≈ 0,533 t CO₂e : sous le seuil de 5 t CO₂e, pas de contrôle d\'étanchéité périodique, ni de contrôle réglementaire à la mise en service (art. R. 543-79, au-delà de 5 t). L\'essai de pression à l\'azote avant la charge reste indispensable.',
  }),
  S({
    id: 'ep1-surface-mini', skills: ['CAP:UP1.dossier', 'A1:1.08'], confidence: 'secondary',
    prompt: 'D\'après la notice, la charge totale impose-t-elle une surface minimale pour le bureau ?',
    choices: [
      'Non : 0,79 kg ≤ 1,22 kg, aucune exigence de surface',
      'Oui : il faut au moins 52 m²',
      'Oui : tout appareil A2L impose un local d\'au moins 30 m²',
      'Impossible à dire sans la PS',
    ],
    answer: 0,
    explain: 'La notice ne fixe une surface minimale qu\'au-delà de 1,22 kg (seuil dérivé de la LII du R32). Avec 0,79 kg, le bureau de 20 m² convient sans condition.',
  }),
  S({
    id: 'ep1-cable-alim', skills: ['CAP:UP1.quantitatif', 'CAP:UP2.electricite'], confidence: 'ok',
    prompt: 'Pourquoi le câble d\'alimentation est-il en 3G2,5 mm² ?',
    choices: [
      'Il est protégé par un disjoncteur 16 A : la section doit être d\'au moins 2,5 mm² en cuivre',
      'Parce que l\'intensité maximale de l\'UE est de 25 A',
      'Le 2,5 mm² est obligatoire pour tout câble extérieur',
      'Pour réduire la consommation électrique',
    ],
    answer: 0,
    explain: 'La section se choisit avec le calibre de la protection (NF C 15-100) : 16 A → 2,5 mm² cuivre. Le « 3G » = phase, neutre et terre vert/jaune.',
  }),

  // ── Outillage et matériel ──
  M({
    id: 'ep1-outillage', skills: ['CAP:UP1.quantitatif', 'A1:10.01'], confidence: 'ok',
    prompt: 'Quels outils faut-il prévoir pour réaliser les liaisons frigorifiques ?',
    choices: [
      'Coupe-tube et ébavureur',
      'Dudgeonnière excentrique adaptée R32/R410A',
      'Clé dynamométrique',
      'Poste de brasage et bouteille d\'azote avec détendeur',
      'Scie à métaux pour couper le cuivre',
      'Pince à sertir pour tube multicouche',
    ],
    answer: [0, 1, 2, 3],
    explain: 'La scie laisse des copeaux qui pollueraient le circuit. Les raccords flare se serrent à la clé dynamométrique (couples de la notice) ; le multicouche n\'a rien à faire en frigorifique.',
  }),
  S({
    id: 'ep1-couple-38', skills: ['CAP:UP1.dossier', 'CAP:UP2.faconnage'], confidence: 'ok',
    prompt: 'À quel couple serrer l\'écrou flare ⅜" sur la vanne gaz de l\'UE ?',
    choices: ['33 à 42 N·m', '15 à 18 N·m', '5 N·m, à la main', 'Le plus fort possible'],
    answer: 0,
    explain: 'Notice : ⅜" 33 à 42 N·m (¼" 15 à 18 N·m). Trop serré, la collerette se fissure ; pas assez, elle fuit.',
  }),
  S({
    id: 'ep1-brasure-cup', skills: ['CAP:UP1.quantitatif', 'A1:10.01'], confidence: 'ok',
    prompt: 'Pourquoi la brasure cuivre-phosphore permet-elle de braser cuivre sur cuivre sans décapant ?',
    choices: [
      'Le phosphore agit comme désoxydant sur le cuivre',
      'Parce que l\'argent ne fond pas',
      'Parce que l\'azote remplace le décapant',
      'Elle ne le permet pas : il faut toujours un décapant',
    ],
    answer: 0,
    explain: 'Le phosphore est auto-décapant sur le cuivre. Sur laiton ou acier, il faut une brasure argent avec décapant. L\'azote, lui, évite la calamine à l\'intérieur du tube.',
  }),
  M({
    id: 'ep1-a2l-outils', skills: ['CAP:UP1.quantitatif', 'A1:11.03', 'A1:1.08'], confidence: 'ok',
    prompt: 'R32 (A2L) : quelles précautions de matériel et de mise en œuvre sont justifiées ?',
    choices: [
      'Détecteur de fuites, pompe à vide et station de récupération compatibles A2L',
      'Aucune source d\'inflammation dans la zone pendant les opérations sur le fluide',
      'Ventiler le local pendant l\'intervention',
      'Tester l\'étanchéité avec un mélange azote/oxygène',
      'Purger le R32 à l\'air libre dans le bureau, il est peu inflammable',
    ],
    answer: [0, 1, 2],
    explain: 'A2L = faiblement inflammable. On élimine les sources d\'inflammation, on ventile, on utilise un outillage adapté. L\'oxygène est interdit (risque d\'explosion avec l\'huile) et tout dégazage volontaire est interdit.',
  }),

  // ── Sécurité de l'intervention ──
  O({
    id: 'ep1-consignation', skills: ['CAP:UP1.securite', 'CAP:UP2.electricite'], confidence: 'ok',
    prompt: 'Remettez dans l\'ordre la consignation électrique de l\'UE avant raccordement.',
    choices: [
      'Séparer : ouvrir Q2 (et Q1 au tableau)',
      'Condamner Q2 en position ouverte avec un cadenas personnel',
      'Identifier et signaler : pancarte « Ne pas manœuvrer — travaux en cours »',
      'Vérifier l\'absence de tension (VAT) aux bornes de l\'UE',
    ],
    explain: 'Séparation, condamnation, identification, VAT (NF C 18-510). La VAT se fait en dernier, sur le lieu de travail, avec un VAT vérifié avant et après.',
  }),
  S({
    id: 'ep1-cadenas', skills: ['CAP:UP1.securite', 'CAP:UP1.dossier'], confidence: 'ok',
    prompt: 'Quel appareil du schéma permet de condamner l\'alimentation directement à côté de l\'UE ?',
    choices: ['Q2', 'KM1', 'S1', 'F1'],
    answer: 0,
    explain: 'Q2 est l\'interrupteur-sectionneur cadenassable de proximité. Un contacteur (KM1) ou un arrêt d\'urgence (S1) n\'assurent pas une séparation condamnable.',
  }),
  S({
    id: 'ep1-auto-maintien', skills: ['CAP:UP1.dossier', 'CAP:UP2.electricite'], confidence: 'ok',
    prompt: 'Quel est le rôle du contact KM1 13-14 placé en parallèle de S3 ?',
    choices: [
      'Auto-maintien : KM1 reste enclenché quand on relâche S3',
      'Protéger le contacteur contre les surintensités',
      'Allumer le voyant rouge H2',
      'Couper l\'UE en cas de défaut d\'isolement',
    ],
    answer: 0,
    explain: 'Le contact NO 13-14 « shunte » le bouton marche : la bobine reste alimentée jusqu\'à l\'ouverture de S2 ou S1.',
  }),
  S({
    id: 'ep1-au-nf', skills: ['CAP:UP1.securite', 'CAP:UP2.electricite'], confidence: 'ok',
    prompt: 'Pourquoi l\'arrêt d\'urgence S1 est-il un contact à ouverture (NF) en série ?',
    choices: [
      'Sécurité positive : une coupure de fil provoque aussi l\'arrêt',
      'Parce qu\'un contact NF consomme moins',
      'Pour pouvoir redémarrer en appuyant dessus',
      'C\'est indifférent, NO ou NF',
    ],
    answer: 0,
    explain: 'Un circuit de sécurité doit tomber en position sûre en cas de défaut (fil coupé, contact oxydé). Le coup-de-poing à accrochage impose un déverrouillage volontaire.',
  }),
  S({
    id: 'ep1-t1-24v', skills: ['CAP:UP1.securite', 'CAP:UP2.electricite'], confidence: 'ok',
    prompt: 'Quel est l\'intérêt d\'alimenter le circuit de commande en 24 V par T1 ?',
    choices: [
      'Très basse tension de sécurité : risque d\'électrisation réduit sur les boutons et voyants',
      'Augmenter la puissance disponible pour l\'UE',
      'Supprimer le besoin de protection différentielle',
      'Le compresseur fonctionne en 24 V',
    ],
    answer: 0,
    explain: 'Avec un transformateur de sécurité, la commande est en TBTS. La puissance (230 V) reste sur les pôles de KM1, protégée par Q1 (30 mA).',
  }),
  M({
    id: 'ep1-epi', skills: ['CAP:UP1.securite', 'A1:12.05'], confidence: 'ok',
    prompt: 'Quels EPI le technicien doit-il porter pour le brasage et la manipulation du R32 ?',
    choices: [
      'Lunettes de protection (teintées pour le brasage)',
      'Gants (protection thermique au brasage, contre les brûlures par le froid à la charge)',
      'Chaussures de sécurité',
      'Masque à cartouche filtrante pour respirer le R32',
      'Vêtements en fibres synthétiques',
    ],
    answer: [0, 1, 2],
    explain: 'Le R32 liquide provoque des brûlures par le froid. Un masque filtrant ne protège pas d\'une atmosphère appauvrie en oxygène ; les synthétiques fondent au contact de la flamme.',
  }),
  M({
    id: 'ep1-permis-feu', skills: ['CAP:UP1.securite', 'A1:10.01'], confidence: 'secondary',
    prompt: 'Les brasures sont faites contre le mur des archives papier. Que prévoit le permis de feu ?',
    choices: [
      'Il est délivré par le donneur d\'ordre (chef d\'établissement ou son représentant) avant les travaux',
      'Éloigner ou protéger les matériaux combustibles (écran ignifugé côté traversée)',
      'Un extincteur adapté à portée de main pendant le brasage',
      'Une surveillance de la zone après la fin des travaux par points chauds',
      'Il n\'est utile qu\'en milieu industriel',
    ],
    answer: [0, 1, 2, 3],
    explain: 'Le permis de feu formalise l\'analyse du risque incendie : zone dégagée, extincteur, surveillance après travaux (la durée est fixée sur le permis, souvent 1 à 2 h). Il s\'applique partout où un point chaud menace des combustibles.',
  }),

  // ── Étanchéité et tirage au vide ──
  S({
    id: 'ep1-gaz-essai', skills: ['CAP:UP2.etancheite', 'A1:3.02'], confidence: 'ok',
    prompt: 'Avec quel gaz réaliser l\'essai d\'étanchéité des liaisons ?',
    choices: ['Azote sec (déshydraté)', 'Air comprimé de l\'atelier', 'Oxygène', 'R32 de la précharge'],
    answer: 0,
    explain: 'L\'azote est sec et inerte. L\'air apporte de l\'humidité, l\'oxygène est explosif au contact de l\'huile, et la précharge doit rester dans l\'UE (vannes fermées).',
  }),
  O({
    id: 'ep1-ordre-essais', skills: ['CAP:UP2.etancheite', 'CAP:UP3.vide', 'A1:3.04'], confidence: 'ok',
    prompt: 'Remettez dans l\'ordre les opérations après raccordement des liaisons (vannes de l\'UE fermées).',
    choices: [
      'Mettre les liaisons sous 40 bar d\'azote sec',
      'Contrôler la tenue en pression 30 min et rechercher les fuites',
      'Relâcher l\'azote',
      'Tirer au vide jusqu\'à 0,67 mbar abs',
      'Isoler la pompe et faire le test de remontée de 15 min',
      'Ouvrir les vannes de l\'UE',
      'Ajouter les 40 g de R32 à la balance',
    ],
    explain: 'Étanchéité à l\'azote d\'abord, vide ensuite (on ne cherche pas une fuite au vide), puis ouverture des vannes pour libérer la précharge et complément pesé.',
  }),
  S({
    id: 'ep1-remontee', skills: ['CAP:UP3.vide', 'A1:3.04'], confidence: 'ok',
    prompt: 'Pendant le test de remontée, la pression monte puis se stabilise vers 3 mbar. Interprétation ?',
    choices: [
      'Présence d\'humidité qui s\'évapore : poursuivre le tirage au vide',
      'Fuite franche : la pression monterait jusqu\'à la pression atmosphérique',
      'Le vide est parfait',
      'La pompe à vide est trop puissante',
    ],
    answer: 0,
    explain: 'Remontée qui se stabilise = humidité (pression de vapeur de l\'eau). Remontée continue jusqu\'à l\'atmosphère = fuite : retour à l\'essai à l\'azote.',
  }),
  S({
    id: 'ep1-registre', skills: ['CAP:UP1.securite', 'A1:3.05'], confidence: 'ok',
    prompt: 'Après la mise en service, quel document renseigner pour tracer la charge de R32 ajoutée ?',
    choices: [
      'La fiche d\'intervention (Cerfa 15497) et l\'étiquette de l\'installation',
      'Aucun document : la charge est inférieure à 1 kg',
      'Uniquement le bon de livraison du fluide',
      'Le permis de feu',
    ],
    answer: 0,
    explain: 'Toute manipulation de fluide se trace sur la fiche d\'intervention (quantité chargée, fluide, bouteille utilisée), même sous le seuil de contrôle périodique (art. R. 543-82). Sous 5 t CO₂e, la signature du détenteur n\'est pas exigée. La fiche est conservée 5 ans.',
  }),
];
