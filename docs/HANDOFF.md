# PI Network Customer Portal — Handoff Doc

Internal-only customer portal for PI Network customers (L1) and their delegated contacts (L2). Admin staff (L0) manage everything from `/admin`.

Last updated: 2026-05-10.

---

## 1. Quick Start

### Server
- **Host**: `172.16.88.222` (hostname `customerportal`), Ubuntu 24.04
- **SSH**: `ssh pinetwork@172.16.88.222` (password auth — see internal vault)
- **App lives in**: `/home/pinetwork/pinetwork-portal/`
- **systemd unit**: `pinetwork-portal.service` (enabled, listens `127.0.0.1:3000`)
- **nginx**: `/etc/nginx/sites-available/customerportal` reverse-proxies 443 → 3000, with `client_max_body_size 150m` for pcap uploads
- **TLS**: self-signed cert at `/etc/ssl/pinetwork/customerportal.{crt,key}`, SAN includes `customerportal`, `customerportal.local`, `customerportal.pinetwork.local`, `IP:172.16.88.222`. Expires 2028-08-10
- **Internal-only access** (no public DNS / cert)

### Common ops
```bash
# View status / logs
sudo systemctl status pinetwork-portal
sudo journalctl -u pinetwork-portal -f

# Deploy new code (typical loop)
cd ~/pinetwork-portal
# (drop new files in)
npm run build
sudo systemctl restart pinetwork-portal

# Reload nginx (after editing /etc/nginx/sites-available/customerportal)
sudo nginx -t && sudo systemctl reload nginx
```

### Bootstrap admin
- First admin: `mingyao.li0216@gmail.com` (Mario Li), seeded in `data/users.json`
- No SMTP wired — invite URLs are generated in `/admin/users` and given to the user manually

---

## 2. Architecture

- **Framework**: Next.js 15 App Router + React 19 + TypeScript + Tailwind 3 + Lucide icons
- **Storage**: JSON files on disk (`data/*.json`). No database. Atomic writes via temp + rename.
- **Auth**: scrypt password hashing + cookie-based sessions (`pi_sid`, 7-day TTL). Cookie `secure: process.env.PORTAL_HTTPS === "1"`.
- **Middleware** (`src/middleware.ts`): gates `/portal/*` and `/admin/*` routes; redirects unauthenticated to `/login?next=…`.
- **Module init pattern**: `src/lib/data.ts` exports mutable arrays (sites, devices, tickets, etc.). `src/lib/server-data.ts` is server-only and on first import (Node caches modules) loads JSON files from disk into those arrays. To persist, mutate the array in-place and call `persistX()`.

### Why JSON files (not Postgres)
- Single-writer (one Next.js process), small dataset, internal tool.
- Easy to back up (just tar `data/`), inspect (jq), and seed.
- Trade-off: no concurrent multi-process writes, no transactional integrity. If usage outgrows this, swap to SQLite or Postgres — keep the same `lib/server-data.ts` interface.

---

## 3. User Model

Three levels:

| Level | Description | Permissions |
|---|---|---|
| **L0** | PI Network Admin (`isAdmin=true`, `parentUserId=null`) | Full access to `/admin/*` |
| **L1** | Customer Admin (`isAdmin=false`, `parentUserId=null`) | Access only to sites in `permissions[siteId]`. Can create L2 contacts under self. |
| **L2** | Contact (`parentUserId=<L1 id>`) | Subset of L1's permissions. Can't create more contacts. |

**Permissions matrix**: `user.permissions: Record<siteId, ServiceCategory[]>`.
Modules: `network`, `voice`, `cctv`, `pos`, `endpoint`, `it_support`, `projects`, `traffic_analysis`.
L1 → L2 must be a subset (enforced front + back).

**Site Groups** (`/admin/site-groups`): named bags of site IDs. From a user's edit screen, "Bulk Grant from Site Group" lets you grant access to many sites at once with one click. Groups are syntactic sugar — they expand into per-site entries in `user.permissions` at apply time, so deleting a group doesn't revoke previously-granted access.

---

## 4. Routes Map

### Public
- `/` — root (likely redirects to login or portal)
- `/login` — sign in
- `/forgot` — password reset request
- `/set-password?token=…` — set initial / reset password (invite flow)

### Customer (`/portal/*`, requires session)
- `/portal/sites` — site list
- `/portal/sites/[siteId]` — site detail. **7 tabs**: network / voice / cctv / pos / endpoint / it_support / projects (+ traffic_analysis). Tabs are gated by the user's per-site permissions.
  - Top-right corner of every device card has **"More Details"** (links to device detail page) + **"Create Ticket"**
  - Bottom-right floating button **"Ask about <site>"** opens **per-site chat** (LLM scoped to this site only)
