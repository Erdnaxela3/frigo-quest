# Levels

| # | Level | Main skills | Phase |
|---|---|---|---|
| L00 | [Labo des gaz (sandbox)](L00-labo-des-gaz.md) | 1.01–1.03, 1.07, 5.02 | 1 |
| L01 | [Raccorder le manifold et lire l'installation](L01-raccordement-manifold.md) | 5.01, 1.03, 6.04 | 1 |
| L02 | [Contrôle d'étanchéité périodique](L02-controle-etancheite.md) | 4.01–4.09, 2.02 | 1 |
| L03 | [Test de pression à l'azote](L03-test-pression-azote.md) | 3.01, 3.02, 3.05, 12.08 | 1 |
| L04 | [Tirage au vide](L04-tirage-au-vide.md) | 3.03, 3.04, 12.09, CAP EP3 | 1 |
| L05 | [Récupération du fluide](L05-recuperation.md) | 5.02, 5.03, 5.07, 5.08 | 1 |
| L06 | [Charge en fluide](L06-charge.md) | 5.02, 5.05, 5.06, CAP EP3 | 2 |
| L07 | [Mise en service et réglage des pressostats](L07-mise-en-service-pressostats.md) | 6.03, 6.06, 9.04, 9.06, CAP EP3 | 2 |
| L08 | [Remplacer un détendeur thermostatique Danfoss](L08-detendeur-danfoss.md) | 9.01–9.03, 12.07, 10.01 | 2 |
| L09 | [Pump-down et remplacement du filtre déshydrateur](L09-filtre-pump-down.md) | 6.04, 9.08, 10.01 | 2 |
| L10 | [Compresseur grillé et huile contaminée](L10-compresseur-huile.md) | 5.04, 6.02, 6.05, 6.06 | 2 |
| L11 | [Incondensables](L11-incondensables.md) | 7.06, 7.07, 1.03 | 3 |
| L12 | [Diagnostic de pannes](L12-diagnostic.md) | groups 6–9, 4.04 | 3 |
| L13 | [Intervention sur R290](L13-r290.md) | group 12, 1.08, 5.09, 11.05 | 3 |
| L14 | [Traçabilité : fiche d'intervention et déchets](L14-tracabilite.md) | 3.05, 4.09, 5.07, 5.08 | 3 |
| L15 | [Régulateurs de pression KVP / KVR](L15-regulateurs-pression.md) | 7.02, 8.02, 8.07, 9.05 | 3 |

Every level follows the structure in [04-game-mechanics.md](../04-game-mechanics.md): briefing, objectives, rules (mistakes), hints, 3 challenges (guidé / standard / examen), perfect-run test.

Scenes:
- **PLATINE** (primary, phase 1) — **vertical wooden training board** (platine didactique, 1200 × 900 mm), R32, every component exposed and labelled, laid out as a split system unrolled on the board:
  - left half "unité extérieure": hermetic rotary/scroll **compresseur** (with crankcase heater), **condenseur** à ailettes + ventilateur, **réservoir liquide**, **filtre déshydrateur**, **voyant liquide**, **vanne de service liquide 2 voies** (Schrader) and **vanne de service gaz 3 voies** (Schrader + 3 positions), **pressostats HP (KP5) / BP (KP1)**, Schrader HP on discharge;
  - right half "unité intérieure": **électrovanne** liquide, **détendeur thermostatique Danfoss** (TE2-type, bulbe + égalisation externe) with a **capillaire** bypass option, **évaporateur** à ailettes + ventilateur, **thermostat** d'ambiance;
  - copper lines drawn on the board (liquid ¼", suction ⅜"), clamps, fixed manometers optional, electrical box at the bottom (sectionneur, contacteur, transfo 24 V) — wiring is lessons-only for now;
  - charge 1.2 kg R32 (GWP 675 → 0.81 t CO₂e — below the 5 t threshold, used in L02 to teach the exemption; the CF scene covers the "checks required" case).
  Levels L01–L09, L11, L12 use PLATINE by default; CF is the alternative scene where noted.
- **CF** — chambre froide positive (+2 °C), groupe de condensation hermétique, réservoir liquide, vannes de service 3 voies BP/HP, vanne départ liquide, filtre déshydrateur, voyant, électrovanne, détendeur thermostatique Danfoss TE2, évaporateur ventilé, pressostats KP1/KP5, thermostat. Fluid R449A (GWP 1396) or R404A (legacy, GWP 3922). Charge 6 kg. Mirrors the CAP EP3 bench.
- **SPLIT** — split mural R32 3.5 kW, unité extérieure avec vannes 2 voies (liquide) / 3 voies (gaz) + Schrader, précharge 1.1 kg pour 7.5 m.
- **R290** — vitrine réfrigérée plug-in R290, 150 g, tubes de process.
- **BANC** — établi (bouteilles, station, balance) for L00 and parts of L05.
