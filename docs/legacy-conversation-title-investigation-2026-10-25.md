# Repeated legacy conversation titles

Read-only investigation on 25 October 2026 following the user's report that older conversations display the same name. No saved titles, messages or schema were changed.

- The configured database contains 28 active sessions titled `Pharmacology Study Session`, all with `title_source=manual`. Their shared `updated_at` is 24 October 2026 07:32:24 UTC. That timestamp can reflect the metadata backfill, and does not establish when each title was assigned.
- Historical frontend code introduced in `97488cf` explicitly sent this constant in every session-creation request. It remained in the parent of `a0e3ab5`; the current runtime sends an empty creation payload instead.
- Migration `20261024090000_conversation_discovery.sql` classified every existing non-`New Chat` title as manual. This includes the historical placeholder, so automatic naming correctly skips those records under the current manual-title protection rule.
- Current title generation is restricted to the requested owned pending session. Metadata reads and opening the mobile sheet do not rename conversations. Current rename requests are scoped to one owned session.
- The evidence explains the repeated persisted placeholder. It does not establish that distinct previous titles were overwritten today, or provide an exact recovery mapping. Existing title/owner guards remain in place; do not blanket-regenerate manual titles or claim invented replacements are restored originals.

Recovery remains separate: find an authoritative backup/history mapping, or obtain an explicit decision to generate replacement titles from the affected conversations using a reviewed, reversible procedure. No repair has been applied. The existing mocked title/session tests passed 18/18.

Recommended repair if exact historical names are unavailable: snapshot the affected IDs, owners, titles, sources and update timestamps in a private operator backup; propose replacements from each selected conversation through the existing authorized backend title generator; review the mapping; apply only rows whose placeholder, owner and timestamp still match the snapshot. Preserve later user renames and keep a rollback mapping. Regenerated labels are new names, not recovered originals. Do not reset every manual title to pending or run provider calls merely by opening history.

Notion handoff pending: record this as an investigation with verified read-only findings and unresolved historical-title recovery. No connector was available; no Notion write is claimed.
