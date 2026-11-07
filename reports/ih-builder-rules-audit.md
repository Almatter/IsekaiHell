# IH character builder — rules audit

Reviewed 2026-11-07 against the Google rules document and repository commit `132f97b1ee6fcf2833fd42de130b2cd6d54c8eed` (current `main`, also the GitHub Pages publishing source). No application code or live website was changed.

The document's linked tab is Skills. Its text export also exposed the other rules tabs, which were included in this review. The website identifies its rules snapshot as 2026-09-05; the document includes an update dated 2026-10-25.

Rules: [Skills](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.8blouwhowqty), [Skeleton](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.vqmd4vb87yyd), [Items](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.ex7j32svuj7u), [Races](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.p5ai154l6zxr), [Classes](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.gfh39dhb5lyx), [Abilities](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.ifoxsfcx9r0u), [Titles](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.unpvt3j1zoa9), [Specialty Rules](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.7jc2s75j5f91).

“Missing” below means the rule has no structured implementation; it may still be possible to write it in notes or a custom row. A description in the catalog is not the same as a working feature. “Validation gap” means a human still needs to check the rule; it does not necessarily mean the UI conceals that limitation. Campaign-only features are separated from creation problems. This is a source and calculation audit, not an exhaustive browser interaction test or a review of the separate Races document.

## Calculation, purchase, and validation errors

