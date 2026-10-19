# Hearth & Oath: a dark fantasy life book

The v0.5 update changes presentation and navigation. Preserve revision 4 saves,
every game rule, actual geography, every authored action ID, and offline play.

## Direction

Reference the user's VERMIS guidebook images through original artwork and print
language: dense ink, imperfect halftone, weathered black/moss, bone typography,
faded chartreuse, rust accents. The interface must remain readable and touchable.
No logos, reproduced book pages, decorative illegible fonts, or texture over text.

## Ownership

- Root: app.js, index.html, offline bundler, package/version and publication.
- visual_design: styles.css; all responsive components and dark palette.
- avatar_design: avatar.js; actual etched portraits with preserved customization.
- party_combat: map.js; dark engraved terrain and marks with unchanged geometry.
- annual_life: original generated scene asset, dist/art/dark-pilgrim.webp.
- journey_qa: browser scripts, fixture-based QA, README.
- life_engine: navigation/interaction audit and narrow accessibility fixes.

## Phone shell (root DOM contract)

Keep .app-shell, .sidebar, .main-shell, .game-header, #main-content,
.game-content.<tab>-content and all old module view classes.

The new header is `.game-header.phone-header` with `.header-bookmark` (menu,
small title and chapter), `.identity-bar` (portrait + name + age/calling),
`.header-place`, `.header-resources` and `.status-bars` (four `.status-bar`
rows: Health, Joy, Focus and Stress; actual saved values). On desktop
`.desktop-age-button` is present; on phones only dock's central Age up is visible.

`.mobile-command-dock` is fixed at the bottom, above safe-area padding:
`.command-age-row` with `.command-age-button`, and `.command-reason` displaying
the actual blocking need. `.bottom-nav` has Life, World, People, Activities,
and More (opens menu). It appears on all game views. Reserve enough page bottom
padding so controls never cover story, forms, map, or combat. 46px hit targets.

`.menu-drawer` is an accessible dialog/drawer with `.drawer-heading`,
`.drawer-links` listing all views, `.drawer-section-label`, and `.drawer-tools`.
Use actual button operations; Escape/backdrop/close and navigation dismiss it.
Modal scroll locking and focus restoration must work on phones and desktop.

Life is `.life-phone-layout`: `.life-current` holds actual current scene, battle,
dungeon, road, project, conversation reminder, and calendar obligations. The main
`.life-feed.panel` has `.feed-heading`, `.life-feed-list`, and age-grouped
`.age-ledger` details with `.age-stamp` and `.life-entry` articles. Narration is
the actual journal, not fabricated activity. Show recent two ages open, keep old
ages expandable. `.life-actions-shortcuts` has compact routes to Family/school,
Activities, Quests. The full Chronicle remains accessible.

Add the `activities` view containing existing actual Life actions with
`.life-activity-grid` categories and `.activities-detail` section; filters preserve
existing IDs. All previously visible quick actions must remain reachable. Keep
specialized Family, School, Workshop, Lore, Character, Pack, Party views.

`.life-tools` remains as compact secondary links for existing browser scripts,
but CSS may hide it on the Life screen because shortcuts/drawer cover those paths.

Creation retains every field/name and #character-form. `.creation-hero` is a
dark illustrated book cover, `.creation-landscape` uses the generated scene.
Actual artwork is a CSS background URL('./art/dark-pilgrim.webp'); root updates
offline bundling for WebP alongside SVG. Preserve fallback artwork if asset isn't
ready. Hero copy/title is concise and dark fantasy. No game title change.

## Safety of presentation

Visible Age up reasons mirror the engine gates, including existing road journeys
and legacy annual plans. Resolve controls stay available in Life. New menu
navigation never spends time or changes saved simulation state. Keep the current
save key and every legacy pending scene/thread/battle/project exactly loadable.

Respect prefers-reduced-motion, escape supplied names, preserve SVG IDs and
ARIA, and support narrow 360px screens, keyboard focus, and high contrast text.
