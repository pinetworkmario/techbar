export type Lang = "en" | "zh";

export const LANGS: Lang[] = ["en", "zh"];

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    "modules.network": "Internet & Wi-Fi",
    "modules.voice": "Phones",
    "modules.cctv": "Security cameras",
    "modules.pos": "Payment terminals",
    "modules.endpoint": "Computers & devices",
    "modules.it_support": "IT support",
    "status.allRunning": "All running smoothly",
    "status.issuesDetected": "We've spotted some issues",
    "status.callSupport": "Need a hand? Call support",
    "status.online": "Online",
    "status.offline": "Offline",
    "status.degraded": "Degraded",
    "nav.sites": "My sites",
    "nav.tickets": "Tickets",
    "nav.help": "Help & training",
    "nav.account": "My account",
    "nav.store": "Store",
    "common.viewDetails": "View details",
    "common.requestHelp": "Request help",
    "common.lastCheckedAt": "Last checked",
    "timeline.engineerVisit": "Our engineer was on-site",
    "timeline.deviceReplaced": "Device replaced",
    "timeline.routineCheck": "Routine check completed",
  },
  zh: {
    "modules.network": "网络上网",
    "modules.voice": "电话",
    "modules.cctv": "监控摄像头",
    "modules.pos": "刷卡机",
    "modules.endpoint": "电脑设备",
    "modules.it_support": "技术支持",
    "status.allRunning": "一切运行正常",
    "status.issuesDetected": "发现一些问题",
    "status.callSupport": "需要帮助？联系我们",
    "status.online": "在线",
    "status.offline": "离线",
    "status.degraded": "服务降级",
    "nav.sites": "我的店铺",
    "nav.tickets": "工单",
    "nav.help": "帮助",
    "nav.account": "我的账户",
    "nav.store": "商城",
    "common.viewDetails": "查看详情",
    "common.requestHelp": "请求支持",
    "common.lastCheckedAt": "最后检查",
    "timeline.engineerVisit": "工程师上门",
    "timeline.deviceReplaced": "设备更换",
    "timeline.routineCheck": "例行检查完成",
  },
};

export function t(lang: Lang, key: string): string {
  const dict = DICT[lang];
  if (dict && key in dict) return dict[key];
  return key;
}

export async function getLang(): Promise<Lang> {
  // Lazily import next/headers so this module stays safe to import from
  // client components (which only need the type and the `t()` helper).
  const { cookies } = await import("next/headers");
  const c = await cookies();
  const raw = c.get("pi_lang")?.value;
  if (raw === "zh" || raw === "en") return raw;
  return "en";
}
