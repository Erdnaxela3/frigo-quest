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
| R449A | 1396 | HFC/HFO, mélange zéotrope |
| R32 | 675 | HFC pur, A2L |
| R1234yf | 4 | HFO, A2L |
| R290 (propane) | 3 | Hydrocarbure, A3 |
| R744 (CO₂) | 1 | Fluide naturel |

Le règlement (UE) 2024/573 prend les valeurs du 4e rapport du GIEC pour les HFC (celles du tableau) et du 6e rapport pour les HFO : il donne **0,501** pour le R1234yf, que le jeu arrondit à l'ancienne valeur 4.

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
- **Étiquetage** (art. 12) : l'étiquette indique la présence de gaz fluorés, le nom du fluide, la charge **en kg et en t CO₂e** et, s'il y a lieu, la mention « hermétiquement scellé ». Elle se place près des vannes de service. Après un changement de fluide, on refait l'étiquette.
- **Certification** : seuls les techniciens certifiés manipulent les fluides, et seules les entreprises qui les emploient peuvent en acheter (art. 11). Les bouteilles non rechargeables sont interdites.

**Interdictions de mise sur le marché** (annexe IV) des appareils neufs, sauf si des exigences de sécurité sur le site l'imposent :

| Équipement | Interdit si | Depuis / à partir du |
|---|---|---|
| Split (bi-bloc) de moins de 3 kg | PRP ≥ 750 | 1er janvier 2025 |
| Froid autonome (vitrine *plug-in*…), hors refroidisseurs | PRP ≥ 150 | 1er janvier 2025 |
| Froid hors refroidisseurs et hors autonome | PRP ≥ 2500, puis PRP ≥ 150 | 2025, puis 2030 |
| Réfrigérateurs et congélateurs ménagers | tout gaz fluoré | 1er janvier 2026 |
| Clim et PAC monobloc ou autonome jusqu'à 50 kW | PRP ≥ 150 | 1er janvier 2027 |
| Split air-eau ≤ 12 kW | PRP ≥ 150 | 1er janvier 2027 |
| Split air-air ≤ 12 kW | PRP ≥ 150 | 1er janvier 2029 |
| Split > 12 kW | PRP ≥ 750, puis PRP ≥ 150 | 2029, puis 2033 |
| Clim et PAC autonome ≤ 12 kW | tout gaz fluoré | 1er janvier 2032 |
| Split ≤ 12 kW | tout gaz fluoré | 1er janvier 2035 |

**Interdictions d'entretien** (art. 13) avec du fluide **vierge** :
- PRP ≥ 2500 (R404A, R507A) en **froid** : interdit depuis le **1er janvier 2025**, quelle que soit la charge. Le fluide **régénéré ou recyclé** reste autorisé jusqu'au **1er janvier 2030**. Le froid sous −50 °C et le matériel militaire sont exemptés.
- PRP ≥ 2500 en **climatisation et pompes à chaleur** : interdit depuis le **1er janvier 2026**. Régénéré ou recyclé autorisé jusqu'au **1er janvier 2032**.
- PRP ≥ 750 en **froid fixe, hors refroidisseurs** : interdit à partir du **1er janvier 2032**. Le régénéré et le recyclé restent autorisés, sans date de fin.
- « Recyclé » : seule l'entreprise qui a récupéré le fluide peut le réutiliser, et sur le même type d'équipement. « Régénéré » : la bouteille porte une étiquette avec le lot et l'installation de régénération.

En France, le règlement est complété par le **code de l'environnement** (l'article R.543-106 fonde l'attestation d'aptitude) et par des arrêtés. Les déchets d'équipements électriques (**DEEE**) et l'**écoconception** font aussi partie de l'item 1.00 : un appareil en fin de vie doit être vidé de son fluide par une entreprise habilitée avant d'entrer dans la filière DEEE.`,
    },
    {
      title: 'Calculer la charge en t CO₂e et la fréquence de contrôle',
      body: `La fréquence des contrôles d'étanchéité ne dépend plus des kilos mais des **tonnes équivalent CO₂** :

**t CO₂e = masse (kg) × PRP / 1000**

Exemple : chambre froide au R404A, 8 kg → 8 × 3922 / 1000 = **31,4 t CO₂e**.