| ID | Finding | Rule and observed behavior | Source evidence |
|---|---|---|---|
| E01 | Fixed Standing prerequisites misread | Always Outnumbered needs C Standing. Villainous needs C Standing and a C criminal title. Both F purchases return `ok:true` at F Standing; the parser compares Standing with the purchased skill grade and ignores the literal C requirement. Villainous's title requirement is also unenforced. | `js/app.js:338–360`, `data/skills.js` |
| E02 | Polymorph uses the wrong Intelligence prerequisite | Polymorph F requires Character D and Intelligence E. One global offset is applied to every prerequisite, so a valid Character D / Intelligence E build is rejected for lacking Intelligence D. | `js/app.js:345–355` |
| E03 | Fighting Style prerequisites are manual only | The checker does not associate a style with actual weapon types/equipment or verify the governing stat one grade above the style. Fighting Style A with all F stats and no equipment returns `ok:true`, with a manual-check message. Weapon group/style description is not required either. | `js/app.js:338–360` |
| E04 | Martial Ethos/Mastery prerequisites are unenforced | No binding of five core techniques to Ethos, five additional techniques to Mastery, weapon-type matching, required grades, or restricted core combinations. Mastery can pass the manual checker without Ethos. | `js/app.js:338–360` |
| E05 | Magic School/Domain prerequisites are unenforced | School F with Magic F and zero affinities passes the checker. Five selected cores, grade progression, School prerequisite for Domain, and the second distinct set of five are not verified. | `js/app.js:338–360` |
| E06 | Chosen-stat prerequisites cannot be checked | Profession, Masterwork Maker, and Masterwork Refiner do not capture the governing stat in a structured field. `[stat]` placeholders are not resolved; a Maker F can return `ok:true` with all F stats. | `js/app.js:311–360` |
| E07 | Tamer skill/facility dependencies are manual only | Breeding and other Tamer branches do not enforce same-grade Tamer plus the corresponding facility asset. Breeding F with neither returns `ok:true`, marked for manual review. | `js/app.js:338–360` |
| E08 | Other nonstandard prerequisites are manual or partial | Capacity's Large/Elasticity requirement and Chameleon's Hybrid/Mixed Race/Intermediate requirement are not checked. Scrying checks Standing but not its required same-grade scrying asset/item. | `js/app.js:338–360` |
| E09 | Affinity purchases bypass prerequisites | Separate affinity rows check only Drain's selected stat. They do not enforce Intelligence one grade higher or the Magic-grade dependency for advanced affinities. Element A with F Intelligence and no Magic produces no affinity prerequisite error. The generic `Affinity [type]` skill follows a different validation route. | `js/app.js:374–381`, `619–628` |
| E10 | Important required selections can be blank | Feature, Special Movement, Resistance, Affinity/Element, Fighting Style, Profession, School/Domain, Ethos/Mastery, Gear and similar entries can lack their defining type/subject. `parameters` metadata is not generally enforced; only a short hard-coded list gets required-detail checks. | `js/app.js:56–60`, `311–360`, `374–381` |
| E11 | Broad Resistance is underpriced | Physical Resistance costs 21 points/grade; Magical Resistance costs 70. Both are billed as the generic 7-point Resistance skill regardless of entered type. | `js/app.js:87–93`, `data/skills.js` |
| E12 | Special Movement variants are underpriced | Fancy Falling, Wall-crawling and Water Walking cost 14; Speedburst has 7/14-point variants. Every generic Special Movement purchase costs 7/grade regardless of subtype. | `js/app.js:87–93`, `data/skills.js` |
| E13 | Two martial cores are missing | Incurable and Indirect appear in the current martial technique rules but not the 35-entry technique catalog. They exist in the affinity catalog. Custom cores are a workaround. | `data/techniques.js`; Skills → Technique Cores |
| E14 | Specialization restrictions are unenforced | More than one Fighting Style may be specialized. A specialized style can still buy Generalist, which is explicitly forbidden. The incompatibility with Mastery's free technique benefits is not represented. | `js/app.js:311–335`, `363–372`, `94–109` |
| E15 | Non-upgrading cores and specific upgrade caps are not enforced | Blind Fighter may be assigned E+ and billed as if it upgrades. Affinity rows also ignore their definition's `nonUpgrading` flag. Rules such as Blind Ranged Fighting/Quake's higher-grade conditions and Range's magical-extension requirement are not validated. | `js/app.js:94–110`, `363–381`, `data/techniques.js`, `data/affinities.js` |
| E16 | Racial discount target eligibility is unchecked | Born For This/These lists all purchased skills, rather than qualifying racial requirement purchases. Techniques, affinities and natural equipment are not selectable even when they satisfy those requirements. Hybrids have no per-parent allocation check. | `js/app.js:87–93`, `248–274`, `641–643` |
| E17 | Racial discounts survive removal of their perk | `skillCost()` subtracts 7 whenever the row ID remains in `bornTargets`, even after switching to Versatile or another path/perk. Changing the perk does not clear or disable that discount. | `js/app.js:87–93`, `136–180` |
| E18 | Mixed Race can be paid for twice | The hybrid path automatically charges 7 per extra tree; a separate Feature [Mixed Race] row also charges 7 without satisfying/replacing the automatic charge. There is no unified purchase representing both. | `js/app.js:86`, `87–93`, `123–126` |
| E19 | Free origin/Chosen Path skills are absent from ability components | The virtual free skill is displayed/exported, but `componentPool()` only includes purchased skills, techniques and affinities. A free Chosen Path Fast or Heightened Sense cannot be selected for an ability without buying a second copy or writing around it. Free skills are likewise absent from ordinary skill lookup and Power Grade calculations. | `js/app.js:76–78`, `128`, `301–310`, `491–496` |
| E20 | Deplete does not affect calculated cooldown | Deplete rank 1/2/3 should add 2/4/6 posts. Fast E with Deplete 3 still calculates a 1-post cooldown, rather than 7. | `js/app.js:502` |
| E21 | Limiter-specific restrictions are mostly unenforced | Permanent, Maximum, Object and Irreversible can be given ranks 2/3 despite being single-rank limits. Charges can be applied to Lucky despite its prohibition. Required named assistants, item context for Object, ongoing-vs-instant suitability, physical-change eligibility for Irreversible, and approval/context requirements are not validated. Static-vs-summoned Companion/Minions limiter eligibility is not modeled. | `js/app.js:35`, `325–350`, `data/meta.js:99–113` |
| E22 | Action calculations undercount extra intents | The code takes `max(taggedEffects, extraIntents)` rather than combining independent contributions. Even one additional intent with no tagged cores still produces one action. The damaging-ability exemption is applied without checking that the ability deals damage; see C03. | `js/app.js:498–503` |
| E23 | Invalid ability combinations are accepted | No checks require a technique's Fighting Style in the formula, keep techniques within one style, require Magic/School/Domain components where specified, or prevent Aura + Range. Selective, Non-Lethal and similar component-grade requirements are not validated. Missing/deleted component references silently disappear from calculation. | `js/app.js:491–503`, `619–643` |
| E24 | Ability grade overrides can contradict their formula | A high-grade component can be exported with an arbitrary F ability override, without lowering its component grade or validating Flux. Per-component usage grades and Flux transfers are not represented. Overrides may be useful for staff rulings, but currently need no explanation and generate no discrepancy warning. | `js/app.js:498–503`, `665–666` |
| E25 | Pathforger omits a stat requirement | The current document requires Vitality E or Speed E. Neither appears in its metadata requirements nor in its checker. | `data/meta.js:76–83`, `js/app.js:544–545`; Classes → Pathforger |
| E26 | Class checks count rows rather than distinct qualifying choices | Caster's three Intelligence secondaries and two elements, and Nomad's profession/supplemental selections, can be filled using duplicate rows. No distinctness/type identity check establishes that the selections represent the required breadth. | `js/app.js:529–547` |
| E27 | Class eligibility is not consistently revalidated | Automatically acquired classes are removed if their requirements stop passing. Manually acquired classes can remain equipped after losing qualifying skills/equipment; final validation checks override explanations but does not recheck every equipped class. | `js/app.js:525`, `550–557`, `619–643` |
| E28 | Masterwork job-title suggestions never match the skills | The configured prefixes contain `Masterwork #Maker`, `#Harvester`, etc.; actual skill names omit `#`. Both family matching and noun generation miss them. A Masterwork Maker yields no job-title suggestion. | `data/meta.js:90`, `js/app.js:521–522` |
| E29 | Static minions cannot be distinguished from summoning components | Rules classify fixed minions as passive. The builder has no mode selection and includes Minions in ability components regardless of whether they are permanent followers or summoned. | `js/app.js:465–473`, `491–496`; Skills → Minions |

