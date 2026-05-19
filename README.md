# PiNetwork Business Technology Portal

First-version, web-only customer portal prototype for **PiNetwork** — an
Australian ICT service provider for multi-site SMBs (restaurants, retailers,
multi-store businesses).

This repo is a **front-end-only Next.js prototype** with mock data. There is no
real Salesforce, MDM, RMM, payment or auth integration. The purpose is to give
PiNetwork and its customers a tangible look at what the portal experience will
feel like.

> Customer used in mock data: **ABC Restaurant Group** with 5 sites
> (Melbourne CBD, Box Hill, Springvale, Sydney, Brisbane).

---

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS 3**
- **Lucide** icons
- All UI components are local (Tailwind-based, shadcn-style API). No third-party
  UI library is required.
- Mock data only — no API calls, no auth.

---

## How to run

### Prerequisites
- Node.js **22 LTS** (Node 20 LTS also works)
- npm 10+

### Install + dev
```bash
npm install
npm run dev
```

Open **http://localhost:3000** for the public landing page, or
**http://localhost:3000/portal** to jump straight into the customer portal.

The dev script binds to `0.0.0.0` so it's reachable from other machines on the
network (e.g. when running on the `customerportal` server at
`http://172.16.88.222:3000`).

### Production build
```bash
npm run build
npm run start
```

### Lint
```bash
npm run lint
```

---

## What's in the prototype

### Public website (`/`)
A single landing page with anchored sections:
1. **Hero** — "One portal to manage your business technology support."
2. **Built for multi-site businesses** — site list, centralised visibility points.
3. **Services overview** — 8 service cards.
4. **Lifecycle Management and Maintenance** — 9 lifecycle stages.
5. **Customer Portal preview** — sample dashboard panel.
6. **Referral Program** — code, link, credit summary.
7. **CTA** — "Ready to consolidate your business technology?"

### Customer Portal (`/portal/*`)
Sidebar shell with the requested nav items:

| Route | Page |
| --- | --- |
| `/portal` | Overview |
| `/portal/sites` | My Sites (with side-panel detail) |
| `/portal/devices` | My Devices (filters by site, status, search) |
| `/portal/tickets` | Support Tickets + Create Ticket modal (?create=1) |
| `/portal/services` | My Services + Service Coverage Matrix |
| `/portal/lifecycle` | Lifecycle & Maintenance |
| `/portal/projects` | Projects |
| `/portal/help` | Help & Training |
| `/portal/account` | Account + Referral Program |

### Highlighted multi-site signals (mock data)
- Box Hill Store: **no 4G Backup** (recommended).
- Springvale Store: **Endpoint Support is Partial** (4 devices not enrolled).
- Sydney Store: **CCTV not under maintenance plan** (gap → critical).
- Service Coverage Matrix shows the same gaps as Yes / No / Partial /
  Recommended cells.

### Interactions implemented
- Open / close site detail side panel.
- Filter devices by site, status, free-text search.
- Filter tickets by status tab + site dropdown.
- Open Create Ticket modal from many entry points (`?create=1` query, button,
  device row link, site action). Submitting adds a mock ticket to the list.
- Copy referral code / link to clipboard.
- Mobile drawer navigation.

---

## Code structure

```
src/
├── app/
│   ├── layout.tsx, globals.css, page.tsx (public landing)
│   └── portal/
│       ├── layout.tsx
│       ├── page.tsx                 (Overview)
│       ├── sites/page.tsx
│       ├── devices/page.tsx
│       ├── tickets/page.tsx
│       ├── services/page.tsx
│       ├── lifecycle/page.tsx
│       ├── projects/page.tsx
│       ├── help/page.tsx
│       └── account/page.tsx
├── components/
│   ├── ui/         (Card, Badge, Button, Modal, StatTile, PageHeader, StatusBadges)
│   ├── portal/     (PortalSidebar, PortalHeader, MobileNav, CreateTicketModal, ReferralPanel)
│   └── public/     (PublicHeader, PublicFooter)
└── lib/
    ├── types.ts    (Site, Device, Ticket, Service, Project, Maintenance, Referral, …)
    ├── data.ts     (all mock data + selectors)
    └── utils.ts    (cn, formatDate, currency, relativeDays)
```

