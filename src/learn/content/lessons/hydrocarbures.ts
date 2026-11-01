import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'hydrocarbures',
  title: 'Hydrocarbures : sécurité et mise en œuvre',
  skills: [
    'A1:12.01', 'A1:12.02', 'A1:12.03', 'A1:12.04', 'A1:12.05', 'A1:12.06', 'A1:12.07',
    'A1:12.08', 'A1:12.09', 'A1:12.10', 'A1:12.11', 'A1:12.12', 'A1:12.13', 'A1:12.14',
    'A1:1.08', 'A1:5.09', 'A1:11.03', 'A1:11.05',
  ],
  sections: [
    {
      title: 'Ce qui change avec l\'A1',
      body: `L'ancienne catégorie I ne couvrait que les gaz fluorés. La nouvelle **A1** couvre aussi les **hydrocarbures** (R290 propane, R600a isobutane, R1270 propylène). Le **groupe 12** est spécifique A1/A2 et compte beaucoup dans la mise à niveau : il faut savoir analyser le risque, préparer la zone, récupérer, purger à l'azote, braser en sécurité, charger précisément et rendre compte.

Rappels physiques pour le R290 :

- Classe **A3** : très inflammable.
- **LFL = 0,038 kg/m³** (environ 2 % en volume dans l'air).
- **Plus lourd que l'air** (masse molaire 44 g/mol contre 29 pour l'air) : il s'accumule **au sol**, dans les caniveaux, les fosses, les caves.
- Inodore tel qu'utilisé en froid (pas d'odorant comme le gaz de ville) : on ne peut pas se fier à son nez.`,
    },
    {
      title: 'Analyse de risques et zone de travail (12.04, 12.05, 12.13)',
      body: `Avant d'ouvrir quoi que ce soit, on évalue la situation :

- **Volume du local et ventilation** : une petite pièce fermée atteint vite la LFL en cas de fuite.
- **Sources d'inflammation** autour de l'intervention, dans un rayon d'environ 3 m (à vérifier selon la procédure de ton entreprise) : prises de courant, interrupteurs, radiateurs, appareils électriques, chargeurs, flammes, fumeurs, surfaces chaudes.
- **Présence de public** (magasin, bureaux) : il faut les tenir à l'écart.
- Points bas où le gaz peut s'accumuler.

Ensuite on prépare la zone :

1. **Balisage** et signalisation « zone d'intervention — flamme interdite, interdit de fumer ».
2. Suppression ou neutralisation des sources d'inflammation.
3. **Détecteur de gaz HC** en marche en continu, **placé au niveau du sol**.
4. Ventilation (ventilateur compatible atmosphère explosive).
5. **Extincteur** (CO₂ ou poudre) à portée de main.
6. EPI : lunettes, gants, vêtements sans charge électrostatique.
7. Consignation électrique de l'appareil ; si possible, le débrancher **hors de la zone**.`,
    },
    {
      title: 'Outillage, bouteilles et étiquetage (12.01, 12.02)',
      body: `- **Station de récupération** et **pompe à vide** conçues pour les fluides inflammables (pas d'interrupteur ni de relais qui fasse étincelle dans la zone ; matériel de type ATEX ou déclaré compatible A3 par le fabricant).
- **Détecteur de fuite** électronique adapté aux HC.
- Manifold et flexibles en bon état ; flexibles courts pour limiter les rejets.
- **Bouteille de récupération dédiée HC**, identifiée « inflammable ». Les bouteilles de gaz inflammables portent une ogive **rouge** (code couleur EN 1089-3). Ne jamais récupérer un HC dans une bouteille HFC : mélange inflammable mal étiqueté.
- Bouteilles debout, attachées, à l'abri de la chaleur.
- **Étiquette de l'équipement** : pictogramme flamme, nom du fluide, charge. Elle doit rester lisible et être mise à jour après intervention.
- Beaucoup d'appareils HC n'ont **pas de vanne Schrader** mais des **tubes de process** : on utilise une **vanne à étrier (line-tap)** pour accéder au circuit, qu'on ne laisse pas en place définitivement (point de fuite).`,
    },
    {
      title: 'Récupération et purge à l\'azote (12.06)',
      body: `### Récupération

Le fluide est récupéré dans la bouteille HC avec une station compatible. Certaines recommandations admettent un **dégazage contrôlé à l'extérieur** pour les très petites charges de HC (à vérifier selon la réglementation et la procédure applicables) ; l'application enseigne la récupération, conformément à l'item 12.06.

### Purge à l'azote (OFN)

Après récupération, le circuit contient encore des traces de propane, dissoutes notamment dans l'huile. **Avant toute flamme** :

1. Mettre le circuit sous pression d'azote sec.
2. Relâcher l'azote **à l'extérieur**.
3. Répéter plusieurs fois.
4. Contrôler au détecteur à l'ouverture : **0 % de la LFL** avant d'allumer le chalumeau.

Un circuit simplement « vidé » n'est pas un circuit sûr pour braser.`,
    },
    {
      title: 'Ouvrir, remplacer, tester, tirer au vide (12.07 à 12.09)',
      body: `- Couper les tubes au **coupe-tube**. Pas de chalumeau pour « débraser » tant que la purge n'est pas validée.
- Remplacement d'un composant : brasage **avec balayage d'azote** après purge, ou **raccords mécaniques approuvés** (sertissage type Lokring) qui évitent la flamme.
- Remplacer le filtre déshydrateur.
- **Essai de pression à l'azote** (12.08) à la valeur du constructeur, recherche de fuites sur chaque joint.
- **Tirage au vide** avec une pompe adaptée (12.09) et test de remontée : plateau = humidité, remontée continue = fuite.
- Refermer les tubes de process : pinçage et brasage, ou bouchon, et retirer la vanne à étrier si elle n'est pas prévue pour rester.`,
    },
    {
      title: 'Charge et limite de charge (12.03, 12.10)',
      body: `Les charges HC sont **petites** (souvent quelques dizaines à quelques centaines de grammes). On charge **exclusivement à la balance**, avec une précision de l'ordre de quelques grammes (l'application exige ± 5 g), au poids indiqué sur l'étiquette. Une surcharge est à la fois un problème de performance et de **sécurité** : plus de fluide = plus de gaz libéré en cas de fuite.

Pour savoir si une charge est admissible dans un local, on utilise la LFL et le volume ou la surface (formules EN 378 et IEC 60335) :

- m₁ = 4 m³ × LFL = 0,152 kg de R290.
- Climatisation de confort : m_max = 2,5 × LFL^(5/4) × h₀ × √A (h₀ = 0,6 m sol, 1,0 m fenêtre, 1,8 m mur, 2,2 m plafond). L'IEC 60335-2-40 éd. 7 (2022) permet d'aller jusqu'à environ 988 g de R290 (26 × LFL) si l'appareil ajoute des mesures de sécurité (brassage d'air, détecteur de fuite, vannes d'arrêt).
- Meubles commerciaux monoblocs : limite historique 150 g par circuit, portée à **13 × LFL ≈ 494 g** (on dit « 500 g ») par l'IEC 60335-2-89:2019, reprise en EN IEC 60335-2-89:2022, harmonisée en 2023. L'appareil doit avoir été conçu et certifié selon cette édition : la charge de la plaque fait foi.

Le calculateur permet de vérifier une installation.`,
      widget: 'r290-limit',
    },
    {
      title: 'Contrôle final, rapport et efficacité (12.11, 12.12, 12.14)',
      body: `- **Contrôle d'étanchéité direct** au détecteur HC sur tous les raccords et soudures (12.11).
- Remise en service, contrôle des pressions, de la surchauffe et de l'intensité.
- **Rapport de maintenance** (12.12) : date, appareil, fluide et charge, quantités récupérées et chargées, opérations réalisées, résultats des tests, nom de l'intervenant. Le Cerfa 15497 vise les gaz fluorés ; pour un HC, l'entreprise utilise un rapport d'intervention équivalent (à vérifier selon ta procédure).
- Étiquette de l'équipement à jour.

**Efficacité énergétique (12.14)** : le R290 a une forte chaleur latente, donc une petite charge suffit, et de bonnes performances. Elles ne sont atteintes qu'avec la **bonne charge**, des échangeurs propres et une surchauffe correcte.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- R290 : **A3**, LFL **0,038 kg/m³**, plus lourd que l'air → **détecteur au sol**.
- Ordre : analyse de risques → zone et sources d'inflammation → détecteur + ventilation + extincteur → consignation → récupération (bouteille HC) → **purge OFN** → contrôle 0 % LFL → ouverture/brasage → test azote → vide → charge à la balance → contrôle direct → rapport.
- Jamais de flamme avant la purge azote validée.
- Bouteille dédiée HC, ogive rouge, jamais une bouteille HFC.
- Outillage compatible fluides inflammables.
- Charge à la balance, au gramme près.

### Erreurs fréquentes

- Tenir le détecteur à hauteur de visage.
- Oublier une prise ou un chargeur branché dans la zone.
- Utiliser une station de récupération standard qui fait des étincelles.
- Allumer le chalumeau juste après la récupération, sans purge.
- Charger « à la pression » ou à l'œil au voyant.
- Laisser une vanne à étrier en place après l'intervention.`,
    },
  ],
};

export default lesson;
