import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'substitution',
  title: 'Fluides alternatifs : HFO, hydrocarbures, CO₂, NH₃',
  skills: [
    'A1:1.06', 'A1:1.07', 'A1:1.08', 'A1:2.02',
    'A1:11.01', 'A1:11.02', 'A1:11.03', 'A1:11.04', 'A1:11.05',
  ],
  sections: [
    {
      title: 'Pourquoi changer de fluide',
      body: `Le règlement F-gas (UE) 2024/573 réduit progressivement les HFC à fort PRP (quotas, interdictions de mise sur le marché, restrictions d'entretien). Les installateurs rencontrent donc de plus en plus de **fluides à faible PRP** : HFO et mélanges HFC/HFO, hydrocarbures (HC), CO₂ et ammoniac.

La nouvelle attestation **A1** couvre les gaz fluorés **et les hydrocarbures**. Le CO₂ relève de la catégorie **B** et l'ammoniac de la catégorie **C**, mais l'examen théorique A1 contient **au moins une question sur le CO₂ et le NH₃** : il faut connaître leurs propriétés et leurs dangers.`,
    },
    {
      title: 'Classes de sécurité (ISO 817 / EN 378)',
      body: `La classe combine une **lettre (toxicité)** et un **chiffre (inflammabilité)**.

| Code | Signification |
|---|---|
| A | toxicité faible |
| B | toxicité plus élevée |
| 1 | pas de propagation de flamme |
| 2L | faiblement inflammable, vitesse de flamme lente (≤ 10 cm/s) |
| 2 | inflammable |
| 3 | très inflammable |

| Fluide | Classe | PRP (règlement 2024/573) | Remarque |
|---|---|---|---|
| R134a | A1 | 1430 | HFC de référence |
| R449A | A1 | 1396 (souvent affiché 1397) | mélange HFC/HFO, glissement ≈ 4 à 5 K |
| R32 | A2L | 675 | splits récents |
| R1234yf | A2L | 0,501 (4 dans les anciennes fiches) | HFO, climatisation auto |
| R290 (propane) | A3 | 0,02 (3 dans les anciennes fiches) | vitrines, PAC monobloc |
| R744 (CO₂) | A1 | 1 | haute pression, transcritique |
| R717 (NH₃) | B2L | 0 | toxique, industrie |

Le règlement F-gas garde pour les HFC saturés (R134a, R32, R125…) les PRP du 4e rapport du GIEC (AR4) ; pour les HFO et les hydrocarbures, il retient des valeurs plus récentes, d'où les PRP quasi nuls du R1234yf et du R290.

La **LFL** (limite inférieure d'inflammabilité) est la concentration minimale qui peut s'enflammer : 0,038 kg/m³ pour le R290, 0,289 kg/m³ pour le R1234yf, 0,307 kg/m³ pour le R32.`,
    },
    {
      title: 'Les familles en détail (1.07, 11.04)',
      body: `### HFO et mélanges HFC/HFO

R1234yf, R1234ze : PRP très faible, souvent **A2L**. Mélanges de remplacement du R404A (R449A, R448A…) : A1, PRP plus bas mais encore soumis au F-gas, **glissement de température** → charge en **phase liquide**, surchauffe calculée sur la température de rosée, sous-refroidissement sur la température de bulle. Les produits de décomposition de certains HFO (acide trifluoroacétique, famille des PFAS) font débat (2.02, à suivre).

### Hydrocarbures

R290 (propane), R600a (isobutane, réfrigérateurs domestiques), R1270 (propylène). Excellentes propriétés thermodynamiques, PRP quasi nul, **très inflammables (A3)**, plus lourds que l'air. Compatibles avec les huiles minérales et POE selon le compresseur.

### CO₂ (R744)

- PRP = 1, non inflammable, non toxique à faible concentration, mais **asphyxiant** et plus lourd que l'air.
- **Point critique bas : 31 °C et 73,8 bar.** Au-dessus de 31 °C en sortie de refroidisseur, il n'y a plus de condensation : le cycle est **transcritique** et le condenseur devient un **refroidisseur de gaz** (gas cooler).
- Pressions très élevées : environ 26 bar abs à −10 °C côté BP, bien plus côté HP. Composants, flexibles et manomètres spécifiques.
- Point triple vers −56,6 °C et 5,2 bar abs : en vidangeant un circuit CO₂, de la **neige carbonique** peut se former et boucher les passages.

### Ammoniac (R717)

- PRP = 0, excellent rendement, utilisé en industrie.
- **Toxique (B2L)**, odeur piquante détectable à très faible concentration, plus léger que l'air.
- **Attaque le cuivre** et ses alliages : installations en acier. Huile généralement non miscible.

### Avantages et inconvénients

| Fluide | Avantages | Inconvénients |
|---|---|---|
| HFO / mélanges | proches des HFC, peu de changements | A2L pour certains, glissement, coût, débat PFAS |
| HC | efficaces, faible charge, PRP ≈ 0 | inflammables : limites de charge, zone ATEX |
| CO₂ | non inflammable, PRP 1, bon en récupération de chaleur | très haute pression, rendement baisse par forte chaleur |
| NH₃ | rendement, PRP 0, bon marché | toxique, incompatible cuivre, salle des machines dédiée |`,
    },
    {
      title: 'Les substituts dans le cycle (1.06)',
      body: `Changer de fluide change le comportement de l'installation :

- **Pressions** différentes à même température : réglages des pressostats à revoir, PS des composants à vérifier.
- **Température de refoulement** différente (le R32 refoule plus chaud que le R410A, par exemple).
- **Glissement** des mélanges zéotropes : charge liquide, lecture bulle/rosée, une fuite modifie la composition (on ne « complète » pas un mélange après une fuite importante).
- **Détendeur** : corps et orifice adaptés au nouveau fluide.
- **Huile** compatible (POE pour HFC/HFO), filtre déshydrateur adapté.
- **Étiquetage** de l'équipement mis à jour avec le nouveau fluide et la nouvelle charge.`,
    },
    {
      title: 'Limites de charge et d\'occupation (1.08)',
      body: `Pour un fluide inflammable, la charge maximale dépend du **volume du local**, de la **hauteur d'installation** et de la **LFL**. Les seuils de la norme EN 378-1 (annexe C) :

| Seuil | Formule | R290 |
|---|---|---|
| m₁ | 4 m³ × LFL | 0,152 kg |
| m₂ | 26 m³ × LFL | 0,988 kg |
| m₃ | 130 m³ × LFL | 4,94 kg |

Pour les climatiseurs et pompes à chaleur de confort (IEC 60335-2-40), la charge maximale dans une pièce de surface A s'estime par :

**m_max = 2,5 × LFL^(5/4) × h₀ × √A**

avec h₀ la hauteur d'installation : 0,6 m au sol, 1,0 m en fenêtre, 1,8 m au mur, 2,2 m au plafond.

Exemple : split R290 mural (h₀ = 1,8 m) dans une chambre de 12 m² : m_max ≈ 2,5 × 0,0168 × 1,8 × 3,46 ≈ **0,26 kg**. Un appareil chargé à 0,4 kg ne convient pas à cette pièce.

Cette formule s'applique sans mesure de sécurité complémentaire. L'IEC 60335-2-40 éd. 7 (2022) permet de monter jusqu'à environ **988 g** de R290 (26 × LFL) dans un split, à condition d'ajouter brassage d'air, détection de fuite et vannes d'arrêt.

Pour les meubles frigorifiques commerciaux monoblocs (IEC 60335-2-89:2019, EN IEC 60335-2-89:2022), la limite historique de **150 g** de R290 par circuit est passée à **13 × LFL ≈ 494 g** (environ 500 g ; 1,2 kg au plus pour les A2L), pour les appareils conçus selon cette édition.

Teste d'autres cas avec le calculateur ci-dessous.`,
      widget: 'r290-limit',
    },
    {
      title: 'Conception à charge réduite et sécurité (11.02, 11.03, 11.05)',
      body: `### Réduire la charge

- Échangeurs à **microcanaux** ou à faible volume interne.
- Lignes courtes : groupes **monoblocs** (plug-in) ou centrales compactes.
- **Systèmes indirects** : le fluide inflammable reste dans un local technique, un fluide secondaire (eau glycolée) distribue le froid.
- Cascades (par exemple CO₂ en basse température).

Une charge réduite diminue à la fois le risque, l'impact en cas de fuite et souvent le coût.

### Règles de sécurité

| Danger | Fluides | Mesures |
|---|---|---|
| Inflammabilité | HC, A2L | supprimer les sources d'inflammation, ventiler, détecteur, outillage adapté |
| Toxicité | NH₃ | détection, ventilation, ARI/masque, salle des machines |
| Haute pression | CO₂ | composants et flexibles adaptés, soupapes |
| Asphyxie | CO₂, tous en local confiné | détection, ventilation |

Les systèmes HC (11.05) diffèrent par : charge limitée, composants électriques sans étincelle ou hors zone, raccords brasés plutôt que démontables, étiquetage spécifique.`,
    },
    {
      title: 'À retenir pour l\'examen',
      body: `- Classe : lettre = toxicité, chiffre = inflammabilité. R290 = **A3**, R32 et R1234yf = **A2L**, CO₂ = **A1**, NH₃ = **B2L**.
- CO₂ : point critique **31 °C / 73,8 bar**, cycle transcritique, refroidisseur de gaz, très hautes pressions, asphyxiant.
- NH₃ : toxique, plus léger que l'air, **pas de cuivre**.
- HC : très inflammables, plus lourds que l'air, LFL R290 = 0,038 kg/m³.
- Limites de charge : m₁ = 4 m³ × LFL, m₂ = 26 m³ × LFL, m₃ = 130 m³ × LFL ; formule IEC 60335-2-40 en 2,5 × LFL^(5/4) × h₀ × √A.
- Mélanges zéotropes : charge liquide, pas d'appoint après une fuite importante.
- A1 = gaz fluorés + HC ; CO₂ = catégorie B ; NH₃ = catégorie C.

### Erreurs fréquentes

- Croire que A2L veut dire « non inflammable ».
- Penser que le CO₂ est sans danger parce qu'il est A1 (pression, asphyxie).
- Confondre la hauteur h₀ (position de l'appareil) avec la hauteur sous plafond.
- Raccorder un manifold cuivre/laiton sur une installation NH₃.
- Garder les réglages de pressostats d'origine après un changement de fluide.`,
    },
  ],
};

export default lesson;
