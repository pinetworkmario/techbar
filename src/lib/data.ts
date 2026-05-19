// Mock data for the prototype. Replace with Salesforce-backed API in v2.
// Customer: ABC Restaurant Group, 5 sites across VIC/NSW/QLD.

import type {
  ActivityEntry,
  BillingCredit,
  CompanyProfile,
  Contact,
  CoverageStatus,
  Device,
  HelpArticle,
  MaintenanceItem,
  Project,
  ReferralActivity,
  ReferralProgram,
  ServiceKey,
  ServiceModule,
  Site,
  Ticket,
} from "./types";

export const company: CompanyProfile = {
  name: "ABC Restaurant Group",
  legalName: "ABC Restaurant Group Pty Ltd",
  abn: "12 345 678 901",
  industry: "Hospitality / Multi-site QSR",
  primarySupportPlan: "PI Network Multi-Site Care — 24x7",
  accountManager: "Jordan Hayes",
  sinceDate: "2024-04-12",
};

export const contacts: Contact[] = [
  {
    id: "c-owner",
    name: "Linda Tan",
    role: "Operations Director",
    phone: "+61 400 111 222",
    email: "linda@abcrestaurants.example",
  },
  {
    id: "c-it",
    name: "Marcus Wei",
    role: "IT Coordinator",
    phone: "+61 400 333 444",
    email: "marcus@abcrestaurants.example",
  },
  {
    id: "c-finance",
    name: "Priya Shah",
    role: "Finance Manager",
    phone: "+61 400 555 666",
    email: "priya@abcrestaurants.example",
  },
  {
    id: "c-cbd",
    name: "Helen Wu",
    role: "Store Manager",
    phone: "+61 400 700 100",
    email: "helen.cbd@abcrestaurants.example",
  },
  {
    id: "c-bxh",
    name: "David Nguyen",
    role: "Store Manager",
    phone: "+61 400 700 200",
    email: "david.boxhill@abcrestaurants.example",
  },
  {
    id: "c-spv",
    name: "Sarah Lim",
    role: "Store Manager",
    phone: "+61 400 700 300",
    email: "sarah.spv@abcrestaurants.example",
  },
  {
    id: "c-syd",
    name: "Tom Reilly",
    role: "Store Manager",
    phone: "+61 400 700 400",
    email: "tom.syd@abcrestaurants.example",
  },
  {
    id: "c-bne",
    name: "Aisha Khan",
    role: "Store Manager",
    phone: "+61 400 700 500",
    email: "aisha.bne@abcrestaurants.example",
  },
];

export const sites: Site[] = [
  {
    id: "site-cbd",
    name: "Melbourne CBD Store",
    state: "VIC",
    address: "Level G, 220 Collins St, Melbourne VIC 3000",
    health: "Healthy",
    servicesCovered: [
      "network",
      "fourg_backup",
      "voice",
      "pos",
      "cctv",
      "endpoint",
      "it_support",
      "microsoft",
    ],
    devicesCount: 22,
    openTickets: 1,
    maintenanceDue: 0,
    mainContact: contacts[3],
    recommendations: [
      "Wi-Fi AP firmware due for review in 30 days",
    ],
  },
  {
    id: "site-bxh",
    name: "Box Hill Store",
    state: "VIC",
    address: "Shop 42, Box Hill Central, Box Hill VIC 3128",
    health: "Warning",
    servicesCovered: [
      "network",
      "voice",
      "pos",
      "cctv",
      "endpoint",
      "it_support",
    ],
    devicesCount: 16,
    openTickets: 2,
    maintenanceDue: 1,
    mainContact: contacts[4],
    notes: "No 4G failover in place — single internet path.",
    recommendations: [
      "Add 4G Backup to mitigate single-link outage risk",
      "POS terminal POS-BXH-02 approaching warranty expiry",
    ],
  },
  {
    id: "site-spv",
    name: "Springvale Store",
    state: "VIC",
    address: "Shop 7, Springvale Plaza, Springvale VIC 3171",
    health: "Warning",
    servicesCovered: [
      "network",
      "fourg_backup",
      "voice",
      "pos",
      "cctv",
      "it_support",
    ],
    devicesCount: 14,
    openTickets: 1,
    maintenanceDue: 1,
    mainContact: contacts[5],
    notes: "Endpoint Support is Partial — 4 devices not enrolled.",
    recommendations: [
      "Enrol remaining 4 endpoints into managed Endpoint Support",
    ],
  },
  {
    id: "site-syd",
    name: "Sydney Store",
    state: "NSW",
    address: "Shop 12, 500 George St, Sydney NSW 2000",
    health: "Critical",
    servicesCovered: [
      "network",
      "fourg_backup",
      "voice",
      "pos",
      "cctv",
      "endpoint",
      "it_support",
      "microsoft",
    ],
    devicesCount: 18,
    openTickets: 2,
    maintenanceDue: 1,
    mainContact: contacts[6],
    notes: "CCTV system not under maintenance plan.",
    recommendations: [
      "Add CCTV Maintenance plan — 8 cameras outside coverage",
      "NVR firmware 2 versions behind",
    ],
  },
  {
    id: "site-bne",
    name: "Brisbane Store",
    state: "QLD",
    address: "Shop 5, 100 Queen St, Brisbane QLD 4000",
    health: "Healthy",
    servicesCovered: [
      "network",
      "fourg_backup",
      "voice",
      "pos",
      "cctv",
      "endpoint",
      "it_support",
    ],
    devicesCount: 14,
    openTickets: 0,
    maintenanceDue: 0,
    mainContact: contacts[7],
    recommendations: [],
  },
];

