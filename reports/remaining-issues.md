# IH builder — remaining issues after v0.11.1

Updated 2026-11-07. This is a fresh, continuously numbered list organized by the three requested categories. The previous list's **#14 (Educated)** is completed; numbers below replace the previous numbering.

## Completed in this round

- Educated grants three distinct non-Artisan Secondary choices, a background title, free linked grades, paid independent upgrades, class credit and ability/export entries. Individual child prerequisites are waived; Educated’s own Character prerequisite and required choice details still apply. Ordinary racial requirements exclude the grants; a race template explicitly specifying Educated (such as Half-Elf) may use them. Earlier individual upgrade spending is retained when Educated later advances.
- Earned Points is editable and includes Scoop carry-in. Both count toward Standing and the spendable budget. Starting points remain 105 plus stat-reduction bonuses; automatic size bonuses are included in earned points. Older Scoop saves migrate once without changing the total budget.
- Positive earned points unlock A-grade stats. S remains a separate tribulation feature; no S cost or approval was invented.
- Profession's canonical identifier is kept separate from the user's title/specialization. Literal special characters and legacy named Profession imports are handled safely and regression tested.
- Anchor is now a Tier 1 class with its stated stats, skills, same-style technique choices, equipment and Cleave description. Per the user's clarification, it requires two listed techniques from the same Fighting Style.
- All 202 assigned race images exist, decode locally and loaded from public Pages URLs. Diwose, Zentail and Zentox have no assigned artwork; three generated approval drafts are kept outside the website.

## Broken or wrong behavior

1. **Stale racial discounts.** Born For This/These discounts can continue after their perk is changed.
2. **Mixed Race duplicate charges.** Automatic hybrid costs and separately purchased Mixed Race features are not reconciled.
3. **Deplete cooldowns.** The limiter's additional cooldown is not included in ability calculations.
4. **Ability action arithmetic.** Independent effects/intents are undercounted; the free-effect exception is applied without checking the intended context.
5. **Free origin/Chosen Path skills.** Their virtual entries remain absent from ordinary ability components, prerequisite lookup and Power Grade. Educated grants now have these integrations, but the separate origin grant system still needs them.
6. **Masterwork job-title suggestions.** Configured prefixes contain a `#` absent from actual skill names.
7. **Ability grade overrides.** An override can contradict the listed components without a valid lowered-grade/Flux formula or explanation.
8. **Conflicting rule policies needing a ruling.** Starting Asset cap F versus B, natural-equipment stat progression, Versatile replacing versus supplementing a stat, and the precise damaging-ability action exemption differ between the document and explicit builder policies. These are identified conflicts, not all proven accidental coding errors.

## Validations and rule enforcement

9. **Racial discount eligibility.** Restrict targets to actual racial requirement purchases, include eligible techniques/affinities/equipment, and allocate Hybrid discounts by parent tree.
10. **Exact weapon-to-equipment matching.** Styles check category, grade and governing stat; equipment still needs a structured sword/axe/etc. subtype for exact matching.
11. **Remaining core restrictions.** Check higher-grade Blind Ranged Fighting/Quake/Range requirements, relative grades, and other core-specific restrictions. Non-upgrading cores and Indirect's same-style Range dependency are already fixed.
12. **Ability composition.** Require the relevant Fighting Style/Magic/School/Domain components, keep techniques within one style, reject incompatible combinations and detect missing references.
13. **Limiter-specific restrictions.** Single-rank limits, Charges/Lucky, assistant/equipment details, static versus summoned eligibility, and other contextual restrictions still need checks.
14. **Existing class checks.** Pathforger still lacks Vitality E or Speed E; handedness and exact equipment associations need validation; manually acquired classes need revalidation after changes. Educated class credit and some duplicate-row handling are now implemented, but choice identity and grade requirements need a broader audit.
15. **Criminal title advancement and buyoff.** Calculate repeat-offense grades, buyoff costs and perk modifiers, and record staff clearance. Current title entry/removal is a manual record.
16. **Asset conditions and prices.** Enforce subtype prices, fixed locations, property/connection/pet definitions and valid use of training facilities. Facility-type linkage is implemented, but not every price/location rule.
17. **Scoop provenance and calculation.** Earned-point accounting is fixed. Still needed: source character, half-earned/round-down calculation, nontransferable bonus exclusions and prevention of pooled Scoops.

