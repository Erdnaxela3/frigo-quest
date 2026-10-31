import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'circuit',
  title: 'Le circuit frigorifique et ses composants',
  skills: ['A1:1.04', 'A1:1.05', 'A1:6.03', 'A1:6.04', 'A1:9.06', 'CAP:UP3.reglage'],
  sections: [
    {
      title: 'Les quatre organes principaux',
      body: `Tout circuit à compression de vapeur repose sur quatre organes. Le fluide les traverse en boucle et change d'état deux fois.

| Organe | Entrée | Sortie | Rôle |
|---|---|---|---|
| **Compresseur** | vapeur BP surchauffée | vapeur HP très chaude | aspire et comprime, fait circuler le fluide |
| **Condenseur** | vapeur HP | liquide HP sous-refroidi | rejette la chaleur vers l'air ou l'eau |
| **Détendeur** | liquide HP | mélange BP froid | abaisse la pression et dose le débit |
| **Évaporateur** | mélange BP | vapeur BP surchauffée | absorbe la chaleur de la chambre |

On parle de **côté HP** (refoulement, condenseur, ligne liquide jusqu'au détendeur) et de **côté BP** (sortie détendeur, évaporateur, aspiration). Le compresseur et le détendeur sont les deux frontières.

Le compresseur ne doit aspirer **que de la vapeur** : le liquide est incompressible et casse les clapets (coup de liquide). C'est le rôle de la surchauffe.`,
    },
    {
      title: 'Les composants annexes',
      body: `Autour des quatre organes, on trouve des composants qui protègent, stockent ou contrôlent :

- **Bouteille liquide (réservoir)** : en sortie de condenseur, stocke le fluide liquide et absorbe les variations de charge. Permet le *pump-down*.
- **Filtre déshydrateur** : sur la ligne liquide, retient l'humidité, les acides et les particules. Un écart de température entre son entrée et sa sortie signale qu'il est **obstrué**.
- **Voyant liquide** : montre si le liquide arrive sans bulles au détendeur. Sa pastille change de couleur en présence d'humidité.
- **Électrovanne liquide** : coupe la ligne liquide à l'arrêt (régulation par pump-down).
- **Détendeur thermostatique** : son **bulbe**, fixé sur l'aspiration en sortie d'évaporateur, règle l'ouverture pour maintenir une surchauffe constante. Égalisation externe sur les évaporateurs à forte perte de charge. Variantes : **capillaire** (petits appareils), **détendeur électronique** piloté par sondes.
- **Séparateur d'huile** : au refoulement, renvoie l'huile au carter.
- **Bouteille anti-coup de liquide** : à l'aspiration, piège le liquide avant le compresseur.
- **Clapet anti-retour**, **vannes manuelles** d'isolement, **vannes de service** (voir plus bas).

Chaque raccord, brasure, presse-étoupe ou capillaire est un **point de fuite potentiel**.`,
    },
    {
      title: 'Organes de régulation et de sécurité',
      body: `L'item 1.05 demande de distinguer ce qui **régule** (fonctionnement normal) de ce qui **protège** (défaut).

| Organe | Type | Fonction |
|---|---|---|
| Thermostat d'ambiance | régulation | commande l'électrovanne ou le compresseur selon la température de la chambre |
| Pressostat BP | régulation (souvent) | arrête le compresseur quand la BP descend (pump-down), le relance quand elle remonte |
| Pressostat HP | **sécurité** | coupe si la HP dépasse le seuil, souvent à **réarmement manuel** |
| Limiteur de pression | **sécurité** | pressostat de sécurité certifié, réarmement manuel avec outil (à vérifier selon EN 378) |
| Pressostat d'huile différentiel | sécurité | coupe si la pression d'huile est insuffisante |
| Soupape de sécurité | **sécurité ultime** | rejette le fluide si la pression atteint la PS, protège contre l'éclatement |
| Bouchon fusible | sécurité | fond en cas d'incendie |
| Régulateur de pression de condensation | régulation | maintient une HP minimale en hiver |
| Régulateur de pression d'évaporation | régulation | maintient une BP minimale |

Ordre logique des seuils côté HP : **pressostat HP < limiteur < soupape ≤ PS**. Une soupape qui s'ouvre signifie qu'aucune sécurité électrique n'a fonctionné : c'est un défaut grave, et une émission à déclarer.`,
    },
    {
      title: 'Les vannes de service à trois positions',
      body: `La vanne de service (vanne Rotalock ou vanne à tige) se trouve à l'aspiration et au refoulement des compresseurs semi-hermétiques, ou sur la bouteille liquide. Elle a **trois voies** : la ligne, le compresseur (ou l'appareil), et la **prise de pression** pour le manifold.

| Position | Tige | Ligne ↔ compresseur | Prise de pression | Usage |
|---|---|---|---|---|
| **Contre-siège arrière** | dévissée à fond | ouvert | **fermée** | fonctionnement normal, raccorder/déconnecter le flexible |
| **Intermédiaire** | ¼ à ½ tour vissée | ouvert | ouverte | mesure, charge, tirage au vide |
| **Contre-siège avant** | vissée à fond | **fermé** | ouverte côté compresseur | isoler le compresseur (remplacement, récupération) |

Règles de manœuvre :
- On raccorde le flexible **en contre-siège arrière**, puis on décolle d'un quart à un demi-tour.
- **Jamais de contre-siège avant à l'aspiration compresseur en marche** : il tire au vide.
- Jamais de contre-siège avant au **refoulement** compresseur en marche : la pression monte sans limite, risque d'éclatement.
- Après usage : retour en contre-siège arrière, **bouchon de tige et bouchon de prise** remis.

Les splits n'ont souvent qu'une prise Schrader sur la vanne 3 voies de la ligne gaz : la vanne s'ouvre à la clé six pans, la prise est toujours sous pression.

Manipulez la vanne animée et observez quel passage s'ouvre à chaque position.`,
      widget: 'service-valve',
    },
    {
      title: 'Régler un pressostat',
      body: `Un pressostat compare la pression à deux seuils : **enclenchement** (*cut-in*) et **coupure** (*cut-out*). L'écart entre les deux est le **différentiel** (*diff*).

Sur les pressostats à cadran courants (type Danfoss KP), on règle **une échelle principale** et le **différentiel** :
- **Pressostat BP** : l'échelle principale fixe l'**enclenchement**. **Coupure = enclenchement − différentiel**.
- **Pressostat HP** : l'échelle principale fixe la **coupure**. **Enclenchement = coupure − différentiel**.

Exemple BP : enclenchement 2,0 bar rel, différentiel 1,0 bar → coupure à 1,0 bar rel. Le compresseur s'arrête à 1,0 bar et repart quand la BP remonte à 2,0 bar.

Méthode de réglage d'un pressostat BP de régulation (pump-down) :
- Coupure : une pression **sous la BP de fonctionnement normal**, pour que la machine ne s'arrête pas en marche.
- Enclenchement : une pression qui correspond à une température de saturation **proche de la température de la chambre**, pour que la machine reparte quand l'électrovanne rouvre.
- Vérifier le réglage **au manifold**, pas seulement à l'échelle du cadran, qui est indicative.

Les valeurs exactes viennent du dossier technique (à adapter à chaque installation). Ce réglage vaut **30 % de la note** de l'épreuve EP3 du CAP IFCA.

Tournez les molettes et observez les deux seuils.`,
      widget: 'pressostat',
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- Compresseur → condenseur → détendeur → évaporateur. HP du refoulement au détendeur, BP du détendeur à l'aspiration.
- Filtre déshydrateur sur la **ligne liquide** ; écart de température = filtre bouché.
- Bulbe du détendeur thermostatique sur l'aspiration, en sortie d'évaporateur : il régule la **surchauffe**.
- Pressostat HP = **sécurité**, réarmement manuel. Soupape = dernier recours, ouverte = défaut grave.
- Vanne de service : **arrière** = prise fermée, **intermédiaire** = tout ouvert, **avant** = ligne fermée.
- Pressostat BP type KP : coupure = enclenchement − différentiel. HP : enclenchement = coupure − différentiel.`,
    },
    {
      title: 'Erreurs fréquentes',
      body: `- Visser la tige de la vanne d'aspiration à fond compresseur en marche « pour isoler le manifold » : c'est le contre-siège **avant**, pas l'arrière.
- Dévisser le flexible sans avoir remis la vanne en contre-siège arrière : émission de fluide.
- Lire le différentiel comme une valeur absolue : un différentiel de 1 bar n'est pas une coupure à 1 bar.
- Régler la coupure BP au-dessus de la BP de marche : le compresseur fait des cycles courts.
- Confondre bouteille liquide (sortie condenseur, liquide) et bouteille anti-coup de liquide (aspiration, vapeur).
- Shunter un pressostat HP « pour dépanner » : c'est supprimer une sécurité, le risque est l'éclatement.`,
    },
  ],
};

export default lesson;
