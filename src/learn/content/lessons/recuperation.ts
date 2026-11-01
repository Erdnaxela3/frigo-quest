import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'recuperation',
  title: 'Récupération, bouteilles, traçabilité, déchets',
  skills: ['A1:5.02', 'A1:5.03', 'A1:5.04', 'A1:5.05', 'A1:5.06', 'A1:5.07', 'A1:5.08', 'CAP:UP3.charge'],
  level: 'L05',
  sections: [
    {
      title: 'Récupérer : une obligation',
      body: `Tout rejet volontaire de fluide frigorigène est interdit. Avant d'ouvrir un circuit (remplacement de compresseur, réparation de fuite, démantèlement), on **récupère la totalité de la charge** avec une **station de récupération**.

La station est un petit groupe frigorifique : elle aspire le fluide du circuit, le comprime, le condense et le refoule dans une **bouteille de récupération**. Certaines acceptent le liquide, d'autres seulement la vapeur : lisez la plaque de la station. Envoyer du liquide dans une station « vapeur seule » provoque des coups de liquide dans son compresseur.

Le fluide récupéré peut être :
- **recyclé** sur place (filtré, puis réutilisé dans la même entreprise ou installation) ;
- **régénéré** par une installation agréée pour retrouver les spécifications du fluide neuf ;
- **détruit** s'il est trop contaminé ou mélangé.

Avec la réduction des quotas de HFC, le fluide régénéré prend de la valeur : un mélange de deux fluides dans une bouteille, en revanche, part à la destruction, à vos frais.`,
    },
    {
      title: 'Choisir et préparer la bouteille',
      body: `Une bouteille de récupération doit être :
- **dédiée au fluide** récupéré (ou vide et tirée au vide), **jamais** une bouteille contenant un autre fluide ;
- **rechargeable** : les bouteilles jetables de fluide neuf sont interdites au remplissage ;
- **étiquetée** et avec une **date de requalification** valide (réglementation des équipements sous pression) ;
- remplie à **80 % maximum** en liquide.

La règle des 80 % laisse un ciel de vapeur : si la bouteille chauffe, le liquide se dilate. Une bouteille pleine de liquide qui chauffe monte en pression très vite, jusqu'à l'éclatement (pression **hydraulique**).

Exemple du niveau L05 : bouteille de 12 L pour du R449A, masse volumique du liquide ≈ 1,1 kg/L.
- Masse maximale ≈ 12 × 1,1 × 0,8 ≈ **10,5 kg**.
- La **charge maximale gravée ou étiquetée** sur la bouteille prime toujours sur ce calcul.

Avant de commencer : bouteille sur la **balance**, tare ou poids brut noté. Si possible, tirer au vide les flexibles pour ne pas envoyer d'air dans la bouteille.`,
    },
    {
      title: 'Liquide d\'abord, vapeur ensuite',
      body: `Procédure de récupération (niveau L05) :
- Identifier le fluide sur la plaque, choisir la bouteille.
- Raccorder : prises **HP (liquide)** et **BP** du circuit → manifold → **entrée** de la station ; **sortie** de la station → vanne **gaz** de la bouteille.
- Récupérer **le liquide d'abord** par le côté HP : c'est beaucoup plus rapide, un litre de liquide contient des centaines de fois plus de fluide qu'un litre de vapeur.
- Puis la **vapeur**, par les deux côtés.
- Surveiller la pression de la bouteille. Si la station monte trop en pression, **refroidir la bouteille** (linge humide, bac d'eau froide).
- Aller jusqu'à la coupure de la station, circuit à **0 bar rel ou légèrement en vide**.
- **Attendre environ 5 minutes** : si la pression remonte, du fluide dégaze de l'huile ou de points froids, on recommence.
- Faire l'**auto-purge** de la station vers la bouteille, fermer la bouteille, déconnecter.

**Le push-pull**, pour les grosses charges avec bouteille liquide (au-delà de 5 kg environ) : on relie la vanne **liquide** de la bouteille de récupération au côté liquide du circuit. La station aspire la **vapeur** de la bouteille et la refoule dans le côté vapeur du circuit. La bouteille se dépressurise, le circuit se pressurise : le liquide est **poussé** vers la bouteille. On termine par une récupération vapeur classique. Surveillez le remplissage sur la balance : on dépasse vite les 80 %, prévoir une deuxième bouteille.`,
    },
    {
      title: 'Peser et étiqueter',
      body: `Après la récupération, **on pèse** (item 5.06) :

**masse récupérée = poids brut final − poids avant récupération**

On compare à la **charge nominale** de la plaque : la différence correspond à ce qui a fui depuis la dernière charge. Exemple : 6 kg de R449A sur la plaque, 5,6 kg récupérés → 0,4 kg manquants, signe d'une fuite à rechercher.

Puis on **étiquette** la bouteille : fluide, masse, date, installation d'origine. Une bouteille mal étiquetée sera traitée comme un mélange inconnu.

Une bouteille contenant du fluide récupéré est un **déchet** (sauf réutilisation sur place après recyclage) et suit le circuit de traçabilité des déchets.`,
    },
    {
      title: 'Charger sans perte, gérer les huiles',
      body: `**Avant de charger** (item 5.05), vérifier l'état du fluide : le bon fluide (plaque signalétique), une bouteille identifiée et propre, et, pour du fluide recyclé, son origine.

**Charger à la balance**, à la masse indiquée sur la plaque, après un tirage au vide validé :
- Les mélanges zéotropes de la série 400 (R407C, R449A…) se chargent **en phase liquide** : bouteille à tube plongeur, ou retournée. En vapeur, les composants les plus volatils sortent en premier et la composition change.
- Le liquide s'introduit de préférence dans la **ligne liquide**, circuit à l'arrêt et sous vide. Pour compléter côté aspiration compresseur en marche, on **lamine** le liquide au manifold pour qu'il arrive vaporisé au compresseur.
- Purger l'air des flexibles avant d'ouvrir vers le circuit, avec un minimum de fluide.

**Les huiles** (item 5.04) :
- Une huile contaminée (acide après un claquage moteur, humide, noircie) se **vidange**. Un test d'acidité aide à décider.
- L'huile contient du fluide dissous : elle doit être **dégazée** (circuit récupéré, carter à 0 bar) avant vidange.
- L'huile usagée est un **déchet dangereux** : bidon fermé et identifié, remis à la filière de collecte.
- Remplacer par l'huile prescrite (POE pour la plupart des HFC). L'huile POE est très **hygroscopique** : bidon refermé aussitôt.`,
    },
    {
      title: 'Traçabilité et filière déchets',
      body: `Chaque kilo doit être tracé (items 5.07 et 5.08) :
- **Fiche d'intervention Cerfa n° 15497\\*04** : quantités **récupérées** et **chargées**, fluide, identification de la bouteille, signée par l'opérateur et le détenteur (non exigée sous 5 t CO₂e), conservée 5 ans par chacun.
- **Registre** de l'équipement mis à jour.
- La bouteille est rendue au **distributeur** (reprise sans frais) ou à un centre de traitement, au plus tard un an après l'intervention : **régénération** ou **destruction** dans une installation autorisée (rubrique ICPE 2790).
- Le transfert est suivi par le **BSFF** (bordereau de suivi des fluides frigorigènes), obligatoire sur **Trackdéchets** depuis le 1er janvier 2023, émis par l'opérateur qui collecte.
- Transport : bouteilles **debout, calées, robinet protégé**, véhicule ventilé ; les règles du transport de matières dangereuses s'appliquent selon les quantités (à vérifier).

Le bilan de l'entreprise doit tomber juste : fluide acheté = fluide chargé + fluide en stock, et fluide récupéré = fluide rendu.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- Bouteille de récupération : **dédiée, rechargeable, étiquetée, requalification valide, 80 % maximum**.
- **Liquide d'abord** (HP), **vapeur ensuite** (deux côtés) ; push-pull pour les grosses charges.
- Arrêter à 0 bar rel ou léger vide, **attendre 5 min**, recommencer si la pression remonte.
- **Peser** avant et après ; masse récupérée comparée à la charge nominale.
- Mélanges série 400 : **charge en phase liquide**, à la balance.
- Huile contaminée : dégazée, vidangée, **déchet dangereux**.
- Traçabilité : **Cerfa 15497**, registre, **BSFF sur Trackdéchets**, retour distributeur.`,
    },
    {
      title: 'Erreurs fréquentes',
      body: `- Récupérer dans une bouteille qui contient un autre fluide : le mélange n'est plus régénérable.
- Utiliser une bouteille jetable de fluide neuf : interdit et dangereux.
- Dépasser les 80 % parce qu'on ne surveille pas la balance, surtout en push-pull.
- Arrêter la récupération dès la coupure de la station, sans attendre la remontée : le fluide restant s'échappe à l'ouverture du circuit.
- Envoyer du liquide dans une station prévue pour la vapeur seule.
- Ne pas peser : impossible de remplir la fiche d'intervention.
- Charger un R449A en phase vapeur, ou envoyer du liquide non laminé à l'aspiration d'un compresseur en marche.
- Laisser un bidon d'huile POE ouvert : elle absorbe l'humidité de l'air.`,
    },
  ],
};

export default lesson;
