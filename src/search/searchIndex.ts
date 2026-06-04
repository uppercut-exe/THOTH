import { loadWorkItems } from "../data/work";
import { loadDeals } from "../data/sales";
import { loadInvoices } from "../data/finance";
import { loadResources } from "../data/resources";
import { PEOPLE } from "../data/people";
import { ORGANIZATIONS } from "../data/organizations";

export type SearchResultType =
  | "work"
  | "deal"
  | "person"
  | "organization"
  | "invoice"
  | "resource";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  route: string;
  badge?: string;
}

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = [];

  loadWorkItems().forEach((w) => {
    results.push({
      id: `work-${w.id}`,
      type: "work",
      titleEn: w.titleEn,
      titleAr: w.titleAr,
      subtitleEn: w.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      subtitleAr: w.titleAr,
      route: `/work/${w.id}`,
      badge: w.priority,
    });
  });

  loadDeals().forEach((d) => {
    results.push({
      id: `deal-${d.id}`,
      type: "deal",
      titleEn: d.titleEn,
      titleAr: d.titleAr,
      subtitleEn: d.orgNameEn || d.contactNameEn,
      subtitleAr: d.orgNameAr || d.contactNameAr,
      route: `/sales/${d.id}`,
      badge: d.stage,
    });
  });

  PEOPLE.forEach((p) => {
    results.push({
      id: `person-${p.id}`,
      type: "person",
      titleEn: p.name,
      titleAr: p.nameAr,
      subtitleEn: p.company || p.role,
      subtitleAr: p.companyAr || p.roleAr,
      route: `/people/${p.id}`,
      badge: p.type,
    });
  });

  ORGANIZATIONS.forEach((o) => {
    results.push({
      id: `org-${o.id}`,
      type: "organization",
      titleEn: o.nameEn,
      titleAr: o.nameAr,
      subtitleEn: o.industryEn,
      subtitleAr: o.industryAr,
      route: `/organizations/${o.id}`,
      badge: o.relationship,
    });
  });

  loadInvoices().forEach((inv) => {
    results.push({
      id: `invoice-${inv.id}`,
      type: "invoice",
      titleEn: `${inv.number} — ${inv.titleEn}`,
      titleAr: `${inv.number} — ${inv.titleAr}`,
      subtitleEn: inv.orgNameEn,
      subtitleAr: inv.orgNameAr,
      route: `/finance/${inv.id}`,
      badge: inv.status,
    });
  });

  loadResources().forEach((r) => {
    results.push({
      id: `resource-${r.id}`,
      type: "resource",
      titleEn: r.nameEn,
      titleAr: r.nameAr,
      subtitleEn: r.type,
      subtitleAr: r.nameAr,
      route: `/resources/${r.id}`,
      badge: r.status,
    });
  });

  return results;
}

export function searchIndex(query: string, index: SearchResult[]): SearchResult[] {
  if (!query.trim()) return [];
  return index.filter((item) =>
    fuzzyMatch(query, item.titleEn) ||
    fuzzyMatch(query, item.titleAr) ||
    fuzzyMatch(query, item.subtitleEn) ||
    fuzzyMatch(query, item.subtitleAr)
  );
}

export function groupByType(results: SearchResult[]): Record<SearchResultType, SearchResult[]> {
  const groups: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  }
  return groups as Record<SearchResultType, SearchResult[]>;
}
