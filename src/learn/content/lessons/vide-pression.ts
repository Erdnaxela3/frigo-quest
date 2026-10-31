import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'vide-pression',
  title: 'Tirage au vide et tests de pression',
  skills: ['A1:3.01', 'A1:3.02', 'A1:3.03', 'A1:3.04', 'A1:3.05', 'CAP:UP2.etancheite', 'CAP:UP3.vide'],
  level: 'L04',
  sections: [
    {
      title: 'Avant la mise en service : pourquoi tester',
      body: `Après une installation neuve ou une intervention qui a ouvert le circuit (brasures, remplacement de composant), on enchaîne toujours :
- **Essai de résistance** à la pression (item 3.01) : le circuit tient-il mécaniquement ?
- **Essai d'étanchéité** (item 3.02) : le circuit perd-il de la pression ?
- **Tirage au vide** (items 3.03 et 3.04) : on retire l'azote, l'air et surtout l'**humidité**.
- **Consignation** (item 3.05) : pressions, durées, températures, résultat.

Ces essais se font **avant** d'introduire le fluide frigorigène. Chercher une fuite en chargeant du fluide est interdit : ce serait une émission volontaire.

Au CAP IFCA, l'épreuve EP3 commence par une chambre froide sous azote : **vidange de l'azote et tirage au vide** valent 15 points sur 100.`,
    },
    {
      title: 'L\'azote OFN et le matériel',
      body: `On teste à l'**azote déshydraté** (OFN, *oxygen free nitrogen*) : inerte, sec, ininflammable, et son rejet à l'atmosphère n'est pas réglementé.

| Gaz | Pour un test de pression ? | Pourquoi |
|---|---|---|
| **Azote OFN** | **oui** | inerte et sec |
| Oxygène | **jamais** | huile + oxygène sous pression = **explosion** |
| Air comprimé | non | apporte humidité et oxygène |
| Fluide frigorigène | **interdit** | émission volontaire |

Matériel :
- Bouteille d'azote (environ 200 bar quand elle est pleine) **toujours avec un détendeur** à deux manomètres et une soupape. Jamais la bouteille directement sur le manifold.
- Manifold, flexibles, produit moussant, thermomètre ambiant.

Préparation du circuit :
- **Électrovanne ouverte** (alimentée ou ouverte manuellement) et vannes internes ouvertes : tout le circuit doit être testé.
- Isoler les composants qui ne supportent pas la pression d'essai (certains pressostats, selon le dossier).
- Monter en pression **progressivement**, par paliers (par exemple 5 bar, contrôle, 10 bar…).`,
    },
    {
      title: 'Résistance, étanchéité et correction de température',
      body: `Les pressions d'essai viennent de la **plaque signalétique** (PS côté HP et côté BP), du constructeur et de la norme EN 378. Les coefficients exacts sont à prendre dans le dossier technique (à vérifier) ; en tout cas, l'essai d'étanchéité se fait à une pression **≤ PS**.

Procédure :
- **Résistance** : montée à la valeur prescrite, court maintien, aucune déformation.
- **Étanchéité** : à la valeur prescrite, fermer le manifold, **isoler la bouteille**, noter **P₁** et **T₁**.
- Maintenir de 30 min à 24 h, puis noter **P₂** et **T₂**.

La pression d'un gaz enfermé varie avec sa température. Avant de conclure, on corrige :

**P₂ attendue (bar abs) = P₁ (bar abs) × T₂ (K) / T₁ (K)**

Exemple, essai de nuit : P₁ = 10 bar rel à 20 °C, T₂ = 12 °C.
- P₁ = 10 + 1,013 = 11,013 bar abs ; T₁ = 293,15 K ; T₂ = 285,15 K.
- P₂ attendue = 11,013 × 285,15 / 293,15 = 10,71 bar abs, soit **9,70 bar rel**.
- Lecture 9,7 bar rel : **pas de fuite**, la baisse vient du refroidissement.

Inversement, si le soleil chauffe le circuit de 10 K, la pression **monte** : P₂ attendue = 11,013 × 303,15 / 293,15 = 11,39 bar abs, soit 10,38 bar rel. Une lecture de 10,1 bar rel cache une **fuite**, même si la pression a augmenté.

Fuite confirmée → recherche au **produit moussant** : les bulles grossissent au joint fautif. Après l'essai, relâcher l'azote vers l'extérieur.`,
    },
    {
      title: 'La pompe à vide et le vacuomètre',
      body: `Le tirage au vide retire l'air et l'**humidité**. L'eau dans un circuit forme des acides avec l'huile POE, de la glace au détendeur et de la boue dans le filtre. Sous vide, l'eau bout à température ambiante : à 20 °C, il suffit de descendre sous **23 mbar abs**.

Procédure (niveau L04) :
- Vider l'azote jusqu'à **0 bar rel**. Ne jamais démarrer la pompe sur un circuit sous pression.
- Contrôler l'**huile de la pompe** : trouble ou laiteuse → vidange avant de commencer.
- Retirer les **obus Schrader** avec un démonte-obus, utiliser des **flexibles courts et de gros diamètre** : le tirage est beaucoup plus rapide.
- Raccorder **les deux côtés**, BP et HP, électrovanne ouverte.
- Placer le **vacuomètre électronique côté circuit**, pas sur la pompe.
- Démarrer la pompe. Ouvrir le **lest d'air** (gas ballast) les premières minutes si on suspecte de l'humidité, puis le refermer.
- Descendre à l'objectif : **≤ 2 mbar abs** dans le jeu, **500 microns** (≈ 0,67 mbar) comme objectif professionnel courant (à vérifier selon le constructeur).

Le manomètre à aiguille du manifold ne sert à rien ici : il affiche « −1 bar » dès quelques dizaines de mbar.

Ne jamais mettre le compresseur sous tension sous vide : risque de claquage du moteur.`,
    },
    {
      title: 'Interpréter la remontée et le triple tirage',
      body: `Une fois l'objectif atteint, on fait l'**essai de remontée** : isoler la pompe (fermer la vanne), **puis** l'arrêter, et observer le vacuomètre 10 à 30 minutes.

| Comportement | Diagnostic | Action |
|---|---|---|
| Reste sous l'objectif | circuit **sec et étanche** | casser le vide au fluide ou à l'azote |
| Remonte puis se **stabilise** (palier ~10–25 mbar) | **humidité** qui s'évapore | reprendre le tirage, triple tirage |
| Remonte **régulièrement sans s'arrêter** | **fuite** | retour à l'essai d'étanchéité à l'azote |

Le **triple tirage** (triple évacuation) sèche un circuit humide :
- tirer au vide une première fois ;
- **casser le vide à l'azote sec** jusqu'à une légère surpression ; l'azote absorbe l'humidité ;
- relâcher l'azote et recommencer, trois fois au total ;
- dernier tirage jusqu'à l'objectif, puis essai de remontée.

Si le vide plafonne autour de quelques mbar sans jamais descendre, isolez le circuit et lisez le vide **à la pompe** : une huile contaminée peut limiter la pompe elle-même.

Après un tirage réussi, on casse le vide avec le fluide (charge) ou à l'azote sec. Ne laissez jamais un circuit sous vide ouvert à l'air.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- Test de pression = **azote OFN + détendeur**. Jamais d'oxygène, jamais de fluide frigorigène.
- Électrovanne **ouverte** pendant les essais et le tirage.
- Correction : **P₂ = P₁ × T₂ / T₁** en **bar abs** et en **kelvins**.
- Vide : vacuomètre **côté circuit**, deux côtés raccordés, objectif **≤ 2 mbar** (500 microns en pratique).
- Remontée : **palier = humidité**, **montée continue = fuite**.
- **Isoler la pompe avant de l'arrêter.**
- Consigner pressions, températures, durées et résultat (item 3.05).`,
    },
    {
      title: 'Erreurs fréquentes',
      body: `- Faire la correction de température en bar rel ou en °C : le résultat est faux. Avec 20 °C → 12 °C, la formule en °C donnerait une chute de 40 % !
- Conclure à une fuite parce que la pression a baissé pendant une nuit fraîche, ou à l'absence de fuite parce qu'elle a monté au soleil.
- Brancher la bouteille d'azote sans détendeur.
- Tester avec l'électrovanne fermée : une partie du circuit n'est pas testée.
- Démarrer la pompe à vide sur un circuit encore sous azote : huile projetée, pompe abîmée.
- Arrêter la pompe avant de l'isoler : l'huile de la pompe remonte dans le flexible et le vide est perdu.
- Lire le vide au vacuomètre placé sur la pompe : on mesure la pompe, pas le circuit.
- Sauter l'essai de remontée : un tirage sans remontée n'est pas un tirage validé.`,
    },
  ],
};

export default lesson;
