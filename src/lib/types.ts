// Domain types for the PiNetwork customer portal prototype.
// These mirror what would eventually back into Salesforce (Account, Site,
// Asset, Case, Service Contract, Project) but are intentionally
// presentation-shaped for this front-end-only prototype.

export type SiteHealth = "Healthy" | "Warning" | "Critical";

export type ServiceKey =
  | "network"
  | "fourg_backup"
  | "voice"
  | "pos"
  | "cctv"
  | "endpoint"
  | "it_support"
  | "microsoft"
  | "projects";

export type CoverageStatus = "Yes" | "No" | "Partial" | "Recommended";

export type DeviceStatus =
  | "Active"
  | "Warning"
  | "Offline"
  | "In Support"
  | "Not Monitored";

export type DeviceType =
  | "Router"
  | "Switch"
  | "Wi-Fi AP"
  | "POS Terminal"
  | "Payment Terminal"
  | "Receipt Printer"
  | "KDS"
  | "CDS"
  | "NVR"
  | "CCTV Camera"
  | "Alarm Panel"
  | "Windows PC"
  | "Server"
  | "Android POS Device"
  | "Phone Handset";

export type LifecycleStage =
  | "Planned"
  | "Supplied"
  | "Staged"
  | "Installed"
  | "In Service"
  | "Maintenance Due"
  | "Replacement Recommended"
  | "Retired";

export type TicketStatus =
  | "New"
  | "In Progress"
  | "Waiting for Customer"
  | "Scheduled"
  | "Resolved"
  | "Closed";

export type BusinessImpact =
  | "No major impact"
  | "Partially impacted"
  | "Cannot take payments"
  | "Cannot trade"
  | "Security risk";

export type ProjectStatus =
  | "Planning"
  | "Hardware Ordered"
  | "Staging"
  | "In Transit"
  | "Onsite Scheduled"
  | "Installed"
  | "Completed";

export type MaintenancePriority = "Low" | "Medium" | "High" | "Critical";
export type MaintenanceStatus = "Scheduled" | "Due" | "Overdue" | "Completed";

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export type SupportPack =
  | "isp_only"
  | "essential"
  | "protection"
  | "enterprise_protection"
  | "no_support";

export interface Site {
  id: string;
  name: string;
  state: string;
  address: string;
  health: SiteHealth;
  servicesCovered: ServiceKey[];
  devicesCount: number;
  openTickets: number;
  maintenanceDue: number;
  mainContact: Contact;
  notes?: string;
  recommendations: string[];
  ruijieGroupId?: number;
  ruijieGroupName?: string;
  /** Detected LAN /24 prefix (e.g. "192.168.99") for the site, used as the
   * subnet for synthetic discovery results. */
  lanSubnet?: string;
  /** Customer's WAN access (NBN/Opticomm/Starlink/4G/5G/Lightning). */
  accessNetwork?: AccessNetworkInfo;
  /** Most recent carrier outage check result. */
  outageReport?: OutageReport;
  /** Carbon (ABB) service id this site is linked to. Used for real
   * outage queries against the abb-carbon-bridge on Organ. */
  carbonServiceId?: number;
  carbonPoiName?: string;
  carbonServiceAlias?: string;
  /** Site router DHCP pool, pulled from Ruijie gateway interface info. */
  dhcpScope?: {
    startIp: string;
    endIp: string;
    subnetMask: string;
    gatewayIp: string;
  };
  updatedAt?: string;
  supportPack?: SupportPack;
  /** Per-service module configurations. Each is optional; presence
   * indicates that module has been configured for this site. */
  networkModule?: NetworkModuleConfig;
  voiceModule?: VoiceModuleConfig;
  cctvModule?: CctvModuleConfig;
  posModule?: PosModuleConfig;
  endpointModule?: EndpointModuleConfig;
  /** Per-service coverage status surfaced on the customer's site overview. */
  coverage?: Partial<Record<ServiceKey, CoverageStatus>>;
}

export type NetworkVendor = "ruijie" | "ubiquiti" | "tplink";
export interface NetworkModuleConfig {
  vendor: NetworkVendor;
  /** Vendor-side site/group identifier used to scope syncs. */
  siteIdentifier: string;
}

export type VoiceMode = "default_pbx" | "custom_domain";
export interface VoiceModuleConfig {
  mode: VoiceMode;
  /** Required when mode === "custom_domain": SIP server / web portal domain. */
  customDomain?: string;
  /** Extension numbers to monitor connection state for. */
  extensions: string[];
}

export type CameraVendor = "hikvision" | "dahua" | "tplink" | "other";
export type AlarmVendor = "hikvision" | "dahua" | "ajax" | "bosch" | "other";
export interface CctvModuleConfig {
  cameraVendor?: CameraVendor;
  alarmVendor?: AlarmVendor;
  /** Management IP for the NVR / camera unit. */
  cameraIp?: string;
  /** Management IP for the alarm panel. */
  alarmIp?: string;
  /** True when a credential is stored. UI never reads/echoes the value. */
  cameraPasswordSet?: boolean;
  alarmPasswordSet?: boolean;
}
/** Server-only credential blob for CCTV/alarm. Stored separately from Site
 * to keep the JSON view in /api/* responses free of secrets. */
export interface CctvCredentials {
  cameraPassword?: string;
  alarmPassword?: string;
  /** Username if vendor needs one (Hik/Dahua usually do, default "admin"). */
  cameraUser?: string;
  alarmUser?: string;
  updatedAt?: string;
}

