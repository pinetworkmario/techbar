import { helpArticles } from "@/lib/data";
// Side-effect import: ensures help-articles.json is loaded into the
// in-memory array on first request (server-data is server-only).
import "@/lib/server-data";
import { HelpClient } from "./HelpClient";

export default function HelpPage() {
  return <HelpClient articles={helpArticles.slice()} />;
}
