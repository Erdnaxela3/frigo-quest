import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'cap-up2',
  title: 'CAP UP2 : façonnage cuivre et schéma électrique de commande',
  skills: [
    'CAP:UP2.faconnage', 'CAP:UP2.electricite', 'CAP:UP2.etancheite', 'CAP:UP2.pse',
    'A1:10.01', 'A1:3.02',
  ],
  sections: [
    {
      title: 'L\'épreuve EP2',
      body: `L'épreuve **EP2 « Réalisation d'une installation »** (unité UP2) a le plus gros coefficient du CAP. Le règlement d'examen de 2015 indique **coefficient 6 dont 1 pour la PSE** et **8 h dont 1 h de PSE** en ponctuel ; la partie professionnelle seule dure donc **7 h, coefficient 5** (c'est ce qu'affichent les sujets nationaux). Depuis la réforme du CAP (sessions 2021 et suivantes), la PSE est évaluée dans une unité à part (coefficient 1, écrit d'1 h en ponctuel) et la note du **chef-d'œuvre** (coefficient 1) est intégrée à l'épreuve professionnelle de plus fort coefficient. En lycée ou en CFA habilité, l'EP2 est évaluée en CCF. Elle comporte deux parties pratiques :

- **partie fluidique** : réaliser une **platine** frigorifique en cuivre et la tester à l'azote ;
- **partie électrique** : câbler un **circuit de commande** (contacteurs, transformateur 230/24 V, voyants, arrêt d'urgence).

S'y ajoute l'évaluation de **Prévention Santé Environnement** (unité distincte depuis la réforme).`,
    },
    {
      title: 'Partie fluidique : la platine',
      body: `On réalise, d'après un plan coté, un assemblage typique : tubes **1/2" et 1/4"**, cintrages, collets battus (flare) et emboîtures, joints brasés, **vannes**, **filtre déshydrateur**, **voyant liquide**, **électrovanne**.

### Méthode

1. Lire le plan : cotes, diamètres, sens du fluide, position des composants.
2. Tracer et couper au **coupe-tube**, ébavurer.
3. Cintrer en respectant les cotes et le rayon de la cintreuse (pas d'ovalisation).
4. Faire les **collets à 45°** (écrou enfilé avant !) et les emboîtures.
5. Présenter l'ensemble à blanc avant de braser.
6. Respecter le **sens des flèches** du filtre et de l'électrovanne ; voyant lisible.
7. Braser au **cuivre-phosphore** (cuivre/cuivre) ou à l'**argent avec flux** (cuivre/laiton), **avec balayage d'azote**, chiffon mouillé sur les composants sensibles.
8. Serrer les raccords flare à la clé dynamométrique.

### Test d'étanchéité à l'azote

- Azote sec via un **détendeur**, jamais en direct sur la bouteille.
- Montée progressive jusqu'à la pression demandée par le sujet (sans dépasser la PS des composants).
- **Produit moussant** sur chaque joint et raccord.
- Maintien en pression, relevé de la pression et de la température au début et à la fin (une variation de température fait varier la pression : P₂ = P₁ × T₂ / T₁ en absolu et en kelvins).
- Le jury regarde la propreté, le respect des cotes, l'aspect des brasures et le résultat du test.`,
    },
    {
      title: 'Puissance et commande, repérage des appareils',
      body: `Un schéma électrique d'installation frigorifique se divise en deux circuits :

- **Circuit de puissance** : alimente le moteur (compresseur, ventilateurs) en 230 V mono ou 400 V tri. On y trouve le sectionneur ou disjoncteur, les **pôles de puissance** du contacteur, le relais thermique, le moteur.
- **Circuit de commande** : pilote les bobines des contacteurs, souvent en **24 V** via un transformateur. On y trouve les boutons, l'arrêt d'urgence, les contacts des pressostats et du thermostat, les contacts auxiliaires, les voyants.

### Repères usuels

| Lettre | Appareil |
|---|---|
| **Q** | appareil de puissance : sectionneur, disjoncteur, disjoncteur moteur |
| **KM** | contacteur (KM1, KM2…) |
| **KA** | relais auxiliaire |
| **F** | protection : relais thermique, fusible |
| **S** | commande manuelle : bouton-poussoir, interrupteur, arrêt d'urgence |
| **H** | signalisation : voyant |
| **T** | transformateur |
| **M** | moteur |

Les pressostats et le thermostat sont repérés **B** (capteurs) ou **S** selon la norme utilisée sur le schéma.

### Numérotation des bornes

| Repère | Signification |
|---|---|
| A1 – A2 | bobine du contacteur |
| 1-2, 3-4, 5-6 | pôles de puissance |
| x3 – x4 (13-14, 43-44) | contact auxiliaire **NO** (ouvert au repos) |
| x1 – x2 (21-22, 31-32) | contact auxiliaire **NF** (fermé au repos) |
| 95 – 96 | contact **NF** du relais thermique (coupe la commande) |
| 97 – 98 | contact **NO** du relais thermique (signalisation défaut) |`,
    },
    {
      title: 'Auto-maintien, arrêt d\'urgence, verrouillage',
      body: `### Marche / arrêt avec auto-maintien

Dans l'ordre, en série dans le circuit de commande : protection du secondaire du transformateur → **arrêt d'urgence (NF)** → contact **95-96** du relais thermique → **bouton arrêt S0 (NF)** → **bouton marche S1 (NO)** → bobine **KM1 (A1-A2)**.

En **parallèle sur S1**, on câble le contact auxiliaire **NO 13-14 de KM1**. Quand on appuie sur S1, KM1 s'enclenche, son contact 13-14 se ferme et « remplace » S1 : c'est l'**auto-maintien**. Un appui sur S0, un arrêt d'urgence ou un déclenchement du relais thermique ouvre le circuit et KM1 retombe.

### Pourquoi l'arrêt est NF

C'est la **sécurité positive** : un fil coupé ou un contact desserré sur un circuit NF provoque l'arrêt, au lieu d'empêcher l'arrêt. L'arrêt d'urgence est un **coup de poing à accrochage**, NF, qui coupe la commande et reste enfoncé jusqu'au déverrouillage volontaire.

### Verrouillage électrique

Pour que deux contacteurs ne puissent jamais être enclenchés ensemble (inversion de sens, ou froid / dégivrage), on place un contact **NF de KM2** en série avec la bobine de KM1, et un contact **NF de KM1** en série avec la bobine de KM2. On peut ajouter un verrouillage mécanique.

### Transformateur 230/24 V

Il fournit une **très basse tension** pour la commande : moins de risque pour l'opérateur. Le primaire et le secondaire sont protégés (fusibles ou disjoncteur). Les voyants H (marche, défaut) sont alimentés par le même circuit.`,
    },
    {
      title: 'Bonnes pratiques de câblage et mise sous tension',
      body: `- Couleurs : **vert/jaune réservé à la terre (PE)**, bleu clair pour le neutre ; respecter les couleurs imposées par le sujet pour la commande.
- **Embouts** sur les fils souples, serrage correct de chaque borne (tirer légèrement sur le fil pour vérifier).
- **Repérage** des fils aux deux extrémités, cheminement en goulotte, pas de fil tendu.
- Section des conducteurs adaptée au courant.
- **Avant la mise sous tension** : contrôle visuel, contrôle de **continuité** au multimètre, vérification des réglages du relais thermique (intensité nominale du moteur).
- Essai d'abord du **circuit de commande seul**, puis en charge, **en présence du jury**.

### Consignation (NF C 18-510)

1. **Séparer** l'installation de la source (ouvrir le sectionneur).
2. **Condamner** en position ouverte (cadenas personnel, pancarte).
3. **Identifier** l'ouvrage sur lequel on intervient.
4. **Vérifier l'absence de tension** (VAT) avec un appareil adapté, testé avant et après.
5. Mise à la terre et en court-circuit lorsqu'elle est requise.

On ne travaille sur une installation électrique qu'avec une **habilitation** correspondant à l'opération, délivrée par l'employeur. Le référentiel du CAP vise le niveau **B1V** ; un dépanneur a besoin de **BR**, et de **BC** s'il consigne lui-même.`,
    },
    {
      title: 'PSE : prévention santé environnement',
      body: `Les risques du métier et leurs préventions reviennent souvent :

| Risque | Prévention |
|---|---|
| Électrique | consignation, habilitation, VAT |
| Brûlure (chalumeau) et gelure (fluide liquide) | gants, lunettes, permis de feu |
| Asphyxie (fluide ou azote en local confiné) | ventilation, détection |
| Chute (toiture, escabeau) | protections collectives, harnais si nécessaire |
| Manutention (compresseur, bouteilles) | gestes et postures, aides mécaniques |
| Bruit | protections auditives |

La démarche attendue : **identifier le danger**, la **situation dangereuse**, l'**événement** possible et le **dommage**, puis proposer une prévention **collective d'abord, individuelle ensuite**. Pense aussi à l'environnement : récupération des fluides, tri des déchets, fiches de données de sécurité.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- EP2 : platine cuivre + test azote, puis câblage d'un circuit de commande ; partie professionnelle 7 h, coef 5 (6 dont 1 de PSE, 8 h dont 1 h dans le règlement de 2015).
- Puissance = moteur ; commande = bobines, boutons, sécurités, voyants, souvent en 24 V.
- Q disjoncteur/sectionneur, KM contacteur, F relais thermique ou fusible, S bouton, H voyant, T transformateur.
- Auto-maintien : contact **13-14 de KM** en parallèle sur le bouton marche.
- Arrêt et arrêt d'urgence en **NF**, en série : sécurité positive.
- Relais thermique : **95-96 NF** dans la commande.
- Verrouillage : NF de KM2 dans la ligne de KM1 et inversement.
- Consigner : séparer, condamner, identifier, VAT.

### Erreurs fréquentes

- Câbler le contact d'auto-maintien en série au lieu de le mettre en parallèle sur le bouton marche.
- Prendre un contact NO pour l'arrêt d'urgence.
- Mettre le 95-96 dans le circuit de puissance.
- Utiliser le vert/jaune pour autre chose que la terre.
- Oublier les embouts ou laisser des fils mal serrés.
- Mettre sous tension sans test de continuité ni présence du jury.
- Oublier l'écrou avant le collet, braser sans azote.`,
    },
  ],
};

export default lesson;
