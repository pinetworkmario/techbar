/**
 * Synthetic traffic-analysis data for the prototype:
 *   - Internal: staff "clock-in / clock-out" derived from the first / last
 *     time a face was seen by an in-store camera.
 *   - External: hourly foot-traffic — people entering the store vs people
 *     walking past the storefront.
 *
 * Real implementation would consume face-recognition + people-counting events
 * from the NVR / camera analytics or a dedicated retail-analytics platform
 * (e.g. RetailNext, Hikvision iVMS, Dahua DSS Intelligence) and store a
 * per-day rollup. For prototype this is deterministic per (siteId, isoDate).
 *
 * Pure JS — safe to call from client or server.
 */

export interface StaffShift {
  staffId: string;
  name: string;
  role: string;
  firstSeen: string;        // HH:MM
  lastSeen: string;         // HH:MM
  hoursWorked: number;
  firstSeenCamera: string;
  lastSeenCamera: string;
  status: "On time" | "Late" | "Early leave" | "Active now";
}

export interface FootTrafficHour {
  hour: number;             // 0..23
  entered: number;
  passed: number;
}

export interface FootTrafficSummary {
  date: string;
  hourly: FootTrafficHour[];
  totalEntered: number;
  totalPassed: number;
  conversionPct: number;    // entered / passed * 100
  peakHour: number;
  peakEntered: number;
}

const STAFF_NAMES = [
  ["Aiko Tanaka", "Manager"],
  ["Hiroshi Sato", "Sous Chef"],
  ["Yuki Mori", "Chef"],
  ["Marcus Chen", "Front of House"],
  ["Linh Nguyen", "Server"],
  ["David Park", "Server"],
  ["Sophie Williams", "Cashier"],
  ["Jia Wang", "Kitchen Hand"],
  ["Tom Reilly", "Server"],
  ["Priya Shah", "Manager"],
  ["Hassan Ahmed", "Cleaner"],
  ["Bella Rossi", "Bartender"],
];

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoToDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function fmtHM(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Per-site, per-day staff attendance — deterministic. */
export function getInternalAttendance(
  siteId: string,
  isoDate: string = todayIso(),
): StaffShift[] {
  const seed = hashStr(`${siteId}:staff:${isoDate}`);
  const count = 4 + (seed % 5); // 4..8 staff
  const cameras = ["AP_Front", "AP_Mid", "AP_Back", "Counter Cam", "Kitchen Cam"];
  const out: StaffShift[] = [];
  const usedNames = new Set<number>();
  const now = new Date();
  const isToday = isoDate === todayIso();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  for (let i = 0; i < count; i++) {
    let nameIdx = hashStr(`${siteId}:staff:${isoDate}:${i}`) % STAFF_NAMES.length;
    let attempt = 0;
    while (usedNames.has(nameIdx) && attempt < STAFF_NAMES.length) {
      nameIdx = (nameIdx + 1) % STAFF_NAMES.length;
      attempt += 1;
    }
    usedNames.add(nameIdx);
    const [name, role] = STAFF_NAMES[nameIdx];
    const s = hashStr(`${siteId}:${name}:${isoDate}`);
    // Most arrive 7..10 a.m., a few late 10..11
    const firstHour = 7 + ((s >> 1) % 4);
    const firstMinute = (s >> 3) % 60;
    // Most leave 17..22
    const lastHour = 17 + ((s >> 5) % 6);
    const lastMinute = (s >> 7) % 60;
    const firstFloat = firstHour + firstMinute / 60;
    const lastFloat = lastHour + lastMinute / 60;

    let status: StaffShift["status"] = "On time";
    let displayLast = fmtHM(lastHour, lastMinute);
    let hours = lastFloat - firstFloat;

    if (firstFloat > 9.5) status = "Late";
    if (isToday && currentHour < lastFloat) {
      status = "Active now";
      const ch = Math.floor(currentHour);
      const cm = Math.floor((currentHour - ch) * 60);
      displayLast = fmtHM(ch, cm) + " (still in)";
      hours = currentHour - firstFloat;
    } else if (lastFloat < 17.5) {
      status = "Early leave";
    }

    out.push({
      staffId: `staff-${siteId.slice(-6)}-${nameIdx}`,
      name,
      role,
      firstSeen: fmtHM(firstHour, firstMinute),
      lastSeen: displayLast,
      hoursWorked: Math.max(0, Math.round(hours * 10) / 10),
      firstSeenCamera: cameras[s % cameras.length],
      lastSeenCamera: cameras[(s >> 4) % cameras.length],
      status,
    });
  }
  return out;
}

/** Hourly foot-traffic (people entering vs people walking past). */
export function getExternalTraffic(
  siteId: string,
  isoDate: string = todayIso(),
): FootTrafficSummary {
  const seed = hashStr(`${siteId}:foot:${isoDate}`);
  const isToday = isoDate === todayIso();
  const nowHour = isToday ? new Date().getHours() : 23;
  const baseEntered = 20 + (seed % 25);
  const basePassed = 80 + ((seed >> 3) % 80);
  const hourly: FootTrafficHour[] = [];
  for (let h = 0; h < 24; h++) {
    // Closed before 10 / after 22
    if (h < 10 || h > 22) {
      hourly.push({ hour: h, entered: 0, passed: Math.floor(basePassed * 0.2) });
      continue;
    }
    if (isToday && h > nowHour) {
      hourly.push({ hour: h, entered: 0, passed: 0 });
      continue;
    }
    // Lunch peak 12-13 and dinner peak 18-20
    let entMul = 0.6;
    let pasMul = 0.7;
    if (h === 12 || h === 13) {
      entMul = 1.4;
      pasMul = 1.1;
    } else if (h >= 18 && h <= 20) {
      entMul = 1.7;
      pasMul = 1.3;
    } else if (h === 11 || h === 14 || h === 17 || h === 21) {
      entMul = 1.0;
      pasMul = 0.9;
    }
    const jitter = (hashStr(`${siteId}:${isoDate}:${h}`) % 30) - 15; // -15..+14
    const entered = Math.max(
      0,
      Math.round(baseEntered * entMul + jitter * 0.4),
    );
    const passed = Math.max(
      0,
      Math.round(basePassed * pasMul + jitter * 1.2),
    );
    hourly.push({ hour: h, entered, passed });
  }
  const totalEntered = hourly.reduce((s, x) => s + x.entered, 0);
  const totalPassed = hourly.reduce((s, x) => s + x.passed, 0);
  const peak = hourly.reduce(
    (best, x) => (x.entered > best.entered ? x : best),
    hourly[0],
  );
  return {
    date: isoDate,
    hourly,
    totalEntered,
    totalPassed,
    conversionPct:
      totalPassed > 0
        ? Math.round((totalEntered / totalPassed) * 1000) / 10
        : 0,
    peakHour: peak.hour,
    peakEntered: peak.entered,
  };
}