Fréquences fixées par l'article 5 du règlement (UE) 2024/573 :

| Charge | Sans détection de fuite | Avec système de détection |
|---|---|---|
| HFC < 5 t CO₂e · HFO < 1 kg | pas de contrôle périodique | — |
| HFC ≥ 5 et < 50 t CO₂e · HFO ≥ 1 et < 10 kg | 12 mois | 24 mois |
| HFC ≥ 50 et < 500 t CO₂e · HFO ≥ 10 et < 100 kg | 6 mois | 12 mois |
| HFC ≥ 500 t CO₂e · HFO ≥ 100 kg | 3 mois | 6 mois (détection obligatoire) |

Autres règles :
- Nouveauté F-Gas III : les **HFO** (gaz de l'annexe II, section 1, comme le R1234yf) se comptent **au kilo**, pas en t CO₂e.
- Équipements **hermétiquement scellés et étiquetés comme tels** : exemptés sous 10 t CO₂e de HFC ou sous 2 kg de HFO. Dans les **logements**, l'exemption va jusqu'à 3 kg de gaz fluoré.
- Le système de détection de fuites est lui-même contrôlé au moins tous les 12 mois.
- En France (art. R. 543-79), un contrôle est aussi dû **à la mise en service** (au-delà de 5 t CO₂e) et **après toute modification** du circuit.
- Après réparation d'une fuite, on refait un contrôle **au plus tôt 24 h et au plus tard 1 mois** après la réparation.
- Détecteur électronique : sensibilité d'au moins 5 g/an, vérifiée au moins une fois tous les 12 mois.

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
- Titulaire d'une ancienne catégorie I à IV : **remise à niveau ponctuelle avant le 12 mars 2029** (I → A1, II → A2, III → D, IV → E ; au moins 3 h 30 pour I → A1). Sinon l'ancienne attestation tombe et il faut repasser l'examen complet.
- Jusque-là, l'ancienne attestation reste valable **dans son périmètre d'origine**, les gaz fluorés. Elle ne couvre pas les hydrocarbures. Pour le CO₂ et l'ammoniac, une tolérance court jusqu'au 31 décembre 2028 pour les titulaires d'une cat. 1, 2, A1 ou A2 dont l'employeur atteste l'expérience.
- Ensuite, **remise à niveau au moins tous les 7 ans** à compter de la délivrance. En cas d'oubli, l'attestation est suspendue ; au-delà de 3 ans de retard, retour à l'examen complet.

L'examen A1 comprend de la théorie et de la pratique : tronc commun (1 h théorie + 2 h pratique) et partie spécifique A1 (15 min théorie + 1 h pratique), soit **4 h 15**. Il couvre les groupes 1, 2, 3, 4, 5, 10, 11, 12 et **au moins un groupe parmi 6, 7, 8 ou 9**, que le candidat ne connaît pas à l'avance. La théorie comporte au moins une question sur le CO₂ et l'ammoniac, et une sur l'efficacité énergétique. L'arrêté ne fixe pas de note minimale : le jeu prend 70 % par défaut.`,
    },
    {
      title: 'Attestation de capacité, traçabilité et déchets',
      body: `Ne confondez pas les deux documents :

| | Attestation d'**aptitude** | Attestation de **capacité** |
|---|---|---|
| Qui | La **personne** (technicien) | L'**entreprise** |
| Délivrée par | Organisme évaluateur certifié, après examen | Organisme agréé |
| Validité | Remise à niveau tous les 7 ans | 5 ans maximum, une par établissement |
| Sert à | Manipuler le fluide | Acheter le fluide, intervenir chez un client |

Pour obtenir l'attestation de capacité, **chaque personne** qui manipule les fluides pour l'entreprise doit détenir une attestation d'aptitude adaptée (art. R. 543-106), et l'entreprise doit avoir l'outillage approprié.

**Traçabilité de chaque intervention :**
- **Fiche d'intervention Cerfa n° 15497\\*04**, en vigueur depuis juillet 2024. Elle indique : l'opérateur et son **numéro d'attestation de capacité**, le détenteur, l'équipement (fluide, charge en kg et en t CO₂e), la nature de l'intervention, le détecteur utilisé et la date de son contrôle, le résultat du contrôle d'étanchéité, chaque fuite (réparée ou à faire), les quantités chargées (vierge, recyclé, régénéré), les quantités récupérées (à traiter, avec le n° de BSFF, ou à réintroduire), la bouteille et l'installation de destination.
- La fiche est **signée par l'opérateur et par le détenteur**, qui garde l'original. Sous 5 t CO₂e, la signature du détenteur n'est pas exigée. Opérateur et détenteur en gardent chacun un exemplaire **au moins 5 ans**.
- **Registre de l'équipement**, tenu par le détenteur et conservé au moins 5 ans.
- Après un contrôle d'étanchéité sans fuite : **pastille bleue** (disque d'au moins 4 cm) avec la date limite de validité du contrôle. Passé cette date, on ne recharge plus. Si une fuite ne peut pas être réparée sur-le-champ : **pastille rouge** « défaut d'étanchéité », collée sur la bleue. Sous 4 jours ouvrés, il faut stopper la fuite, ou arrêter et vidanger l'équipement.

**Déchets :** le fluide récupéré part chez le distributeur, qui le reprend sans frais, pour **régénération** ou **destruction** dans une installation autorisée. Il faut le remettre au plus tard un an après l'intervention. Le suivi se fait par le **BSFF** (bordereau de suivi des déchets de fluides frigorigènes), obligatoire sur **Trackdéchets** depuis le 1er janvier 2023. C'est l'opérateur qui collecte le fluide qui émet le bordereau. Les huiles usagées sont aussi des déchets dangereux.

**Sanctions :** le dégazage volontaire est interdit, sauf pour la sécurité des personnes. Il est puni, comme la recharge d'un équipement qui fuit, l'absence de récupération ou l'absence de contrôle d'étanchéité, d'une **contravention de 5e classe** : jusqu'à 1 500 €, 3 000 € en récidive, et 5 fois plus pour une entreprise.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- **t CO₂e = kg × PRP / 1000**. Seuils : **5 / 50 / 500** → **12 / 6 / 3 mois**, durée doublée avec un système de détection de fuite. HFO : **1 / 10 / 100 kg**.
- Entretien au fluide vierge de PRP ≥ 2500 : interdit en froid depuis **2025**, en clim/PAC depuis **2026**.
- F-Gas III = règlement **(UE) 2024/573**, applicable depuis le **11 mars 2024**, sortie des HFC en **2050**.
- Certification des personnes : règlement d'exécution **(UE) 2024/2215** et **arrêté du 21 novembre 2025**.
- **A1 = ex-catégorie I + hydrocarbures**. Nouvelles catégories obligatoires au **1er janvier 2027**.
- Remise à niveau des anciens titulaires avant le **12 mars 2029**, puis **tous les 7 ans**.
- Aptitude = personne ; capacité = entreprise.
- Chaque intervention → **fiche Cerfa 15497\\*04**, gardée 5 ans ; chaque déchet de fluide → **BSFF sur Trackdéchets**.
- HFO : PRP faible mais produit de dégradation **TFA** (PFAS).`,
    },
    {
      title: 'Erreurs fréquentes',
      body: `- **Raisonner en kilos** pour la fréquence des contrôles HFC : depuis 2015, c'est la t CO₂e qui compte. 8 kg de R404A (31,4 t) et 8 kg de R32 (5,4 t) n'ont pas les mêmes enjeux, même si les deux sont ici à 12 mois.
- Oublier de **diviser par 1000** : on obtient des « kg CO₂e », pas des tonnes.
- Croire qu'un fluide **régénéré** est soumis aux mêmes interdictions que le fluide vierge : pour le PRP ≥ 2500, il reste autorisé jusqu'en 2030 (froid) ou 2032 (clim/PAC).
- Calculer la t CO₂e d'un **HFO** pur : ses seuils de contrôle se lisent en kilos.
- Penser que l'ancienne catégorie I reste valable indéfiniment : sans remise à niveau avant le **12 mars 2029**, elle tombe.
- Confondre aptitude et capacité, ou 7 ans (remise à niveau des personnes) et 5 ans (attestation de capacité, conservation des documents).
- Dire que les HFC détruisent l'ozone : ce sont les CFC et HCFC (chlore). Les HFC sont visés pour l'**effet de serre**.`,
    },
  ],
};

export default lesson;
