import type { Question } from '../types';

// A1 groups 1–5. Numeric answers use the saturation tables of src/physics/refrigerants.ts.
export const QUESTIONS_A1_BASE: Question[] = [
  // ---- 1.00 Réglementation ----
  {
    id: "q1-1.00-fgas-reg", skills: ["A1:1.00"], type: "single", confidence: "ok",
    prompt: "Quel règlement européen encadre aujourd'hui les gaz à effet de serre fluorés (« F-Gas III ») ?",
    choices: ["Règlement (UE) 2024/573", "Règlement (UE) 517/2014", "Règlement (CE) 842/2006", "Règlement (CE) 1005/2009"],
    answer: 0,
    explain: "Le règlement (UE) 2024/573 (F-Gas III) s'applique depuis le 11 mars 2024 et remplace le 517/2014. Les exigences de certification sont fixées par le règlement d'exécution 2024/2215.",
  },
  {
    id: "q1-1.00-arrete-2025", skills: ["A1:1.00"], type: "single", confidence: "ok",
    prompt: "Quel texte français organise la délivrance des nouvelles attestations d'aptitude (catégories A1, A2, B, C, D, E, V) ?",
    choices: ["L'arrêté du 13 octobre 2008", "L'arrêté du 21 novembre 2025", "L'arrêté du 2 juin 2015", "Le règlement (UE) 2024/573 seul, sans texte national"],
    answer: 1,
    explain: "L'arrêté du 21 novembre 2025 (JO du 10 décembre 2025) transpose le règlement d'exécution 2024/2215. L'arrêté du 13 octobre 2008 est abrogé au 31 décembre 2026 ; celui du 2 juin 2015 concerne le CAP IFCA.",
  },
  {
    id: "q1-1.00-cat-a1", skills: ["A1:1.00"], type: "single", confidence: "ok",
    prompt: "Quel est le périmètre de la nouvelle catégorie A1 ?",
    choices: [
      "Gaz fluorés uniquement, équipements de moins de 3 kg",
      "Gaz fluorés et hydrocarbures, tous équipements",
      "CO₂ (R744) uniquement",
      "Contrôle d'étanchéité sans intervention sur le circuit",
    ],
    answer: 1,
    explain: "A1 succède à l'ancienne catégorie I et couvre les gaz fluorés ET les hydrocarbures, sur tous les équipements. A2 = moins de 3 kg, B = CO₂, C = ammoniac, E = contrôle d'étanchéité sans intervention.",
  },
  {
    id: "q1-1.00-categories", skills: ["A1:1.00"], type: "multi", confidence: "ok",
    prompt: "Parmi ces associations catégorie → périmètre, lesquelles sont correctes ?",
    choices: ["B → CO₂ (R744)", "C → ammoniac (R717)", "D → récupération seule, moins de 3 kg", "E → charge des systèmes au propane", "V → climatisation des véhicules"],
    answer: [0, 1, 2, 4],
    explain: "B = CO₂, C = NH₃, D = récupération seule (< 3 kg, < 6 kg hermétique), E = contrôle d'étanchéité sans intervention sur le circuit, V = climatisation automobile.",
  },
  {
    id: "q1-1.00-date-2027", skills: ["A1:1.00"], type: "single", confidence: "ok",
    prompt: "À partir de quelle date les nouvelles attestations d'aptitude deviennent-elles obligatoires ?",
    choices: ["11 mars 2024", "11 décembre 2025", "1er janvier 2027", "12 mars 2029"],
    answer: 2,
    explain: "L'arrêté est en vigueur depuis le 11 décembre 2025, mais le nouveau dispositif est obligatoire au 1er janvier 2027 ; l'ancien arrêté de 2008 est abrogé le 31 décembre 2026.",
  },
  {
    id: "q1-1.00-remise-niveau", skills: ["A1:1.00"], type: "single", confidence: "ok",
    prompt: "Un technicien titulaire de l'ancienne catégorie I veut obtenir l'A1 sans repasser l'examen complet. Avant quelle date doit-il suivre la remise à niveau ?",
    choices: ["31 décembre 2026", "1er janvier 2027", "12 mars 2029", "1er janvier 2030"],
    answer: 2,
    explain: "Les titulaires des catégories I à IV doivent suivre une remise à niveau avant le 12 mars 2029 ; sinon l'ancienne attestation devient caduque et il faut repasser l'examen complet.",
  },
  {
    id: "q1-1.00-7ans", skills: ["A1:1.00"], type: "numeric", confidence: "ok",
    prompt: "La nouvelle attestation impose une remise à niveau périodique. Quel est l'intervalle maximal entre deux remises à niveau (années) ?",
    answer: { value: 7, tol: 0 }, unit: "ans",
    explain: "Remise à niveau au moins tous les 7 ans. En cas d'oubli l'attestation est suspendue ; au-delà de 3 ans de retard, l'examen complet est à repasser.",
  },
  {
    id: "q1-1.00-chrono", skills: ["A1:1.00", "A1:2.01"], type: "order", confidence: "ok",
    prompt: "Classez ces étapes réglementaires dans l'ordre chronologique.",
    choices: [
      "F-Gas III (UE 2024/573) applicable",
      "Entrée en vigueur de l'arrêté du 21 novembre 2025",
      "Nouvelles attestations d'aptitude obligatoires",
      "Fin de la remise à niveau des anciennes catégories I à IV",
    ],
    explain: "11 mars 2024 → 11 décembre 2025 → 1er janvier 2027 → 12 mars 2029.",
  },
  {
    id: "q1-1.00-capacite", skills: ["A1:1.00", "A1:5.08"], type: "multi", confidence: "secondary",
    prompt: "Concernant l'attestation de capacité de l'entreprise, quelles affirmations sont exactes ?",
    choices: [
      "Elle est nécessaire pour acheter des fluides frigorigènes",
      "Elle exige au moins un salarié titulaire d'une attestation d'aptitude valide",
      "Elle est délivrée à vie",
      "Elle remplace l'attestation d'aptitude du technicien",
    ],
    answer: [0, 1],
    explain: "L'attestation de capacité concerne l'entreprise (validité 5 ans) ; elle conditionne l'achat de fluide et suppose du personnel titulaire de l'attestation d'aptitude. Elle ne remplace pas l'aptitude individuelle.",
  },
  {
    id: "q1-1.00-deee", skills: ["A1:1.00", "A1:5.08"], type: "single", confidence: "secondary",
    prompt: "Un réfrigérateur ménager en fin de vie relève de quelle filière de collecte ?",
    choices: ["DEEE (déchets d'équipements électriques et électroniques)", "Ordures ménagères", "Ferraille, sans traitement particulier", "Déchets inertes du BTP"],
    answer: 0,
    explain: "Les appareils frigorifiques usagés sont des DEEE : le fluide et l'huile doivent être récupérés par un opérateur habilité avant tout démantèlement.",
  },
  {
    id: "q1-1.00-ecoconception", skills: ["A1:1.00"], type: "single", confidence: "secondary",
    prompt: "Que fixe la réglementation européenne sur l'écoconception pour les climatiseurs et pompes à chaleur ?",
    choices: [
      "Des performances énergétiques minimales (SEER, SCOP…)",
      "La périodicité du contrôle d'étanchéité",
      "Les catégories d'attestation d'aptitude",
      "Les quotas de mise sur le marché des HFC",
    ],
    answer: 0,
    explain: "L'écoconception impose des exigences minimales d'efficacité énergétique (SEER/SCOP) ; l'étiquetage énergétique les rend visibles. Le contrôle d'étanchéité et les quotas relèvent de F-Gas.",
  },

  // ---- 1.01 Unités ----
  {
    id: "q1-1.01-abs", skills: ["A1:1.01"], type: "numeric", confidence: "ok",
    prompt: "Un manomètre indique 7,0 bar. Quelle est la pression absolue (bar abs) ?",
    answer: { value: 8.01, tol: 0.05 }, unit: "bar",
    explain: "Les manomètres affichent la pression relative. P abs = P rel + pression atmosphérique (1,013 bar) = 7,0 + 1,01 = 8,01 bar abs.",
  },
  {
    id: "q1-1.01-pa", skills: ["A1:1.01"], type: "single", confidence: "ok",
    prompt: "À combien de pascals correspond 1 bar ?",
    choices: ["1 000 Pa", "10 000 Pa", "100 000 Pa", "1 000 000 Pa"],
    answer: 2,
    explain: "1 bar = 10⁵ Pa = 100 kPa = 0,1 MPa. Le pascal est l'unité SI de pression.",
  },
  {
    id: "q1-1.01-kelvin", skills: ["A1:1.01"], type: "numeric", confidence: "ok",
    prompt: "Convertissez 25 °C en kelvins.",
    answer: { value: 298.15, tol: 0.5 }, unit: "K",
    explain: "T(K) = T(°C) + 273,15 = 25 + 273,15 = 298,15 K. Un écart de température (surchauffe…) a la même valeur en K et en °C.",
  },
  {
    id: "q1-1.01-kwh", skills: ["A1:1.01"], type: "numeric", confidence: "ok",
    prompt: "Combien de mégajoules (MJ) représente 1 kWh ?",
    answer: { value: 3.6, tol: 0.01 }, unit: "MJ",
    explain: "1 kWh = 1000 W × 3600 s = 3 600 000 J = 3,6 MJ. Le joule est l'unité SI d'énergie, le watt (J/s) celle de la puissance.",
  },
  {
    id: "q1-1.01-microns", skills: ["A1:1.01", "A1:3.04"], type: "single", confidence: "ok",
    prompt: "Un vacuomètre affiche 500 microns (µm Hg). À quelle pression absolue cela correspond-il environ ?",
    choices: ["0,67 mbar", "5 mbar", "50 mbar", "0,5 bar"],
    answer: 0,
    explain: "1 micron de mercure ≈ 0,133 Pa, donc 500 µm ≈ 67 Pa ≈ 0,67 mbar absolu.",
  },
  {
    id: "q1-1.01-masse-vol", skills: ["A1:1.01"], type: "single", confidence: "ok",
    prompt: "La masse volumique du R32 liquide à 25 °C est d'environ 961 kg/m³. Combien pèse 1 litre de ce liquide ?",
    choices: ["0,096 kg", "0,961 kg", "9,61 kg", "961 kg"],
    answer: 1,
    explain: "1 m³ = 1000 L, donc 961 kg/m³ = 0,961 kg/L.",
  },

  // ---- 1.02 Thermodynamique, zéotropes ----
  {
    id: "q1-1.02-glissement", skills: ["A1:1.02"], type: "single", confidence: "ok",
    prompt: "Qu'appelle-t-on le « glissement de température » (glide) d'un mélange ?",
    choices: [
      "L'écart entre température de rosée et température de bulle à pression constante",
      "La différence entre température de refoulement et d'aspiration",
      "La baisse de température dans le détendeur",
      "L'écart entre surchauffe et sous-refroidissement",
    ],
    answer: 0,
    explain: "Un zéotrope ne change pas d'état à température constante : à pression donnée il commence à bouillir à la température de bulle et finit à la température de rosée. L'écart est le glissement (≈ 6,5 K pour le R407C).",
  },
  {
    id: "q1-1.02-zeotropes", skills: ["A1:1.02", "A1:1.06"], type: "multi", confidence: "ok",
    prompt: "Parmi ces fluides, lesquels sont des mélanges zéotropes à glissement important (plusieurs kelvins) ?",
    choices: ["R407C", "R449A", "R32", "R290", "R134a"],
    answer: [0, 1],
    explain: "R407C (≈ 6,5 K) et R449A (≈ 4,5 K) sont des zéotropes. R32, R290 et R134a sont des corps purs ; le R410A est quasi azéotrope (glissement ≈ 0,1 K).",
  },
  {
    id: "q1-1.02-charge-liquide", skills: ["A1:1.02", "A1:5.05"], type: "single", confidence: "ok",
    prompt: "Pourquoi un mélange zéotrope doit-il être soutiré de la bouteille en phase liquide ?",
    choices: [
      "Parce que la vapeur n'a pas la même composition que le liquide (fractionnement)",
      "Parce que la charge est plus rapide",
      "Pour éviter de refroidir la bouteille",
      "Parce que la vapeur est inflammable",
    ],
    answer: 0,
    explain: "Les composants les plus volatils s'évaporent en premier : la phase vapeur est enrichie en eux. Charger en vapeur modifierait la composition du fluide dans le circuit et dans la bouteille.",
  },
  {
    id: "q1-1.02-pression-bouteille", skills: ["A1:1.02", "A1:1.03"], type: "single", confidence: "ok",
    prompt: "Deux bouteilles de R134a à 20 °C : l'une pleine, l'autre presque vide (il reste du liquide). Que lit-on au manomètre ?",
    choices: ["La même pression (≈ 4,7 bar rel)", "Une pression plus forte sur la bouteille pleine", "Une pression plus forte sur la bouteille presque vide", "On ne peut rien dire sans peser"],
    answer: 0,
    explain: "Tant que liquide et vapeur coexistent, la pression ne dépend que de la température : Psat(R134a, 20 °C) ≈ 5,72 bar abs, soit ≈ 4,7 bar relatif. Seule la pesée donne la quantité.",
  },
  {
    id: "q1-1.02-latente", skills: ["A1:1.02"], type: "single", confidence: "ok",
    prompt: "Un corps pur s'évapore à pression constante dans l'évaporateur. Comment évolue sa température pendant le changement d'état ?",
    choices: ["Elle reste constante", "Elle augmente régulièrement", "Elle diminue", "Elle suit la température de l'air"],
    answer: 0,
    explain: "Pendant un changement d'état à pression constante, un corps pur absorbe de la chaleur latente sans changer de température. La température ne monte qu'une fois tout le liquide évaporé (surchauffe).",
  },
  {
    id: "q1-1.02-fuite-zeo", skills: ["A1:1.02", "A1:1.06"], type: "single", confidence: "ok",
    prompt: "Après une fuite importante en phase vapeur sur un circuit au R407C, quelle est la bonne pratique ?",
    choices: [
      "Récupérer la charge restante et recharger en totalité en fluide neuf, en phase liquide",
      "Compléter la charge en phase vapeur",
      "Compléter avec du R134a, un des composants du mélange",
      "Ajouter de l'azote pour compenser",
    ],
    answer: 0,
    explain: "Une fuite vapeur modifie la composition du zéotrope restant. Si l'écart de composition est important, on récupère et on recharge entièrement, toujours en phase liquide.",
  },

  // ---- 1.03 Tables, log p-h ----
  {
    id: "q1-1.03-tsat-r134a", skills: ["A1:1.03"], type: "numeric", confidence: "ok",
    prompt: "R134a : le manomètre BP indique 1,9 bar (relatif). Quelle est la température d'évaporation (°C) ?",
    answer: { value: -0.2, tol: 1 }, unit: "°C",
    explain: "1,9 + 1,01 = 2,91 bar abs. La table du R134a donne Psat = 2,93 bar abs à 0 °C, donc Tévap ≈ 0 °C.",
  },
  {
    id: "q1-1.03-sh-r32", skills: ["A1:1.03", "A1:4.04"], type: "numeric", confidence: "ok",
    prompt: "R32 : BP 7,1 bar (relatif), température de la ligne d'aspiration en sortie d'évaporateur 6 °C. Quelle est la surchauffe (K) ?",
    answer: { value: 6.1, tol: 1 }, unit: "K",
    explain: "7,1 bar rel = 8,11 bar abs → Tévap ≈ 0 °C (table R32). Surchauffe = T aspiration − T évaporation = 6 − 0 ≈ 6 K.",
  },
  {
    id: "q1-1.03-sc-r410a", skills: ["A1:1.03", "A1:4.04"], type: "numeric", confidence: "ok",
    prompt: "R410A : HP 23,2 bar (relatif), température de la ligne liquide 35 °C. Quel est le sous-refroidissement (K) ?",
    answer: { value: 4.9, tol: 1 }, unit: "K",
    explain: "23,2 bar rel = 24,2 bar abs → Tcond ≈ 40 °C (bulle). Sous-refroidissement = T condensation − T liquide = 40 − 35 ≈ 5 K.",
  },
  {
    id: "q1-1.03-sh-r407c", skills: ["A1:1.03", "A1:1.02"], type: "numeric", confidence: "ok",
    prompt: "R407C : BP 3,0 bar (relatif), température d'aspiration 6 °C. Quelle est la surchauffe (K) ? (Pour un zéotrope, choisissez la bonne température de saturation.)",
    answer: { value: 7.8, tol: 1 }, unit: "K",
    explain: "La surchauffe se calcule avec la température de ROSÉE : à 4,01 bar abs, Trosée ≈ −1,8 °C, donc SH ≈ 6 − (−1,8) ≈ 8 K. Avec la température de bulle (≈ −9 °C) on trouverait 15 K, à tort.",
  },
  {
    id: "q1-1.03-sc-r449a", skills: ["A1:1.03", "A1:1.02"], type: "numeric", confidence: "ok",
    prompt: "R449A : HP 16,0 bar (relatif), température de la ligne liquide 34 °C. Quel est le sous-refroidissement (K) ?",
    answer: { value: 5.3, tol: 1 }, unit: "K",
    explain: "Le sous-refroidissement se calcule avec la température de BULLE : à 17,0 bar abs, Tbulle ≈ 39,3 °C, donc SC ≈ 39,3 − 34 ≈ 5 K. Avec la rosée (≈ 45,7 °C) on surestimerait le sous-refroidissement.",
  },
  {
    id: "q1-1.03-logph-axes", skills: ["A1:1.03"], type: "single", confidence: "ok",
    prompt: "Sur un diagramme log p-h (diagramme de Mollier frigorifique), que porte-t-on en abscisse ?",
    choices: ["L'enthalpie massique (kJ/kg)", "La température (°C)", "L'entropie (kJ/kg·K)", "Le volume massique (m³/kg)"],
    answer: 0,
    explain: "Abscisse = enthalpie massique h (kJ/kg), ordonnée = pression en échelle logarithmique. Sous la cloche, le fluide est en mélange liquide-vapeur.",
  },
  {
    id: "q1-1.03-cloche", skills: ["A1:1.03", "A1:1.02"], type: "single", confidence: "ok",
    prompt: "Sur le diagramme log p-h d'un corps pur, comment sont les isothermes à l'intérieur de la cloche ?",
    choices: ["Horizontales (pression constante)", "Verticales", "Confondues avec la courbe de bulle", "Inexistantes"],
    answer: 0,
    explain: "Dans la zone diphasique, température et pression sont liées : une isotherme est donc une droite horizontale. Pour un zéotrope, elles sont inclinées à cause du glissement.",
  },

  // ---- 1.04 Composants ----
  {
    id: "q1-1.04-cycle", skills: ["A1:1.04"], type: "order", confidence: "ok",
    prompt: "En partant du compresseur, classez les composants dans le sens de circulation du fluide.",
    choices: ["Compresseur", "Condenseur", "Détendeur", "Évaporateur"],
    explain: "Le compresseur refoule une vapeur chaude HP vers le condenseur, le liquide est détendu par le détendeur puis s'évapore dans l'évaporateur avant de revenir au compresseur.",
  },
  {
    id: "q1-1.04-condenseur", skills: ["A1:1.04"], type: "order", confidence: "ok",
    prompt: "Classez les transformations du fluide dans le condenseur, de l'entrée à la sortie.",
    choices: ["Désurchauffe de la vapeur", "Condensation", "Sous-refroidissement du liquide"],
    explain: "La vapeur surchauffée se refroidit jusqu'à saturation (désurchauffe), se condense à pression constante, puis le liquide se refroidit sous sa température de condensation (sous-refroidissement).",
  },
  {
    id: "q1-1.04-detendeur", skills: ["A1:1.04"], type: "single", confidence: "ok",
    prompt: "Quel est le rôle du détendeur ?",
    choices: [
      "Abaisser la pression du liquide et alimenter l'évaporateur selon le besoin",
      "Augmenter la pression de la vapeur",
      "Retenir l'humidité",
      "Séparer l'huile du fluide",
    ],
    answer: 0,
    explain: "Le détendeur crée la chute de pression HP → BP et dose le débit de liquide vers l'évaporateur (un détendeur thermostatique maintient une surchauffe constante).",
  },
  {
    id: "q1-1.04-etat-aspiration", skills: ["A1:1.04", "A1:1.02"], type: "single", confidence: "ok",
    prompt: "Dans quel état le fluide doit-il arriver à l'aspiration du compresseur ?",
    choices: ["Vapeur surchauffée", "Liquide sous-refroidi", "Mélange liquide-vapeur", "Liquide saturé"],
    answer: 0,
    explain: "Un compresseur ne comprime que de la vapeur : la surchauffe garantit qu'aucune goutte de liquide n'arrive au compresseur (risque de coup de liquide).",
  },
  {
    id: "q1-1.04-position", skills: ["A1:1.04", "A1:1.05"], type: "multi", confidence: "ok",
    prompt: "Quels composants sont normalement installés sur la ligne liquide (entre condenseur et détendeur) ?",
    choices: ["Filtre déshydrateur", "Voyant liquide", "Vanne électromagnétique de ligne liquide", "Bouteille anti-coup de liquide", "Séparateur d'huile"],
    answer: [0, 1, 2],
    explain: "Filtre déshydrateur, voyant et électrovanne se placent sur la ligne liquide. La bouteille anti-coup de liquide est à l'aspiration, le séparateur d'huile au refoulement.",
  },
  {
    id: "q1-1.04-evaporateur", skills: ["A1:1.04"], type: "single", confidence: "ok",
    prompt: "Que fait le fluide frigorigène dans l'évaporateur ?",
    choices: [
      "Il s'évapore en absorbant la chaleur du milieu à refroidir",
      "Il se condense en cédant de la chaleur",
      "Il est comprimé",
      "Il se sous-refroidit",
    ],
    answer: 0,
    explain: "L'évaporateur produit le froid : le fluide basse pression s'y évapore en prenant de la chaleur à l'air ou à l'eau, puis se surchauffe en fin d'évaporateur.",
  },

  // ---- 1.05 Vannes, régulation, sécurité ----
  {
    id: "q1-1.05-voyant", skills: ["A1:1.05", "A1:4.04"], type: "single", confidence: "ok",
    prompt: "Le voyant liquide montre des bulles en permanence et l'indicateur d'humidité a changé de couleur. Que signifient ces deux indications ?",
    choices: [
      "Bulles : liquide pas assez sous-refroidi (souvent manque de charge) ; couleur : humidité dans le circuit",
      "Bulles : surcharge ; couleur : excès d'huile",
      "Bulles : présence d'azote ; couleur : fluide neuf",
      "Les deux signifient que le circuit est normal",
    ],
    answer: 0,
    explain: "Des bulles en ligne liquide indiquent un sous-refroidissement insuffisant (manque de charge, filtre colmaté…). La pastille qui change de couleur signale une humidité excessive : filtre déshydrateur à remplacer.",
  },
  {
    id: "q1-1.05-pressostat-hp", skills: ["A1:1.05"], type: "single", confidence: "ok",
    prompt: "Quel est le rôle d'un pressostat HP de sécurité ?",
    choices: [
      "Arrêter le compresseur si la pression de refoulement dépasse le seuil réglé",
      "Démarrer le compresseur quand la BP monte",
      "Réguler la surchauffe",
      "Évacuer le fluide à l'atmosphère",
    ],
    answer: 0,
    explain: "Le pressostat HP coupe le compresseur en cas de surpression (condenseur encrassé, ventilateur HS…). En sécurité il est souvent à réarmement manuel pour imposer une recherche de cause.",
  },
  {
    id: "q1-1.05-securites", skills: ["A1:1.05"], type: "multi", confidence: "ok",
    prompt: "Lesquels sont des organes de sécurité contre la surpression ?",
    choices: ["Pressostat HP", "Soupape de sécurité", "Voyant liquide", "Filtre déshydrateur", "Bouchon fusible"],
    answer: [0, 1, 4],
    explain: "Pressostat HP, soupape et bouchon fusible protègent contre la surpression. Voyant et filtre sont des accessoires de contrôle et de traitement du fluide.",
  },
  {
    id: "q1-1.05-schrader", skills: ["A1:1.05", "A1:4.01"], type: "single", confidence: "ok",
    prompt: "Pourquoi faut-il toujours remettre le bouchon sur une valve Schrader après intervention ?",
    choices: [
      "Le bouchon avec son joint est la seconde barrière d'étanchéité",
      "Pour des raisons esthétiques",
      "Pour faciliter la prochaine connexion",
      "Le bouchon sert de soupape",
    ],
    answer: 0,
    explain: "L'obus Schrader peut fuir légèrement ; le bouchon étanche (avec joint) constitue la seconde barrière. Une valve sans bouchon est un point de fuite fréquent.",
  },
  {
    id: "q1-1.05-electrovanne", skills: ["A1:1.05", "A1:1.04"], type: "single", confidence: "ok",
    prompt: "Une vanne électromagnétique de ligne liquide « NF » (normalement fermée)…",
    choices: ["est fermée quand sa bobine n'est pas alimentée", "est ouverte quand sa bobine n'est pas alimentée", "régule la pression d'évaporation", "remplace le détendeur"],
    answer: 0,
    explain: "NF : fermée hors tension, elle s'ouvre quand la bobine est alimentée. Utilisée avec un pressostat BP, elle permet le pump-down (arrêt par tirage au vide de l'évaporateur).",
  },
  {
    id: "q1-1.05-soupape", skills: ["A1:1.05"], type: "single", confidence: "ok",
    prompt: "Une soupape de sécurité protège un réservoir de liquide. Que ne doit-on jamais faire ?",
    choices: [
      "Installer une vanne fermée entre le réservoir et la soupape",
      "Contrôler visuellement la soupape",
      "Noter son tarage dans le dossier",
      "Orienter son échappement vers une zone sûre",
    ],
    answer: 0,
    explain: "Une soupape ne doit jamais pouvoir être isolée du volume qu'elle protège : sinon la protection contre la surpression n'existe plus.",
  },

  // ---- 1.06 Substitution ----
  {
    id: "q1-1.06-r449a-retrofit", skills: ["A1:1.06", "A1:5.05"], type: "multi", confidence: "ok",
    prompt: "Remplacement du R404A par du R449A sur une installation existante. Quelles actions sont nécessaires ?",
    choices: [
      "Charger le R449A en phase liquide",
      "Calculer la surchauffe avec la température de rosée",
      "Mettre à jour l'étiquetage et le registre de l'équipement",
      "Charger le R449A en phase vapeur pour aller plus vite",
      "Mélanger le R449A avec le R404A restant",
    ],
    answer: [0, 1, 2],
    explain: "Le R449A est un zéotrope (glissement ≈ 4,5 K) : charge en liquide, surchauffe sur la rosée, sous-refroidissement sur la bulle. Le R404A est récupéré entièrement, jamais mélangé, et l'étiquette doit indiquer le nouveau fluide.",
  },
  {
    id: "q1-1.06-r32-refoulement", skills: ["A1:1.06", "A1:1.07"], type: "single", confidence: "ok",
    prompt: "Par rapport au R410A, le R32 présente notamment…",
    choices: [
      "un PRP plus faible mais une température de refoulement plus élevée",
      "un PRP plus élevé",
      "une classe de sécurité A1",
      "des pressions deux fois plus faibles",
    ],
    answer: 0,
    explain: "R32 : PRP 675 contre 2088 pour le R410A, pressions voisines, classe A2L (faiblement inflammable) et température de refoulement plus élevée.",
  },
  {
    id: "q1-1.06-r1234yf", skills: ["A1:1.06", "A1:2.02"], type: "single", confidence: "ok",
    prompt: "Le R1234yf (HFO) remplace le R134a en climatisation automobile. Pourquoi est-il un bon candidat ?",
    choices: [
      "Pressions de fonctionnement proches du R134a et PRP très faible (4)",
      "Il est ininflammable et sans PRP",
      "Il fonctionne à des pressions bien plus élevées",
      "C'est un hydrocarbure",
    ],
    answer: 0,
    explain: "Ses courbes pression-température sont voisines de celles du R134a et son PRP est de 4 au lieu de 1430. Il est en revanche classé A2L.",
  },
  {
    id: "q1-1.06-huile-r22", skills: ["A1:1.06", "A1:5.04"], type: "single", confidence: "ok",
    prompt: "Lors du passage d'une installation au R22 (huile minérale) vers un HFC, que faut-il généralement faire pour l'huile ?",
    choices: [
      "La remplacer par une huile POE compatible avec le HFC",
      "Garder l'huile minérale, elle convient à tous les fluides",
      "Supprimer l'huile",
      "Ajouter de l'huile pour moteur",
    ],
    answer: 0,
    explain: "Les HFC ne sont pas miscibles avec l'huile minérale : le retour d'huile au compresseur ne serait plus assuré. On passe à une huile polyolester (POE), hygroscopique, donc à manipuler à l'abri de l'humidité.",
  },

  // ---- 1.07 HC, CO₂, NH₃ ----
  {
    id: "q1-1.07-co2-critique", skills: ["A1:1.07"], type: "single", confidence: "ok",
    prompt: "Pourquoi les installations au CO₂ (R744) fonctionnent-elles souvent en cycle transcritique ?",
    choices: [
      "Parce que sa température critique (31 °C) est souvent dépassée côté HP",
      "Parce que le CO₂ est inflammable",
      "Parce que sa pression est trop faible",
      "Parce qu'il est toxique",
    ],
    answer: 0,
    explain: "Au-delà de 31 °C (73,8 bar), le CO₂ ne peut plus se condenser : on refroidit un gaz supercritique dans un refroidisseur de gaz (gas cooler).",
  },
  {
    id: "q1-1.07-co2-pression", skills: ["A1:1.07", "A1:1.03"], type: "numeric", confidence: "ok",
    prompt: "Quelle est la pression de saturation relative du CO₂ (R744) à 0 °C (bar) ?",
    answer: { value: 33.8, tol: 1 }, unit: "bar",
    explain: "Psat(R744, 0 °C) ≈ 34,85 bar abs, soit ≈ 33,8 bar relatif : environ quatre fois celle du R32 (≈ 7,1 bar rel). Il faut des composants et des outils adaptés à ces pressions.",
  },
  {
    id: "q1-1.07-nh3", skills: ["A1:1.07"], type: "multi", confidence: "ok",
    prompt: "Quelles affirmations sur l'ammoniac (R717) sont exactes ?",
    choices: [
      "Il est toxique (classe B2L)",
      "Il est incompatible avec le cuivre et ses alliages",
      "Son PRP est nul",
      "Il est inodore",
      "Il s'utilise avec des tubes en cuivre",
    ],
    answer: [0, 1, 2],
    explain: "R717 : classe B2L (toxique, faiblement inflammable), PRP 0, odeur très forte qui sert d'alarme. Il attaque le cuivre : les installations sont en acier.",
  },
  {
    id: "q1-1.07-r290", skills: ["A1:1.07", "A1:1.08"], type: "single", confidence: "ok",
    prompt: "Le propane (R290) se caractérise par…",
    choices: [
      "une classe A3 (très inflammable) et un PRP de 3",
      "une classe A1 et un PRP de 1430",
      "une classe B2L et un PRP nul",
      "une classe A2L et un PRP de 675",
    ],
    answer: 0,
    explain: "R290 : PRP 3, excellentes performances, mais classe A3. Sa masse volumique liquide (≈ 493 kg/m³) est environ moitié de celle des HFC, d'où des charges plus faibles.",
  },
  {
    id: "q1-1.07-classes", skills: ["A1:1.07", "A1:1.08"], type: "single", confidence: "ok",
    prompt: "Dans la classification de sécurité des fluides (A1, A2L, A3, B2L…), que désigne la lettre ?",
    choices: ["La toxicité (A = faible, B = plus élevée)", "L'inflammabilité", "Le PRP", "La pression de service"],
    answer: 0,
    explain: "La lettre indique la toxicité (A faible, B plus élevée) ; le chiffre indique l'inflammabilité (1 pas de propagation de flamme, 2L faible, 2, 3 forte).",
  },

  // ---- 1.08 Inflammabilité ----
  {
    id: "q1-1.08-a2l", skills: ["A1:1.08"], type: "single", confidence: "ok",
    prompt: "Que signifie la classe « 2L » d'un fluide comme le R32 ?",
    choices: [
      "Faiblement inflammable, vitesse de combustion faible (≤ 10 cm/s)",
      "Ininflammable",
      "Très inflammable",
      "Toxique à faible concentration",
    ],
    answer: 0,
    explain: "2L = faiblement inflammable avec une vitesse de flamme ≤ 10 cm/s. Le R32 et le R1234yf sont A2L ; le propane est A3.",
  },
  {
    id: "q1-1.08-lfl", skills: ["A1:1.08"], type: "single", confidence: "ok",
    prompt: "Quelle est la limite inférieure d'inflammabilité (LII / LFL) du propane R290 ?",
    choices: ["0,038 kg/m³", "0,307 kg/m³", "0,38 kg/m³", "3,8 kg/m³"],
    answer: 0,
    explain: "LFL R290 ≈ 0,038 kg/m³, soit environ 8 fois plus faible que celle du R32 (≈ 0,307 kg/m³). Plus la LFL est basse, plus la charge admissible dans un local est faible.",
  },
  {
    id: "q1-1.08-charge-local", skills: ["A1:1.08"], type: "single", confidence: "ok",
    prompt: "Dans un même local, quel fluide autorise la charge la plus élevée au regard du risque d'inflammabilité ?",
    choices: ["R32 (LFL 0,307 kg/m³)", "R290 (LFL 0,038 kg/m³)", "Les deux sont identiques", "Cela ne dépend pas du fluide"],
    answer: 0,
    explain: "Les limites de charge des normes sont proportionnelles à la LFL et au volume/surface du local : avec une LFL 8 fois plus élevée, le R32 permet une charge bien plus importante.",
  },
  {
    id: "q1-1.08-volume-lfl", skills: ["A1:1.08"], type: "numeric", confidence: "ok",
    prompt: "Un local de 30 m³. Quelle masse de R290 (kg), répartie uniformément, suffirait à atteindre la LFL (0,038 kg/m³) ?",
    answer: { value: 1.14, tol: 0.03 }, unit: "kg",
    explain: "30 m³ × 0,038 kg/m³ = 1,14 kg. En réalité le propane, plus lourd que l'air, s'accumule au sol : la LFL est atteinte localement avec beaucoup moins, d'où des limites de charge bien inférieures.",
  },
  {
    id: "q1-1.08-lourd", skills: ["A1:1.08", "A1:5.09"], type: "single", confidence: "ok",
    prompt: "Où une fuite de propane (R290) risque-t-elle de former une atmosphère inflammable ?",
    choices: ["Au niveau du sol et dans les points bas", "Au plafond", "Uniformément dans la pièce instantanément", "Nulle part, il se dilue immédiatement"],
    answer: 0,
    explain: "Le propane est plus lourd que l'air : il s'accumule au sol, dans les caniveaux et sous-sols. Détection et ventilation se font en partie basse.",
  },

  // ---- 2.01 Politique climatique ----
  {
    id: "q1-2.01-kigali", skills: ["A1:2.01"], type: "single", confidence: "ok",
    prompt: "Quel accord international organise la réduction progressive (phase-down) des HFC à l'échelle mondiale ?",
    choices: ["L'amendement de Kigali (2016) au protocole de Montréal", "Le protocole de Kyoto (1997)", "La convention de Vienne (1985)", "Le règlement F-Gas"],
    answer: 0,
    explain: "L'amendement de Kigali, adopté en 2016, ajoute les HFC au protocole de Montréal avec un calendrier mondial de réduction. F-Gas est un règlement européen, pas un accord international.",
  },
  {
    id: "q1-2.01-montreal", skills: ["A1:2.01", "A1:2.02"], type: "single", confidence: "ok",
    prompt: "Le protocole de Montréal (1987) visait à l'origine…",
    choices: [
      "la protection de la couche d'ozone (CFC, HCFC)",
      "la limitation du réchauffement à 1,5 °C",
      "la réduction des HFC uniquement",
      "l'efficacité énergétique des bâtiments",
    ],
    answer: 0,
    explain: "Montréal a éliminé les substances appauvrissant la couche d'ozone (CFC comme le R12, HCFC comme le R22). Les HFC, sans effet sur l'ozone, n'y ont été ajoutés qu'en 2016 à Kigali pour leur effet de serre.",
  },
  {
    id: "q1-2.01-paris", skills: ["A1:2.01"], type: "single", confidence: "ok",
    prompt: "Quel est l'objectif central de l'accord de Paris (2015) ?",
    choices: [
      "Contenir le réchauffement nettement en dessous de 2 °C, en visant 1,5 °C",
      "Supprimer tous les fluides frigorigènes",
      "Interdire le CO₂ comme fluide",
      "Protéger la couche d'ozone",
    ],
    answer: 0,
    explain: "L'accord de Paris fixe l'objectif de limiter le réchauffement bien en dessous de 2 °C par rapport à l'ère préindustrielle, et de poursuivre les efforts vers 1,5 °C.",
  },
  {
    id: "q1-2.01-ordre", skills: ["A1:2.01"], type: "order", confidence: "ok",
    prompt: "Classez ces textes dans l'ordre chronologique.",
    choices: ["Protocole de Montréal", "Protocole de Kyoto", "Accord de Paris", "Amendement de Kigali", "Règlement F-Gas III (UE 2024/573)"],
    explain: "Montréal 1987 → Kyoto 1997 → Paris 2015 → Kigali 2016 → F-Gas III 2024.",
  },
  {
    id: "q1-2.01-quotas", skills: ["A1:2.01", "A1:1.00"], type: "single", confidence: "secondary",
    prompt: "Selon F-Gas III, quel est l'horizon de la réduction des quotas de mise sur le marché des HFC dans l'UE ?",
    choices: ["Sortie complète des HFC en 2050", "Réduction de 10 % en 2050", "Aucun quota n'existe", "Interdiction totale dès 2025"],
    answer: 0,
    explain: "Le système de quotas réduit progressivement les quantités de HFC mises sur le marché, jusqu'à zéro en 2050. Conséquence : prix en hausse et passage aux fluides à faible PRP.",
  },

  // ---- 2.02 PRP, PFAS ----
  {
    id: "q1-2.02-prp-def", skills: ["A1:2.02"], type: "single", confidence: "ok",
    prompt: "Que représente le PRP (potentiel de réchauffement planétaire, GWP) d'un fluide ?",
    choices: [
      "Son effet de serre comparé à celui de la même masse de CO₂, sur 100 ans",
      "Sa capacité à détruire l'ozone",
      "Sa température critique",
      "Son pouvoir frigorifique",
    ],
    answer: 0,
    explain: "Le PRP compare l'effet de serre d'1 kg de gaz à celui d'1 kg de CO₂ (PRP = 1) sur 100 ans. Les valeurs réglementaires françaises sont celles du 4e rapport du GIEC (ex. R410A = 2088).",
  },
  {
    id: "q1-2.02-plus-fort", skills: ["A1:2.02"], type: "single", confidence: "ok",
    prompt: "Lequel de ces fluides a le PRP le plus élevé ?",
    choices: ["R404A", "R410A", "R134a", "R32"],
    answer: 0,
    explain: "R404A = 3922, R410A = 2088, R134a = 1430, R32 = 675. Le R404A est le plus visé par les restrictions F-Gas.",
  },
  {
    id: "q1-2.02-tco2e", skills: ["A1:2.02"], type: "numeric", confidence: "ok",
    prompt: "Une fuite a fait perdre 3 kg de R404A (PRP 3922). Combien de tonnes équivalent CO₂ ont été émises ?",
    answer: { value: 11.77, tol: 0.1 }, unit: "t CO₂e",
    explain: "3 × 3922 / 1000 = 11,77 t CO₂e, l'équivalent de plusieurs dizaines de milliers de km en voiture.",
  },
  {
    id: "q1-2.02-tfa", skills: ["A1:2.02"], type: "single", confidence: "ok",
    prompt: "Quel produit de dégradation atmosphérique des HFO comme le R1234yf soulève des préoccupations environnementales ?",
    choices: ["L'acide trifluoroacétique (TFA), une substance PFAS persistante", "Le monoxyde de carbone", "L'ozone stratosphérique", "Le méthane"],
    answer: 0,
    explain: "Le R1234yf se dégrade rapidement dans l'atmosphère, mais presque entièrement en TFA, un PFAS très persistant qui s'accumule dans l'eau. Un faible PRP ne signifie pas absence d'impact.",
  },
  {
    id: "q1-2.02-faible-prp", skills: ["A1:2.02", "A1:1.07"], type: "multi", confidence: "ok",
    prompt: "Quels fluides ont un PRP inférieur à 10 ?",
    choices: ["R744 (CO₂)", "R290 (propane)", "R1234yf", "R32", "R134a"],
    answer: [0, 1, 2],
    explain: "R744 = 1, R290 = 3, R1234yf = 4. Le R32 (675) et le R134a (1430) sont des HFC à PRP nettement plus élevé.",
  },
  {
    id: "q1-2.02-odp", skills: ["A1:2.02", "A1:2.01"], type: "single", confidence: "ok",
    prompt: "Les HFC (R134a, R410A…) détruisent-ils la couche d'ozone ?",
    choices: ["Non, leur potentiel de destruction de l'ozone est nul, mais ce sont des gaz à effet de serre", "Oui, autant que les CFC", "Oui, mais seulement le R410A", "Non, et ils n'ont aucun impact environnemental"],
    answer: 0,
    explain: "Sans chlore, les HFC ont un PDO (ODP) nul ; leur problème est leur PRP élevé. Les CFC et HCFC (R22) détruisaient l'ozone.",
  },

  // ---- 3.01 Essai de résistance ----
  {
    id: "q1-3.01-azote", skills: ["A1:3.01", "A1:3.02"], type: "single", confidence: "ok",
    prompt: "Avec quel gaz réalise-t-on un essai de pression sur un circuit frigorifique ?",
    choices: ["Azote sec (OFN)", "Oxygène", "Air comprimé de l'atelier", "Fluide frigorigène du circuit"],
    answer: 0,
    explain: "On utilise de l'azote déshydraté (OFN). Jamais d'oxygène : au contact de l'huile sous pression il peut provoquer une explosion. L'air apporte humidité et oxygène ; le fluide serait émis en cas de fuite.",
  },
  {
    id: "q1-3.01-jamais-o2", skills: ["A1:3.01"], type: "single", confidence: "ok",
    prompt: "Pourquoi est-il interdit d'utiliser de l'oxygène pour mettre un circuit sous pression ?",
    choices: [
      "Risque d'inflammation ou d'explosion au contact de l'huile",
      "L'oxygène est trop cher",
      "L'oxygène ne peut pas être détecté",
      "L'oxygène est plus léger que l'air",
    ],
    answer: 0,
    explain: "L'huile du compresseur et les graisses s'enflamment spontanément sous oxygène pur comprimé. Seul l'azote (OFN), gaz inerte et sec, convient.",
  },
  {
    id: "q1-3.01-detendeur", skills: ["A1:3.01"], type: "single", confidence: "ok",
    prompt: "Une bouteille d'azote pleine contient environ 200 bar. Que faut-il impérativement utiliser pour pressuriser un circuit ?",
    choices: ["Un détendeur-manodétendeur réglé à la pression d'essai", "Le manifold seul", "Un flexible direct sur la vanne de la bouteille", "Une vanne à boisseau"],
    answer: 0,
    explain: "Sans détendeur, la pression de la bouteille détruirait le circuit et serait dangereuse pour l'opérateur. On monte progressivement jusqu'à la pression d'essai.",
  },
  {
    id: "q1-3.01-procedure", skills: ["A1:3.01", "A1:3.02"], type: "order", confidence: "ok",
    prompt: "Classez les étapes d'un essai de pression à l'azote.",
    choices: [
      "Isoler les composants non prévus pour la pression d'essai",
      "Raccorder la bouteille d'azote équipée de son détendeur",
      "Monter progressivement à la pression d'essai",
      "Maintenir la pression et relever pression et température",
      "Relâcher l'azote dans une zone ventilée",
    ],
    explain: "On protège les organes fragiles, on pressurise progressivement à l'azote détendu, on observe (avec correction de température), puis on évacue l'azote, qui n'est pas polluant mais présente un risque d'anoxie en local confiné.",
  },

  // ---- 3.02 Essai d'étanchéité ----
  {
    id: "q1-3.02-correction-t", skills: ["A1:3.02", "A1:1.01"], type: "numeric", confidence: "ok",
    prompt: "Circuit sous azote à 25 bar (relatif) à 30 °C. Le lendemain matin, il fait 15 °C. Sans fuite, quelle pression relative doit-on lire (bar) ?",
    answer: { value: 23.71, tol: 0.1 }, unit: "bar",
    explain: "P₂ = P₁ × T₂ / T₁ en absolu et en kelvins : 26,01 × 288,15 / 303,15 = 24,73 bar abs, soit 23,7 bar relatif. Une baisse plus importante indique une fuite.",
  },
  {
    id: "q1-3.02-interpretation", skills: ["A1:3.02"], type: "single", confidence: "ok",
    prompt: "Après 24 h sous azote, la pression a baissé. Comment conclure ?",
    choices: [
      "Corriger la pression initiale de la variation de température ; s'il reste une baisse, il y a une fuite",
      "Toute baisse est une fuite, sans calcul",
      "Une baisse est normale, l'azote traverse le cuivre",
      "Ajouter de l'azote et recommencer",
    ],
    answer: 0,
    explain: "La pression d'un gaz varie avec la température (P/T constant, en absolu). Il faut comparer à la pression attendue à la nouvelle température avant de conclure.",
  },
  {
    id: "q1-3.02-hydrogene", skills: ["A1:3.02", "A1:4.06"], type: "single", confidence: "secondary",
    prompt: "Pour localiser une très petite fuite sur un circuit vide de fluide, on peut le remplir de…",
    choices: ["Azote hydrogéné (95 % N₂ / 5 % H₂) et utiliser un détecteur d'hydrogène", "Oxygène et un détecteur électronique", "Air comprimé et une lampe UV", "Propane et un briquet"],
    answer: 0,
    explain: "Le mélange 95/5 est ininflammable ; l'hydrogène, très petite molécule, traverse les micro-fuites et se détecte avec un détecteur spécifique.",
  },
  {
    id: "q1-3.02-bulles", skills: ["A1:3.02", "A1:4.07"], type: "single", confidence: "ok",
    prompt: "Pendant l'essai d'étanchéité sous azote, comment vérifier rapidement chaque raccord ?",
    choices: ["Avec un produit moussant (bulles)", "En écoutant", "Avec un thermomètre", "En pesant le circuit"],
    answer: 0,
    explain: "Un produit moussant appliqué sur les raccords et brasures forme des bulles à l'endroit d'une fuite. On rince ensuite pour éviter la corrosion.",
  },

  // ---- 3.03 Pompe à vide ----
  {
    id: "q1-3.03-pas-fluide", skills: ["A1:3.03", "A1:5.03"], type: "single", confidence: "ok",
    prompt: "Peut-on utiliser une pompe à vide pour vidanger un circuit encore chargé en fluide ?",
    choices: [
      "Non : le fluide doit d'abord être récupéré avec une station de récupération",
      "Oui, si on ouvre le lest d'air",
      "Oui, pour les petites charges",
      "Oui, si le fluide est un HFO",
    ],
    answer: 0,
    explain: "La pompe à vide rejette ce qu'elle aspire à l'atmosphère : l'utiliser sur un circuit chargé est un dégazage interdit. On récupère d'abord, on tire au vide ensuite.",
  },
  {
    id: "q1-3.03-bonnes-pratiques", skills: ["A1:3.03"], type: "multi", confidence: "ok",
    prompt: "Quelles pratiques accélèrent et améliorent le tirage au vide ?",
    choices: [
      "Flexibles courts et de gros diamètre",
      "Retirer les obus Schrader avec un démonte-obus",
      "Huile de pompe propre, vidangée régulièrement",
      "Flexibles longs et fins",
      "Laisser les obus en place pour limiter les fuites",
    ],
    answer: [0, 1, 2],
    explain: "Le débit pompé est limité par les restrictions : obus Schrader et flexibles fins freinent fortement. Une huile chargée d'humidité dégrade le vide limite de la pompe.",
  },
  {
    id: "q1-3.03-arret", skills: ["A1:3.03"], type: "single", confidence: "ok",
    prompt: "En fin de tirage au vide, que faut-il faire avant d'arrêter la pompe ?",
    choices: ["Isoler la pompe du circuit (fermer la vanne)", "Ouvrir le lest d'air", "Débrancher le vacuomètre", "Ouvrir la bouteille de fluide"],
    answer: 0,
    explain: "Une pompe arrêtée encore ouverte sur le circuit laisse l'air rentrer et peut faire remonter de l'huile dans les flexibles et le circuit. On isole d'abord, puis on arrête.",
  },
  {
    id: "q1-3.03-lest", skills: ["A1:3.03"], type: "single", confidence: "ok",
    prompt: "À quoi sert le lest d'air (gas ballast) d'une pompe à vide ?",
    choices: [
      "À limiter la condensation de vapeur d'eau dans l'huile de la pompe",
      "À augmenter le vide limite",
      "À récupérer le fluide frigorigène",
      "À mesurer le vide",
    ],
    answer: 0,
    explain: "En début de tirage, beaucoup de vapeur d'eau est aspirée ; le lest d'air évite qu'elle se condense dans l'huile. On le ferme ensuite pour atteindre le vide le plus poussé.",
  },
  {
    id: "q1-3.03-vacuometre", skills: ["A1:3.03", "A1:3.04"], type: "single", confidence: "ok",
    prompt: "Où raccorder idéalement le vacuomètre électronique ?",
    choices: ["Côté circuit, le plus loin possible de la pompe", "Directement sur la pompe", "Sur la bouteille de fluide", "Il n'a pas besoin d'être raccordé"],
    answer: 0,
    explain: "Près de la pompe, le vacuomètre affiche un vide meilleur que celui réellement atteint dans le circuit. On le place côté installation, isolable de la pompe pour l'essai de remontée.",
  },

  // ---- 3.04 Air et humidité ----
  {
    id: "q1-3.04-remontee", skills: ["A1:3.04"], type: "single", confidence: "ok",
    prompt: "Pompe isolée, la pression remonte puis se stabilise sur un palier. Quel est le diagnostic ?",
    choices: ["Humidité résiduelle dans le circuit", "Fuite", "Circuit parfaitement sec et étanche", "Vacuomètre défectueux"],
    answer: 0,
    explain: "L'eau restante s'évapore jusqu'à atteindre sa pression de vapeur : la pression se stabilise (palier). Il faut prolonger le tirage au vide, éventuellement casser le vide à l'azote.",
  },
  {
    id: "q1-3.04-fuite", skills: ["A1:3.04", "A1:3.02"], type: "single", confidence: "ok",
    prompt: "Pompe isolée, la pression remonte de façon continue et régulière (linéaire), sans se stabiliser. Quel est le diagnostic ?",
    choices: ["Fuite", "Humidité", "Vide parfait", "Excès d'huile dans le compresseur"],
    answer: 0,
    explain: "Une remontée linéaire qui ne se stabilise pas signifie que l'air entre en continu : il y a une fuite. Il faut la localiser sous azote avant de recommencer.",
  },
  {
    id: "q1-3.04-ebullition", skills: ["A1:3.04", "A1:1.02"], type: "numeric", confidence: "ok",
    prompt: "En dessous de quelle pression absolue l'eau bout-elle à 20 °C (mbar) ?",
    answer: { value: 23.4, tol: 1 }, unit: "mbar",
    explain: "La pression de vapeur saturante de l'eau à 20 °C est ≈ 23 mbar. Le vide fait bouillir l'eau à température ambiante pour l'extraire sous forme de vapeur ; par temps froid, c'est plus lent.",
  },
  {
    id: "q1-3.04-objectif", skills: ["A1:3.04"], type: "single", confidence: "secondary",
    prompt: "Quel niveau de vide vise-t-on couramment avant la charge d'un circuit neuf ?",
    choices: ["Moins de 500 microns (≈ 0,67 mbar) tenu à l'essai de remontée", "0,5 bar relatif", "−0,1 bar au manomètre BP", "10 mbar"],
    answer: 0,
    explain: "La pratique courante est d'atteindre un vide inférieur à 500 µm (≈ 0,67 mbar) et de vérifier qu'il tient pompe isolée. Respecter en priorité les consignes du fabricant.",
  },
  {
    id: "q1-3.04-mefaits", skills: ["A1:3.04"], type: "multi", confidence: "ok",
    prompt: "Quelles sont les conséquences de l'air et de l'humidité restés dans un circuit ?",
    choices: [
      "Pression de condensation plus élevée (incondensables)",
      "Formation d'acides et dégradation de l'huile",
      "Givrage possible au détendeur",
      "Amélioration du rendement",
    ],
    answer: [0, 1, 2],
    explain: "Les incondensables s'accumulent au condenseur et élèvent la HP. L'humidité réagit avec l'huile POE et le fluide (acides), et peut geler dans l'orifice du détendeur.",
  },
  {
    id: "q1-3.04-procedure", skills: ["A1:3.04", "A1:3.03"], type: "order", confidence: "ok",
    prompt: "Classez les étapes du tirage au vide d'un circuit neuf, après l'essai d'étanchéité.",
    choices: [
      "Évacuer l'azote d'essai",
      "Raccorder pompe et vacuomètre avec flexibles courts, obus retirés",
      "Tirer au vide jusqu'au niveau visé",
      "Isoler la pompe et observer la remontée",
      "Casser le vide avec le fluide frigorigène",
    ],
    explain: "Après l'essai, on évacue l'azote, on tire au vide, on isole la pompe pour vérifier que le vide tient (ni palier d'humidité ni remontée de fuite), puis on casse le vide avec le fluide.",
  },

  // ---- 3.05 Consignation ----
  {
    id: "q1-3.05-mes", skills: ["A1:3.05"], type: "multi", confidence: "ok",
    prompt: "Lors d'une mise en service, quelles données faut-il consigner ?",
    choices: [
      "Pression et durée de l'essai d'étanchéité",
      "Niveau de vide atteint et résultat de l'essai de remontée",
      "Type et masse de fluide chargé",
      "Couleur des flexibles utilisés",
    ],
    answer: [0, 1, 2],
    explain: "Le rapport de mise en service garde la trace des essais (pression, durée, température), du vide obtenu et de la charge exacte : ces données servent de référence aux interventions futures.",
  },
  {
    id: "q1-3.05-cerfa", skills: ["A1:3.05", "A1:4.09", "A1:5.07"], type: "single", confidence: "secondary",
    prompt: "En France, quel document est rempli lors de chaque intervention nécessitant la manipulation de fluide ?",
    choices: ["La fiche d'intervention (Cerfa 15497)", "Le bon de livraison du fluide", "Le carnet de santé du compresseur", "La déclaration d'impôts de l'entreprise"],
    answer: 0,
    explain: "La fiche d'intervention Cerfa 15497 indique notamment l'opérateur, l'équipement, la nature de l'intervention et les quantités chargées ou récupérées. Le détenteur conserve une copie.",
  },
  {
    id: "q1-3.05-duree", skills: ["A1:3.05", "A1:4.09"], type: "single", confidence: "secondary",
    prompt: "Combien de temps faut-il conserver les fiches d'intervention et le registre des contrôles ?",
    choices: ["5 ans", "1 an", "6 mois", "Jusqu'à la fin de la garantie"],
    answer: 0,
    explain: "Les documents d'intervention sont conservés au moins 5 ans par le détenteur et l'opérateur.",
  },

  // ---- 4.01 Points de fuite ----
  {
    id: "q1-4.01-points", skills: ["A1:4.01"], type: "multi", confidence: "ok",
    prompt: "Quels sont les points de fuite les plus probables sur un circuit ?",
    choices: [
      "Raccords dudgeonnés (flare)",
      "Vannes de service et valves Schrader",
      "Brasures",
      "Capillaires soumis aux vibrations",
      "Milieu d'un tube cuivre droit, bien fixé et sans contrainte",
    ],
    answer: [0, 1, 2, 3],
    explain: "Les fuites se concentrent sur les raccords mécaniques, les vannes, les brasures et les tubes qui frottent ou vibrent (fatigue). Un tube droit bien supporté est rarement en cause.",
  },
  {
    id: "q1-4.01-vibrations", skills: ["A1:4.01", "A1:4.03"], type: "single", confidence: "ok",
    prompt: "Un tube capillaire de pressostat frotte contre la carrosserie du groupe. Quel risque ?",
    choices: ["Usure par frottement et fuite à terme", "Aucun risque", "Augmentation du sous-refroidissement", "Baisse de la surchauffe"],
    answer: 0,
    explain: "Les vibrations et frottements usent le cuivre jusqu'au percement. On fixe et protège les capillaires et tubes à chaque contrôle.",
  },
  {
    id: "q1-4.01-joints", skills: ["A1:4.01"], type: "single", confidence: "ok",
    prompt: "Sur un compresseur semi-hermétique, où chercher en priorité une fuite ?",
    choices: ["Aux joints (culasses, plaques, vannes), raccords et voyant d'huile", "Au milieu du carter", "Sur la plaque signalétique", "Sur les pieds antivibratiles"],
    answer: 0,
    explain: "Les joints démontables (culasses, plaques à clapets, vannes de service, voyant d'huile, bornier) sont les points sensibles d'un semi-hermétique.",
  },

  // ---- 4.02 Registre ----
  {
    id: "q1-4.02-avant", skills: ["A1:4.02"], type: "single", confidence: "ok",
    prompt: "Que faire avant de commencer le contrôle d'étanchéité d'une installation ?",
    choices: [
      "Consulter le registre de l'équipement (historique des fuites, réparations, appoints)",
      "Ajouter du fluide pour vérifier la pression",
      "Arrêter définitivement l'installation",
      "Récupérer toute la charge",
    ],
    answer: 0,
    explain: "Le registre indique la charge, le fluide, les fuites passées et les points déjà réparés : il oriente la recherche vers les zones à risque.",
  },
  {
    id: "q1-4.02-infos", skills: ["A1:4.02"], type: "multi", confidence: "secondary",
    prompt: "Quelles informations utiles trouve-t-on dans le registre d'un équipement ?",
    choices: [
      "Type et charge de fluide",
      "Dates et résultats des contrôles d'étanchéité précédents",
      "Quantités ajoutées et récupérées",
      "Le salaire du technicien",
    ],
    answer: [0, 1, 2],
    explain: "Le registre trace la charge, les contrôles, les fuites détectées, les réparations et les mouvements de fluide.",
  },
  {
    id: "q1-4.02-appoints", skills: ["A1:4.02", "A1:4.04"], type: "single", confidence: "ok",
    prompt: "Le registre montre trois appoints de fluide en un an sur la même installation. Qu'en déduire ?",
    choices: [
      "Une fuite persiste : il faut la localiser et la réparer",
      "C'est normal, les installations consomment du fluide",
      "Le fluide se dégrade avec le temps",
      "Il faut augmenter la charge nominale",
    ],
    answer: 0,
    explain: "Un circuit frigorifique est fermé : il ne consomme pas de fluide. Des appoints répétés signent une fuite non réparée ; compléter sans réparer est interdit.",
  },

  // ---- 4.03 Inspection visuelle ----
  {
    id: "q1-4.03-huile", skills: ["A1:4.03"], type: "single", confidence: "ok",
    prompt: "Lors de l'inspection visuelle, une trace grasse est visible sous un raccord. Qu'indique-t-elle probablement ?",
    choices: ["Une fuite : l'huile circule avec le fluide et se dépose au point de fuite", "Un excès de graisse de montage sans importance", "Une condensation normale", "Une surcharge en fluide"],
    answer: 0,
    explain: "L'huile du compresseur circule mêlée au fluide : là où le fluide s'échappe, l'huile reste et attire la poussière. Une trace d'huile impose une vérification au détecteur.",
  },
  {
    id: "q1-4.03-signes", skills: ["A1:4.03", "A1:4.01"], type: "multi", confidence: "ok",
    prompt: "Quels signes repère-t-on lors d'une inspection visuelle et manuelle ?",
    choices: ["Traces d'huile", "Corrosion des tubes ou raccords", "Tubes qui vibrent ou frottent", "Isolant dégradé", "Couleur de la carrosserie"],
    answer: [0, 1, 2, 3],
    explain: "Traces d'huile, corrosion, frottements et vibrations, isolants abîmés, supports desserrés : autant de causes ou d'indices de fuite.",
  },

  // ---- 4.04 Méthode indirecte ----
  {
    id: "q1-4.04-definition", skills: ["A1:4.04"], type: "single", confidence: "ok",
    prompt: "En quoi consiste la méthode indirecte de contrôle d'étanchéité ?",
    choices: [
      "Analyser les paramètres de fonctionnement (pressions, températures, surchauffe, sous-refroidissement…) pour détecter une perte de charge",
      "Pulvériser un produit moussant sur les raccords",
      "Utiliser un détecteur électronique",
      "Injecter un traceur fluorescent",
    ],
    answer: 0,
    explain: "La méthode indirecte déduit une fuite du comportement du système, sans localiser la fuite. Elle s'appuie sur les tables de saturation et le relevé des températures.",
  },
  {
    id: "q1-4.04-manque", skills: ["A1:4.04", "A1:1.03"], type: "multi", confidence: "ok",
    prompt: "Quels symptômes font penser à un manque de charge (sur un circuit à détendeur thermostatique) ?",
    choices: ["Surchauffe élevée", "Sous-refroidissement faible", "Bulles au voyant liquide", "Pression BP basse", "Sous-refroidissement très élevé"],
    answer: [0, 1, 2, 3],
    explain: "Moins de fluide : moins de liquide au condenseur (SC faible, bulles au voyant), évaporateur sous-alimenté (SH élevée, BP basse). Un SC très élevé évoque plutôt une surcharge.",
  },
  {
    id: "q1-4.04-suite", skills: ["A1:4.04", "A1:4.06", "A1:4.07"], type: "single", confidence: "secondary",
    prompt: "La méthode indirecte laisse penser qu'il y a une fuite. Que faire ensuite ?",
    choices: [
      "Localiser la fuite par une méthode directe, puis la réparer",
      "Compléter la charge et repartir",
      "Noter le résultat sans autre action",
      "Remplacer le compresseur",
    ],
    answer: 0,
    explain: "La méthode indirecte ne localise pas la fuite : on passe à une méthode directe (détecteur, produit moussant, traceur) puis on répare avant de recharger.",
  },

  // ---- 4.05 Instruments portables ----
  {
    id: "q1-4.05-verif", skills: ["A1:4.05", "A1:4.08"], type: "single", confidence: "secondary",
    prompt: "Quelle vérification faire sur un détecteur électronique de fuites ?",
    choices: [
      "Le contrôler régulièrement (au moins une fois par an) avec une fuite étalon",
      "Aucune, il est garanti à vie",
      "Le tester en le mettant dans de l'eau",
      "Le vérifier seulement s'il tombe en panne",
    ],
    answer: 0,
    explain: "La sensibilité d'un détecteur dérive : on le vérifie au moins une fois par an (seuil courant de 5 g/an) et avant usage avec une fuite de référence.",
  },
  {
    id: "q1-4.05-thermometre", skills: ["A1:4.05", "A1:1.03"], type: "single", confidence: "ok",
    prompt: "Pour mesurer correctement la température d'aspiration servant au calcul de la surchauffe, il faut…",
    choices: [
      "une sonde à pince bien serrée sur le tube propre, isolée de l'air ambiant",
      "mesurer la température de l'air soufflé",
      "lire la température affichée par le manifold sans sonde",
      "toucher le tube avec la main",
    ],
    answer: 0,
    explain: "Une sonde mal plaquée ou exposée à l'air mesure un mélange tube/air et fausse la surchauffe. On mesure à la sortie de l'évaporateur ou à l'entrée du compresseur selon ce qu'on contrôle.",
  },
  {
    id: "q1-4.05-manifold", skills: ["A1:4.05", "A1:5.01"], type: "single", confidence: "ok",
    prompt: "Sur un manifold classique, quel est le code couleur usuel ?",
    choices: ["Bleu = BP, rouge = HP, jaune = service", "Rouge = BP, bleu = HP, jaune = service", "Jaune = HP, bleu = service, rouge = BP", "Vert = BP, rouge = HP, noir = service"],
    answer: 0,
    explain: "Manomètre et flexible bleus côté basse pression, rouges côté haute pression, flexible jaune pour la bouteille, la pompe ou la station.",
  },

  // ---- 4.06 Méthode directe avec intervention ----
  {
    id: "q1-4.06-traceur", skills: ["A1:4.06"], type: "single", confidence: "ok",
    prompt: "L'injection d'un traceur fluorescent dans le circuit est une méthode…",
    choices: ["directe avec intervention sur le circuit", "indirecte", "directe sans intervention", "interdite"],
    answer: 0,
    explain: "On ouvre le circuit pour injecter le traceur : c'est une méthode directe avec intervention. Le traceur doit être compatible et accepté par le fabricant de l'équipement ; la fuite est repérée à la lampe UV.",
  },
  {
    id: "q1-4.06-azote", skills: ["A1:4.06", "A1:5.03"], type: "order", confidence: "ok",
    prompt: "Fuite introuvable sur un circuit chargé. Classez les étapes pour la localiser sous azote.",
    choices: [
      "Récupérer le fluide",
      "Pressuriser le circuit à l'azote sec avec détendeur",
      "Rechercher la fuite (produit moussant, détecteur adapté)",
      "Réparer puis refaire l'essai d'étanchéité",
    ],
    explain: "On ne pressurise pas un circuit chargé avec de l'azote (mélange). On récupère, on met sous azote à la pression d'essai, on localise, on répare et on refait l'essai d'étanchéité.",
  },

  // ---- 4.07 Méthode directe sans intervention ----
  {
    id: "q1-4.07-methodes", skills: ["A1:4.07"], type: "multi", confidence: "ok",
    prompt: "Quelles méthodes de détection directe ne nécessitent pas d'intervenir sur le circuit ?",
    choices: ["Détecteur électronique", "Produit moussant", "Lampe UV si un traceur est déjà présent", "Injection d'un traceur", "Mise sous azote hydrogéné"],
    answer: [0, 1, 2],
    explain: "Détecteur, produit moussant et lampe UV (traceur déjà présent) s'utilisent sans ouvrir le circuit. Injecter un traceur ou remplacer la charge par de l'azote suppose une intervention.",
  },
  {
    id: "q1-4.07-moussant", skills: ["A1:4.07"], type: "single", confidence: "ok",
    prompt: "Après une recherche au produit moussant, que faut-il faire ?",
    choices: ["Rincer et essuyer les raccords", "Laisser sécher le produit", "Ajouter de la graisse", "Rien"],
    answer: 0,
    explain: "Le produit laissé en place peut favoriser la corrosion des raccords. On essuie et on rince après la recherche.",
  },

  // ---- 4.08 Détecteur électronique ----
  {
    id: "q1-4.08-sous", skills: ["A1:4.08"], type: "single", confidence: "ok",
    prompt: "Où placer la sonde du détecteur électronique autour d'un raccord ?",
    choices: ["En dessous, car les fluides frigorigènes sont plus lourds que l'air", "Au-dessus", "À 30 cm du raccord", "Peu importe"],
    answer: 0,
    explain: "Les HFC, HFO et le propane sont plus lourds que l'air : le fluide qui fuit descend. On passe la sonde sous les raccords, au plus près de la surface.",
  },
  {
    id: "q1-4.08-technique", skills: ["A1:4.08"], type: "multi", confidence: "secondary",
    prompt: "Quelles règles d'utilisation du détecteur électronique sont correctes ?",
    choices: [
      "Déplacer la sonde lentement (quelques cm/s), à quelques mm de la surface",
      "Couper les ventilateurs qui dispersent le fluide",
      "Vérifier que le détecteur est adapté au fluide recherché",
      "Balayer rapidement à 20 cm des tubes",
    ],
    answer: [0, 1, 2],
    explain: "Un balayage lent et proche, sans courant d'air, avec un capteur compatible (HFC, HFO, HC), permet de détecter les petites fuites.",
  },
  {
    id: "q1-4.08-confirmer", skills: ["A1:4.08", "A1:4.07"], type: "single", confidence: "ok",
    prompt: "Le détecteur électronique signale une fuite dans une zone. Comment confirmer l'endroit exact ?",
    choices: ["Avec un produit moussant sur les points suspects", "En ajoutant du fluide", "En coupant l'installation 24 h", "En augmentant la sensibilité au maximum partout"],
    answer: 0,
    explain: "Le détecteur localise une zone ; le produit moussant indique précisément le point de fuite par la formation de bulles.",
  },

  // ---- 4.09 Consignation, fréquences ----
  {
    id: "q1-4.09-frequence", skills: ["A1:4.09", "A1:2.02"], type: "single", confidence: "secondary",
    prompt: "Installation de 4,5 kg de R410A (PRP 2088), sans système de détection de fuites. Quelle est la périodicité du contrôle d'étanchéité ?",
    choices: ["12 mois", "6 mois", "3 mois", "Aucun contrôle obligatoire"],
    answer: 0,
    explain: "4,5 × 2088 / 1000 = 9,4 t CO₂e : entre 5 et 50 t, contrôle tous les 12 mois (24 mois avec système de détection).",
  },
  {
    id: "q1-4.09-seuils", skills: ["A1:4.09"], type: "order", confidence: "secondary",
    prompt: "Classez ces charges de HFC de la périodicité de contrôle la plus longue à la plus courte (sans système de détection).",
    choices: ["10 t CO₂e", "100 t CO₂e", "600 t CO₂e"],
    explain: "Seuils F-Gas III : ≥ 5 t → 12 mois, ≥ 50 t → 6 mois, ≥ 500 t → 3 mois. Un système de détection de fuites double ces intervalles.",
  },
  {
    id: "q1-4.09-lds", skills: ["A1:4.09"], type: "numeric", confidence: "secondary",
    prompt: "Installation de 40 kg de R134a (PRP 1430) équipée d'un système de détection de fuites. Quelle est la périodicité du contrôle (mois) ?",
    answer: { value: 12, tol: 0 }, unit: "mois",
    explain: "40 × 1430 / 1000 = 57,2 t CO₂e : ≥ 50 t → 6 mois, doublé à 12 mois grâce au système de détection de fuites.",
  },
  {
    id: "q1-4.09-sous-seuil", skills: ["A1:4.09", "A1:2.02"], type: "single", confidence: "secondary",
    prompt: "Un split non hermétique contient 7 kg de R32 (PRP 675). Le contrôle périodique d'étanchéité est-il obligatoire ?",
    choices: ["Non : 4,7 t CO₂e, sous le seuil de 5 t", "Oui, tous les 12 mois", "Oui, tous les 6 mois", "Oui, car le R32 est inflammable"],
    answer: 0,
    explain: "7 × 675 / 1000 = 4,7 t CO₂e < 5 t : pas de contrôle périodique F-Gas. Le seuil se calcule en t CO₂e, pas en kg.",
  },
  {
    id: "q1-4.09-recontrole", skills: ["A1:4.09", "A1:4.06"], type: "single", confidence: "secondary",
    prompt: "Après la réparation d'une fuite, dans quel délai faut-il refaire un contrôle d'étanchéité ?",
    choices: ["Dans le mois qui suit la réparation", "Au prochain contrôle périodique", "Dans l'année", "Aucun contrôle n'est nécessaire"],
    answer: 0,
    explain: "Un nouveau contrôle est fait dans le mois suivant la réparation pour vérifier son efficacité, et consigné dans le registre.",
  },
  {
    id: "q1-4.09-etiquette", skills: ["A1:4.09"], type: "single", confidence: "secondary",
    prompt: "Une fuite a été détectée mais ne peut pas être réparée immédiatement. Quelle mention apposer sur l'équipement ?",
    choices: ["Un marquage « défaut d'étanchéité »", "Aucune, on note juste sur la facture", "Une étiquette « conforme »", "Le prochain rendez-vous commercial"],
    answer: 0,
    explain: "En France, un équipement fuyard non réparé est signalé par un marquage « défaut d'étanchéité » ; un équipement contrôlé conforme porte une étiquette indiquant la date du prochain contrôle.",
  },
  {
    id: "q1-4.09-hermetique", skills: ["A1:4.09"], type: "single", confidence: "secondary",
    prompt: "Un équipement hermétiquement scellé et étiqueté contient 8 t CO₂e de HFC. Est-il soumis au contrôle périodique ?",
    choices: ["Non, les hermétiques de moins de 10 t CO₂e sont exemptés", "Oui, tous les 12 mois", "Oui, tous les 3 mois", "Oui, tous les mois"],
    answer: 0,
    explain: "Les équipements hermétiquement scellés et étiquetés comme tels sont exemptés en dessous de 10 t CO₂e (au lieu de 5 t pour les autres).",
  },

  // ---- 5.01 Manomètres ----
  {
    id: "q1-5.01-purge", skills: ["A1:5.01"], type: "single", confidence: "ok",
    prompt: "Avant une charge, comment éviter d'introduire l'air contenu dans les flexibles sans relâcher de fluide ?",
    choices: ["Tirer les flexibles au vide avec la pompe", "Purger longuement les flexibles avec le fluide", "Ne rien faire, la quantité d'air est négligeable", "Souffler dans les flexibles"],
    answer: 0,
    explain: "Les flexibles contiennent de l'air. Les mettre sous vide évite à la fois l'introduction d'incondensables et l'émission de fluide qu'occasionnerait une purge au fluide.",
  },
  {
    id: "q1-5.01-vannes", skills: ["A1:5.01"], type: "multi", confidence: "ok",
    prompt: "Quels équipements limitent les émissions lors de la connexion / déconnexion des manomètres ?",
    choices: ["Flexibles à vanne d'arrêt en bout (« low-loss »)", "Raccords rapides avec clapet", "Flexibles les plus longs possibles", "Flexibles courts"],
    answer: [0, 1, 3],
    explain: "Les flexibles à vanne d'arrêt et les raccords à clapet retiennent le fluide ; des flexibles courts contiennent moins de fluide perdu à chaque déconnexion.",
  },
  {
    id: "q1-5.01-deconnexion-hp", skills: ["A1:5.01"], type: "single", confidence: "secondary",
    prompt: "Installation en marche. Comment limiter le fluide perdu en déconnectant le flexible HP ?",
    choices: [
      "Fermer le raccord HP puis faire basculer le contenu du flexible vers la BP par le manifold, avant de déconnecter",
      "Déconnecter le flexible HP en premier, rempli de liquide",
      "Ouvrir le flexible jaune à l'air libre",
      "Arrêter l'installation et attendre une semaine",
    ],
    answer: 0,
    explain: "Le flexible HP peut contenir du liquide. En le vidant vers la BP (aspirée par le compresseur en marche) avant de le déconnecter, on renvoie ce fluide dans le circuit au lieu de le perdre.",
  },

  // ---- 5.02 Bouteilles ----
  {
    id: "q1-5.02-80", skills: ["A1:5.02"], type: "single", confidence: "ok",
    prompt: "Quel est le taux de remplissage maximal d'une bouteille de récupération ?",
    choices: ["80 % du volume en liquide", "100 %", "95 %", "50 %"],
    answer: 0,
    explain: "Il faut laisser un ciel gazeux : le liquide se dilate avec la température. Une bouteille pleine de liquide peut éclater (pression hydraulique) au moindre réchauffement.",
  },
  {
    id: "q1-5.02-calcul", skills: ["A1:5.02", "A1:5.03"], type: "numeric", confidence: "ok",
    prompt: "Bouteille de récupération de 26,2 L (capacité en eau) pour du R410A. Masse volumique du liquide à 25 °C : 1,062 kg/L. Masse maximale à transférer (kg) ?",
    answer: { value: 22.26, tol: 0.3 }, unit: "kg",
    explain: "0,8 × 26,2 × 1,062 = 22,3 kg. On pèse la bouteille pendant le transfert et on s'arrête avant cette valeur.",
  },
  {
    id: "q1-5.02-dediee", skills: ["A1:5.02", "A1:5.08"], type: "multi", confidence: "ok",
    prompt: "Quelles règles s'appliquent aux bouteilles de récupération ?",
    choices: [
      "Une bouteille par type de fluide, jamais de mélange",
      "Bouteille étiquetée avec le fluide contenu",
      "Bouteille spécifique à la récupération (pas une bouteille de fluide neuf)",
      "On peut y mélanger R404A et R410A s'ils sont destinés à la destruction",
    ],
    answer: [0, 1, 2],
    explain: "Un mélange de fluides ne peut plus être régénéré et coûte plus cher à détruire. Chaque bouteille de récupération est dédiée à un fluide et identifiée.",
  },
  {
    id: "q1-5.02-tube-plongeur", skills: ["A1:5.02", "A1:5.05"], type: "single", confidence: "ok",
    prompt: "Comment soutirer du liquide d'une bouteille sans tube plongeur ?",
    choices: ["En retournant la bouteille, robinet en bas", "Bouteille debout, robinet en haut", "En chauffant la bouteille au chalumeau", "C'est impossible"],
    answer: 0,
    explain: "Sans tube plongeur, le robinet est en contact avec le liquide seulement bouteille retournée. Avec tube plongeur (robinet « liquide »), on soutire du liquide bouteille debout. Jamais de flamme sur une bouteille.",
  },

  // ---- 5.03 Station de récupération ----
  {
    id: "q1-5.03-procedure", skills: ["A1:5.03", "A1:5.07"], type: "order", confidence: "ok",
    prompt: "Classez les étapes d'une récupération de fluide.",
    choices: [
      "Choisir une bouteille de récupération dédiée au fluide, de capacité suffisante",
      "Placer la bouteille sur la balance et noter sa masse",
      "Raccorder la station au circuit et à la bouteille",
      "Récupérer jusqu'à la pression de fin de récupération",
      "Fermer les vannes, peser et étiqueter la bouteille",
      "Consigner la quantité récupérée",
    ],
    explain: "Bouteille adaptée et pesée avant, récupération, puis pesée après : la différence est la masse récupérée, à inscrire sur la fiche d'intervention.",
  },
  {
    id: "q1-5.03-push-pull", skills: ["A1:5.03"], type: "single", confidence: "ok",
    prompt: "Quand la méthode « push-pull » est-elle intéressante ?",
    choices: [
      "Pour transférer rapidement une grande quantité de liquide",
      "Pour récupérer les dernières traces de vapeur",
      "Pour tirer au vide",
      "Pour les circuits sans liquide",
    ],
    answer: 0,
    explain: "La station aspire la vapeur de la bouteille et la refoule dans le circuit, ce qui pousse le liquide du circuit vers la bouteille. On termine en récupérant la vapeur restante.",
  },
  {
    id: "q1-5.03-autopurge", skills: ["A1:5.03", "A1:5.08"], type: "single", confidence: "ok",
    prompt: "Pourquoi réaliser l'auto-purge (vidange interne) de la station en fin de récupération ?",
    choices: [
      "Pour transférer le fluide restant dans la station vers la bouteille et éviter tout mélange à la prochaine récupération",
      "Pour refroidir le compresseur de la station",
      "Pour étalonner la balance",
      "Pour relâcher le fluide restant à l'atmosphère",
    ],
    answer: 0,
    explain: "Le fluide resté dans la station contaminerait la récupération suivante (autre fluide) ou serait émis à la déconnexion.",
  },

  // ---- 5.04 Huile contaminée ----
  {
    id: "q1-5.04-acide", skills: ["A1:5.04"], type: "single", confidence: "ok",
    prompt: "Après le grillage d'un moteur de compresseur hermétique, que faut-il vérifier sur l'huile ?",
    choices: ["Son acidité (test d'acidité)", "Sa couleur uniquement pour l'esthétique", "Sa masse volumique", "Rien, l'huile n'est pas concernée"],
    answer: 0,
    explain: "Le grillage dégrade huile et fluide en produits acides. Si le test est positif : vidange de l'huile, filtre déshydrateur (anti-acide) et nettoyage du circuit avant la remise en service.",
  },
  {
    id: "q1-5.04-dechet", skills: ["A1:5.04", "A1:5.08"], type: "single", confidence: "ok",
    prompt: "Que faire de l'huile contaminée vidangée d'un compresseur ?",
    choices: [
      "La stocker dans un récipient fermé identifié et l'éliminer comme déchet dangereux",
      "La verser à l'égout",
      "La réutiliser dans un autre compresseur",
      "La mélanger au fluide récupéré",
    ],
    answer: 0,
    explain: "L'huile usagée contient du fluide dissous et des acides : c'est un déchet dangereux à confier à une filière agréée avec traçabilité.",
  },
  {
    id: "q1-5.04-recup-avant", skills: ["A1:5.04", "A1:5.03"], type: "single", confidence: "ok",
    prompt: "Pourquoi récupère-t-on le fluide avant de vidanger l'huile d'un compresseur ?",
    choices: ["L'huile contient du fluide dissous qui serait émis", "Pour réchauffer l'huile", "Ce n'est pas nécessaire", "Pour que l'huile soit plus visqueuse"],
    answer: 0,
    explain: "Le fluide est soluble dans l'huile ; vidanger sous pression rejetterait ce fluide et projetterait de l'huile. On récupère jusqu'à pression faible avant d'ouvrir.",
  },
  {
    id: "q1-5.04-poe", skills: ["A1:5.04", "A1:5.05"], type: "single", confidence: "ok",
    prompt: "Pourquoi un bidon d'huile POE doit-il rester fermé ?",
    choices: ["L'huile POE est hygroscopique : elle absorbe l'humidité de l'air", "Elle s'évapore très vite", "Elle est inflammable à l'air", "Pour éviter la poussière uniquement"],
    answer: 0,
    explain: "L'huile POE capte l'eau de l'air, qui forme ensuite des acides dans le circuit. On utilise de petits bidons, refermés aussitôt.",
  },

  // ---- 5.05 État du fluide, charge ----
  {
    id: "q1-5.05-identite", skills: ["A1:5.05", "A1:1.03"], type: "single", confidence: "ok",
    prompt: "Une bouteille étiquetée R134a, stockée à 20 °C, indique 6,5 bar relatif. Que conclure ?",
    choices: [
      "Pression trop élevée (attendu ≈ 4,7 bar) : incondensables ou fluide mélangé, ne pas l'utiliser pour charger",
      "Le fluide est conforme",
      "La bouteille est presque vide",
      "La bouteille est trop pleine, c'est normal",
    ],
    answer: 0,
    explain: "Psat(R134a, 20 °C) ≈ 5,72 bar abs ≈ 4,7 bar relatif. Une pression nettement supérieure à température stabilisée signale de l'air ou un autre fluide.",
  },
  {
    id: "q1-5.05-charge-zeo", skills: ["A1:5.05", "A1:1.02"], type: "single", confidence: "ok",
    prompt: "Comment compléter la charge d'une installation en fonctionnement avec un zéotrope (R407C) ?",
    choices: [
      "Soutirer en liquide et l'introduire progressivement côté aspiration en le laminant",
      "Soutirer en vapeur",
      "Injecter le liquide en grande quantité directement au compresseur",
      "Charger par la ligne de refoulement",
    ],
    answer: 0,
    explain: "Le fluide est soutiré en liquide pour garder sa composition, puis introduit lentement (laminé par la vanne du manifold) pour qu'il se vaporise avant d'atteindre le compresseur.",
  },
  {
    id: "q1-5.05-ordre-charge", skills: ["A1:5.05", "A1:5.06"], type: "order", confidence: "ok",
    prompt: "Classez les étapes d'une charge d'un circuit neuf, tiré au vide.",
    choices: [
      "Vérifier le type de fluide et sa pression à température connue",
      "Poser la bouteille sur la balance et faire la tare",
      "Casser le vide avec le fluide en phase liquide côté HP, installation à l'arrêt",
      "Démarrer et compléter si besoin jusqu'à la charge de la plaque signalétique",
      "Relever pressions, surchauffe et sous-refroidissement",
    ],
    explain: "On vérifie le fluide, on charge à la balance en commençant à l'arrêt côté liquide, puis on complète en fonctionnement et on valide par les relevés (SH, SC).",
  },

  // ---- 5.06 Balance ----
  {
    id: "q1-5.06-pesee", skills: ["A1:5.06", "A1:5.07"], type: "numeric", confidence: "ok",
    prompt: "La bouteille pesait 12,40 kg avant la charge et 10,15 kg après. Quelle masse de fluide a été chargée (kg) ?",
    answer: { value: 2.25, tol: 0.01 }, unit: "kg",
    explain: "12,40 − 10,15 = 2,25 kg. La charge se contrôle à la balance, pas au manomètre : la pression ne dit rien sur la quantité.",
  },
  {
    id: "q1-5.06-pourquoi", skills: ["A1:5.06"], type: "single", confidence: "ok",
    prompt: "Pourquoi charger une installation à la balance plutôt qu'« à la pression » ?",
    choices: [
      "En zone diphasique la pression dépend de la température, pas de la quantité de fluide",
      "La balance est plus rapide",
      "Le manomètre est interdit",
      "Pour économiser le fluide",
    ],
    answer: 0,
    explain: "Tant qu'il y a du liquide, la pression reste la pression de saturation : seule la masse permet de respecter la charge de la plaque signalétique.",
  },
  {
    id: "q1-5.06-flexibles", skills: ["A1:5.06"], type: "single", confidence: "ok",
    prompt: "Pour une petite charge pesée au gramme près, de quoi faut-il tenir compte ?",
    choices: ["Du fluide resté dans les flexibles", "De la couleur de la bouteille", "De la pression atmosphérique", "De l'heure de la journée"],
    answer: 0,
    explain: "Un flexible plein de liquide peut contenir plusieurs dizaines de grammes : sur une petite charge, l'écart devient significatif.",
  },

  // ---- 5.07 Consignation des quantités ----
  {
    id: "q1-5.07-quantites", skills: ["A1:5.07"], type: "multi", confidence: "secondary",
    prompt: "Quelles quantités doivent figurer sur la fiche d'intervention ?",
    choices: ["Masse de fluide chargée", "Masse de fluide récupérée", "Nature du fluide chargé (neuf, recyclé ou régénéré)", "Prix du fluide au kilo"],
    answer: [0, 1, 2],
    explain: "La fiche d'intervention trace les masses chargées et récupérées et l'origine du fluide chargé ; ces données alimentent le registre et les déclarations annuelles.",
  },
  {
    id: "q1-5.07-recup", skills: ["A1:5.07", "A1:5.03"], type: "numeric", confidence: "ok",
    prompt: "Bouteille de récupération : 15,8 kg avant, 19,3 kg après récupération. Quelle masse faut-il inscrire comme récupérée (kg) ?",
    answer: { value: 3.5, tol: 0.01 }, unit: "kg",
    explain: "19,3 − 15,8 = 3,5 kg récupérés, à comparer à la charge nominale de l'équipement pour estimer la quantité perdue.",
  },

  // ---- 5.08 Gestion des gaz fluorés et huiles ----
  {
    id: "q1-5.08-definitions", skills: ["A1:5.08"], type: "single", confidence: "ok",
    prompt: "Quelle est la différence entre fluide « recyclé » et fluide « régénéré » ?",
    choices: [
      "Recyclé : simplement filtré/déshydraté pour réutilisation ; régénéré : retraité en usine pour retrouver les spécifications d'un fluide neuf",
      "Ce sont deux mots pour la même chose",
      "Recyclé : détruit ; régénéré : stocké",
      "Régénéré : mélangé avec d'autres fluides",
    ],
    answer: 0,
    explain: "Le recyclage est un nettoyage de base ; la régénération est un retraitement industriel jusqu'à la qualité d'un fluide neuf. Ce qui ne peut être régénéré est détruit.",
  },
  {
    id: "q1-5.08-filiere", skills: ["A1:5.08"], type: "single", confidence: "secondary",
    prompt: "Que devient un fluide récupéré qui n'est pas réutilisé sur place ?",
    choices: [
      "Il est remis au distributeur ou à une filière agréée pour régénération ou destruction, avec traçabilité",
      "Il est stocké indéfiniment chez le technicien",
      "Il est relâché à l'atmosphère en extérieur",
      "Il est revendu sur internet",
    ],
    answer: 0,
    explain: "Les fluides récupérés sont des déchets suivis (en France sur Trackdéchets) : régénération ou destruction dans une installation autorisée.",
  },
  {
    id: "q1-5.08-transport", skills: ["A1:5.08", "A1:5.09"], type: "multi", confidence: "ok",
    prompt: "Quelles précautions pour transporter des bouteilles de fluide dans un véhicule utilitaire ?",
    choices: [
      "Bouteilles arrimées et robinets protégés (chapeau)",
      "Véhicule ventilé",
      "Bouteilles séparées de l'habitacle si possible",
      "Laisser les bouteilles en plein soleil derrière le pare-brise",
    ],
    answer: [0, 1, 2],
    explain: "Une bouteille non arrimée devient un projectile ; une fuite en habitacle fermé est dangereuse (anoxie, inflammabilité). La chaleur fait monter la pression.",
  },

  // ---- 5.09 Hydrocarbures ----
  {
    id: "q1-5.09-recup-hc", skills: ["A1:5.09", "A1:5.03"], type: "single", confidence: "ok",
    prompt: "Pour récupérer du R290, quel matériel faut-il ?",
    choices: [
      "Station de récupération compatible avec les fluides inflammables et bouteille dédiée aux hydrocarbures",
      "La même station et la même bouteille que pour le R410A",
      "Une pompe à vide",
      "Aucun, on peut toujours relâcher le propane",
    ],
    answer: 0,
    explain: "La station doit être conçue pour les fluides inflammables (pas d'étincelle) et la bouteille dédiée aux HC et étiquetée comme inflammable.",
  },
  {
    id: "q1-5.09-charge-precise", skills: ["A1:5.09", "A1:5.06"], type: "single", confidence: "ok",
    prompt: "Pourquoi la charge d'un équipement au R290 exige-t-elle une balance précise ?",
    choices: [
      "Les charges sont faibles (souvent quelques centaines de grammes) et limitées pour des raisons de sécurité",
      "Le propane est très lourd",
      "La balance remplace la détection de fuites",
      "Pour pouvoir surcharger sans risque",
    ],
    answer: 0,
    explain: "Avec une masse volumique faible et des limites de charge liées à la LFL, quelques dizaines de grammes comptent : on charge à la balance de précision, en phase liquide.",
  },
  {
    id: "q1-5.09-zone", skills: ["A1:5.09", "A1:1.08"], type: "multi", confidence: "ok",
    prompt: "Quelles précautions avant d'ouvrir un circuit au R290 ?",
    choices: [
      "Détecteur de gaz HC en fonctionnement dans la zone, au niveau du sol",
      "Supprimer les sources d'inflammation et utiliser des outils sans étincelle",
      "Ventiler la zone et prévoir un extincteur",
      "Allumer le chalumeau pour gagner du temps",
    ],
    answer: [0, 1, 2],
    explain: "Le propane est A3 et plus lourd que l'air : contrôle de l'atmosphère au sol, pas de source d'inflammation, ventilation et extincteur à portée.",
  },
  {
    id: "q1-5.09-azote", skills: ["A1:5.09", "A1:3.01"], type: "single", confidence: "ok",
    prompt: "Après récupération du R290, que faire avant de braser sur le circuit ?",
    choices: [
      "Balayer le circuit à l'azote (OFN) pour chasser le propane résiduel",
      "Braser directement",
      "Balayer à l'air comprimé",
      "Remplir d'oxygène",
    ],
    answer: 0,
    explain: "Il reste du propane dans le circuit et dissous dans l'huile : un balayage à l'azote élimine le mélange inflammable avant toute flamme.",
  },
];
