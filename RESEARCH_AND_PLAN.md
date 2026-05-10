# Giapha Family State Research And Build Plan

## Comparable Apps And Useful Functions

The goal is not to copy a brand or exact interface. The useful clone target is the pattern: a visual family tree with editable people, relationships, facts, sources, events, media, privacy, and a state/history log.

| App | Useful functions to borrow |
| --- | --- |
| MyHeritage Family Tree Builder | Visual tree building, person profiles, photos, historical records, synced online family sites, charts, maps, GEDCOM import/export, and privacy controls. Source: https://www.myheritage.com/family-tree-builder |
| FamilySearch Family Tree | Free shared tree, relationship editing, source hints, memories, duplicate cleanup, fan/tree views, research tasks, and ancestor discovery. Source: https://www.familysearch.org/en/family-tree/ |
| Ancestry family trees | Invite others to view or collaborate on a tree, attach photos/stories/records, search record hints, and manage tree privacy. Source: https://www.ancestry.com/family-tree/ |
| Gramps | Open-source genealogy model with people, families, events, places, citations, sources, repositories, media, notes, filters, charts, and reports. Source: https://gramps-project.org/ |
| GenoPro | Genogram-oriented family maps with richer human-state tracking such as emotional/health/social context, custom tags, medical history, relationship patterns, and report generation. Source: https://genopro.com/ |
| Family Echo | Fast web family-tree editing, sharing by URL, and simple person cards. Source: https://www.familyecho.com/ |

## Product Direction

Clone the functional shape of GenoPro plus the simple tree editing flow of mainstream genealogy apps. For this MVP, "state" means the current and historical state of each person: living status, wellbeing, contact cadence, privacy, location, notes, tags, and dated timeline events.

## Feature Mining Plan

1. Identify repeat features across the researched apps, then prefer features that help families maintain trustworthy living records instead of only drawing ancestry charts.
2. Rank each feature by immediate usefulness, implementation size, privacy risk, and how well it fits a local-first MVP.
3. Implement high-value features that do not require a backend: visual editing, source tracking, memories, data-quality review, and privacy-safe export.
4. Leave backend-heavy features for later: multi-user roles, invitation links, GEDCOM, record hints, cloud sync, and file storage.
5. Verify with TypeScript build and a manual code-review pass before publishing.

## Implemented From The Research

| Source pattern | App inspiration | Implemented feature |
| --- | --- | --- |
| Quick person and relationship editing | Family Echo, MyHeritage | Clickable tree, search list, and add parent/partner/child workflow. |
| Evidence attached to people | Gramps, FamilySearch, Ancestry | Source ledger with type, confidence, URL/path, note, and linked person. |
| Stories and photos around people | FamilySearch Memories, Ancestry photos/stories, GenoPro picture mode | Memory links with type, privacy, date, URL, and note. |
| Problem spotting and research cleanup | GenoPro Problem Spotter, Gramps tools | Data-quality panel for missing dates, stale health/state checks, unsourced events, and parent-age anomalies. |
| Privacy for living/private people | MyHeritage privacy settings, FamilySearch living-person privacy, Ancestry sharing roles | Public JSON export that redacts private or non-shared living profiles and withholds source details. |

## MVP Scope Implemented

1. Local-first web app using React, TypeScript, Vite, and browser localStorage.
2. Seed family tree data so the app opens with a useful working example.
3. Family tree canvas with parent-child and partner relationships.
4. Click-to-select people from the tree or search list.
5. Search by name, tag, note, occupation, or place.
6. Filters for vital status and wellbeing.
7. Person profile editor for names, birth date, vital status, wellbeing, contact state, privacy, location, tags, and notes.
8. Add parent, partner, or child for the selected person.
9. State timeline with dated events for health, move, career, education, memories, status, and custom notes.
10. Dashboard metrics for total profiles, living people, watch list, private profiles, and unsourced events.
11. JSON export/import for backup and migration.
12. Responsive layout for desktop and mobile use.
13. Source ledger for records, interviews, documents, photos, web links, and other evidence.
14. Memory links for stories, photos, documents, audio, video, and other family artifacts.
15. Problem spotter for data-quality and state-maintenance review.
16. Public export that redacts private or living non-shared profiles.

## Next Backend Scope

1. Replace localStorage with a database such as SQLite/Postgres.
2. Add authentication and per-family workspaces.
3. Add role-based sharing: owner, editor, contributor, viewer.
4. Add source documents, file attachments, and photo albums.
5. Add GEDCOM import/export.
6. Add conflict history and audit logs.
7. Add health/privacy controls so sensitive state fields can be hidden by role.
8. Add tree layout improvements for complex multiple marriages and large families.
