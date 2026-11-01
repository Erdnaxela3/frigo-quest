import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'thermo',
  title: 'Unités et thermodynamique de base, mélanges zéotropes',
  skills: ['A1:1.01', 'A1:1.02'],
  sections: [
    {
      title: 'Les unités SI à connaître',
      body: `Le frigoriste jongle avec des unités anglo-saxonnes (psi, °F, microns) et des unités SI. À l'examen, on raisonne en SI.

| Grandeur | Unité SI | Unités courantes | Conversions utiles |
|---|---|---|---|
| Température | kelvin (K) | °C | T(K) = T(°C) + 273,15 |
| Pression | pascal (Pa) | bar, mbar, psi | 1 bar = 100 000 Pa = 1000 mbar ≈ 14,5 psi |
| Masse | kilogramme (kg) | g | 1 kg = 1000 g |
| Masse volumique | kg/m³ | kg/L | 1 kg/L = 1000 kg/m³ |
| Énergie | joule (J) | kJ, kWh | 1 kWh = 3600 kJ |
| Puissance | watt (W) | kW | 1 W = 1 J/s |

Deux remarques importantes :
- Un **écart** de température (surchauffe, sous-refroidissement, glissement) s'exprime en **K**. Un écart de 5 °C vaut 5 K.
- Le vide se lit en **mbar absolus** ou en **microns** de mercure : 1 mbar = 750 microns, donc 500 microns ≈ 0,67 mbar.

Masse volumique, ordre de grandeur à 25 °C : eau 1000 kg/m³, R449A liquide ≈ 1113 kg/m³, R404A ≈ 1044 kg/m³, propane liquide ≈ 493 kg/m³. Le propane est deux fois plus léger que les HFC : à volume égal, on en met deux fois moins en masse.`,
    },
    {
      title: 'Pression absolue et pression relative',
      body: `L'atmosphère appuie sur tout ce qui nous entoure avec environ **1,013 bar** au niveau de la mer.

- La **pression absolue** part du vide parfait (0 bar abs).
- La **pression relative** (ou effective) part de la pression atmosphérique. C'est ce qu'affiche un manomètre de manifold : à l'air libre, il indique 0.

**P abs = P rel + 1,013**

Exemples :
- Un circuit à l'air libre : 0 bar rel = 1,013 bar abs.
- Un manomètre BP qui indique 2,6 bar : 3,6 bar abs.
- Un vide de 2 mbar abs : environ −1,011 bar rel. Le manomètre à aiguille affiche « −1 » et ne permet pas de juger un tirage au vide : il faut un **vacuomètre électronique**.

Les tables de saturation et les lois des gaz utilisent la **pression absolue**. Les manomètres affichent la **relative**. Toujours vérifier de quelle pression on parle. Sur les fiches, on note souvent « bar » pour la relative et « bar abs » pour l'absolue, ou « barg » / « bara » en anglais.`,
    },
    {
      title: 'Chaleur, enthalpie et changements d\'état',
      body: `La **chaleur** est de l'énergie qui passe toujours du corps chaud vers le corps froid. Une machine frigorifique ne « produit » pas de froid : elle **transporte de la chaleur** de la chambre froide vers l'extérieur, en dépensant de l'énergie au compresseur.

Deux formes de chaleur :
- **Chaleur sensible** : elle change la température sans changer l'état. Q = m × c × ΔT (pour l'eau, c ≈ 4,18 kJ/kg·K).
- **Chaleur latente** : elle change l'état sans changer la température. Pour vaporiser 1 kg d'eau à 100 °C, il faut environ 2257 kJ, soit plus de 5 fois ce qu'il faut pour la chauffer de 0 à 100 °C.

C'est la chaleur latente qui fait fonctionner un circuit frigorifique : le fluide **s'évapore** dans l'évaporateur en absorbant beaucoup de chaleur, puis **se condense** dans le condenseur en la rejetant.

| Changement d'état | Sens | Chaleur |
|---|---|---|
| Vaporisation (évaporation, ébullition) | liquide → vapeur | absorbée |
| Condensation (liquéfaction) | vapeur → liquide | rejetée |
| Fusion | solide → liquide | absorbée |
| Solidification | liquide → solide | rejetée |
| Sublimation | solide → vapeur | absorbée |

L'**enthalpie massique** h (kJ/kg) est le « contenu énergétique » de 1 kg de fluide. Dans un échangeur, la puissance échangée vaut **débit massique × différence d'enthalpie**. C'est l'axe horizontal du diagramme log p-h.`,
    },
    {
      title: 'Saturation : pression et température liées',
      body: `Tant qu'un fluide pur contient à la fois du liquide et de la vapeur, sa **pression et sa température sont liées** : c'est la **saturation**. L'eau bout à 100 °C sous 1,013 bar abs, mais à environ 20 °C sous 23 mbar abs : c'est pour cela qu'un tirage au vide fait bouillir l'humidité du circuit.

Trois états à distinguer :
- **Liquide sous-refroidi** : plus froid que sa température de saturation. Exemple : la ligne liquide.
- **Mélange saturé** liquide + vapeur : P et T liées. Exemple : l'intérieur de l'évaporateur et du condenseur, une bouteille de fluide.
- **Vapeur surchauffée** : plus chaude que sa température de saturation. Exemple : l'aspiration et le refoulement du compresseur.

Chaque fluide a sa propre courbe. Valeurs du jeu à 20 °C (bar abs) :

| Fluide | Psat à 20 °C |
|---|---|
| R134a | 5,72 |
| R1234yf | 5,92 |
| R290 | 8,36 |
| R32 | 14,75 |
| R744 (CO₂) | 57,29 |

Au-dessus du **point critique**, il n'y a plus de distinction liquide/vapeur. Pour le CO₂, il est à **31 °C** et 73,8 bar abs : c'est pourquoi les installations CO₂ fonctionnent souvent en régime **transcritique** en été. Pour le R32 il est à 78 °C, pour le R134a à 101 °C.

Faites varier la température sur le curseur et observez : la pression monte vite avec la température. Une bouteille de fluide laissée au soleil monte en pression même si sa masse ne change pas.`,
      widget: 'pt-slider',
    },
    {
      title: 'Mélanges zéotropes et glissement de température',
      body: `Beaucoup de fluides sont des **mélanges** de plusieurs corps purs. On les classe ainsi :

| Type | Série | Exemples | Comportement |
|---|---|---|---|
| Corps pur | — | R134a, R32, R290 | une seule température de saturation par pression |
| Azéotrope | série 500 | R507A | se comporte comme un corps pur |
| Quasi-azéotrope | série 400 | R410A, R404A | glissement faible (< 1 K) |
| **Zéotrope** | série 400 | **R407C, R449A** | **glissement** de plusieurs kelvins |

Dans un mélange zéotrope, les composants ne s'évaporent pas à la même température. À pression constante, l'ébullition **commence** à la **température de bulle** et **se termine** à la **température de rosée**, plus haute. L'écart s'appelle le **glissement** (*glide*).

Exemple avec le R407C (valeurs du jeu) : à 4,27 bar abs (3,26 bar rel), la bulle est à environ −7 °C et la rosée à 0 °C, soit un glissement d'environ 7 K.

Conséquences pratiques :
- Pour la **surchauffe** (évaporation), on prend la **température de rosée**.
- Pour le **sous-refroidissement** (condensation), on prend la **température de bulle**.
- Une fuite en phase vapeur fait partir davantage les composants volatils : la composition restante change (**fractionnement**).
- On **charge toujours en phase liquide**, pour que la composition introduite soit celle de la bouteille.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- **P abs = P rel + 1,013** ; **T(K) = T(°C) + 273,15** ; un écart de température est en **K**.
- Tables de saturation et lois des gaz : toujours en **absolu**.
- Changement d'état = **chaleur latente**, sans variation de température. Évaporation = absorbe, condensation = rejette.
- Mélange saturé : P et T liées. Liquide **sous-refroidi** sous la saturation, vapeur **surchauffée** au-dessus.
- Zéotrope : **bulle** (début d'ébullition, plus froide) et **rosée** (fin, plus chaude). SH avec la rosée, SC avec la bulle.
- Mélanges de la série 400 : **charge en phase liquide**.
- CO₂ : point critique à **31 °C**.`,
    },
    {
      title: 'Erreurs fréquentes',
      body: `- Lire la pression relative du manomètre et l'utiliser dans une formule de gaz parfait : la formule demande des **bar abs** et des **kelvins**.
- Convertir un écart de température en ajoutant 273 : une surchauffe de 6 °C vaut **6 K**, pas 279 K.
- Croire que « 0 bar » au manomètre veut dire « vide » : c'est la pression atmosphérique.
- Utiliser la température de bulle pour calculer la surchauffe d'un R407C : on **surestime** la surchauffe de plusieurs kelvins et on risque d'ouvrir trop le détendeur (retour de liquide au compresseur).
- Charger un R449A en phase vapeur : la composition du mélange change et l'installation ne retrouve plus ses performances.
- Penser qu'un HFO pur a un glissement : c'est le **mélange** qui crée le glissement, pas la famille chimique.`,
    },
  ],
};

export default lesson;