## Missing or incomplete creation features

| ID | Feature | What is missing |
|---|---|---|
| M01 | Educated bundle | Selection of three non-Artisan secondaries, free/linked grade progression, independent upgrades, associated background/job title, singleton enforcement, class credit, and exclusion from ordinary racial requirements. Buying Educated currently only adds its own row. |
| M02 | Magic School | Naming/description and binding of the five core selections; restricted core combination; Metamagic augmenter allocation; school-relative grades; automatic student title/asset. |
| M03 | Magic Domain | One-Domain restriction; binding its five additional cores; 49-point Domain Power skill pool and shared grades; free additional affinity/augmenter in abilities; graduate title/asset. |
| M04 | Martial Ethos | Core selection and progression, Initiative type selection and one-type restriction, student title/asset, and its ability effects. |
| M05 | Martial Mastery | One-Mastery restriction, five additional core bindings, free eligible techniques, Weapon Excellence versus Weapon Precision choice, and master title/asset. |
| M06 | Item's internal build | Budget number and text notes exist, but there is no nested skill/equipment builder, expenditure calculation, item stat handling, ignored-stat versus retained-skill prerequisites, Sentience check or wielder-use check. |
| M07 | Transformation's internal build | Budget number and text notes exist. Missing form-specific purchases/refunds, inherited-versus-disabled features, nested Transformation prohibition, Size Change dependency, equipment melding and structured ability components. |
| M08 | Companion construction | Shared budget display and text boxes exist. Missing actual pooled expenditure, minimum one improved stat or skill, nested Companion/Minion prohibition, and structured stats/race/class/equipment/prerequisites. |
| M09 | Minion construction | A user-entered subtotal is checked against 56, but the template's actual cost and B caps are not calculated. No structured forbidden-skill check, spell/static mode or grade-based number progression. Count remains a nominal 1–5 even at higher grades. |
| M10 | Tamer development | Only one free buddy record is modeled, without structured size/stat/skill/element data. No roster based on Tamer grade, farm capacity, breeding, merging, awakening, skill/stat training or downtime assignments. |
| M11 | Class catalog | Only Caster, Striker, Nomad and Pathforger are defined. Anchor is missing at Tier 1, as are the document's Tier 2/3 classes; see inventory below. No higher-tier ancestry requirements or tier 2/3 equipment workflow. |
| M12 | Granted class features | Class perks export their names, but their grants and effects are not instantiated. In particular Nomad's Talented Friends does not generate its five adaptive minions. Magic Circle, Agile and Pathforged have no structured ability/vehicle effects or conditions. |
| M13 | Ability Flux and component usage grades | No point-for-grade transfers, individual component lowering, allocated augmenters, magic/martial caps, available-technique constraints or Maximum-limiter incompatibility checks. A free-text note and grade override are the only approximations. |
| M14 | Ability quantities and conditions | Range, area, target count, duration, limited uses, delayed cooldown start and permanently occupied cooldown grades are not calculated/exported as structured values. Duration, Trap and permanent effects retain only a simple grade-based cooldown number plus any manual notes. |
| M15 | Enchanting | The Workbench is explicitly under construction. Missing Mythril eligibility, cores/shard capacity, skill slots, grade caps, costs/discounts, separate item abilities/cooldowns, damage-related enchantment loss and shattering/shocking support. |
| M16 | Consumables | No recipe builder, grade and skill costs, Artisan reductions, prerequisite inclusion, held/refunded points, purchased-versus-crafted ownership or Character Grade usage checks. |
| M17 | Magic item inventory limits | No distinction between enchanted items/consumables and Item-skill objects, equipped magic-item counting by Standing, or Focus limit increases. |
| M18 | Masterwork workflow | Inventory is displayed, but no harvesting/development, two-to-one refining, facility construction, five-resource Maker limit, positive/negative augments, infusion slots, Charge/Static choices or relevant grade/facility validation. Self Made is a perk name without its Construct natural-equipment crafting exception. |
| M19 | Fuller construction | No chassis/core/weapon/subsystem builder, grade/size/hardpoint rules, part and ability prices, Grip requirements, independent system cooldowns, power routing or redlining. Generic Asset/Item notes cannot enforce these rules. |
| M20 | Augments | No catalog, prices, prerequisites, body/slot categories, installation requirements, Sentience-loss totals or thresholds, incompatibilities, or granted skills/equipment. Includes fashion, nerve, body, arm/hand and sensory augment systems in Specialty Rules. |
| M21 | Sheet fields and ordinary items | No dedicated Theme, Post Frequency, Discord Name, Current RP, short/long-term Goals, Downtime, Narrator Grade or required weak point/core field. No distinct ordinary Items inventory. Generic notes can hold some of this information. |
| M22 | Size sheet output | A non-Medium size only appears as a cost entry in the generated creation log, rather than an equipped Size title and full rules block. Tiny/Small's free Accurate benefit and lift/carry/throw modifiers are omitted from the size summaries; other sizes also lack full lift/throw data. Height/weight do not validate against the selected size. |
| M23 | Criminal titles | Generic titles have no grade, mandatory-equip lock, repeat-offense advancement, buyoff price or perk-specific buyoff rules. All custom titles can be freely toggled/deleted. |
| M24 | Asset definition and pricing | Generic rows have arbitrary manually entered prices and notes. Missing typed connection/pet/property/training/social assets, fixed-location requirements and specific training-facility pricing checks. A generic Asset skill row does not create a corresponding defined possession, while separate Asset entries charge independently. See C01 for the grade-cap conflict. |
| M25 | Multiple-tree Feature synchronization | Hybrid charges, purchased Mixed Race features, actual tree titles and prerequisites are separate representations. A Feature entry does not grant an additional tree selection, and custom racial titles cannot be resolved into structured tree access by that feature alone. |

