# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the server

```bash
node server.js
```

Opens at `http://localhost:3000`. No dependencies — uses only Node.js built-ins.

## Architecture

This is a zero-dependency Node.js proxy server + HTML frontend for viewing TxDOT traffic camera feeds near Fort Worth.

**Why a proxy server?** The TxDOT ITS API (`its.txdot.gov`) does not set CORS headers, so browser fetches are blocked. The server proxies requests server-side.

**TxDOT API (undocumented, reverse-engineered):**
- Base: `https://its.txdot.gov/its`
- Camera snapshot list: `GET /DistrictIts/GetCctvSnapshotListByDistrict?districtCode=FTW`
  - Returns a JSON array of `{ icd_Id: string, snippet: string }` where `snippet` is a raw base64 JPEG (no data URI prefix)
- The per-camera endpoint (`GetCctvSnapshotByIcdId`) returns 500 — use the list endpoint and filter client-side
- The site itself uses SignalR (`District/ItsHub`) for live push updates, but the REST snapshot endpoint is sufficient for polling

**Local API routes:**
- `GET /` — serves `index.html`
- `GET /api/cameras` — returns the `NEARBY_CAMERAS` list (camera IDs and display labels)
- `GET /api/snapshot?id=<icd_Id>` — fetches the full district snapshot list from TxDOT, filters to the requested camera, and returns `{ icd_Id, snippet }`

**Camera IDs near Magnolia Ave, Fort Worth (IH-35W corridor):**
- `IH35W @ Morningside` — just north of Magnolia
- `IH35W @ Berry` — just south of Magnolia
- `IH35W @ Spur280` — near downtown
- `IH30 @ Hulen` — IH-30 corridor

To find other available camera IDs, call the district snapshot list endpoint directly and inspect the `icd_Id` fields.