- `/portal/sites/[siteId]/devices/[deviceId]` — device detail page. Big photo + thumbnail strip + lightbox; admin-authored notes; full specs; service coverage chips
- `/portal/account` — account page (referral panel, payment methods card)
- `/portal/account/contacts` — L1 manages L2 contacts
- `/portal/store` — browse catalog (image cards + featured row + category filter)
- `/portal/store/[itemId]` — product detail page (gallery + lightbox + markdown long description + qty stepper + site picker + add-to-order). Order submit auto-creates one ticket per category, routed to that team.
- `/portal/tickets` — view all tickets across user's accessible sites
- `/portal/projects` — read-only project list
- `/portal/lifecycle` — device lifecycle / warranty view
- `/portal/help` — help articles (currently hardcoded; no admin yet)

### Admin (`/admin/*`, requires `isAdmin=true`)
- `/admin` — dashboard
- `/admin/users` — user CRUD + per-site permissions matrix + Bulk Grant from Group
- `/admin/sites` — site list + "New Site" (with Google Places autocomplete on Address)
- `/admin/sites/[siteId]` — **the big one**. Site profile editor + device editor below. See §5
- `/admin/site-groups` — Site Group CRUD
- `/admin/orders` — orders submitted from Store
- `/admin/catalog` — Store catalog CRUD
- `/admin/tickets` — all tickets, status/team/latest-update editor (see §5)
- `/admin/projects` — project CRUD with progress bar
- `/admin/chat-handoffs` — when a customer clicks "Human" in chat, request lands here

---

## 5. Site Editor (the central admin tool)

**Path**: `/admin/sites/[siteId]` ([SiteProfileEditor.tsx](../src/app/admin/sites/[siteId]/SiteProfileEditor.tsx))

Hierarchy:
```
Site Profile
├─ Basic fields: Name / State / Address (Google Places autocomplete) / Health
├─ Services Covered (multi-select chips)
├─ Main Site Contact (name, role, phone, email)
├─ Support Pack
├─ Notes
└─ Service Modules (the new section, ordered by category)
   ├─ Network
   │  ├─ Vendor (Ruijie / Ubiquiti / TP-Link) + vendor-side site identifier
   │  ├─ "Sync from Ruijie" / "Probe UniFi" buttons (vendor-specific)
   │  ├─ ▸ Access Network (Upstream WAN)         [sub-section]
   │  │   • Type / Carrier / Plan Speed / Failover
   │  │   • Plan Speed dropdown grouped by tier (Residential NBN / Business NBN / Enterprise Ethernet / Wireless)
   │  │   • Carrier dropdown: Telstra / Aussie Broadband / Superloop / Lightning Broadband / Uniti / Other
   │  ├─ ▸ ABB Carbon Outage Link                [sub-section]
   │  │   • "Search Carbon by address" → modal → pick service → link
   │  │   • Powers /api/account/sites/[id]/outage-check
   │  └─ ▸ LAN Addressing                        [sub-section]
   │      • LAN /24 prefix; auto-detected by Ruijie sync
   │      • DHCP pool readout (gateway / range / mask)
   ├─ Network Diagnostics (Pcap Scan)
   │  • Upload .pcap/.pcapng/.cap (max 120 MB)
   │  • tshark extracts ARP / DHCP / mDNS / HTTP-UA / TLS-SNI / ports
   │  • OUI table classifies hosts by MAC vendor
   │  • Qwen3.6-plus classifies anything left "unknown"
   │  • Device Discovery table: Category / IP / MAC / Vendor / Hostname / Evidence / Why
   ├─ Voice
   │  • Mode: Default PBX vs Customer custom domain
   │  • Extensions to monitor (comma-separated)
   ├─ CCTV & Alarm
   │  • Cameras: vendor (Hik / Dahua / TP-Link / Other) / IP / user / password (write-only)
   │  • Alarm: vendor (Hik / Dahua / Ajax / Bosch / Other) / IP / user / password (write-only)
   │  • Ping status badges (camera + alarm) — auto-refresh on open
   │  • Passwords stored in data/cctv-credentials.json (mode 0600), never returned by API
   ├─ Point of Sale
   │  • Vendor (Abacus / Pisell / Square) + Managed-by-us toggle
   │  • Sunmi platform site name (when managed)
   │  • On-prem terminal IP (optional, ping)
   └─ Endpoint Management
      • Atera customer name + "Probe Atera" button
      • Live agents on the customer-facing Endpoint tab read from /api/account/sites/[id]/atera-agents (60s cache)
```