Domain types in `lib/types.ts` are intentionally close to what eventually will
back into Salesforce so swapping mock data for real API calls is mostly a
data-fetching change, not a UI rebuild.

---

## Future integration notes

### Salesforce (data backbone)
Map the prototype types to the following standard / custom Salesforce objects:

| Prototype type | Salesforce object |
| --- | --- |
| `CompanyProfile` | Account |
| `Contact` | Contact |
| `Site` | Account (record type "Site") **or** custom `Site__c` |
| `Device` | Asset (with custom `Service_Coverage__c`, `Lifecycle_Stage__c`) |
| `Ticket` | Case |
| `ServiceModule` | Service Contract / Entitlement |
| `Project` | Custom `Project__c` or Opportunity → Project |
| `MaintenanceItem` | custom `Maintenance__c` |
| `ReferralActivity` | custom `Referral__c` |

Implementation path:
1. Replace `src/lib/data.ts` with thin server functions in
   `src/lib/sf/` that hit Salesforce via REST/Composite API or via a backend
   service. Keep the same types so pages do not change.
2. Use Next.js Server Components for read-heavy pages (Sites, Devices, Tickets
   list) so customer data never leaves the server.
3. Create / update flows (Create Ticket, Request Maintenance, Request Device
   Replacement) post via Salesforce REST. Keep them as **requests** — the
   portal must not directly mutate device configuration.

### Auth
Add NextAuth (or your existing SSO provider) with **per-Account scoping**
enforced server-side: every Salesforce query must be filtered by the user's
Account / contact role, never trust the client.

### Monitoring / MDM / RMM
- Network: integrate with the Ruijie Cloud API (already documented internally)
  to populate device health, last-seen, AP heatmaps. Surface as read-only
  signals on Devices and Site detail.
- Endpoint: pull device inventory and patch status from your MDM/RMM (e.g.
  Intune, NinjaOne) into the Device list and Lifecycle page.
- CCTV: pull status from Hikvision / NVR systems where available — otherwise
  show "Not Monitored" so the gap is visible.

### Notifications
Out of scope for this prototype. When wired:
- Email via SendGrid / Microsoft Graph.
- SMS via Twilio.
- Slack / Teams via existing PiNetwork bot infrastructure.
- All notifications should be additive — the portal remains the source of
  truth.

---

## Boundaries (intentionally NOT in this prototype)

- ❌ No native mobile app (Web only — responsive layout instead).
- ❌ No real Salesforce API.
- ❌ No real payment processing.
- ❌ No real authentication or user management.
- ❌ No technical logs / config exposed to customers.
- ❌ No direct firewall / VLAN / VPN / network configuration changes.
- ✅ Remote actions are always **requests** (Create Ticket, Request
  Maintenance, Request Replacement) — never direct execution.

---

## Assumptions made while building this

- Customer is multi-site and views the portal as an *operating tool*, not a
  marketing brochure. Pages lead with operational data, not product copy.
- "Service Coverage Matrix" is the highest-signal artefact for multi-site
  customers — given a top-of-page slot in `/portal/services`.
- "Lifecycle & Maintenance" is a first-class navigation item, not a sub-tab —
  PiNetwork's positioning is whole-lifecycle, not break-fix.
- Referral credits are never cash. UI consistently says "credit on account".
- The mock customer's gaps (Box Hill 4G, Sydney CCTV, Springvale Endpoint) are
  visible in at least three places (Site card, Service Coverage Matrix,
  Lifecycle risk recommendations) so an Operations Director sees the same
  story regardless of which page they open first.