const today = new Date("2026-05-08");
function addDays(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const devices: Device[] = [
  // CBD
  {
    id: "dev-cbd-r1",
    name: "CBD Core Router",
    type: "Router",
    siteId: "site-cbd",
    location: "Comms Cabinet",
    brand: "Ruijie",
    model: "RG-EG310GH-P",
    serialNumber: "RJ-EG-3401",
    status: "Active",
    serviceCoverage: ["network", "fourg_backup", "it_support"],
    warrantyExpiry: addDays(420),
    lifecycleStage: "In Service",
    lastMaintenance: addDays(-45),
    nextMaintenance: addDays(135),
  },
  {
    id: "dev-cbd-sw1",
    name: "CBD Floor Switch",
    type: "Switch",
    siteId: "site-cbd",
    location: "Comms Cabinet",
    brand: "Ruijie",
    model: "RG-NBS3100-24GT4SFP",
    serialNumber: "RJ-SW-7811",
    status: "Active",
    serviceCoverage: ["network", "it_support"],
    warrantyExpiry: addDays(580),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-ap1",
    name: "CBD Wi-Fi AP — Dining",
    type: "Wi-Fi AP",
    siteId: "site-cbd",
    location: "Dining ceiling",
    brand: "Ruijie",
    model: "RG-RAP2260(G)",
    serialNumber: "RJ-AP-9921",
    status: "Active",
    serviceCoverage: ["network", "it_support"],
    warrantyExpiry: addDays(360),
    lifecycleStage: "In Service",
    nextMaintenance: addDays(30),
  },
  {
    id: "dev-cbd-pos1",
    name: "CBD POS Terminal 1",
    type: "POS Terminal",
    siteId: "site-cbd",
    location: "Front counter",
    brand: "Lightspeed",
    model: "LS-Pro-15",
    serialNumber: "LS-2231",
    status: "Active",
    serviceCoverage: ["pos", "endpoint", "it_support"],
    warrantyExpiry: addDays(220),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-pay1",
    name: "CBD Payment Terminal 1",
    type: "Payment Terminal",
    siteId: "site-cbd",
    location: "Front counter",
    brand: "Tyro",
    model: "Tyro Eftpos Plus",
    serialNumber: "TY-44120",
    status: "Active",
    serviceCoverage: ["pos"],
    warrantyExpiry: addDays(290),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-cctv1",
    name: "CBD CCTV — Entry",
    type: "CCTV Camera",
    siteId: "site-cbd",
    location: "Entry door",
    brand: "Hikvision",
    model: "DS-2CD2143G2-I",
    serialNumber: "HK-A1-22",
    status: "Active",
    serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(640),
    lifecycleStage: "In Service",
  },
  // Box Hill
  {
    id: "dev-bxh-r1",
    name: "Box Hill Router",
    type: "Router",
    siteId: "site-bxh",
    location: "Back office",
    brand: "Ruijie",
    model: "RG-EG305GH-P",
    serialNumber: "RJ-EG-1144",
    status: "Warning",
    serviceCoverage: ["network", "it_support"],
    warrantyExpiry: addDays(120),
    lifecycleStage: "Maintenance Due",
    lastMaintenance: addDays(-200),
    nextMaintenance: addDays(-5),
  },
  {
    id: "dev-bxh-sw1",
    name: "Box Hill Switch",
    type: "Switch",
    siteId: "site-bxh",
    location: "Back office",
    brand: "Ruijie",
    model: "RG-NBS3100-8GT2SFP",
    serialNumber: "RJ-SW-2310",
    status: "Active",
    serviceCoverage: ["network", "it_support"],
    warrantyExpiry: addDays(410),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-bxh-pos2",
    name: "Box Hill POS Terminal 2",
    type: "POS Terminal",
    siteId: "site-bxh",
    location: "Counter 2",
    brand: "Lightspeed",
    model: "LS-Pro-15",
    serialNumber: "LS-2240",
    status: "Active",
    serviceCoverage: ["pos", "endpoint"],
    warrantyExpiry: addDays(40),
    lifecycleStage: "Replacement Recommended",
  },
  {
    id: "dev-bxh-cctv1",
    name: "Box Hill NVR",
    type: "NVR",
    siteId: "site-bxh",
    location: "Back office",
    brand: "Hikvision",
    model: "DS-7616NXI",
    serialNumber: "HK-NVR-771",
    status: "Active",
    serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(320),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-bxh-alarm1",
    name: "Box Hill Alarm Panel",
    type: "Alarm Panel",
    siteId: "site-bxh",
    location: "Back office",
    brand: "Bosch",
    model: "Solution 6000",
    serialNumber: "BO-AL-4422",
    status: "Active",
    serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(820),
    lifecycleStage: "In Service",
  },
  // Springvale
  {
    id: "dev-spv-r1",
    name: "Springvale Router",
    type: "Router",
    siteId: "site-spv",
    location: "Comms cabinet",
    brand: "Ruijie",
    model: "RG-EG310GH-P",
    serialNumber: "RJ-EG-9981",
    status: "Active",
    serviceCoverage: ["network", "fourg_backup", "it_support"],
    warrantyExpiry: addDays(510),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-pos1",
    name: "Springvale POS 1",
    type: "POS Terminal",
    siteId: "site-spv",
    location: "Counter 1",
    brand: "Lightspeed",
    model: "LS-Pro-15",
    serialNumber: "LS-3110",
    status: "Active",
    serviceCoverage: ["pos"],
    warrantyExpiry: addDays(60),
    lifecycleStage: "Maintenance Due",
    nextMaintenance: addDays(2),
  },
  {
    id: "dev-spv-pc1",
    name: "Springvale Back Office PC",
    type: "Windows PC",
    siteId: "site-spv",
    location: "Back office",
    brand: "Lenovo",
    model: "ThinkCentre M70q",
    serialNumber: "LN-MC-2233",
    status: "Not Monitored",
    serviceCoverage: [],
    warrantyExpiry: addDays(180),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-pc2",
    name: "Springvale Manager Laptop",
    type: "Windows PC",
    siteId: "site-spv",
    location: "Office",
    brand: "Lenovo",
    model: "ThinkPad E14",
    serialNumber: "LN-LP-5523",
    status: "Not Monitored",
    serviceCoverage: [],
    warrantyExpiry: addDays(220),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-android1",
    name: "Springvale Floor POS A",
    type: "Android POS Device",
    siteId: "site-spv",
    location: "Floor",
    brand: "Sunmi",
    model: "V2s",
    serialNumber: "SM-V2-7799",
    status: "Active",
    serviceCoverage: ["pos"],
    warrantyExpiry: addDays(310),
    lifecycleStage: "In Service",
  },
  // Sydney
  {
    id: "dev-syd-r1",
    name: "Sydney Router",
    type: "Router",
    siteId: "site-syd",
    location: "Comms",
    brand: "Ruijie",
    model: "RG-EG310GH-P",
    serialNumber: "RJ-EG-7712",
    status: "Active",
    serviceCoverage: ["network", "fourg_backup", "it_support"],
    warrantyExpiry: addDays(540),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-nvr1",
    name: "Sydney NVR",
    type: "NVR",
    siteId: "site-syd",
    location: "Comms",
    brand: "Hikvision",
    model: "DS-7732NXI",
    serialNumber: "HK-NVR-9920",
    status: "Warning",
    serviceCoverage: [],
    warrantyExpiry: addDays(120),
    lifecycleStage: "Maintenance Due",
    nextMaintenance: addDays(-2),
  },
  {
    id: "dev-syd-cctv1",
    name: "Sydney CCTV — Counter",
    type: "CCTV Camera",
    siteId: "site-syd",
    location: "Counter",
    brand: "Hikvision",
    model: "DS-2CD2143G2-I",
    serialNumber: "HK-A2-31",
    status: "Active",
    serviceCoverage: [],
    warrantyExpiry: addDays(440),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-pos1",
    name: "Sydney POS 1",
    type: "POS Terminal",
    siteId: "site-syd",
    location: "Counter 1",
    brand: "Lightspeed",
    model: "LS-Pro-15",
    serialNumber: "LS-7765",
    status: "Active",
    serviceCoverage: ["pos", "endpoint"],
    warrantyExpiry: addDays(180),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-phone1",
    name: "Sydney Reception Handset",
    type: "Phone Handset",
    siteId: "site-syd",
    location: "Reception",
    brand: "Yealink",
    model: "T54W",
    serialNumber: "YL-T54-2210",
    status: "Active",
    serviceCoverage: ["voice"],
    warrantyExpiry: addDays(700),
    lifecycleStage: "In Service",
  },
  // Brisbane
  {
    id: "dev-bne-r1",
    name: "Brisbane Router",
    type: "Router",
    siteId: "site-bne",
    location: "Comms",
    brand: "Ruijie",
    model: "RG-EG310GH-P",
    serialNumber: "RJ-EG-3322",
    status: "Active",
    serviceCoverage: ["network", "fourg_backup", "it_support"],
    warrantyExpiry: addDays(610),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-pos1",
    name: "Brisbane POS 1",
    type: "POS Terminal",
    siteId: "site-bne",
    location: "Counter 1",
    brand: "Lightspeed",
    model: "LS-Pro-15",
    serialNumber: "LS-9912",
    status: "Active",
    serviceCoverage: ["pos", "endpoint"],
    warrantyExpiry: addDays(280),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-pay1",
    name: "Brisbane Payment Terminal 1",
    type: "Payment Terminal",
    siteId: "site-bne",
    location: "Counter 1",
    brand: "Tyro",
    model: "Tyro Eftpos Plus",
    serialNumber: "TY-66231",
    status: "Active",
    serviceCoverage: ["pos"],
    warrantyExpiry: addDays(330),
    lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-cctv1",
    name: "Brisbane CCTV — Entry",
    type: "CCTV Camera",
    siteId: "site-bne",
    location: "Entry",
    brand: "Hikvision",
    model: "DS-2CD2143G2-I",
    serialNumber: "HK-A3-91",
    status: "Active",
    serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(720),
    lifecycleStage: "In Service",
  },
];

// Pad device count per site to roughly match Site.devicesCount.
// We expose only the representative inventory above for the table; the
// remaining counts are abstract (rolled-up from deeper inventory).

export const tickets: Ticket[] = [
  {
    id: "t-1001",
    number: "PI-1001",
    siteId: "site-bxh",
    deviceOrService: "POS Terminal — Counter 2",
    issueType: "POS terminal slow / printer not responding",
    businessImpact: "Partially impacted",
    status: "In Progress",
    createdAt: addDays(-2),
    assignedTeam: "POS & Payments",
    latestUpdate:
      "Engineer scheduled onsite tomorrow 10:00 AM. Replacement printer in transit.",
  },
  {
    id: "t-1002",
    number: "PI-1002",
    siteId: "site-bxh",
    deviceOrService: "Internet — primary link",
    issueType: "Intermittent drops between 18:00 and 21:00",
    businessImpact: "Partially impacted",
    status: "Waiting for Customer",
    createdAt: addDays(-1),
    assignedTeam: "Network",
    latestUpdate:
      "Awaiting confirmation that issue still occurring after carrier-side fix at 06:00.",
  },
  {
    id: "t-1003",
    number: "PI-1003",
    siteId: "site-syd",
    deviceOrService: "NVR — Sydney",
    issueType: "Camera 4 offline, NVR firmware 2 versions behind",
    businessImpact: "Security risk",
    status: "Scheduled",
    createdAt: addDays(-3),
    assignedTeam: "CCTV & Alarm",
    latestUpdate:
      "Onsite visit scheduled to upgrade NVR firmware and replace PoE injector.",
  },
  {
    id: "t-1004",
    number: "PI-1004",
    siteId: "site-syd",
    deviceOrService: "Voice — Reception handset",
    issueType: "Inbound calls dropping after 15s",
    businessImpact: "Partially impacted",
    status: "New",
    createdAt: addDays(0),
    assignedTeam: "Voice",
    latestUpdate: "Triage scheduled within 2 business hours.",
  },
  {
    id: "t-1005",
    number: "PI-1005",
    siteId: "site-spv",
    deviceOrService: "Endpoint — Manager laptop",
    issueType: "Laptop not enrolled into Endpoint Support",
    businessImpact: "No major impact",
    status: "New",
    createdAt: addDays(-1),
    assignedTeam: "Endpoint Support",
    latestUpdate: "Pending customer approval to enrol device.",
  },
  {
    id: "t-1006",
    number: "PI-1006",
    siteId: "site-cbd",
    deviceOrService: "Wi-Fi AP — Dining",
    issueType: "Guest Wi-Fi captive portal occasionally fails",
    businessImpact: "No major impact",
    status: "In Progress",
    createdAt: addDays(-4),
    assignedTeam: "Network",
    latestUpdate: "Captive portal config under review by network engineer.",
  },
];

export const services: ServiceModule[] = [
  {
    key: "network",
    name: "Network & Internet",
    blurb:
      "Wired and wireless networks across all sites with proactive monitoring.",
    status: "Active",
    sitesCoveredIds: ["site-cbd", "site-bxh", "site-spv", "site-syd", "site-bne"],
    devicesCovered: 18,
    supportLevel: "24x7",
    relatedTicketIds: ["t-1002", "t-1006"],
    recommendedAction: "Schedule quarterly network health check.",
  },
  {
    key: "fourg_backup",
    name: "4G Backup",
    blurb: "Automatic 4G failover when the primary internet link goes down.",
    status: "Partial",
    sitesCoveredIds: ["site-cbd", "site-spv", "site-syd", "site-bne"],
    devicesCovered: 4,
    supportLevel: "24x7",
    relatedTicketIds: [],
    recommendedAction: "Add 4G Backup at Box Hill Store to remove single point of failure.",
  },
  {
    key: "voice",
    name: "Voice / SIP",
    blurb: "Hosted SIP trunks, handsets and number management.",
    status: "Active",
    sitesCoveredIds: ["site-cbd", "site-bxh", "site-spv", "site-syd", "site-bne"],
    devicesCovered: 12,
    usersCovered: 22,
    supportLevel: "Business Hours",
    relatedTicketIds: ["t-1004"],
  },
  {
    key: "pos",
    name: "POS & Payments",
    blurb: "POS terminals, payment terminals and integrations support.",
    status: "Active",
    sitesCoveredIds: ["site-cbd", "site-bxh", "site-spv", "site-syd", "site-bne"],
    devicesCovered: 14,
    supportLevel: "24x7",
    relatedTicketIds: ["t-1001"],
    recommendedAction: "Replace BXH POS terminal 2 — warranty expiring in 40 days.",
  },
  {
    key: "cctv",
    name: "CCTV & Alarm",
    blurb: "Cameras, NVRs, alarm panels and footage retrieval support.",
    status: "Partial",
    sitesCoveredIds: ["site-cbd", "site-bxh", "site-spv", "site-bne"],
    devicesCovered: 19,
    supportLevel: "Business Hours",
    relatedTicketIds: ["t-1003"],
    recommendedAction:
      "Add Sydney Store CCTV system to maintenance plan — 8 cameras outside coverage.",
  },
  {
    key: "endpoint",
    name: "Endpoint Support",
    blurb: "Managed endpoints with patching, anti-malware and remote support.",
    status: "Partial",
    sitesCoveredIds: ["site-cbd", "site-bxh", "site-syd", "site-bne"],
    devicesCovered: 12,
    usersCovered: 18,
    supportLevel: "Business Hours",
    relatedTicketIds: ["t-1005"],
    recommendedAction:
      "Enrol 4 Springvale endpoints to bring all sites onto managed coverage.",
  },
  {
    key: "it_support",
    name: "IT Support",
    blurb: "Remote and onsite IT support across all sites.",
    status: "Active",
    sitesCoveredIds: ["site-cbd", "site-bxh", "site-spv", "site-syd", "site-bne"],
    devicesCovered: 0,
    usersCovered: 28,
    supportLevel: "24x7",
    relatedTicketIds: [],
  },
  {
    key: "microsoft",
    name: "Microsoft Licensing",
    blurb:
      "Microsoft 365 subscriptions, identity, security baselines and add-ons.",
    status: "Active",
    sitesCoveredIds: ["site-cbd", "site-syd"],
    devicesCovered: 0,
    usersCovered: 12,
    supportLevel: "Business Hours",
    relatedTicketIds: [],
    recommendedAction:
      "Recommended: extend Microsoft 365 Business Premium to remaining sites for unified identity.",
  },
  {
    key: "projects",
    name: "Projects & Installations",
    blurb: "New site openings, hardware refreshes and rollouts delivered as projects.",
    status: "Active",
    sitesCoveredIds: ["site-cbd", "site-bxh", "site-spv", "site-syd", "site-bne"],
    devicesCovered: 0,
    supportLevel: "Business Hours",
    relatedTicketIds: [],
  },
];

// Service coverage matrix for the Sites x Services grid.
// Mirrors the customer's stated business reality:
// - Box Hill: no 4G Backup
// - Springvale: Endpoint Support is Partial
// - Sydney: CCTV not under maintenance plan (No)
// Microsoft licensing only for stores with office staff.
export const coverageMatrix: Record<string, Partial<Record<ServiceKey, CoverageStatus>>> = {
  "site-cbd": {
    network: "Yes",
    fourg_backup: "Yes",
    voice: "Yes",
    pos: "Yes",
    cctv: "Yes",
    endpoint: "Yes",
    it_support: "Yes",
    microsoft: "Yes",
  },
  "site-bxh": {
    network: "Yes",
    fourg_backup: "Recommended",
    voice: "Yes",
    pos: "Yes",
    cctv: "Yes",
    endpoint: "Yes",
    it_support: "Yes",
    microsoft: "No",
  },
  "site-spv": {
    network: "Yes",
    fourg_backup: "Yes",
    voice: "Yes",
    pos: "Yes",
    cctv: "Yes",
    endpoint: "Partial",
    it_support: "Yes",
    microsoft: "No",
  },
  "site-syd": {
    network: "Yes",
    fourg_backup: "Yes",
    voice: "Yes",
    pos: "Yes",
    cctv: "No",
    endpoint: "Yes",
    it_support: "Yes",
    microsoft: "Yes",
  },
  "site-bne": {
    network: "Yes",
    fourg_backup: "Yes",
    voice: "Yes",
    pos: "Yes",
    cctv: "Yes",
    endpoint: "Yes",
    it_support: "Yes",
    microsoft: "No",
  },
};

export const projects: Project[] = [
  {
    id: "p-2001",
    name: "Geelong Store Opening",
    siteId: "site-cbd", // closest existing site for grouping
    category: "New Store Opening",
    status: "Hardware Ordered",
    startDate: addDays(-14),
    expectedCompletion: addDays(35),
    owner: "Projects Team",
    progress: 30,
  },
  {
    id: "p-2002",
    name: "Sydney CCTV Upgrade",
    siteId: "site-syd",
    category: "CCTV Upgrade",
    status: "Staging",
    startDate: addDays(-7),
    expectedCompletion: addDays(21),
    owner: "CCTV & Alarm",
    progress: 55,
  },
  {
    id: "p-2003",
    name: "Group POS Rollout — Lightspeed Pro",
    siteId: "site-bxh",
    category: "POS Rollout",
    status: "Onsite Scheduled",
    startDate: addDays(-30),
    expectedCompletion: addDays(7),
    owner: "POS & Payments",
    progress: 80,
  },
  {
    id: "p-2004",
    name: "Box Hill Router Replacement",
    siteId: "site-bxh",
    category: "Router Replacement",
    status: "In Transit",
    startDate: addDays(-3),
    expectedCompletion: addDays(4),
    owner: "Network",
    progress: 65,
  },
];

export const maintenanceItems: MaintenanceItem[] = [
  {
    id: "m-3001",
    siteId: "site-bxh",
    deviceId: "dev-bxh-r1",
    deviceName: "Box Hill Router",
    type: "Firmware update + health check",
    dueDate: addDays(-5),
    priority: "High",
    assignedTeam: "Network",
    status: "Overdue",
  },
  {
    id: "m-3002",
    siteId: "site-spv",
    deviceId: "dev-spv-pos1",
    deviceName: "Springvale POS 1",
    type: "Quarterly POS check",
    dueDate: addDays(2),
    priority: "Medium",
    assignedTeam: "POS & Payments",
    status: "Due",
  },
  {
    id: "m-3003",
    siteId: "site-syd",
    deviceId: "dev-syd-nvr1",
    deviceName: "Sydney NVR",
    type: "Firmware upgrade",
    dueDate: addDays(-2),
    priority: "Critical",
    assignedTeam: "CCTV & Alarm",
    status: "Overdue",
  },
  {
    id: "m-3004",
    siteId: "site-cbd",
    deviceId: "dev-cbd-ap1",
    deviceName: "CBD Wi-Fi AP — Dining",
    type: "Wi-Fi heatmap + firmware review",
    dueDate: addDays(30),
    priority: "Low",
    assignedTeam: "Network",
    status: "Scheduled",
  },
  {
    id: "m-3005",
    siteId: "site-bne",
    deviceId: "dev-bne-r1",
    deviceName: "Brisbane Router",
    type: "Annual router service",
    dueDate: addDays(75),
    priority: "Low",
    assignedTeam: "Network",
    status: "Scheduled",
  },
];

export const recentActivity: ActivityEntry[] = [
  {
    id: "a-1",
    at: addDays(0),
    text: "Sydney NVR firmware upgrade scheduled for Friday onsite visit.",
    kind: "maintenance",
  },
  {
    id: "a-2",
    at: addDays(0),
    text: "Voice ticket PI-1004 opened for Sydney reception handset.",
    kind: "ticket",
  },
  {
    id: "a-3",
    at: addDays(-1),
    text: "Replacement printer dispatched for Box Hill POS Terminal 2.",
    kind: "ticket",
  },
  {
    id: "a-4",
    at: addDays(-2),
    text: "Project Geelong Store Opening — switches and APs received at staging.",
    kind: "project",
  },
  {
    id: "a-5",
    at: addDays(-3),
    text: "CCTV maintenance recommendation generated for Sydney Store.",
    kind: "service",
  },
];

export const helpArticles: HelpArticle[] = [
  {
    id: "h-1",
    title: "Internet down — first checks",
    category: "Network",
    estimatedMinutes: 5,
    appliesTo: "Network & Internet",
    format: "Article",
  },
  {
    id: "h-2",
    title: "How to restart your router safely",
    category: "Network",
    estimatedMinutes: 3,
    appliesTo: "Network & Internet",
    format: "Video",
  },
  {
    id: "h-3",
    title: "POS cannot connect — what to check",
    category: "POS & Payments",
    estimatedMinutes: 6,
    appliesTo: "POS & Payments",
    format: "Article",
  },
  {
    id: "h-4",
    title: "Payment terminal offline — first checks",
    category: "POS & Payments",
    estimatedMinutes: 4,
    appliesTo: "POS & Payments",
    format: "Article",
  },
  {
    id: "h-5",
    title: "How to request CCTV footage",
    category: "CCTV & Alarm",
    estimatedMinutes: 5,
    appliesTo: "CCTV & Alarm",
    format: "Article",
  },
  {
    id: "h-6",
    title: "How to create a support ticket",
    category: "Portal Guide",
    estimatedMinutes: 3,
    appliesTo: "Portal",
    format: "Video",
  },
  {
    id: "h-7",
    title: "Voice handset not registering",
    category: "Voice",
    estimatedMinutes: 4,
    appliesTo: "Voice / SIP",
    format: "Article",
  },
  {
    id: "h-8",
    title: "Resetting a Microsoft 365 user password",
    category: "IT Support",
    estimatedMinutes: 3,
    appliesTo: "Microsoft Licensing",
    format: "Article",
  },
];

export const referralActivities: ReferralActivity[] = [
  {
    id: "r-1",
    referredBusiness: "Greenfield Cafe Group",
    status: "Credit Applied",
    eligibleService: "Network & Internet (3 sites)",
    creditAmount: 240,
    date: addDays(-40),
  },
  {
    id: "r-2",
    referredBusiness: "Sunset Sushi Pty Ltd",
    status: "Purchased",
    eligibleService: "POS & Payments (2 sites)",
    creditAmount: 150,
    date: addDays(-12),
  },
  {
    id: "r-3",
    referredBusiness: "Harbour Coffee Co.",
    status: "Contacted",
    eligibleService: "Quoting Network + CCTV",
    creditAmount: 0,
    date: addDays(-6),
  },
  {
    id: "r-4",
    referredBusiness: "Lotus Bakery Group",
    status: "Invited",
    eligibleService: "Awaiting first conversation",
    creditAmount: 0,
    date: addDays(-2),
  },
];

export const referralCredit: BillingCredit = {
  available: 320,
  pending: 150,
  used: 480,
  nextInvoiceCredit: 120,
};

export const referralProgram: ReferralProgram = {
  code: "ABCRESTO2026",
  link: "https://pinetwork.com.au/ref/ABCRESTO2026",
  credit: referralCredit,
  activity: referralActivities,
};

// Convenience selectors used across pages.
export function getSiteById(id: string): Site | undefined {
  return sites.find((s) => s.id === id);
}
export function getSiteName(id: string): string {
  return getSiteById(id)?.name ?? id;
}
export function getDevicesForSite(siteId: string): Device[] {
  return devices.filter((d) => d.siteId === siteId);
}
export function getTicketsForSite(siteId: string): Ticket[] {
  return tickets.filter((t) => t.siteId === siteId);
}
export function getMaintenanceForSite(siteId: string): MaintenanceItem[] {
  return maintenanceItems.filter((m) => m.siteId === siteId);
}

// ===== Site detail tab extras =====

import type {
  ServiceCategory,
  SiteExtras,
} from "./types";

const TYP3: Record<ServiceCategory, string> = {
  network: "NET",
  voice: "VOI",
  cctv: "CCT",
  pos: "POS",
  endpoint: "EPT",
  it_support: "ITS",
  projects: "PRJ",
  traffic_analysis: "TRA",
};

export function deviceCategory(t: Device["type"]): ServiceCategory {
  switch (t) {
    case "Router":
    case "Switch":
    case "Wi-Fi AP":
      return "network";
    case "Phone Handset":
      return "voice";
    case "NVR":
    case "CCTV Camera":
    case "Alarm Panel":
      return "cctv";
    case "POS Terminal":
    case "Payment Terminal":
    case "Android POS Device":
    case "Receipt Printer":
    case "KDS":
    case "CDS":
      return "pos";
    case "Windows PC":
    case "Server":
      return "endpoint";
  }
}

// Extra devices to round out POS peripherals, voice handsets, endpoints,
// alarm panels and additional cameras at each site.
const _extraDevices: Device[] = [
  // ---- Melbourne CBD ----
  {
    id: "dev-cbd-printer1", name: "CBD Receipt Printer 1", type: "Receipt Printer",
    siteId: "site-cbd", location: "Front counter",
    brand: "Epson", model: "TM-m30III", serialNumber: "EP-RP-1101",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(280), lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-kds1", name: "CBD Kitchen Display", type: "KDS",
    siteId: "site-cbd", location: "Kitchen pass",
    brand: "Lightspeed", model: "KDS-21", serialNumber: "LS-KDS-3301",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(360), lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-cds1", name: "CBD Customer Display", type: "CDS",
    siteId: "site-cbd", location: "Front counter",
    brand: "Lightspeed", model: "CDS-15", serialNumber: "LS-CDS-3302",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(360), lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-phone1", name: "CBD Reception Handset", type: "Phone Handset",
    siteId: "site-cbd", location: "Reception",
    brand: "Yealink", model: "T54W", serialNumber: "YL-T54-1101",
    status: "Active", serviceCoverage: ["voice"],
    warrantyExpiry: addDays(640), lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-phone2", name: "CBD Office Handset", type: "Phone Handset",
    siteId: "site-cbd", location: "Back office",
    brand: "Yealink", model: "T46U", serialNumber: "YL-T46-1102",
    status: "Active", serviceCoverage: ["voice"],
    warrantyExpiry: addDays(640), lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-pc1", name: "CBD Back Office PC", type: "Windows PC",
    siteId: "site-cbd", location: "Back office",
    brand: "Lenovo", model: "ThinkCentre M70q", serialNumber: "LN-MC-1101",
    status: "Active", serviceCoverage: ["endpoint", "it_support"],
    warrantyExpiry: addDays(420), lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-srv1", name: "CBD Backroom Server", type: "Server",
    siteId: "site-cbd", location: "Comms cabinet",
    brand: "Dell", model: "PowerEdge T150", serialNumber: "DL-T150-1101",
    status: "Active", serviceCoverage: ["endpoint", "it_support"],
    warrantyExpiry: addDays(900), lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-cctv2", name: "CBD CCTV — Counter", type: "CCTV Camera",
    siteId: "site-cbd", location: "Counter",
    brand: "Hikvision", model: "DS-2CD2143G2-I", serialNumber: "HK-A1-23",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(640), lifecycleStage: "In Service",
  },
  {
    id: "dev-cbd-alarm1", name: "CBD Alarm Panel", type: "Alarm Panel",
    siteId: "site-cbd", location: "Back office",
    brand: "Bosch", model: "Solution 6000", serialNumber: "BO-AL-1101",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(820), lifecycleStage: "In Service",
  },

  // ---- Box Hill ----
  {
    id: "dev-bxh-printer1", name: "Box Hill Receipt Printer", type: "Receipt Printer",
    siteId: "site-bxh", location: "Counter 2",
    brand: "Epson", model: "TM-m30III", serialNumber: "EP-RP-2101",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(180), lifecycleStage: "In Service",
  },
  {
    id: "dev-bxh-kds1", name: "Box Hill Kitchen Display", type: "KDS",
    siteId: "site-bxh", location: "Kitchen",
    brand: "Lightspeed", model: "KDS-21", serialNumber: "LS-KDS-2101",
    status: "Warning", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(220), lifecycleStage: "In Service",
  },
  {
    id: "dev-bxh-cds1", name: "Box Hill Customer Display", type: "CDS",
    siteId: "site-bxh", location: "Counter 2",
    brand: "Lightspeed", model: "CDS-15", serialNumber: "LS-CDS-2102",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(220), lifecycleStage: "In Service",
  },
  {
    id: "dev-bxh-phone1", name: "Box Hill Counter Handset", type: "Phone Handset",
    siteId: "site-bxh", location: "Counter",
    brand: "Yealink", model: "T46U", serialNumber: "YL-T46-2101",
    status: "Active", serviceCoverage: ["voice"],
    warrantyExpiry: addDays(540), lifecycleStage: "In Service",
  },
  {
    id: "dev-bxh-cctv-cam1", name: "Box Hill CCTV — Entry", type: "CCTV Camera",
    siteId: "site-bxh", location: "Entry",
    brand: "Hikvision", model: "DS-2CD2143G2-I", serialNumber: "HK-A2-21",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(540), lifecycleStage: "In Service",
  },
  {
    id: "dev-bxh-pc1", name: "Box Hill Office PC", type: "Windows PC",
    siteId: "site-bxh", location: "Back office",
    brand: "HP", model: "ProDesk 400 G9", serialNumber: "HP-PD-2101",
    status: "Active", serviceCoverage: ["endpoint", "it_support"],
    warrantyExpiry: addDays(360), lifecycleStage: "In Service",
  },

  // ---- Springvale ----
  {
    id: "dev-spv-printer1", name: "Springvale Receipt Printer", type: "Receipt Printer",
    siteId: "site-spv", location: "Counter 1",
    brand: "Epson", model: "TM-m30III", serialNumber: "EP-RP-3101",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(280), lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-kds1", name: "Springvale Kitchen Display", type: "KDS",
    siteId: "site-spv", location: "Kitchen",
    brand: "Lightspeed", model: "KDS-21", serialNumber: "LS-KDS-3101",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(310), lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-cds1", name: "Springvale Customer Display", type: "CDS",
    siteId: "site-spv", location: "Counter 1",
    brand: "Lightspeed", model: "CDS-15", serialNumber: "LS-CDS-3102",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(310), lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-phone1", name: "Springvale Counter Handset", type: "Phone Handset",
    siteId: "site-spv", location: "Counter 1",
    brand: "Yealink", model: "T46U", serialNumber: "YL-T46-3101",
    status: "Active", serviceCoverage: ["voice"],
    warrantyExpiry: addDays(540), lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-cctv1", name: "Springvale CCTV — Entry", type: "CCTV Camera",
    siteId: "site-spv", location: "Entry",
    brand: "Hikvision", model: "DS-2CD2143G2-I", serialNumber: "HK-A4-31",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(540), lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-cctv2", name: "Springvale CCTV — Counter", type: "CCTV Camera",
    siteId: "site-spv", location: "Counter",
    brand: "Hikvision", model: "DS-2CD2143G2-I", serialNumber: "HK-A4-32",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(540), lifecycleStage: "In Service",
  },
  {
    id: "dev-spv-alarm1", name: "Springvale Alarm Panel", type: "Alarm Panel",
    siteId: "site-spv", location: "Back office",
    brand: "Bosch", model: "Solution 6000", serialNumber: "BO-AL-3101",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(720), lifecycleStage: "In Service",
  },

  // ---- Sydney ----
  {
    id: "dev-syd-sw1", name: "Sydney Switch", type: "Switch",
    siteId: "site-syd", location: "Comms",
    brand: "Ruijie", model: "RG-NBS3100-24GT4SFP", serialNumber: "RJ-SW-4101",
    status: "Active", serviceCoverage: ["network", "it_support"],
    warrantyExpiry: addDays(540), lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-ap1", name: "Sydney Wi-Fi AP — Floor", type: "Wi-Fi AP",
    siteId: "site-syd", location: "Floor ceiling",
    brand: "Ruijie", model: "RG-RAP2260(G)", serialNumber: "RJ-AP-4101",
    status: "Active", serviceCoverage: ["network", "it_support"],
    warrantyExpiry: addDays(420), lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-printer1", name: "Sydney Receipt Printer", type: "Receipt Printer",
    siteId: "site-syd", location: "Counter 1",
    brand: "Epson", model: "TM-m30III", serialNumber: "EP-RP-4101",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(280), lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-kds1", name: "Sydney Kitchen Display", type: "KDS",
    siteId: "site-syd", location: "Kitchen",
    brand: "Lightspeed", model: "KDS-21", serialNumber: "LS-KDS-4101",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(360), lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-cds1", name: "Sydney Customer Display", type: "CDS",
    siteId: "site-syd", location: "Counter 1",
    brand: "Lightspeed", model: "CDS-15", serialNumber: "LS-CDS-4102",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(360), lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-phone2", name: "Sydney Office Handset", type: "Phone Handset",
    siteId: "site-syd", location: "Office",
    brand: "Yealink", model: "T46U", serialNumber: "YL-T46-4102",
    status: "Active", serviceCoverage: ["voice"],
    warrantyExpiry: addDays(700), lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-cctv2", name: "Sydney CCTV — Dining", type: "CCTV Camera",
    siteId: "site-syd", location: "Dining",
    brand: "Hikvision", model: "DS-2CD2143G2-I", serialNumber: "HK-A2-32",
    status: "Active", serviceCoverage: [],
    warrantyExpiry: addDays(440), lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-alarm1", name: "Sydney Alarm Panel", type: "Alarm Panel",
    siteId: "site-syd", location: "Back office",
    brand: "Bosch", model: "Solution 6000", serialNumber: "BO-AL-4101",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(820), lifecycleStage: "In Service",
  },
  {
    id: "dev-syd-pc1", name: "Sydney Office PC", type: "Windows PC",
    siteId: "site-syd", location: "Office",
    brand: "HP", model: "EliteDesk 800 G9", serialNumber: "HP-ED-4101",
    status: "Active", serviceCoverage: ["endpoint", "it_support"],
    warrantyExpiry: addDays(420), lifecycleStage: "In Service",
  },

  // ---- Brisbane ----
  {
    id: "dev-bne-sw1", name: "Brisbane Switch", type: "Switch",
    siteId: "site-bne", location: "Comms",
    brand: "Ruijie", model: "RG-NBS3100-8GT2SFP", serialNumber: "RJ-SW-5101",
    status: "Active", serviceCoverage: ["network", "it_support"],
    warrantyExpiry: addDays(540), lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-ap1", name: "Brisbane Wi-Fi AP — Dining", type: "Wi-Fi AP",
    siteId: "site-bne", location: "Dining",
    brand: "Ruijie", model: "RG-RAP2260(G)", serialNumber: "RJ-AP-5101",
    status: "Active", serviceCoverage: ["network", "it_support"],
    warrantyExpiry: addDays(420), lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-printer1", name: "Brisbane Receipt Printer", type: "Receipt Printer",
    siteId: "site-bne", location: "Counter 1",
    brand: "Epson", model: "TM-m30III", serialNumber: "EP-RP-5101",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(280), lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-kds1", name: "Brisbane Kitchen Display", type: "KDS",
    siteId: "site-bne", location: "Kitchen",
    brand: "Lightspeed", model: "KDS-21", serialNumber: "LS-KDS-5101",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(360), lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-cds1", name: "Brisbane Customer Display", type: "CDS",
    siteId: "site-bne", location: "Counter 1",
    brand: "Lightspeed", model: "CDS-15", serialNumber: "LS-CDS-5102",
    status: "Active", serviceCoverage: ["pos"],
    warrantyExpiry: addDays(360), lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-phone1", name: "Brisbane Reception Handset", type: "Phone Handset",
    siteId: "site-bne", location: "Reception",
    brand: "Yealink", model: "T54W", serialNumber: "YL-T54-5101",
    status: "Active", serviceCoverage: ["voice"],
    warrantyExpiry: addDays(640), lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-cctv2", name: "Brisbane CCTV — Counter", type: "CCTV Camera",
    siteId: "site-bne", location: "Counter",
    brand: "Hikvision", model: "DS-2CD2143G2-I", serialNumber: "HK-A3-92",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(720), lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-alarm1", name: "Brisbane Alarm Panel", type: "Alarm Panel",
    siteId: "site-bne", location: "Back office",
    brand: "Bosch", model: "Solution 6000", serialNumber: "BO-AL-5101",
    status: "Active", serviceCoverage: ["cctv"],
    warrantyExpiry: addDays(820), lifecycleStage: "In Service",
  },
  {
    id: "dev-bne-pc1", name: "Brisbane Office PC", type: "Windows PC",
    siteId: "site-bne", location: "Office",
    brand: "Lenovo", model: "ThinkCentre M70q", serialNumber: "LN-MC-5101",
    status: "Active", serviceCoverage: ["endpoint", "it_support"],
    warrantyExpiry: addDays(420), lifecycleStage: "In Service",
  },
];

// Mutate the existing devices array in-place so all consumers see the extras.
devices.push(..._extraDevices);

// Asset numbering: PI-{SITE3}-{TYP3}-{NN}, deterministic per device.
const _assetMap: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const counters: Record<string, number> = {};
  for (const d of devices) {
    const site3 = (d.siteId.split("-")[1] ?? "GEN").toUpperCase();
    const typ3 = TYP3[deviceCategory(d.type)];
    const key = site3 + "-" + typ3;
    counters[key] = (counters[key] ?? 0) + 1;
    map[d.id] =
      "PI-" + site3 + "-" + typ3 + "-" + String(counters[key]).padStart(3, "0");
  }
  return map;
})();

