import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'cap-up3',
  title: 'CAP UP3 : mise en service, réglage du pressostat BP, relevés',
  level: 'L04',
  skills: [
    'CAP:UP3.vide', 'CAP:UP3.charge', 'CAP:UP3.reglage', 'CAP:UP3.mesure',
    'A1:3.03', 'A1:3.04', 'A1:5.05', 'A1:5.06', 'A1:5.07', 'A1:6.03', 'A1:6.06', 'A1:3.05',
  ],
  sections: [
    {
      title: 'L\'épreuve EP3 et son barème',
      body: `L'épreuve **EP3 « Entretien, mise en service »** (unité UP3, coefficient 4) est une épreuve **pratique de 6 h** en ponctuel (en CCF : trois situations d'évaluation). Tu arrives devant une **chambre froide** dont le circuit est **sous pression d'azote**. Le barème du sujet national (session 2019), sur 100 points :

| Tâche | Points |
|---|---|
| Vidange de l'azote et tirage au vide | 15 |
| Charge en fluide selon la plaque signalétique | 20 |
| Remise en marche en sécurité | 15 |
| **Réglage du pressostat BP** | **30** |
| Fiches de relevés et documents | 20 |

Le sujet peut varier d'une session à l'autre, mais cette trame est la référence. Le réglage du pressostat BP vaut à lui seul presque un tiers de la note : il faut le maîtriser parfaitement, et surtout savoir **vérifier les valeurs réelles au manifold**.`,
    },
    {
      title: '1. Vidange de l\'azote et tirage au vide (15 pts)',
      body: `1. Raccorder le manifold côté BP et HP, relâcher l'azote jusqu'à **0 bar relatif**. Ne jamais démarrer la pompe à vide sur un circuit encore en pression.
2. Contrôler l'**huile de la pompe** (trouble = à changer avant).
3. Flexibles courts et de gros diamètre ; retirer les obus Schrader si possible (démonte-obus) pour accélérer.
4. Pompe sur le manifold, **BP et HP ouverts**, électrovanne liquide ouverte, pour vider tout le circuit.
5. **Vacuomètre côté circuit**, pas à la pompe.
6. Tirer jusqu'à la valeur demandée (consigne du sujet ; 500 microns, soit environ 0,67 mbar, est une cible professionnelle courante).
7. **Test de remontée** : isoler la pompe, l'arrêter, observer :
   - reste stable → circuit sec et étanche ;
   - remonte puis **plafonne** → **humidité** : continuer à tirer, éventuellement casser le vide à l'azote et recommencer ;
   - remonte **sans arrêt, de façon linéaire** → **fuite** : retour à la recherche de fuite.
8. **Isoler avant d'arrêter la pompe** (sinon l'huile de la pompe remonte dans le flexible).
9. Casser le vide avec le fluide frigorigène (charge) ou de l'azote sec ; ne jamais laisser le circuit sous vide ouvert à l'air.`,
    },
    {
      title: '2. Charge selon la plaque (20 pts)',
      body: `1. Lire la **plaque signalétique** : fluide et charge (par exemple R449A, 6,0 kg). Vérifier que la bouteille contient **le même fluide**.
2. Bouteille sur la **balance**. Un mélange zéotrope (R449A, R407C…) se charge **en phase liquide** : vanne liquide d'une bouteille à tube plongeur, ou bouteille retournée si elle n'en a pas.
3. Purger le flexible jaune, puis **tarer** la balance.
4. Casser le vide en chargeant du liquide **côté HP / réservoir**, compresseur à l'arrêt, jusqu'à équilibre.
5. Compléter compresseur en marche, **côté BP, lentement**, robinet du manifold étranglé pour que le liquide se vaporise avant le compresseur (pas de coup de liquide).
6. S'arrêter à la **masse de la plaque**, lue sur la balance (pas sur le manomètre : la pression dépend de la température, pas de la charge).
7. Fermer la bouteille, récupérer le contenu du flexible côté BP, déconnecter.
8. Noter la masse chargée et la nature du fluide (vierge, recyclé, régénéré).`,
    },
    {
      title: '3. Remise en marche en sécurité (15 pts)',
      body: `- **Vannes** : vannes de service en arrière (ou entrouvertes pour les manomètres), vanne liquide ouverte, bouchons en place. Jamais de démarrage avec le refoulement fermé.
- **Électricité** : vérifier la tension au multimètre, **résistance de carter** alimentée le temps nécessaire, retrait de la **consignation en présence du jury**.
- **Démarrage** : bruit, sens de rotation, **intensité** comparée à la plaque (pince ampèremétrique), ventilateurs en marche.
- **Stabilisation** : BP et HP, voyant clair, surchauffe et sous-refroidissement corrects.`,
    },
    {
      title: '4. Réglage du pressostat BP (30 pts)',
      body: `Sur un **Danfoss KP1** : la molette **RANGE règle l'enclenchement**, la molette **DIFF règle le différentiel**, et **coupure = enclenchement − différentiel**.

Exemple de consigne du jury : coupure 0,5 bar, enclenchement 2,0 bar.

1. Calculer : différentiel = 2,0 − 0,5 = **1,5 bar**. Régler RANGE ≈ 2,0 et DIFF ≈ 1,5 sur les échelles.
2. **Vérifier la coupure** : fermer la vanne de la ligne liquide (ou laisser le thermostat fermer l'électrovanne). Le compresseur continue de tourner et la BP baisse. Lire au manifold **la pression au moment exact où le compresseur s'arrête**.
3. **Vérifier l'enclenchement** : rouvrir doucement la vanne. La BP remonte. Lire **la pression au moment où le compresseur redémarre**.
4. Corriger par **quart de tour** (sur un KP1, un tour de la tige RANGE ≈ 0,7 bar, soit ≈ 0,17 bar par quart de tour) et recommencer jusqu'à être à ± 0,2 bar des deux valeurs.
5. Noter les valeurs **mesurées** sur la fiche.

Les échelles du pressostat sont **indicatives** (imprécision de quelques dixièmes de bar) : le jury contrôle les valeurs réelles. Attention au **différentiel trop faible** : le compresseur fait des courts cycles. Si le sujet le demande, régler aussi le thermostat (consigne et différentiel) et observer un cycle complet.

Entraîne-toi sur le cadran : règle l'enclenchement et le différentiel, puis lis la coupure.`,
      widget: 'pressostat',
    },
    {
      title: '5. Fiches de relevés (20 pts)',
      body: `Une fois l'installation stabilisée, remplis la fiche. Exemple de relevés et de contrôles :

| Grandeur | Mesure | Comment |
|---|---|---|
| BP (bar rel) | manifold côté aspiration | |
| HP (bar rel) | manifold côté refoulement / liquide | |
| T évaporation | table ou réglette, à partir de la BP (rosée pour un zéotrope) | convertir en absolu si la table l'exige |
| T condensation | à partir de la HP (bulle pour le sous-refroidissement) | |
| T aspiration | thermomètre de contact en sortie d'évaporateur | |
| **Surchauffe** | T aspiration − T évaporation | cible courante 5 à 8 K |
| T liquide | thermomètre sur la ligne liquide | |
| **Sous-refroidissement** | T condensation − T liquide | cible courante 4 à 6 K |
| Intensité (A) | pince ampèremétrique | comparer à la plaque |
| Air entrée / sortie évaporateur et condenseur | thermomètre | |
| Température de la chambre | thermomètre | |
| Coupure / enclenchement BP | mesurés au manifold | |
| Charge (kg) | balance | |

Une fiche lisible, complète, avec les **unités** et des valeurs **cohérentes** entre elles (une surchauffe négative signale une erreur de lecture). Mentionne aussi la quantité de fluide chargée et sa nature pour la traçabilité.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- Barème EP3 (sujet national 2019) : 15 vide, 20 charge, 15 remise en marche, **30 pressostat BP**, 20 relevés.
- Pompe à vide seulement à 0 bar rel ; vacuomètre côté circuit ; isoler avant d'arrêter la pompe ; test de remontée : plateau = humidité, linéaire = fuite.
- Charge à la **balance**, mélange zéotrope en **liquide**, complément côté BP lentement.
- KP1 : **RANGE = enclenchement**, coupure = enclenchement − différentiel.
- Coupure vérifiée en fermant la vanne liquide, enclenchement en la rouvrant, **lecture au manifold**.
- Surchauffe = T aspiration − T évaporation ; sous-refroidissement = T condensation − T liquide.

### Erreurs fréquentes

- Régler le pressostat à l'échelle sans mesurer la coupure et l'enclenchement réels.
- Prendre RANGE pour la coupure.
- Différentiel trop petit : courts cycles.
- Arrêter la pompe avant de l'isoler.
- Charger un mélange en phase vapeur, ou s'arrêter « quand la pression est bonne ».
- Démarrer sans attendre la résistance de carter ou sans retirer la consignation devant le jury.
- Lire une table en absolu avec une pression relative (ou l'inverse).
- Fiche incomplète ou sans unités.`,
    },
  ],
};

export default lesson;