Below the profile editor: **Devices section** (`AdminSiteEditor.tsx`)
- One row per device with: photo, name/type/brand/model, asset/serial, status/lifecycle/warranty, service coverage
- Edit / Upload primary photo / Remove photo / Delete device
- **Notes** textarea (saved per-device, shown verbatim on customer "More Details" page)
- **Additional location photos gallery** (up to 8, customer can swipe through)
- "Add device" button opens DeviceFormModal

---

## 6. Integrations

All keys in `~/pinetwork-portal/.env.local` (mode 600, pinetwork-owned). Loaded automatically by Next.js. Never commit.

| Integration | Env var | Purpose | Endpoint / cost |
|---|---|---|---|
| **ABB Carbon** | `CARBON_BRIDGE_URL` (defaults to `http://172.16.88.3:8089`) | Real outage status per linked site | Goes via `abb-carbon-bridge.service` on Organ (FastAPI). Bridge holds the actual ABB Carbon credentials at `~/.openclaw/agents/main/workspace/.openclaw/abb-carbon{-token}.json`. See `project_abb_carbon_integration.md` in claude memory |
| **UniFi Site Manager** | `UBIQUITI_API_KEY` | Probe site existence + device counts | `https://api.ui.com/v1/sites`. Search `meta.desc` (friendly name); `meta.name` is a random short ID. NB: per-site device listing not exposed in this API — we only return `statistics.counts` |
| **Atera RMM** | `ATERA_API_KEY` (same value as Jimmy's `~/.hermes/.env`) | Live endpoint agents per site | `https://app.atera.com/api/v3/customers` + `/agents/customer/{id}`. Limited to 50/page, 700 req/min. We cache per-site for 60s |
| **OpenRouter** | `OPENROUTER_API_KEY` + `OPENROUTER_CHAT_MODEL` (default `qwen/qwen3.6-plus`) + `OPENROUTER_PCAP_MODEL` (default same) | Per-site customer chat + pcap device discovery | `https://openrouter.ai/api/v1/chat/completions`. Qwen3.6-plus is multimodal (text/image/video) — image upload in chat works |
| **Google Places** | `GOOGLE_MAPS_API_KEY` | Address autocomplete in admin site editor | `https://places.googleapis.com/v1/places:autocomplete` (NEW). Project `625539470578`. Billing linked. Application restrictions = None (server-side only). |
| **Ruijie Cloud** | (creds in `data/ruijie.env`) | AP/Switch/Gateway inventory + LAN auto-detect | Per-customer creds. See `src/lib/ruijie.ts` and `ruijie-sync.ts` |
| **mcpserver** | `MCPSERVER_HOST=172.16.88.80` | (reserved for future bot-dispatch use; not currently called from portal code) | — |

### Adding a new key
```bash
echo 'NEW_KEY=value' >> ~/pinetwork-portal/.env.local
sudo systemctl restart pinetwork-portal   # required for env vars to take effect
```

---

## 7. Per-site Customer Chat

`/portal/sites/[id]` floating button "Ask about <site>" opens [SiteChat.tsx](../src/components/portal/SiteChat.tsx).

- POSTs to `/api/account/sites/[id]/chat` with full conversation history (max 12 turns retained).
- Server prompt builder ([chat/route.ts](../src/app/api/account/sites/[siteId]/chat/route.ts)) injects: site profile, devices, recent 8 tickets, access network, all service module configs, last outage report.
- Auth: `canAccessSite(me, siteId)` — customers only chat about their own sites.
- Model is told: "don't know → say so; don't fabricate device names, IPs, ticket numbers."
- **Image attachment**: multimodal `content` array `[{type:"text"}, {type:"image_url",image_url:{url:"data:..."}}]`, max 4 MB per image.
- **Voice input**: browser Web Speech API (`SpeechRecognition`), transcribed into text input, user can edit before sending. Hidden if browser unsupported.
- **Switch to human**: posts to `/api/account/sites/[id]/chat/handoff`, stored in `data/chat-handoffs.json`. Admin sees pending count badge in left nav + manages at `/admin/chat-handoffs` (Claim / Mark Resolved).

---

## 8. Data Files (`~/pinetwork-portal/data/`)

| File | Owner | Notes |
|---|---|---|
| `users.json` | scrypt password hashes + permissions matrix | Primary auth store |
| `sessions.json` | session cookies | TTL 7 days |
| `invites.json` | pending invitations | TTL 7 days |
| `sites.json` | site records (profile + service modules + access network + Carbon link + LAN) | Persisted on edit |
| `devices.json` | device records (asset, photo URL, etc.) | Persisted on edit |
| `device-overrides.json` | admin-only per-device fields (assetNumber override, notes, gallery) | Notes shown on customer device detail |
| `cctv-credentials.json` | mode 0600 — CCTV/alarm passwords | NEVER returned via API |
| `tickets.json` | ticket records | Created via customer ticket modal, edited via `/admin/tickets` |
| `projects.json` | project records | Full CRUD via `/admin/projects` |
| `maintenance.json` | maintenance items (scheduled/due/overdue/completed) | CRUD via `/admin/maintenance`. Wiped from data.ts demo on init |
| `help-articles.json` | KB articles | CRUD via `/admin/help-articles`. Demo seed wiped on init; load JSON authoritative |
| `activity.json` | append-only audit log (last 500 entries) | Auto-written by `lib/activity.ts` `recordActivity()` from mutation routes. View at `/admin/activity` |
| `referral.json` | global referral program (code, link, credit, activity[]) | CRUD via `/admin/referral`. **Currently single global program** — per-user codes are a TODO |
| `catalog.json` | Store catalog items | Full CRUD via `/admin/catalog` |
| `orders.json` | customer orders from Store | Edited via `/admin/orders` |
| `payment-cards.json` | customer-stored payment methods (stub) | — |
| `reset-requests.json` | password reset requests | — |
| `site-groups.json` | named bags of site IDs (admin-only) | Used by Bulk Grant from Group |
| `chat-handoffs.json` | "switch to human" requests from per-site chat | Managed at `/admin/chat-handoffs` |
| `ruijie.env` | Ruijie Cloud credentials | Loaded by `lib/ruijie.ts` |

`public/uploads/devices/<id>-<timestamp>.<ext>` — uploaded device photos. Cleanup happens automatically when the photo is replaced or device deleted.

---

## 9. Admin Inventory (what's wired)

| Page | Path | What it manages |
|---|---|---|
| Dashboard | `/admin` | Landing |
| Users | `/admin/users` | CRUD + permissions matrix + bulk grant from group |
| Sites & Devices | `/admin/sites` (+ `[siteId]`) | The big editor — see §5 |
| Site Groups | `/admin/site-groups` | Named bags of sites for bulk-grant |
| Orders | `/admin/orders` | Customer orders submitted from Store |
| Store Catalog | `/admin/catalog` | Items customers see in Store |
| Tickets | `/admin/tickets` | Status / assigned team / latest-update on every ticket |
| Projects | `/admin/projects` | Project CRUD with progress bar |
| Maintenance | `/admin/maintenance` | Schedule + complete maintenance items (per-site or per-device) |
| Help Articles | `/admin/help-articles` | KB CRUD with markdown body (rendered on `/portal/help` via react-markdown) |
| Referrals | `/admin/referral` | Global referral code/link/credit pool + activity CRUD |
| Activity Log | `/admin/activity` | Auto-recorded mutations across tickets / projects / maintenance |
| Chat Handoffs | `/admin/chat-handoffs` | Customer requests for human takeover from chat |

Inside `/admin/sites/[siteId]` editor, Service Modules section also includes:
- **Service Coverage Matrix** — per-service Yes / Partial / Recommended / No / "not assessed". Stored on `site.coverage`.

---

## 10. Known Gaps / Roadmap

Customer-facing features that don't yet have admin counterparts:

1. **Per-user referral codes** — current referral program is global. Real implementation should give each L1 customer their own promo code + credit balance. Reuse `lib/referral-store.ts` shape but key by user id.
2. **Per-vendor live network sync** — UniFi/Ruijie sync gives counts but not per-device list. UniFi requires controller-local API (separate auth model). TP-Link Omada not implemented.
3. **Voice extension monitoring** — config stored, but no live SIP registration check
4. **POS Sunmi integration** — config stored, no live device status
5. **Customer-side activity feed widget** — `recordActivity()` writes to `data/activity.json` and `/admin/activity` shows it; could be filtered per-user-accessible-sites and shown on customer dashboard.

Done in 2026-05-10 round 2: react-markdown on `/portal/help` (clickable card → modal renders bodyMarkdown), Activity feed auto-gen (recordActivity wired into ticket / project status / maintenance complete), Referral admin (global program metadata + per-referral CRUD) at `/admin/referral` and `/admin/activity` viewer.

Done in 2026-05-10 round 3 (Store e-commerce upgrade): CatalogItem extended with imageUrl / gallery / brand / longDescription / leadTimeDays / stockStatus / featured / minQty / maxQty / tags. Admin catalog modal got image upload (primary + gallery up to 8) — only available after first save. Customer Store has bigger image cards with stock badges + featured row. New product detail page `/portal/store/[itemId]` with gallery, markdown body, qty stepper, site picker, add-to-order. **Order submission auto-creates one ticket per category** routed to the right team (network → Network, voice → Voice, pos → POS & Payments, cctv → CCTV & Alarm, endpoint → Endpoint, it_support → IT Support, materials → Operations). Each auto-created ticket gets a description with the order #, line items, and customer note. Logged in `data/activity.json`.

### Other todos
- Pcap "Adopt to inventory" — turn discovered devices into Device records with one click
- Per-device live data on More Details (Atera/UniFi/Ruijie lookup by MAC or hostname)
- Multiple device gallery photos already done — could add EXIF stripping for privacy
- Backups: nightly `tar czf data-$(date +%Y%m%d).tgz data/` to NAS would be cheap insurance

---

## 11. Deployment Cheatsheet

### Code change (typical)
```bash
# from your laptop
scp my-changes.tgz pinetwork@172.16.88.222:/tmp/
ssh pinetwork@172.16.88.222
cd ~/pinetwork-portal
tar -xzf /tmp/my-changes.tgz
npm run build      # always — type errors caught here
sudo systemctl restart pinetwork-portal
sudo journalctl -u pinetwork-portal -f   # tail logs while smoke-testing
```

### Adding tshark (for pcap analysis)
Already installed (4.2.2 from apt). If you ever rebuild the host:
```bash
sudo apt install -y --no-install-recommends tshark
```

### Adding new env var
```bash
echo 'NEW_VAR=value' >> ~/pinetwork-portal/.env.local
sudo systemctl restart pinetwork-portal
```

### Backup
```bash
# Run nightly via cron, send to NAS
tar czf /tmp/portal-data-$(date +%Y%m%d).tgz -C ~/pinetwork-portal data
# rsync /tmp/portal-data-*.tgz to NAS share
```

### Restore (if data corrupts)
```bash
sudo systemctl stop pinetwork-portal
cd ~/pinetwork-portal
mv data data.broken
tar xzf /path/to/portal-data-YYYYMMDD.tgz
sudo systemctl start pinetwork-portal
```

---

## 12. Code Layout Cheatsheet

```
src/
├── app/
│   ├── (root)/               # public pages: /, /login, /forgot, /set-password
│   ├── portal/                # customer-facing pages (gated by middleware)
│   │   ├── sites/[siteId]/
│   │   │   ├── SiteDetailClient.tsx       # the 7-tab site detail
│   │   │   └── devices/[deviceId]/        # the device detail page
│   │   ├── store/                         # Store browse + cart
│   │   ├── tickets/                       # customer ticket list
│   │   ├── projects/                      # customer project list
│   │   └── ...
│   ├── admin/                 # admin pages (gated by middleware + isAdmin check)
│   │   ├── sites/[siteId]/
│   │   │   ├── SiteProfileEditor.tsx      # the heavy editor (§5)
│   │   │   ├── AdminSiteEditor.tsx        # device list + notes + gallery
│   │   │   └── DeviceFormModal.tsx        # add/edit device modal
│   │   ├── users/                         # user CRUD + permissions matrix
│   │   ├── site-groups/                   # site groups CRUD
│   │   ├── tickets/                       # ticket list + status editor
│   │   ├── projects/                      # project CRUD
│   │   ├── catalog/                       # store catalog CRUD
│   │   ├── orders/                        # order list + admin actions
│   │   └── chat-handoffs/                 # human handoff queue
│   └── api/
│       ├── auth/                          # login / logout / forgot / set-password
│       ├── account/                       # customer-facing endpoints
│       │   └── sites/[siteId]/
│       │       ├── chat/{,handoff}/route.ts
│       │       ├── tickets/route.ts        # POST creates a ticket
│       │       ├── outage-check/route.ts   # Carbon + synthetic
│       │       └── atera-agents/route.ts   # live Atera RMM list
│       └── admin/                         # admin-only endpoints
│           ├── users/                     # ...
│           ├── sites/[siteId]/
│           │   ├── route.ts                # PATCH site profile
│           │   ├── module-status/route.ts  # ping camera/alarm/POS
│           │   ├── pcap/route.ts           # device discovery upload
│           │   ├── sync-ruijie/, sync-unifi/, sync-atera/
│           │   └── ...
│           ├── devices/[deviceId]/{route,photo,gallery}/route.ts
│           ├── catalog/, projects/, tickets/, site-groups/, places/, chat-handoffs/
├── lib/
│   ├── data.ts                # in-memory arrays (sites, devices, tickets, …)
│   ├── server-data.ts         # JSON load/persist (server-only)
│   ├── store.ts               # users / sessions / invites / device-overrides
│   ├── auth.ts                # scrypt + cookie sessions + canAccessSite()
│   ├── types.ts               # all domain types
│   ├── ruijie.ts, ruijie-sync.ts
│   ├── unifi.ts               # UniFi Site Manager API client
│   ├── atera.ts               # Atera v3 client
│   ├── carbon-bridge.ts       # HTTP client → abb-carbon-bridge on Organ
│   ├── outage-real.ts         # Carbon → portal OutageReport (server-only)
│   ├── access-network.ts      # ACCESS_TYPES + synthetic outage fallback
│   ├── openrouter.ts          # OpenRouter chat client (multimodal)
│   ├── pcap-discover.ts       # tshark + OUI + LLM device discovery
│   ├── ping.ts                # server-side ICMP probe with cache
│   ├── oui.ts                 # MAC OUI → vendor + category hint
│   ├── catalog-types.ts, store-catalog.ts
│   ├── chat-handoffs.ts, site-groups.ts, cctv-credentials.ts
│   └── discovery.ts, discovery-server.ts, traffic.ts, support-packs.ts
└── components/
    ├── portal/                # customer-side reusable UI
    │   ├── SiteChat.tsx, CreateTicketModal.tsx
    │   ├── PortalHeader/Sidebar/MobileNav, LogoutButton, ReferralPanel
    │   └── PaymentMethodsCard
    ├── admin/                 # admin-side reusable UI
    │   └── AddressAutocomplete.tsx
    └── ui/                    # generic primitives (Button, Card, Modal, Badges)
```

---

## 13. Tips for Future Maintainers

- **Always run `npm run build` before restart** — type errors surface here, not at runtime in dev mode
- **Module init order matters**: `data.ts` defines the in-memory arrays AND wipes them on import (so the demo data doesn't ship). `server-data.ts` then loads from JSON files into the same arrays. If you add a new persisted entity, add it to `server-data.ts` in the same pattern.
- **Server-only imports**: anything that imports `"server-only"` cannot be in any module reachable from a `"use client"` component. If you mix them, build fails. We learned this with `carbon-bridge.ts` → `outage-real.ts` split. See `feedback_nextjs_server_only_dynamic_import.md` in claude memory for the gory details.
- **CCTV passwords**: never expose them. The pattern is: write-only field in the form (admin types new pw → save), bool flag `cctvCameraPasswordSet` lives on the site, actual values in `cctv-credentials.json` (0600). Don't add a "show password" feature.
- **Live API caches**: 60s TTL on Atera per-site, 60s on Carbon outage, 30s on ping probes. Per-host pcap analysis bypasses cache (file is unique). Tune as needed.
- **OpenRouter spend**: Qwen3.6-plus is currently chosen for both chat and pcap. Cheap (~$0.50 per million tokens). Set `OPENROUTER_CHAT_MODEL` / `OPENROUTER_PCAP_MODEL` env vars to override per-purpose.
- **Google Places billing**: $200/month free credit covers ~10K autocomplete sessions. Set a budget alert in Google Cloud → Billing → Budgets.
- **Backups**: there is no automated backup yet. Critical TODO. Cheap fix: nightly cron `tar czf data-$(date +%Y%m%d).tgz data/` + rsync to NAS.

---

## 14. Operational Contacts

- **Primary engineer**: Mario Li (mingyao.li0216@gmail.com)
- **Internal bot fleet**: 17 Hermes/OpenClaw bots, central manager LuigiV2 (172.16.88.2)
- **Issue tracker**: handled via Salesforce Cases + Slack channels (per existing PI Network workflow)
- **For Atera key rotation**: also update Jimmy (172.16.88.6) `~/.hermes/.env` to keep portal + bot fleet in sync
- **For Carbon outage issues**: SSH to Organ (172.16.88.3) and check `systemctl status abb-carbon-bridge`
