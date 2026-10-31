import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'reglementation',
  title: 'Réglementation F-Gas III et nouvelles attestations',
  skills: ['A1:1.00', 'A1:2.01', 'A1:2.02'],
  sections: [
    {
      title: 'Pourquoi les gaz fluorés sont réglementés',
      body: `Les HFC (R404A, R410A, R134a, R32…) ne détruisent pas la couche d'ozone, contrairement aux CFC et HCFC (R12, R22) interdits depuis le protocole de Montréal. Mais ce sont de **puissants gaz à effet de serre** : 1 kg de R404A rejeté réchauffe autant que près de 4 tonnes de CO₂.

On mesure cet effet par le **PRP** (potentiel de réchauffement planétaire, en anglais GWP), calculé sur 100 ans par rapport au CO₂ (PRP = 1).

| Fluide | PRP (valeur du jeu) | Famille |
|---|---|---|
| R404A | 3922 | HFC, mélange |
| R410A | 2088 | HFC, mélange |
| R407C | 1774 | HFC, mélange zéotrope |
| R134a | 1430 | HFC pur |
| R449A | 1397 | HFC/HFO, mélange zéotrope |
| R32 | 675 | HFC pur, A2L |
| R1234yf | 4 | HFO, A2L |
| R290 (propane) | 3 | Hydrocarbure, A3 |
| R744 (CO₂) | 1 | Fluide naturel |

Le cadre international :
- **Protocole de Montréal** (1987) : CFC puis HCFC éliminés.
- **Amendement de Kigali** (2016) : réduction progressive (*phase-down*) des HFC.
- **Accord de Paris** (2015) : neutralité carbone visée par l'UE en 2050.

Les HFO comme le R1234yf ont un PRP très faible, mais se dégradent dans l'atmosphère en **acide trifluoroacétique (TFA)**, un PFAS très persistant. C'est le sens de l'item 2.02 : un PRP bas ne veut pas dire « sans impact ».`,
    },
    {
      title: 'Le règlement F-Gas III (UE) 2024/573',
      body: `Le règlement **(UE) 2024/573**, dit F-Gas III, s'applique depuis le **11 mars 2024**. Il remplace le règlement 517/2014. Ce qu'il faut savoir pour l'examen :

- **Quotas** : les quantités de HFC mises sur le marché européen diminuent par paliers jusqu'à une **sortie complète en 2050**. Le fluide devient plus rare et plus cher : chaque kilo récupéré compte.
- **Interdiction d'émission** : tout rejet volontaire est interdit. Le fluide doit être **récupéré** lors de l'entretien, de la réparation et du démantèlement.
- **Contrôles d'étanchéité** obligatoires selon la charge en **t CO₂e** (voir section suivante).
- **Interdictions de mise sur le marché** d'équipements neufs selon le PRP et le type d'appareil, par exemple les petits splits < 3 kg avec PRP ≥ 750 depuis le 1er janvier 2025, puis un durcissement en 2027, 2029 et 2035 (calendrier détaillé **à vérifier**, les sources divergent).
- **Interdictions d'entretien** : les fluides **vierges** de PRP ≥ 2500 (R404A, R507A) sont interdits pour l'entretien des installations de froid ; les fluides **recyclés ou régénérés** restent tolérés pour un temps (dates exactes et seuils de charge **à vérifier**).
- **Certification** : seuls les techniciens certifiés manipulent les fluides, et seules les entreprises certifiées peuvent en acheter.

En France, le règlement est complété par le **code de l'environnement** (l'article R.543-106 fonde l'attestation d'aptitude) et par des arrêtés. Les déchets d'équipements électriques (**DEEE**) et l'**écoconception** font aussi partie de l'item 1.00 : un appareil en fin de vie doit être vidé de son fluide par une entreprise habilitée avant d'entrer dans la filière DEEE.`,
    },
    {
      title: 'Calculer la charge en t CO₂e et la fréquence de contrôle',
      body: `La fréquence des contrôles d'étanchéité ne dépend plus des kilos mais des **tonnes équivalent CO₂** :

**t CO₂e = masse (kg) × PRP / 1000**

Exemple : chambre froide au R404A, 8 kg → 8 × 3922 / 1000 = **31,4 t CO₂e**.

Fréquences pour les HFC (sources secondaires concordantes, texte officiel **à vérifier**) :

| Charge | Sans détection de fuite | Avec système de détection |
|---|---|---|
| < 5 t CO₂e | pas de contrôle périodique | — |
| ≥ 5 et < 50 t CO₂e | 12 mois | 24 mois |
| ≥ 50 et < 500 t CO₂e | 6 mois | 12 mois |
| ≥ 500 t CO₂e | 3 mois | 6 mois (détection obligatoire) |

Autres règles :
- Les équipements **hermétiquement scellés** et étiquetés de moins de 10 t CO₂e sont exemptés (à vérifier).
- Nouveauté F-Gas III : les **HFO** (gaz de l'annexe II) entrent dans le champ **au kilo** : ≥ 1 kg → 12 mois, ≥ 10 kg → 6 mois, ≥ 100 kg → 3 mois (à vérifier).
- Un contrôle est aussi dû à la mise en service et après toute modification du circuit (à vérifier).

Essayez avec le calculateur : 2,4 kg de R410A donnent 5,01 t CO₂e, donc un contrôle tous les 12 mois. 3 kg de R134a donnent 4,29 t CO₂e : pas de contrôle périodique obligatoire.`,
      widget: 'tco2e',
    },
    {
      title: 'Les nouvelles attestations d\'aptitude',
      body: `Le règlement d'exécution **(UE) 2024/2215** fixe les exigences minimales de certification des personnes. En France, il est transposé par l'**arrêté du 21 novembre 2025** (publié au JO du 10 décembre 2025). Les anciennes catégories I à IV sont remplacées :

| Nouvelle | Ancienne | Périmètre |
|---|---|---|
| **A1** | I | Gaz fluorés **et hydrocarbures**, tous équipements |
| A2 | II | Idem, équipements < 3 kg (< 6 kg si hermétique et étiqueté) |
| B | — | CO₂ (R744) |
| C | — | Ammoniac (R717) |
| D | III | Récupération seule, < 3 kg (< 6 kg hermétique) |
| E | IV | Contrôle d'étanchéité sans intervention sur le circuit |
| V | — | Climatisation des véhicules |

Les dates clés :
- Arrêté en vigueur le **11 décembre 2025**, nouvelles catégories **obligatoires au 1er janvier 2027**. L'arrêté du 13 octobre 2008 est abrogé au 31 décembre 2026.
- Titulaire d'une ancienne catégorie I à IV : **remise à niveau avant le 12 mars 2029** pour obtenir A1, A2, D ou E. Sinon l'ancienne attestation tombe et il faut repasser l'examen complet.
- Pendant la transition, un titulaire de cat. I peut continuer à travailler, y compris sur les nouveaux fluides, jusqu'au 12 mars 2029 (à vérifier).
- Ensuite, **remise à niveau au moins tous les 7 ans**. En cas d'oubli, l'attestation est suspendue ; au-delà de 3 ans de retard, retour à l'examen complet.

L'examen A1 comprend de la théorie et de la pratique : tronc commun (1 h théorie + 2 h pratique) et partie spécifique A1 (15 min théorie + 1 h pratique), soit **4 h 15**. Il couvre les groupes 1, 2, 3, 4, 5, 10, 11, 12 et **un groupe parmi 6, 7, 8 ou 9** tiré par l'examinateur. La théorie comporte au moins une question sur le CO₂ et l'ammoniac, et une sur l'efficacité énergétique.`,
    },
    {
      title: 'Attestation de capacité, traçabilité et déchets',
      body: `Ne confondez pas les deux documents :

| | Attestation d'**aptitude** | Attestation de **capacité** |
|---|---|---|
| Qui | La **personne** (technicien) | L'**entreprise** |
| Délivrée par | Organisme évaluateur certifié, après examen | Organisme agréé |
| Validité | Remise à niveau tous les 7 ans | 5 ans (à vérifier) |
| Sert à | Manipuler le fluide | Acheter le fluide, intervenir chez un client |

L'entreprise doit employer au moins une personne titulaire d'une attestation d'aptitude valide pour obtenir l'attestation de capacité (à vérifier).

**Traçabilité de chaque intervention :**
- **Fiche d'intervention Cerfa n° 15497** : fluide, charge, quantités récupérées et ajoutées, résultat du contrôle d'étanchéité, intervenant. Signée par l'opérateur (le détenteur) et l'entreprise (à vérifier).
- **Registre de l'équipement** tenu par le détenteur, conservé **5 ans** (à vérifier).
- Après un contrôle d'étanchéité : **étiquette** indiquant la date du prochain contrôle ; marquage « défaut d'étanchéité » si la fuite n'est pas réparée immédiatement (à vérifier).

**Déchets :** le fluide récupéré part chez le distributeur pour **régénération** ou **destruction** dans une installation autorisée (rubrique ICPE 2790). Le suivi se fait par le **BSFF** (bordereau de suivi des fluides frigorigènes), dématérialisé sur **Trackdéchets** (à vérifier pour les modalités). Les huiles usagées sont aussi des déchets dangereux.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- **t CO₂e = kg × PRP / 1000**. Seuils : **5 / 50 / 500** → **12 / 6 / 3 mois**, durée doublée avec un système de détection de fuite.
- F-Gas III = règlement **(UE) 2024/573**, applicable depuis le **11 mars 2024**, sortie des HFC en **2050**.
- Certification des personnes : règlement d'exécution **(UE) 2024/2215** et **arrêté du 21 novembre 2025**.
- **A1 = ex-catégorie I + hydrocarbures**. Nouvelles catégories obligatoires au **1er janvier 2027**.
- Remise à niveau des anciens titulaires avant le **12 mars 2029**, puis **tous les 7 ans**.
- Aptitude = personne ; capacité = entreprise.
- Chaque intervention → **fiche Cerfa 15497** ; chaque déchet de fluide → **BSFF sur Trackdéchets**.
- HFO : PRP faible mais produit de dégradation **TFA** (PFAS).`,
    },
    {
      title: 'Erreurs fréquentes',
      body: `- **Raisonner en kilos** pour la fréquence des contrôles HFC : depuis 2015, c'est la t CO₂e qui compte. 8 kg de R404A (31,4 t) et 8 kg de R32 (5,4 t) n'ont pas les mêmes enjeux, même si les deux sont ici à 12 mois.
- Oublier de **diviser par 1000** : on obtient des « kg CO₂e », pas des tonnes.
- Croire qu'un fluide **régénéré** est soumis aux mêmes interdictions que le fluide vierge : les interdictions d'entretien visent d'abord le vierge.
- Penser que l'ancienne catégorie I reste valable indéfiniment : sans remise à niveau avant le **12 mars 2029**, elle tombe.
- Confondre aptitude et capacité, ou 7 ans (remise à niveau des personnes) et 5 ans (attestation de capacité, conservation des documents).
- Dire que les HFC détruisent l'ozone : ce sont les CFC et HCFC (chlore). Les HFC sont visés pour l'**effet de serre**.`,
    },
  ],
};

export default lesson;