export function assetNumber(d: Device): string {
  if (d.assetNumber) return d.assetNumber;
  return _assetMap[d.id] ?? ("PI-" + d.id.toUpperCase());
}

export function devicePhotoUrl(d: Device): string {
  if (d.photoUrl) return d.photoUrl;
  return "https://picsum.photos/seed/" + assetNumber(d) + "/800/520";
}

function _hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface PingResult {
  router: number | null;
  google: number | null;
  aws: number | null;
}

export function pingsFor(d: Device): PingResult {
  if (d.status === "Offline") return { router: null, google: null, aws: null };
  const h = _hash(d.id);
  const k = d.status === "Warning" ? 3 : 1;
  return {
    router: (1 + (h % 4)) * k,
    google: (8 + (h % 14)) * (d.status === "Warning" ? 2 : 1),
    aws: (14 + (h % 24)) * (d.status === "Warning" ? 2 : 1),
  };
}

export function getDevicesForSiteByCategory(
  siteId: string,
  category: ServiceCategory,
): Device[] {
  return devices.filter(
    (d) => d.siteId === siteId && deviceCategory(d.type) === category,
  );
}

// ===== Per-site extras (network info, voice flow, alarm, POS, project photos) =====
export const siteExtras: Record<string, SiteExtras> = {
  "site-cbd": {
    network: {
      wanType: "NBN Enterprise Ethernet 200/200",
      isp: "Aussie Broadband Business",
      has4gBackup: true,
      publicIp: "203.0.113.21",
      outageStatus: "Online",
      lastOutage: addDays(-46),
    },
    voice: {
      mainDid: "+61 3 9000 1100",
      callFlow: [
        { label: "Inbound DID", detail: "+61 3 9000 1100" },
        { label: "Auto Attendant", detail: "Press 1 Reservations · 2 Catering · 0 Reception" },
        { label: "Ring Group", detail: "Reception (Linda, Helen) — 20s" },
        { label: "Voicemail", detail: "voicemail-cbd@abcrestaurants.example" },
      ],
      forwarding: [
        { id: "fr-cbd-1", match: "After hours (after 22:00)", destination: "Voicemail", active: true },
        { id: "fr-cbd-2", match: "Weekend mornings (before 10:00)", destination: "Mobile +61 400 700 100", active: false },
      ],
      inboundCallsToday: 38,
      missedCallsToday: 2,
    },
    alarm: {
      armed: "Disarmed",
      lastEvent: "Disarmed by Helen Wu",
      lastEventAt: addDays(0) + " 06:48",
      monitoredBy: "ASIAL Grade A1 — PI Network Alarm Monitoring",
    },
    pos: { posSystem: "Lightspeed Pro", paymentProvider: "Tyro Eftpos Plus" },
    projectPhotos: {},
  },
  "site-bxh": {
    network: {
      wanType: "NBN FTTP 100/40",
      isp: "Aussie Broadband Business",
      has4gBackup: false,
      publicIp: "203.0.113.55",
      outageStatus: "Degraded",
      lastOutage: addDays(-2),
    },
    voice: {
      mainDid: "+61 3 9000 2200",
      callFlow: [
        { label: "Inbound DID", detail: "+61 3 9000 2200" },
        { label: "Ring Group", detail: "Counter handset — 25s" },
        { label: "Voicemail", detail: "voicemail-bxh@abcrestaurants.example" },
      ],
      forwarding: [
        { id: "fr-bxh-1", match: "After hours (after 21:30)", destination: "Voicemail", active: true },
      ],
      inboundCallsToday: 21,
      missedCallsToday: 5,
    },
    alarm: {
      armed: "Armed Stay",
      lastEvent: "Armed Stay by David Nguyen",
      lastEventAt: addDays(0) + " 22:10",
      monitoredBy: "ASIAL Grade A1 — PI Network Alarm Monitoring",
    },
    pos: { posSystem: "Lightspeed Pro", paymentProvider: "Tyro Eftpos Plus" },
    projectPhotos: {},
  },
  "site-spv": {
    network: {
      wanType: "NBN FTTP 100/40",
      isp: "Aussie Broadband Business",
      has4gBackup: true,
      publicIp: "203.0.113.78",
      outageStatus: "Online",
    },
    voice: {
      mainDid: "+61 3 9000 3300",
      callFlow: [
        { label: "Inbound DID", detail: "+61 3 9000 3300" },
        { label: "Ring Group", detail: "Counter handset — 25s" },
        { label: "Voicemail", detail: "voicemail-spv@abcrestaurants.example" },
      ],
      forwarding: [],
      inboundCallsToday: 17,
      missedCallsToday: 1,
    },
    alarm: {
      armed: "Armed Away",
      lastEvent: "Armed Away by Sarah Lim",
      lastEventAt: addDays(0) + " 22:05",
      monitoredBy: "ASIAL Grade A1 — PI Network Alarm Monitoring",
    },
    pos: { posSystem: "Lightspeed Pro", paymentProvider: "Tyro Eftpos Plus" },
    projectPhotos: {},
  },
  "site-syd": {
    network: {
      wanType: "NBN Enterprise Ethernet 200/200",
      isp: "Vocus",
      has4gBackup: true,
      publicIp: "203.0.113.101",
      outageStatus: "Online",
      lastOutage: addDays(-90),
    },
    voice: {
      mainDid: "+61 2 9000 4400",
      callFlow: [
        { label: "Inbound DID", detail: "+61 2 9000 4400" },
        { label: "Auto Attendant", detail: "Press 1 Reservations · 2 Catering · 0 Reception" },
        { label: "Ring Group", detail: "Reception (Tom) + Office handset — 25s" },
        { label: "Voicemail", detail: "voicemail-syd@abcrestaurants.example" },
      ],
      forwarding: [
        { id: "fr-syd-1", match: "After hours (after 22:00)", destination: "Voicemail", active: true },
      ],
      inboundCallsToday: 44,
      missedCallsToday: 3,
    },
    alarm: {
      armed: "Triggered",
      lastEvent: "Motion sensor — Back of house (cleared by patrol)",
      lastEventAt: addDays(-1) + " 02:11",
      monitoredBy: "ASIAL Grade A1 — PI Network Alarm Monitoring",
    },
    pos: { posSystem: "Lightspeed Pro", paymentProvider: "Tyro Eftpos Plus" },
    projectPhotos: {},
  },
  "site-bne": {
    network: {
      wanType: "NBN FTTP 100/40",
      isp: "Aussie Broadband Business",
      has4gBackup: true,
      publicIp: "203.0.113.130",
      outageStatus: "Online",
    },
    voice: {
      mainDid: "+61 7 9000 5500",
      callFlow: [
        { label: "Inbound DID", detail: "+61 7 9000 5500" },
        { label: "Ring Group", detail: "Reception handset — 25s" },
        { label: "Voicemail", detail: "voicemail-bne@abcrestaurants.example" },
      ],
      forwarding: [],
      inboundCallsToday: 12,
      missedCallsToday: 0,
    },
    alarm: {
      armed: "Armed Away",
      lastEvent: "Armed Away by Aisha Khan",
      lastEventAt: addDays(0) + " 21:55",
      monitoredBy: "ASIAL Grade A1 — PI Network Alarm Monitoring",
    },
    pos: { posSystem: "Lightspeed Pro", paymentProvider: "Tyro Eftpos Plus" },
    projectPhotos: {},
  },
};

// Per-project installation photos (mock — picsum.photos seeded by project id).
export function projectPhotos(projectId: string): string[] {
  return [1, 2, 3, 4].map(
    (n) => "https://picsum.photos/seed/" + projectId + "-" + n + "/800/520",
  );
}

// ============================================================
// BEGIN: clear mock site/device data (2026-05-08)
// All mock sites + devices removed at runtime so admin can populate
// via the production data store. Type-bearing arrays kept; entries
// emptied. To restore the demo data, remove this block.
// ============================================================
sites.length = 0;
devices.length = 0;
projects.length = 0;
tickets.length = 0;
maintenanceItems.length = 0;
for (const _k of Object.keys(siteExtras)) {
  delete siteExtras[_k];
}
contacts.length = 0;
referralActivities.length = 0;
referralCredit.available = 0;
referralCredit.pending = 0;
referralCredit.used = 0;
referralCredit.nextInvoiceCredit = 0;
referralProgram.activity = referralActivities;
referralProgram.credit = referralCredit;
referralProgram.code = "";
referralProgram.link = "";
for (const _s of services) {
  _s.sitesCoveredIds = [];
  _s.devicesCovered = 0;
  _s.relatedTicketIds = [];
}
// END clear
