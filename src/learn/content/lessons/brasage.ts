import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'brasage',
  title: 'Façonnage du cuivre, brasage et supportage',
  skills: ['A1:10.01', 'A1:10.02', 'A1:4.01', 'CAP:UP2.faconnage', 'CAP:UP2.etancheite'],
  sections: [
    {
      title: 'Le tube cuivre frigorifique',
      body: `Le froid utilise du **cuivre de qualité frigorifique** : propre, dégraissé, déshydraté, livré **bouchonné** aux deux extrémités. Les diamètres sont exprimés en **pouces** (1/4", 3/8", 1/2", 5/8", 3/4", 7/8"…).

| Forme | État | Usage |
|---|---|---|
| Couronne | **recuit** (souple) | petits diamètres, se cintre facilement |
| Barre | **écroui** (dur) | gros diamètres, longueurs droites, raccords à braser |

Rebouche un tube entamé : l'humidité et la poussière qui entrent finiront dans le filtre ou le détendeur. Chaque raccord est un **point de fuite potentiel** (4.01) : moins il y a de raccords, mieux c'est. Un bon cintrage remplace un coude brasé.`,
    },
    {
      title: 'Couper, ébavurer, cintrer',
      body: `### Couper

- **Coupe-tube** uniquement, avec une avance progressive de la molette. **Jamais de scie** : les copeaux entrent dans le circuit.
- Coupe perpendiculaire à l'axe, sans écraser le tube.

### Ébavurer

- Ébavureur intérieur et extérieur. Tiens le tube **ouverture vers le bas** pour que les copeaux tombent dehors.
- Une bavure intérieure freine le fluide et peut empêcher un collet de bien porter.

### Cintrer

- Cintreuse à levier (ou à ressort pour les petits diamètres en recuit). La forme de la cintreuse impose le **rayon de cintrage** ; ne force pas en dessous (ordre de grandeur souvent indiqué : 3 à 5 fois le diamètre, à vérifier selon l'outil et le diamètre).
- Défauts à éviter : **ovalisation**, **plis** à l'intérieur de la courbe, **écrasement**. Ils réduisent la section et fragilisent le tube.
- Repère la position du cintrage sur le tube **avant** de cintrer (trait au crayon, en tenant compte du repère de la cintreuse). Au CAP, les cotes du plan de la platine doivent être respectées.`,
    },
    {
      title: 'Collet battu (flare 45°) et emboîture',
      body: `### Collet battu à 45°

1. Couper, ébavurer.
2. **Enfiler l'écrou avant** de faire le collet (oubli classique !).
3. Serrer le tube dans la matrice à la bonne hauteur, former le collet avec la dudgeonnière à excentrique.
4. Contrôler : surface lisse, sans fissure, diamètre qui remplit la portée de l'écrou.
5. Serrer à la **clé dynamométrique** au couple du fabricant. Ordres de grandeur courants des notices de splits : 1/4" ≈ 14–18 N·m, 3/8" ≈ 33–42 N·m, 1/2" ≈ 50–62 N·m, 5/8" ≈ 63–77 N·m (à vérifier sur la notice de l'appareil).

Trop peu serré : fuite. Trop serré : collet fissuré, fuite plus tard. Ne réutilise pas un vieil écrou ou un vieux joint.

### Emboîture

L'emboîture (expansion cylindrique) permet d'emmancher un tube dans l'autre pour les braser sans manchon. Sur le terrain, le mot **« dudgeon »** désigne souvent l'emboîture, et parfois le collet : vérifie le vocabulaire du sujet d'examen.`,
    },
    {
      title: 'Brasage fort : argent ou cuivre-phosphore',
      body: `En froid, on fait du **brasage fort** (métal d'apport fondant au-dessus de 450 °C). Le brasage tendre (étain) ne résiste pas aux vibrations ni aux pressions des circuits frigorifiques.

| Brasure | Assemblage | Flux |
|---|---|---|
| **Cuivre-phosphore** (avec ou sans argent, quelques %) | cuivre sur cuivre | **pas de flux** : le phosphore désoxyde le cuivre |
| **Argent** (forte teneur en argent) | cuivre sur laiton, acier, inox | **flux obligatoire** |

Ne brase pas un acier avec une brasure au phosphore : le joint devient fragile.

### Le geste

1. Pièces propres, emboîture ajustée : le **jeu capillaire** est faible (de l'ordre du dixième de millimètre).
2. Balayage d'azote en route (section suivante).
3. Protéger les organes sensibles (vanne, voyant, filtre, électrovanne) avec un **chiffon mouillé** ou une pâte thermique, ou démonter leurs parties internes selon le fabricant.
4. Chauffer uniformément le tube puis l'emboîture jusqu'au rouge sombre ; la brasure **suit la chaleur** et pénètre par capillarité.
5. Apporter la baguette sur le joint chaud, pas dans la flamme.
6. Laisser refroidir sans bouger ; nettoyer les résidus de flux (corrosifs).

Un bon joint montre un **congé régulier** sur tout le pourtour, sans porosité ni coulure à l'intérieur.

### Sécurité

Chalumeau (oxyacétylénique ou air/gaz) avec **clapets anti-retour**, bouteilles debout et attachées, lunettes teintées, gants, extincteur à portée, permis de feu si le site l'exige. **Ne jamais chauffer un tube qui contient encore du fluide sous pression** : décomposition toxique, risque d'éclatement.`,
    },
    {
      title: 'Balayage d\'azote et test d\'étanchéité',
      body: `Sans azote, l'oxygène de l'air dans le tube forme de la **calamine** (oxyde de cuivre) sur la paroi intérieure. Elle se détache ensuite et va **boucher le filtre, le détendeur** ou abîmer le compresseur.

- Azote sec (OFN) via un **détendeur-régulateur** sur la bouteille, jamais en direct.
- **Faible débit** (quelques litres par minute, à vérifier selon le mode opératoire) : on doit juste chasser l'air, pas souffler la brasure.
- Le circuit doit avoir une **sortie ouverte** : on ne brase pas un circuit fermé sous pression.
- Commencer le balayage avant de chauffer, le maintenir jusqu'au refroidissement du joint.

Après assemblage : **test de pression à l'azote** à la valeur du sujet ou du constructeur, contrôle à l'eau savonneuse ou au produit moussant sur chaque joint, maintien en pression en tenant compte de la température (P₂ = P₁ × T₂ / T₁ en pression absolue et en kelvins). Puis tirage au vide.`,
    },
    {
      title: 'Supportage des tuyauteries (10.02)',
      body: `Une tuyauterie mal supportée vibre, frotte et finit par se fissurer : c'est une cause fréquente de fuite.

- **Colliers** adaptés au diamètre, avec garniture (caoutchouc) pour amortir les vibrations et éviter le contact direct entre métaux différents.
- Supports réguliers sur les longueurs droites, et **près des coudes, des vannes et des composants lourds** (espacement selon le diamètre et la notice, à vérifier).
- Pas de contrainte sur le compresseur ni sur les raccords : la tuyauterie ne doit pas « tirer » sur un collet.
- Laisser la **dilatation** se faire (lyre, boucle) sur les longues lignes.
- Ligne d'aspiration **isolée** (manchon isolant fermé) : évite la condensation et la surchauffe inutile.
- Pente de l'aspiration vers le compresseur et siphon en pied de colonne montante pour le retour d'huile.
- Protéger les tubes contre les chocs et les UV en extérieur (goulotte, gaine).`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- Coupe-tube, jamais de scie. Ébavurer ouverture vers le bas.
- Enfiler l'écrou avant le collet. Serrer à la clé dynamométrique.
- Brasage **fort** en froid. Cuivre/cuivre : cuivre-phosphore sans flux. Cuivre/laiton ou acier : brasure argent avec flux.
- **Balayage d'azote** à faible débit pendant tout brasage, sortie ouverte.
- Chiffon mouillé sur vannes, voyants, filtres.
- Jamais de flamme sur un circuit contenant du fluide.
- Après brasage : test azote, recherche de fuites, puis tirage au vide.
- Supports près des coudes et des composants, colliers amortis, pas de contrainte.

### Erreurs fréquentes

- Oublier l'écrou avant de battre le collet.
- Braser sans azote « parce que c'est un petit joint ».
- Mettre trop de débit d'azote : la brasure est soufflée, le joint est poreux.
- Chauffer directement la baguette au lieu du joint.
- Laisser un tube ouvert à l'air plusieurs heures.
- Cintrer trop serré : tube ovalisé ou plissé.
- Utiliser du flux pour du cuivre-phosphore sur cuivre (inutile) ou oublier le flux sur du laiton.`,
    },
  ],
};

export default lesson;