## Campaign/progression features absent from this creation-only tool

These are supported in the document but should be treated as expansion scope, rather than automatically calling the existing creation cap a bug.

| ID | Feature | Missing support |
|---|---|---|
| P01 | Earned points and progression | No RP awards, reward URLs, expenditure history, unspent advancement points or general earned-point input. `pointsEarned()` only returns Tiny/Small bonuses, so normal Standing advancement is impossible. A imported extra field does not fix the calculation. |
| P02 | A/S stats, tribulations and Skill Mastery | Stats are capped to B; no tribulation records, S unlocks, pre/post-tribulation restrictions, or the separate one-skill A mastery option with 350 earned points/renown/no-tribulation conditions. |
| P03 | Intermediate/Ascended evolution | No tier or evolution award workflow. Missing Evolved/Apex and higher racial perks, free assets/skills and choices, Variant Infamous/Folk Hero/Cashback and Ascended branches, and Hybrid Favored Parent choices. Listing Intermediate/Ascended race templates does not implement these perks. |
| P04 | Higher-grade and Complex Assets | No five-component Complex Asset structure, owner sharing, custom perks, grade degradation/restoration, growth counters or S-grade leadership validation. Higher-grade RP-earned assets are not supported by the F-only asset editor. |
| P05 | Trading and persistent resources | No marketplace minimum price checks, counterparty/provenance records, transfers, held resources or enforcement of own-character/retrade restrictions. |
| P06 | Boons and contracts | No one-Boon limit, consumption/reacquisition state, or structured contractual parties/terms/consequences. These can only be written in notes/titles/assets. |
| P07 | Scoop validation | A carry-in field exists, but no source character/earned-point ledger, half-and-round-down calculation, exclusion of nontransferable size/Cashback bonuses, or prevention of pooling multiple scoops. |
| P08 | Persistent change log | Export creates a new undated creation summary every time. There is no stored chronological log of dated awards, moderator links, purchases, trades and title changes. |
| P09 | Optional combat derived sheet | No HP/equipment durability, effectiveness, size-modified movement/lifting/throwing and combat modifiers, conditions or live cooldown tracking. These are optional combat features, not prerequisites for a basic character creator. |