## Missing features

18. **Magic School/Domain benefits.** Metamagic allocation, Domain's 49-point pool, free affinity/augmenter options and automatic student/graduate titles/assets. Foundations are implemented.
19. **Martial Ethos/Mastery benefits.** Initiative, student/master titles/assets, free Mastery techniques, Weapon Excellence/Precision and specialization's exclusion from free Mastery benefits. Foundations are implemented.
20. **Advanced classes and class grants.** Add the Tier 2/3 catalog and predecessor requirements; instantiate grants such as Nomad's Talented Friends and class perk effects. All five starter classes, including Anchor, are now listed.
21. **Item internal builder.** Actual purchases, internal spending, item stats and prerequisite/wielder checks.
22. **Transformation internal builder.** Inherited/unusable features, refunds, form purchases, Size Change, nested-form restrictions and equipment melding.
23. **Companion internal builder.** Shared expenditure, minimum development, forbidden skills, race/class eligibility and equipment.
24. **Minion internal builder.** Calculated 56-point templates, B caps, spell/static mode, forbidden skills and grade-based numbers.
25. **Tamer development.** Structured buddy rosters, size/stats/skills/elements, farm capacity, training, breeding, merging, awakening and downtime.
26. **Enchanting.** Cores/shards, capacity, skills, costs/discounts, separate item abilities/cooldowns and damage effects.
27. **Consumables.** Recipes, costs, prerequisite inclusion, Artisan reductions, held/refunded points and usage checks.
28. **Magic-item limits.** Standing/Focus allowances and correct classification of enchanted items, consumables and Item-skill objects.
29. **Masterwork crafting workflow.** Harvesting, refining, facilities, Maker augments/setbacks, infusion and Self Made. Specialty/stat checks are implemented.
30. **Fullers.** Chassis, cores, weapons/systems, hardpoints, prices, piloting, independent cooldowns and redlining.
31. **Augments.** Catalog, costs, slots, installation requirements, Sentience loss and granted functionality.
32. **Character-sheet fields and ordinary Items.** Theme, Post Frequency, Discord Name, Current RP, Goals, Downtime, Narrator Grade, required weak point/core and everyday inventory.
33. **Size output and modifiers.** Equipped size titles, complete lift/carry/throw/movement/Accurate effects and height/weight consistency.
34. **Persistent awards and expenditure history.** Dated moderator links, purchases, trades, title changes and refund approvals. The editable earned total and Educated upgrade charges are not a complete historical ledger.
35. **Advanced progression.** Full evolution prerequisites/perks, S-stat tribulations, S costs/unlocks and the separate Skill Mastery route. Recorded evolution tier and the A-stat unlock are already present.
36. **Campaign assets and optional combat.** Complex Assets, shared ownership, marketplace workflows, Boons/contracts, HP, equipment durability, effectiveness, conditions and live cooldown tracking.
37. **Approved race art installation.** Diwose, Zentail and Zentox drafts await approval before being added to the catalog. No assigned image URL was broken in the current audit; see race-image-audit.md.

## Verification

31 automated regression tests pass. Browser checks cover Educated selection/upgrades/export, safe Profession names, earned totals/Standing, and phone-width forms. Image verification covered all 110 races and 202 assigned public images. Draft artwork is not referenced by the site.

A final additional browser file-import check could not execute because automatic approval review reached its usage limit. Local migration and upgrade-accounting regression tests passed.
