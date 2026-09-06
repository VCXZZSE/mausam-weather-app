# Official alerts and advisories

**Current state: paused at user request.** The homepage renders a static
“No advisories available now” message for general, farming and fishing.
No advisory requests run from the homepage. Both API routes return unavailable
without contacting upstream services. The live component and provider below
are retained for later integration, and are not enabled.

The following describes the prepared, inactive integration:

The homepage card sits immediately below Today at a glance and replaces the
swimming and Garden & Crops cards. General alerts are prioritised by official
severity; farming and fishing remain visible as compact status sections.

## Current integration

Both Vercel and Fastify expose `GET /api/advisories?latitude=…&longitude=…`.
An optional six-digit `postalCode` is accepted. The existing pincode search
resolves coordinates; the advisory service reverse-geocodes those coordinates
to a district/state. The pincode is not treated as a government alert boundary.
Location lookup uses OpenStreetMap, as elsewhere in the app; all alert content
comes from government documents.

The source is NDMA Sachet's public portal index at
https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails and its linked
CAP XML documents. These responses were inspected during implementation.
The portal index is not a documented stable API contract; schema changes fail
closed. No key is needed for the currently reachable public endpoints.

Only Actual/Public CAP alerts are displayed, with their original message,
severity, issuing authority, validity and source link. Test, cancelled, expired
and future-effective messages are excluded. Cache refresh is three minutes
server-side and five minutes client-side; expiry is checked every minute in
the card. Requests and caches are bounded. No stale-success fallback is used.

## Access still required for full coverage

This is a conservative partial integration, not complete nationwide coverage.
District/state descriptors are matched exactly. Ambiguous area descriptions,
missing district resolution and unsupported polygon-only geography mark the
general category unavailable, while verified matching alerts can still appear.
The separate Sachet polygon endpoint returned 403 during verification. That
needs an approved access path before polygon-level targeting is supported.

Dedicated farming and fishing coverage is not yet connected. Empty CAP subsets
therefore show Updates unavailable, never No advisory today. Verified relevant
CAP messages can still appear in those categories. The UI's no-advisory states
are implemented and tested, but must only be enabled by a complete successful
source check. Do not replace these states with seasonal tables or weather rules.

Next source-access steps:

- IMD district/nowcast/marine API access: https://mausam.imd.gov.in/responsive/apis.php
  and https://api.imd.gov.in/public/index.php (registration/IP whitelisting).
- IMD district/block agromet feed access: https://imdagrimet.gov.in/ . Published
  district bulletins exist, but an automated feed contract has not been verified.
- INCOIS marine advisories: https://incois.gov.in/site/services/hwa.jsp . Verify
  structured access and coastal coverage before claiming no fishing advisory.
- Fishing prohibitions require the actual authority's order; a weather warning
  is not evidence of a legal fishing ban.

`VITE_ADVISORIES_API_URL` can override the endpoint. Otherwise the card uses the
origin of `VITE_WEATHER_API_URL`, or the same-origin `/api/advisories` in production.
No new API credentials are embedded in the frontend.

`lib/advisories/` and `backend/src/advisories/` are mirrored, following the existing
dual-runtime layout. Keep them identical when updating the service.