## Conflicts between the document and explicit builder rulings

These should be resolved against the intended authoritative rules before implementation. The code deliberately records rulings that differ from the document, so it would be misleading to call every one an accidental programming error.

| ID | Conflict | Document | Builder |
|---|---|---|---|
| C01 | Starting Asset maximum | Asset skill allows up to B at creation. | The editor, data cap, final validation and `rulings.assetCreationMax` all restrict Assets to F. |
| C02 | Natural equipment stat progression | Natural F needs E stat; E needs E; D needs D; C needs C, etc. | `equipmentValidation()` always requires the associated stat one grade higher. `naturalEquipmentUsesNormalStatProgression:true` explicitly selects that policy. E natural weapons with Strength E are rejected. |
| C03 | Action exemption | Ability Intent adds an action for each extra intent; some martial examples also describe tagged-core exemptions. The exact interaction needs one consistent rule. | Metadata explicitly permits one tagged effect on a damaging ability for free, but calculation applies a free effect to every ability and fails to add independent extra intents. The calculation bug E22 exists even if the metadata exemption is intended. |
| C04 | Versatile replaces or supplements the stat | The racial perk says permanently change the governing stat and change Fighting Style/Magic requirements to match. | UI explicitly calls it an alternate option; equipment retains its original stat. Magic accepts either stat, while Fighting Style's stat dependency is not implemented. |

## Missing class inventory

The rules define the following classes absent from the four-entry builder catalog. Names preserve the document's spelling.

