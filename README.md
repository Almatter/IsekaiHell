# Isekai Hell Site v0.11.0

Open `index.html` after extracting the full archive. The site is static and can be hosted from any ordinary web server.

## v0.11.0 Educated and advancement

- Educated now grants three linked Secondary skills, optional paid individual upgrades, a background title, class credit and readable sheet entries.
- Earned points include Scoop carry-in and determine Standing. Legacy saves migrate Scoop points without duplicating their budget.
- Positive earned points unlock A stats; S still requires a separate tribulation workflow.
- Added Anchor starter-class checks and hardened Profession naming/imports.
- Audited every assigned race image. See `reports/race-image-audit.md`; approval drafts have not been installed.
- Updated `reports/remaining-issues.md` distinguishes broken behavior, rule enforcement and missing features.

## v0.10.0 character builder corrections

- Structured weapon types, criminal titles, school/style foundations, specialty stats and Tamer facilities now enforce their prerequisites.
- Corrected Polymorph requirements, Standing gates, Resistance and Special Movement prices, missing martial cores and non-upgrading techniques/affinities.
- Saved characters retain their data. Older affected entries need explicit weapon, foundation, stat or facility selections before passing the new checks.
- Run `node --test tests/builder-rules.test.cjs` for regression checks. See `reports/remaining-issues.md` for the numbered follow-up list.

## v0.9.1 highlights

- Rebuilt the 10–15 minute Rules Training lesson around the basic rules layer only.
- Fixed clipped tutorial speaker labels and scene numbers.
- Race-tree choice now changes the tutorial vessel art, backdrop, legal starter loadout, and practice ability.
- Added a full stat primer explaining Strength, Precision, Intelligence, Vitality, and Speed and how prerequisites connect stats to skills/equipment.
- Reworked ability creation to teach ability focus, component selection, ability grade, cooldown, and ability action cost before testing the user.
- Replaced the old three-action-post exercise with narrative-first movement, attack, counterattack, defense, and narrator adjudication exercises.
- Improved simulacrum framing so its full holographic silhouette stays inside the stage on desktop and mobile.
- Cooldown practice now uses the selected vessel's D-grade training ability and the normal two-post D-grade cooldown.
- The lesson explicitly excludes optional structured-combat material such as measured movement, equipment HP, and effectiveness formulas.
- Heightened Sense continues to require a chosen normal sense in Character Creation.

## Tutorial scope

The tutorial warns users that it takes about 10–15 minutes and that progress is not saved. It does not use localStorage/sessionStorage and does not grant World RP certification.

### v0.11.1

- Skill search no longer redraws the catalog on blur, preserving the first skill-panel click.
- Educated grants waive individual prerequisites; Educated retains its own Character requirement and required choice details.
- Ineligible skills no longer show limiter controls; imported invalid limiters remain flagged until edited.
- Race artwork standard: male and female adult examples together on a plain textureless background. Revised missing-race drafts remain pending approval.