export type PosVendor = "Abacus" | "Pisell" | "Square";
export interface PosModuleConfig {
  vendor?: PosVendor;
  managed: boolean;
  /** Required when managed === true: Sunmi platform site name. */
  sunmiSiteName?: string;
  /** LAN IP of an on-prem POS gateway / terminal we can ping. Optional. */
  terminalIp?: string;
}

export interface EndpointModuleConfig {
  /** Atera "Customer" name; Atera API filters assets by it. */
  ateraCustomerName?: string;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  siteId: string;
  location: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: DeviceStatus;
  serviceCoverage: ServiceKey[];
  warrantyExpiry: string; // ISO date
  lifecycleStage: LifecycleStage;
  lastMaintenance?: string;
  nextMaintenance?: string;
  assetNumber?: string;
  photoUrl?: string;
}

export interface TicketComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "customer" | "admin";
  text: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  number: string;
  siteId: string;
  deviceOrService: string;
  issueType: string;
  businessImpact: BusinessImpact;
  status: TicketStatus;
  createdAt: string; // ISO date
  assignedTeam: string;
  latestUpdate: string;
  description?: string;
  comments?: TicketComment[];
}

export interface ServiceModule {
  key: ServiceKey;
  name: string;
  blurb: string;
  status: "Active" | "Partial" | "Not Subscribed" | "Recommended";
  sitesCoveredIds: string[];
  devicesCovered: number;
  usersCovered?: number;
  supportLevel: "24x7" | "Business Hours" | "Best Effort" | "Not Covered";
  relatedTicketIds: string[];
  recommendedAction?: string;
}

export interface Project {
  id: string;
  name: string;
  siteId: string;
  category:
    | "New Store Opening"
    | "CCTV Upgrade"
    | "POS Rollout"
    | "Router Replacement"
    | "Network Upgrade";
  status: ProjectStatus;
  startDate: string;
  expectedCompletion: string;
  owner: string;
  progress: number; // 0-100
}

export interface MaintenanceItem {
  id: string;
  siteId: string;
  deviceId?: string;
  deviceName: string;
  type: string;
  dueDate: string;
  priority: MaintenancePriority;
  assignedTeam: string;
  status: MaintenanceStatus;
}

export interface ReferralActivity {
  id: string;
  referredBusiness: string;
  status: "Invited" | "Contacted" | "Purchased" | "Credit Applied";
  eligibleService: string;
  creditAmount: number;
  date: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  category:
    | "Network"
    | "POS & Payments"
    | "CCTV & Alarm"
    | "Voice"
    | "IT Support"
    | "Portal Guide";
  estimatedMinutes: number;
  appliesTo: string;
  format: "Article" | "Video";
  /** Optional markdown body (admin-authored). When absent, the help page
   * shows only the metadata card. */
  bodyMarkdown?: string;
  /** Optional URL for video format. */
  videoUrl?: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  text: string;
  kind: "ticket" | "maintenance" | "device" | "project" | "service";
}

export interface CompanyProfile {
  name: string;
  legalName: string;
  abn: string;
  industry: string;
  primarySupportPlan: string;
  accountManager: string;
  sinceDate: string;
}

export interface BillingCredit {
  available: number;
  pending: number;
  used: number;
  nextInvoiceCredit: number;
}

export interface ReferralProgram {
  code: string;
  link: string;
  credit: BillingCredit;
  activity: ReferralActivity[];
}

// ===== Site detail tab extensions =====
export type ServiceCategory =
  | "network"
  | "voice"
  | "cctv"
  | "pos"
  | "endpoint"
  | "it_support"
  | "projects"
  | "traffic_analysis";

export type AccessNetworkType =
  | "NBN_FTTP"
  | "NBN_FTTC"
  | "NBN_FTTN"
  | "NBN_HFC"
  | "NBN_FW"
  | "NBN_EE"
  | "Opticomm"
  | "Starlink"
  | "Lightning"
  | "4G"
  | "5G"
  | "Other";

export interface AccessNetworkInfo {
  type: AccessNetworkType;
  carrier: string;
  planSpeed?: string;
  accountId?: string;
  hasFailover?: boolean;
  failoverType?: AccessNetworkType;
}

export interface OutageReport {
  status: "operational" | "scheduled" | "degraded" | "outage" | "unknown";
  checkedAt: string;
  source: string;
  message: string;
  scheduledStartsAt?: string;
  scheduledEndsAt?: string;
}

export interface ForwardingRule {
  id: string;
  match: string;
  destination: string;
  active: boolean;
}

export interface CallFlowStep {
  label: string;
  detail: string;
}

export interface SiteNetworkInfo {
  wanType: string;
  isp: string;
  has4gBackup: boolean;
  publicIp: string;
  outageStatus: "Online" | "Degraded" | "Outage";
  lastOutage?: string;
}

export interface SiteVoiceInfo {
  mainDid: string;
  callFlow: CallFlowStep[];
  forwarding: ForwardingRule[];
  inboundCallsToday: number;
  missedCallsToday: number;
}

export interface SiteAlarmInfo {
  armed: "Disarmed" | "Armed Stay" | "Armed Away" | "Triggered";
  lastEvent: string;
  lastEventAt: string;
  monitoredBy: string;
}

export interface SitePosInfo {
  posSystem: string;
  paymentProvider: string;
}

export interface SiteExtras {
  network?: SiteNetworkInfo;
  voice?: SiteVoiceInfo;
  alarm?: SiteAlarmInfo;
  pos?: SitePosInfo;
  projectPhotos?: Record<string, string[]>;
}