- **Tier 1:** Anchor.
- **Caster descendants:** Spellweaver, Summoner, Transformer, Arcane Enforcer, Entropy Warlock, Life Warden, Oracle, Elementalar, Necromancer, Battle Magician, Magical Slayer, Shapeshifter.
- **Anchor descendants:** Bastion, Ronin, Shadow Sickle, Blitz Vanguard, Paladin, Koan/Crusader, Tekiya/Brigand, Grim Reaper, Night Slicer.
- **Striker descendants:** Brawler, Swashbuckler, Samurai, Twin Blade, Dread Knight, Martial Artist, Divine Monk, Wild Rager, Duelist, Privateer, Daimyo, Warlord, Twin Tempest, Dual Phantom, Knightmare, Overseer.
- **Nomad descendants:** Scout, Socialite, Free Runner, Bureaucrat, Crafter, Performer, Ranger, Scholar, Shinobi, Sniper, Sanctioned Diplomate/Legate, Truth Seeker, Parkour Master, Diadem, Divum, Kage, Hunter, Delver, Artillerist.

## Reproduced calculation checks

The existing data files and application closure were loaded into Node's `vm`. Initialization/rendering was skipped and internal functions exposed in memory; no application file was edited. These checks exercised actual functions, not reimplementations.

| Scenario | Actual result |
|---|---|
| Always Outnumbered F, F Standing | `ok:true` |
| Villainous F, F Standing, no criminal title | `ok:true` |
| Polymorph F, Character D, Intelligence E | Rejected: requires Intelligence D |
| Fighting Style A, F stats, no equipment | `ok:true`, manual prerequisite message |
| Martial Mastery A, no Ethos, no techniques | `ok:true`, manual prerequisite message |
| Tamer Breeding F, no Tamer or facility | `ok:true`, manual prerequisite message |
| Masterwork Maker F, F stats | `ok:true`, manual prerequisite message |
| Magic School F, Magic F, no affinities | `ok:true` |
| Natural Weapon E, Strength E | Rejected: requires Strength D |
| Resistance F, Physical | 7 points rather than 21 |
| Resistance F, Magical | 7 points rather than 70 |
| Special Movement F, Wall-crawling | 7 points rather than 14 |
| Fast E with Deplete 3 | 1-post cooldown rather than 7 |
| Ability with one additional intent | 1 action |
| Two tagged components plus two additional intents | 2 actions; additional independent contributions are lost |
| Free Chosen Path Fast | Empty component pool without a purchased copy |
| Former Born For This target after changing to Versatile | Discount persists: Fast F costs 0 |
| Blind Fighter E under an ordinary E style | 14 points despite non-upgrading status |
| Lucky with Charges | `ok:true` |
| Fast with Permanent rank 3 | `ok:true` |
| Element A without Magic or sufficient Intelligence | No affinity prerequisite error |
| Masterwork Maker skill | No job-title suggestion |

## Source ambiguities to avoid turning into false bugs

- Beast Mundane requirements have ambiguous list indentation around “choose one” and the two senses. The builder interprets them as natural equipment plus two senses. This review does not label that interpretation wrong without clarification.
- Mining appears as a Nomad profession option, but the Skills tab does not provide a corresponding standalone Mining skill definition. That is a rules-document omission or an intended Artisan/Profession equivalent, not enough evidence of a builder catalog extraction error.
- Nomad lists Focus at 7 in its class example, while the actual Focus skill costs 21. The builder uses the Skills list price. Class illustrative subtotals should not override skill prices automatically.
- A skill description being present does not mean all narrative adjudication should become an automated blocker. The priorities are correct costs, explicit choices, dependencies, grants and truthful validation messages.

## Suggested order

1. Fix prerequisite parsing, affinity validation, variable prices, discount state, limiter cooldowns and action math.
2. Add structured Educated/School/Domain/Ethos/Mastery grants and nested Item/form/follower builds.
3. Complete creation classes, class grants and required sheet fields.
4. Resolve the four rule conflicts before changing the current explicit policies.
5. Add crafting/specialty systems and, if desired, a separate progression mode.
