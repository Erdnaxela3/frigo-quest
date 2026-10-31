import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'saturation',
  title: 'Tables de saturation, surchauffe, sous-refroidissement',
  skills: ['A1:1.03', 'A1:4.04', 'A1:5.01', 'CAP:UP3.mesure'],
  level: 'L01',
  sections: [
    {
      title: 'Lire une table de saturation',
      body: `Une table de saturation (ou réglette P/T) donne, pour un fluide, la pression à laquelle il bout pour chaque température. Elle n'est valable **que si liquide et vapeur coexistent** : dans l'évaporateur, dans le condenseur, dans une bouteille.

Extrait des valeurs du jeu, en **bar abs** :

| T (°C) | R134a | R404A (rosée) | R449A (rosée) | R32 |
|---|---|---|---|---|
| −30 | 0,84 | 2,04 | 1,55 | 2,73 |
| −10 | 2,01 | 4,33 | 3,38 | 5,83 |
| 0 | 2,93 | 6,00 | 4,76 | 8,13 |
| 20 | 5,72 | 10,69 | 8,72 | 14,75 |
| 40 | 10,17 | 17,62 | 14,8 | 24,78 |

Pour un mélange zéotrope, la table a **deux colonnes** : bulle et rosée. Le R449A à −10 °C : bulle 4,30 bar abs, rosée 3,38 bar abs.

Les manomètres affichent la pression **relative**. Avant d'utiliser une table en absolu, ajoutez 1,013 bar. Les cadrans de manifold et les manifolds électroniques font la conversion pour vous, à condition d'avoir choisi **le bon fluide**.

Avec le curseur, choisissez un fluide et une température, puis comparez bulle et rosée.`,
      widget: 'pt-slider',
    },
    {
      title: 'Raccorder et lire le manifold',
      body: `C'est la mission du niveau L01. La procédure correcte, avec un minimum d'émissions (item 5.01) :

- **1.** Lire la **plaque signalétique** : fluide et charge. Sélectionner l'échelle du même fluide sur le manifold.
- **2.** Vérifier que les vannes du manifold sont **fermées**.
- **3.** Retirer les bouchons de la vanne de service (tige et prise de pression).
- **4.** **Flexible bleu** sur la vanne d'aspiration (BP), **flexible rouge** sur la prise HP (bouteille liquide ou refoulement).
- **5.** Décoller les vannes de service du contre-siège arrière d'un quart à un demi-tour : les manomètres indiquent.
- **6.** Lire BP et HP, puis les températures de saturation : **rosée** côté BP, **bulle** côté HP.

Pour se déconnecter, compresseur en marche :
- Remettre la vanne HP en **contre-siège arrière** (prise isolée).
- Ouvrir brièvement les vannes HP puis BP du manifold : le fluide du flexible HP est aspiré côté BP.
- Remettre la vanne BP en contre-siège arrière, fermer le manifold et les vannes des flexibles, dévisser.
- **Remettre les bouchons** : ce sont eux qui assurent l'étanchéité finale.

Ne vous raccordez pas sans raison : chaque branchement est une source potentielle d'émission.`,
    },
    {
      title: 'Surchauffe et sous-refroidissement',
      body: `**Surchauffe (SH)** = température de la ligne d'aspiration − température d'évaporation (**rosée**).

On mesure la température du tube d'aspiration en sortie d'évaporateur, près du bulbe du détendeur. La surchauffe prouve que tout le liquide s'est évaporé avant le compresseur.

**Sous-refroidissement (SC)** = température de condensation (**bulle**) − température de la ligne liquide.

On mesure en sortie de condenseur ou de bouteille liquide. Le sous-refroidissement prouve que le détendeur reçoit du liquide sans bulles.

Exemple du niveau L01, chambre froide au R449A (valeurs du jeu) :

| Mesure | Lecture | Saturation | Résultat |
|---|---|---|---|
| BP | 2,6 bar rel (3,6 bar abs) | rosée ≈ −8 °C | — |
| Tube aspiration | −2 °C | — | SH = −2 − (−8) = **6 K** |
| HP | 15,1 bar rel (16,1 bar abs) | bulle ≈ 37 °C | — |
| Ligne liquide | 32 °C | — | SC = 37 − 32 = **5 K** |

Ordres de grandeur (à confirmer avec le constructeur) : surchauffe 5 à 8 K avec un détendeur thermostatique, sous-refroidissement 3 à 8 K. Une surchauffe proche de 0 signale un risque de **coup de liquide** au compresseur.`,
    },
    {
      title: 'Le diagramme log p-h',
      body: `Le diagramme enthalpique porte la **pression** en ordonnée (échelle logarithmique) et l'**enthalpie** en abscisse. La **cloche** sépare trois zones : liquide sous-refroidi à gauche, mélange liquide + vapeur sous la cloche, vapeur surchauffée à droite.

Le cycle frigorifique y dessine un quadrilatère à 4 points :

| Point | Où | État |
|---|---|---|
| 1 | Entrée compresseur | Vapeur surchauffée, BP |
| 2 | Sortie compresseur | Vapeur très surchauffée, HP |
| 3 | Sortie condenseur | Liquide sous-refroidi, HP |
| 4 | Sortie détendeur | Mélange, BP |

- 1 → 2 : **compression**, pression et enthalpie augmentent.
- 2 → 3 : **condensation** à pression constante, désurchauffe puis condensation puis sous-refroidissement.
- 3 → 4 : **détente** à enthalpie constante (ligne verticale).
- 4 → 1 : **évaporation** à pression constante, puis surchauffe.

La longueur 4 → 1 représente la production frigorifique par kg de fluide ; la longueur 1 → 2, le travail du compresseur. Le rapport des deux donne l'efficacité (COP frigorifique).

Déplacez les points du diagramme : si la BP baisse, la compression s'allonge et l'efficacité chute.`,
      widget: 'logph',
    },
    {
      title: 'Le contrôle d\'étanchéité indirect',
      body: `L'item 1.03 relie tables et diagramme au **contrôle indirect** : on détecte une fuite par ses effets sur le fonctionnement, sans détecteur. On compare les relevés avec les valeurs de référence du **registre** (relevés de mise en service, interventions précédentes).

| Symptôme | BP | HP | SH | SC |
|---|---|---|---|---|
| **Manque de fluide (fuite)** | basse | basse | **élevée** | **faible ou nul**, bulles au voyant |
| Excès de charge | normale ou haute | haute | normale ou faible | **élevé** |
| Filtre ou détendeur obstrué | basse | normale | élevée | élevé |
| Condenseur encrassé, ventilateur HS | un peu haute | **haute** | normale | normal ou faible |
| Évaporateur pris en glace, ventilateur HS | **basse** | basse | **faible** | normal |

Un manque de fluide se reconnaît donc à une **surchauffe élevée** combinée à un **sous-refroidissement faible**, souvent avec un voyant liquide qui « mousse ». Le contrôle indirect oriente la recherche ; une fuite suspectée se confirme ensuite par une **méthode directe** (détecteur, produit moussant).`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- Table de saturation = **mélange saturé** uniquement, en **bar abs**.
- **SH = T aspiration − T rosée (BP)**. **SC = T bulle (HP) − T liquide**.
- Évaporation → **rosée** ; condensation → **bulle**. Avec un corps pur, bulle = rosée.
- Toujours régler le manifold sur **le fluide de la plaque signalétique**.
- Log p-h : 1→2 compression, 2→3 condensation, 3→4 détente **isenthalpique**, 4→1 évaporation.
- Fuite = BP basse, **SH haute**, **SC basse**, bulles au voyant.
- Déconnexion propre : vanne HP en contre-siège arrière, vider le flexible HP vers la BP, **bouchons remis**.`,
    },
    {
      title: 'Erreurs fréquentes',
      body: `- **Mauvaise échelle** sur le manifold : on lit la température d'un autre fluide. Le R404A et le R449A n'ont pas la même courbe.
- Calculer la surchauffe avec la **température de bulle** d'un zéotrope : la surchauffe paraît plus grande de plusieurs kelvins qu'en réalité.
- Inverser les flexibles : le manomètre BP exposé à la HP peut être détruit.
- Ouvrir les deux vannes du manifold compresseur en marche en dehors de la déconnexion : on envoie des gaz chauds HP dans l'aspiration.
- Mettre la vanne d'aspiration en **contre-siège avant** compresseur en marche : il tire au vide et s'abîme.
- Mesurer la température d'aspiration loin de l'évaporateur ou sans isoler la sonde : la mesure est fausse.
- Oublier les bouchons : la vanne de service devient un point de fuite.`,
    },
  ],
};

export default lesson;
