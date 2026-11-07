# IH builder — remaining issues after prerequisite corrections

Updated 2026-11-07. Numbers below are stable references for the next round of corrections. The original audit is historical; this list reflects the changes in v0.10.0.

Implemented in this round: fixed C Standing for Always Outnumbered/Villainous; structured graded criminal titles and Villainous eligibility; independent Polymorph prerequisites; required Fighting Style weapon choices and category/stat/equipment checks; five-entry, style-bound Ethos/Mastery foundations; School/Domain affinity/augmenter foundations and dependency grades; Profession/Maker/Refiner stats; Tamer/facility dependencies; Capacity/Chameleon/Scrying checks; affinity prerequisites; additional required details; Resistance/movement prices; Incurable/Indirect; one specialized style and no Generalist; F-only non-upgrading cores. Saves use schema 6 and preserve existing data, but older affected entries need explicit selections before they validate.

The rules permit other Fighting Styles alongside a single specialized style. They do not state that specialization bans other styles. Criminal title names in the rules are **Thief, Murder, Vandal, Abuser**.

## Remaining corrections and feature work

1. **Racial discount eligibility and stale discounts.** Restrict Born For This/These to actual racial requirement purchases, include eligible techniques/affinities/equipment, allocate by parent tree, and disable retained discounts when the perk changes.
2. **Mixed Race purchase synchronization.** Reconcile the automatic hybrid charge with separately purchased Mixed Race features and the tree titles/access they grant.
3. **Free origin/Chosen Path skill integration.** Include virtual free skills in ability components, prerequisite lookups and Power Grade; give parameterized free skills the same structured subject/subtype controls as purchased ones.
4. **Deplete cooldowns.** Apply its +2/+4/+6 posts to calculated abilities.
5. **Other limiter restrictions.** Enforce single-rank limits, Charges/Lucky incompatibility, required assistants/equipment, static versus summoned eligibility, and other limiter-specific conditions.
6. **Ability action arithmetic.** Add independent intents/effects correctly and apply any agreed free-effect rule only in the appropriate context.
7. **Ability composition.** Enforce required Fighting Style/Magic/School/Domain components, same-style techniques, incompatible cores, relative component grades and missing references.
8. **Ability Flux and grade overrides.** Implement individual usage grades, grade transfers and augmenter caps; require a reason or a valid transformation when overriding the formula’s grade.
9. **Other core-specific restrictions.** Check higher-grade Blind Ranged Fighting/Quake/Range conditions and relevant range/combination rules. Non-upgrading cores and Indirect’s same-style Range dependency are fixed.
10. **Exact weapon-to-equipment matching.** Styles now require valid weapon selections, governing stats and matching equipment categories/grades. Equipment still lacks a structured sword-versus-axe/etc. subtype, so exact weapon matching needs a corresponding equipment field.
11. **Existing class checker errors.** Add Pathforger’s missing Vitality E or Speed E; prevent duplicate rows satisfying distinct choices; revalidate manually acquired/equipped classes when their requirements change.
12. **Missing class catalog.** Add Anchor and the document’s Tier 2/3 classes with predecessor requirements and per-tier equipment rules.
13. **Class grants and effects.** Instantiate grants such as Nomad’s Talented Friends and model Magic Circle, Agile and Pathforged conditions/effects.
14. **Educated bundle.** Select and grant three linked non-Artisan secondaries, handle upgrades, background title and class/racial eligibility correctly.
15. **Magic School/Domain granted benefits.** Foundations are enforced; Metamagic allocation, Domain’s 49-point skill pool, free affinity/augmenter options and student/graduate titles/assets remain.
16. **Ethos/Mastery granted benefits.** Foundations are enforced; Initiative, student/master titles/assets, free Mastery techniques, Weapon Excellence/Precision and specialization’s exclusion from free Mastery benefits remain.
17. **Item internal builder.** Replace the text-only build with actual internal purchases, spending, item stats and dependency/wielder checks.
18. **Transformation internal builder.** Model inherited/unusable features, refunds, form purchases, Size Change, nested-form restrictions and equipment melding.
19. **Companion internal builder.** Calculate shared-pool spending, minimum development, prohibited skills, race/class eligibility and equipment.
20. **Minion internal builder.** Calculate the 56-point template and B caps, spell/static mode, forbidden skills and grade-based counts.
21. **Tamer development.** Prerequisites/facilities are enforced; structured buddy rosters, size/stats/skills/elements, farm capacity, breeding/merging/training/awakening and downtime remain.
22. **Enchanting.** Implement Mythril eligibility, cores/shards, capacity, skills, costs/discounts, independent item abilities/cooldowns and damage-related effects.
23. **Consumables.** Implement recipes, prerequisite skills, costs, Artisan reductions, held/refunded points and usage requirements.
24. **Magic-item inventory limits.** Track enchanted items/consumables against Standing and Focus allowances, excluding Item-skill objects as the rules specify.
25. **Masterwork crafting workflow.** Stat/specialty checks are implemented; harvesting, refining, facilities, Maker augments/setbacks, infusion and Self Made behavior remain.
26. **Fullers.** Add chassis, cores, equipment, systems, hardpoints, prices, piloting, independent cooldowns and redlining.
27. **Augments.** Add the catalog, prices, body/slot restrictions, installation requirements, Sentience loss and granted functionality.
28. **Character-sheet fields and ordinary inventory.** Add Theme, Post Frequency, Discord Name, Current RP, Goals, Downtime, Narrator Grade, required weak point/core and ordinary Items.
29. **Size output and modifiers.** Export equipped size titles and complete lift/carry/throw/movement/Accurate benefits; check height/weight consistency.
30. **Criminal-title advancement and buyoff ledger.** The four graded mandatory titles and Villainous checks work. Repeat-offense grade calculation, paid buyoff, perk-specific costs and persistent staff-clearance history remain. Current clear/correction controls are manual records, not automated buyoff.
31. **Other Asset rules.** Tamer facilities have structured types. General asset subtype pricing, locations, property/connection/pet definitions and synchronization with Asset-skill purchases remain.
32. **Earned points, change logs and Scoops.** Add awards/provenance, advancement spending, unspent points, dated history, validated half-earned Scoop calculations and exclusions. C Standing skills remain unavailable to an ordinary F Standing creation build.
33. **Higher progression and evolution.** Recorded evolution tier supports Chameleon checking, but does not grant or validate the entire evolution process. Add advanced racial perks, A/S stat unlocks, tribulations and the separate Skill Mastery route.
34. **Campaign assets and optional combat.** Add Complex Assets, shared ownership, marketplace transfers, Boons/contracts and optional combat HP/durability/effectiveness/condition tracking as desired.
35. **Resolve remaining rule-policy conflicts.** Starting Asset cap F versus B; natural-equipment stat progression; Versatile replacing versus supplementing the governing stat; and the exact damaging-ability action exemption. Current policies were preserved in this round.

## Verification

- `node --test tests/builder-rules.test.cjs`: regression tests cover valid and invalid prerequisite chains, collections, subtype prices, non-upgrading cores and save compatibility.
- Browser checks: criminal title creation; weapon-type selection and valid Fighting Style; five-technique Ethos creation; five-affinity School creation and reopening; readable foundation export; deleting a foundation invalidates the School; Resistance pricing options and typed facility controls.
- Mobile checks at 320×568 and 390×844: completed the five-affinity School workflow, checked dialog/page overflow and visible Save controls, verified 44 px foundation/title action targets and 16 px mobile input text. No physical iOS/Android hardware was used.
- Existing saved builds are not silently assigned invented weapons, parent skills, foundations, stat choices or facilities. Edit affected entries to complete those choices.
