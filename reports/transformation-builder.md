# Transformation builder — v0.12.0

Implemented from the Transformation and Size Change entries in the [IH rules](https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/edit?tab=t.8blouwhowqty), checked 2026-11-07. The user explicitly permits narrative justification for any selected skill/feature removal; no justification or approval field is required.

## Behavior

- Each Transformation purchase owns one fixed form and supplies 28 points per purchased grade.
- Forms inherit the base character dynamically. Structured changes are saved as overlays, preserving the base character and other forms. Changes to unrelated base fields continue to inherit after a form is edited.
- Individual skills, paid features, techniques, affinities, custom skill/feature rows, Educated grants, free cosmetic features and abilities can be disabled. Refund accounting uses the current points actually charged by the base builder, including discounts and paid independent Educated upgrades. Free entries give no refund; removing a bundle and one of its children cannot refund the child twice.
- Lowering an inherited skill grade returns the corresponding paid difference. Stats cannot be reduced to fund a form, and melding equipment gives no refund. The Transformation purchase funding the form cannot refund itself.
- Shared editors support form skill/feature purchases, skill upgrades, techniques, affinities, equipment and abilities. Prerequisite checks use the effective form, including its stats, retained equipment and remaining skills.
- Titles and existing Transformation activation skills/abilities remain inherited. Forms cannot purchase or upgrade Transformation internally. Source Transformation is protected from editing/removal in its own form.
- Worn equipment melds by default; natural equipment remains available. Each equipment entry can explicitly be retained or made unavailable.
- Size changes cost no size points and require usable Size Change of sufficient grade. Stat upgrades use the existing stat price table, with A as the highest supported editable stat grade.
- Overspending, missing base references, unavailable ability components, duplicate entry IDs and unmet skill/equipment/size prerequisites appear in form and character validation. Form points do not affect earned points, Standing or the base budget.
- Local saves and JSON exports retain structured forms in schema 8. Existing text descriptions and notes are preserved. Generated character sheets append effective form stats, skills/features, techniques, affinities, equipment, abilities, disabled entries, melded equipment and accounting.

## Validation

43 automated regression tests pass, including 12 Transformation scenarios covering separate budgets, discounts/free grants, partial refunds, inherited abilities, nested purchase restrictions, dependencies, size, equipment, JSON migration and dynamic inheritance. JavaScript syntax and diff checks pass.

Browser checks passed for desktop removal/refund, form purchases, ability composition, cancellation isolation and sheet export. Phone-width layout was checked at 390 × 844 with no horizontal overflow. The subsequent full mobile save automation stalled in browser input/focus commands; the desktop save path and automated state/accounting checks passed. A full phone interaction pass should be repeated when browser automation is responsive.

Existing broader builder limitations (such as ability action arithmetic, advanced class grants, Item internals and crafting subsystems) remain listed in remaining-issues.md and are also inherited by the shared form editors.
