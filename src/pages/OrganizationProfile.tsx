import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  ORGANIZATIONS, ORG_TYPE_META, ORG_STATUS_META, totalDepartments, totalTeams,
  type Organization, type Branch, type Department, type Team,
} from "../data/organizations";
import {
  ArrowLeft, ChevronRight, MapPin, Globe, Users, Building2,
  Layers, GitBranch, ChevronDown, Star, ExternalLink,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Tab types ────────────────────────────────────────────

type Tab = "overview" | "structure" | "branches" | "departments";

const TABS: { id: Tab; en: string; ar: string }[] = [
  { id: "structure",   en: "Structure",   ar: "الهيكل" },
  { id: "overview",    en: "Overview",    ar: "نظرة عامة" },
  { id: "branches",    en: "Branches",    ar: "الفروع" },
  { id: "departments", en: "Departments", ar: "الأقسام" },
];

// ─── Org chart: connecting bar ────────────────────────────
// Uses a CSS flex trick to draw the horizontal line between
// sibling branches: each cell is flex-1 with border-t,
// first starts at center (ms-[50%]), last ends at center (me-[50%]).

function HorizontalBar({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <div
      className="absolute top-0 left-0 right-0 flex pointer-events-none"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`flex-1 border-t border-border/40 ${
            i === 0 ? "ms-[50%]" : i === count - 1 ? "me-[50%]" : ""
          }`}
        />
      ))}
    </div>
  );
}

// ─── Org chart: team row ──────────────────────────────────

function TeamRow({ team, lang }: { team: Team; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0 ms-1" />
      <span className="text-[12px] text-foreground/75 flex-1 min-w-0 truncate">
        {ar ? team.nameAr : team.nameEn}
      </span>
      <span className="text-[11px] text-muted-foreground shrink-0">
        {team.headcount}p
      </span>
    </div>
  );
}

// ─── Org chart: department item ───────────────────────────

function DeptItem({ dept, lang }: { dept: Department; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-muted/20 transition-colors"
      >
        {/* Icon */}
        <div className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
          <Layers size={11} strokeWidth={1.75} className="text-muted-foreground" />
        </div>

        {/* Name + lead */}
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-medium text-foreground truncate leading-snug">
            {ar ? dept.nameAr : dept.nameEn}
          </p>
          {(dept.leadEn || dept.leadAr) && (
            <p className="text-[10.5px] text-muted-foreground truncate">
              {ar ? dept.leadAr : dept.leadEn}
            </p>
          )}
        </div>

        {/* Stats + toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground">{dept.headcount}p</span>
          {dept.teams.length > 0 && (
            <span className="text-[10.5px] text-muted-foreground/60">
              {dept.teams.length}T
            </span>
          )}
          {dept.teams.length > 0 && (
            <ChevronDown
              size={12}
              strokeWidth={2}
              className={`text-muted-foreground/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </button>

      {/* Teams */}
      {open && dept.teams.length > 0 && (
        <div className="border-t border-border/30 divide-y divide-border/20 bg-muted/10">
          {dept.teams.map((team) => (
            <TeamRow key={team.id} team={team} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Org chart: branch column ─────────────────────────────

function BranchColumn({ branch, lang }: { branch: Branch; lang: "en" | "ar" }) {
  const ar = lang === "ar";

  return (
    <div className="flex flex-col items-center min-w-[200px] max-w-[230px] w-full">
      {/* Vertical connector from horizontal bar → branch card */}
      <div className="w-px h-8 bg-border/40" aria-hidden="true" />

      {/* Branch card */}
      <div className="w-full border border-border/50 rounded-xl bg-background shadow-sm overflow-hidden">
        {branch.isHQ && (
          <div className="h-1 w-full bg-gradient-to-r from-primary/30 to-primary/10" />
        )}
        <div className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p
              className="text-[13px] font-medium text-foreground leading-tight"
              style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}
            >
              {ar ? branch.nameAr : branch.nameEn}
            </p>
            {branch.isHQ && (
              <Star size={11} className="text-primary/60 shrink-0 mt-0.5" fill="currentColor" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2.5">
            <MapPin size={9.5} strokeWidth={1.75} className="shrink-0" />
            {ar
              ? `${branch.cityAr}، ${branch.countryAr}`
              : `${branch.cityEn}, ${branch.countryEn}`
            }
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users size={10} strokeWidth={1.75} />
              {branch.headcount}
            </span>
            <span className="flex items-center gap-1">
              <Layers size={10} strokeWidth={1.75} />
              {branch.departments.length}
            </span>
          </div>
        </div>
      </div>

      {/* Departments */}
      {branch.departments.length > 0 && (
        <>
          <div className="w-px h-5 bg-border/40" aria-hidden="true" />
          <div className="w-full flex flex-col gap-2">
            {branch.departments.map((dept) => (
              <DeptItem key={dept.id} dept={dept} lang={lang} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Org chart: root node ─────────────────────────────────

function CompanyRootNode({ org, lang }: { org: Organization; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const typeMeta   = ORG_TYPE_META[org.type];
  const statusMeta = ORG_STATUS_META[org.status];

  return (
    <div className="w-full max-w-[320px] border border-primary/20 rounded-2xl bg-primary/4 overflow-hidden shadow-sm">
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-primary to-primary/30" />
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-semibold shrink-0 ${org.avatarColor}`}>
            {initials(ar ? org.nameAr : org.nameEn)}
          </div>
          <div className="min-w-0">
            <p
              className="text-[15px] font-medium text-foreground truncate"
              style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}
            >
              {ar ? org.nameAr : org.nameEn}
            </p>
            <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${typeMeta.pill}`}>
              {ar ? typeMeta.ar : typeMeta.en}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={11} strokeWidth={1.75} />
            {org.headcount.toLocaleString()} {ar ? "موظف" : "people"}
          </span>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
            {ar ? statusMeta.ar : statusMeta.en}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Structure tab ────────────────────────────────────────

function StructureTab({ org, lang }: { org: Organization; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const branchCount = org.branches.length;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex flex-col items-center min-w-max mx-auto px-4">

        {/* Root: Company */}
        <CompanyRootNode org={org} lang={lang} />

        {/* Vertical line: company → horizontal bar */}
        <div className="w-px h-8 bg-border/40" aria-hidden="true" />

        {/* Branches */}
        {branchCount === 1 ? (
          <BranchColumn branch={org.branches[0]} lang={lang} />
        ) : (
          <div className="relative flex gap-6 items-start">
            {/* Horizontal connector bar across all branch tops */}
            <HorizontalBar count={branchCount} />

            {org.branches.map((branch) => (
              <BranchColumn key={branch.id} branch={branch} lang={lang} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────

function OverviewTab({ org, lang }: { org: Organization; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const depts = totalDepartments(org);
  const teams  = totalTeams(org);

  return (
    <div className="space-y-5">
      {/* Description */}
      <div className="border border-border/40 rounded-xl px-6 py-5 bg-background">
        <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-3">
          {ar ? "نبذة" : "About"}
        </h3>
        <p
          className="text-[14px] text-foreground/85 leading-[1.75] max-w-[660px]"
          style={{ fontFamily: "var(--app-font-serif)" }}
        >
          {ar ? org.descAr : org.descEn}
        </p>
      </div>

      {/* Metrics */}
      <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
        <div className="px-6 py-4 border-b border-border/40">
          <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">
            {ar ? "المقاييس الرئيسية" : "Key Metrics"}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
          {[
            { value: org.headcount.toLocaleString(), label: ar ? "إجمالي الأشخاص" : "Total People" },
            { value: String(org.branches.length),    label: ar ? "الفروع"          : "Branches" },
            { value: String(depts),                  label: ar ? "الأقسام"         : "Departments" },
            { value: String(teams),                  label: ar ? "الفرق"           : "Teams" },
          ].map((s, i) => (
            <div key={i} className="bg-background px-6 py-5 flex flex-col gap-1.5">
              <p
                className="text-[22px] font-medium text-foreground leading-none"
                style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}
              >
                {s.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="border border-border/40 rounded-xl overflow-hidden bg-background divide-y divide-border/30">
        {[
          { label: ar ? "المقر الرئيسي" : "Headquarters",
            value: org.branches.find(b => b.isHQ)
              ? (ar
                  ? `${org.branches.find(b => b.isHQ)!.cityAr}، ${org.branches.find(b => b.isHQ)!.countryAr}`
                  : `${org.branches.find(b => b.isHQ)!.cityEn}, ${org.branches.find(b => b.isHQ)!.countryEn}`)
              : "—",
            icon: MapPin,
          },
          { label: ar ? "تأسست" : "Founded",      value: org.founded,     icon: Building2 },
          { label: ar ? "القطاع" : "Industry",    value: ar ? org.industryAr : org.industryEn, icon: GitBranch },
          ...(org.website
            ? [{ label: ar ? "الموقع" : "Website", value: org.website, icon: Globe, href: `https://${org.website}` }]
            : []),
        ].map((row, i) => {
          const Icon = row.icon;
          return (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Icon size={14} strokeWidth={1.75} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground mb-0.5">{row.label}</p>
                {"href" in row && row.href ? (
                  <a href={row.href} target="_blank" rel="noreferrer"
                    className="text-[13.5px] text-foreground hover:text-primary transition-colors flex items-center gap-1 w-fit">
                    {row.value}
                    <ExternalLink size={10} strokeWidth={1.75} className="text-muted-foreground/50" />
                  </a>
                ) : (
                  <p className="text-[13.5px] text-foreground">{row.value}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Branches tab ─────────────────────────────────────────

function BranchesTab({ org, lang }: { org: Organization; lang: "en" | "ar" }) {
  const ar = lang === "ar";

  return (
    <div className="space-y-4">
      {org.branches.map((branch) => (
        <div key={branch.id} className="border border-border/40 rounded-xl overflow-hidden bg-background">
          {/* Branch header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border/30">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className="text-[15px] font-medium text-foreground"
                  style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.015em" }}
                >
                  {ar ? branch.nameAr : branch.nameEn}
                </h3>
                {branch.isHQ && (
                  <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
                    {ar ? "المقر الرئيسي" : "HQ"}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                <MapPin size={10} strokeWidth={1.75} />
                {ar
                  ? `${branch.cityAr}، ${branch.countryAr}`
                  : `${branch.cityEn}, ${branch.countryEn}`
                }
              </p>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-muted-foreground shrink-0">
              <span className="flex items-center gap-1.5">
                <Users size={12} strokeWidth={1.75} />
                {branch.headcount} {ar ? "شخص" : "people"}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers size={12} strokeWidth={1.75} />
                {branch.departments.length} {ar ? "قسم" : "depts"}
              </span>
            </div>
          </div>

          {/* Departments list */}
          <div className="divide-y divide-border/20">
            {branch.departments.map((dept) => (
              <div key={dept.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/10 transition-colors">
                <div className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                  <Layers size={11} strokeWidth={1.75} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {ar ? dept.nameAr : dept.nameEn}
                  </p>
                  {(dept.leadEn || dept.leadAr) && (
                    <p className="text-[11px] text-muted-foreground">{ar ? dept.leadAr : dept.leadEn}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground shrink-0">
                  <span>{dept.headcount}p</span>
                  <span className="text-border">·</span>
                  <span>{dept.teams.length} {ar ? "فرق" : "teams"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Departments tab ──────────────────────────────────────

function DepartmentsTab({ org, lang }: { org: Organization; lang: "en" | "ar" }) {
  const ar = lang === "ar";

  const allDepts: { dept: Department; branch: Branch }[] = org.branches.flatMap((b) =>
    b.departments.map((d) => ({ dept: d, branch: b }))
  );

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border/40 bg-muted/20">
        {[
          ar ? "القسم" : "Department",
          ar ? "الفرع" : "Branch",
          ar ? "الأشخاص" : "People",
          ar ? "الفرق" : "Teams",
        ].map((h, i) => (
          <p key={i} className="text-[10.5px] font-semibold text-muted-foreground tracking-[0.07em] uppercase">
            {h}
          </p>
        ))}
      </div>

      {/* Rows */}
      {allDepts.map(({ dept, branch }, i) => (
        <div
          key={dept.id}
          className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 hover:bg-muted/15 transition-colors ${i < allDepts.length - 1 ? "border-b border-border/30" : ""}`}
        >
          {/* Dept */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <Layers size={12} strokeWidth={1.75} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                {ar ? dept.nameAr : dept.nameEn}
              </p>
              {(dept.leadEn || dept.leadAr) && (
                <p className="text-[11px] text-muted-foreground">{ar ? dept.leadAr : dept.leadEn}</p>
              )}
            </div>
          </div>

          {/* Branch */}
          <span className="text-[12px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
            {branch.isHQ && <Star size={9} className="text-primary/50" fill="currentColor" />}
            {ar ? branch.nameAr : branch.nameEn}
          </span>

          {/* People */}
          <span
            className="text-[13px] font-medium text-foreground whitespace-nowrap"
            style={{ fontFamily: "var(--app-font-serif)" }}
          >
            {dept.headcount}
          </span>

          {/* Teams */}
          <span className="text-[12.5px] text-foreground/70 whitespace-nowrap">
            {dept.teams.length}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────

export default function OrganizationProfile() {
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("structure");
  const ar = lang === "ar";

  const org: Organization | undefined = ORGANIZATIONS.find((o) => o.id === id);

  if (!org) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <Building2 size={20} className="text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
          {ar ? "لم يُعثر على المنظمة" : "Organization not found"}
        </p>
        <button
          onClick={() => navigate("/organizations")}
          className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"
        >
          <ArrowLeft size={12} strokeWidth={2} />
          {ar ? "العودة إلى المنظمات" : "Back to Organizations"}
        </button>
      </div>
    );
  }

  const typeMeta   = ORG_TYPE_META[org.type];
  const statusMeta = ORG_STATUS_META[org.status];
  const depts      = totalDepartments(org);
  const teams      = totalTeams(org);

  return (
    <div className="min-h-full">

      {/* ── Hero header ─────────────────────────────────── */}
      <div
        className="relative border-b border-border/40"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.35) 0%, hsl(var(--background)) 65%)" }}
      >
        {/* Back */}
        <div className="px-8 md:px-10 pt-6">
          <button
            onClick={() => navigate("/organizations")}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft size={12} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
            {ar ? "المنظمات" : "Organizations"}
            <ChevronRight size={11} strokeWidth={1.75} className="text-muted-foreground/50" />
            <span className="text-foreground/70">{ar ? org.nameAr : org.nameEn}</span>
          </button>
        </div>

        {/* Main */}
        <div className="px-8 md:px-10 pt-6 pb-7 max-w-[900px]">
          <div className="flex items-start gap-5">

            {/* Avatar */}
            <div
              className={`w-[68px] h-[68px] rounded-2xl shrink-0 flex items-center justify-center text-[20px] font-semibold select-none shadow-sm ring-4 ring-background/80 ${org.avatarColor}`}
            >
              {initials(ar ? org.nameAr : org.nameEn)}
            </div>

            {/* Name block */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h1
                    className="text-[26px] md:text-[30px] font-medium text-foreground leading-tight"
                    style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}
                  >
                    {ar ? org.nameAr : org.nameEn}
                  </h1>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {ar ? org.industryAr : org.industryEn}
                    {org.branches[0] && (
                      <>
                        <span className="mx-2 text-border">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={10} strokeWidth={1.75} className="text-muted-foreground/60" />
                          {ar
                            ? `${org.branches.find(b => b.isHQ)?.cityAr ?? org.branches[0].cityAr}, ${org.branches.find(b => b.isHQ)?.countryAr ?? org.branches[0].countryAr}`
                            : `${org.branches.find(b => b.isHQ)?.cityEn ?? org.branches[0].cityEn}, ${org.branches.find(b => b.isHQ)?.countryEn ?? org.branches[0].countryEn}`
                          }
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-background text-[11.5px] font-medium shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  {ar ? statusMeta.ar : statusMeta.en}
                </div>
              </div>

              {/* Type + founded + website */}
              <div className="flex items-center gap-3 flex-wrap mt-3">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${typeMeta.pill}`}>
                  {ar ? typeMeta.ar : typeMeta.en}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {ar ? `تأسست ${org.founded}` : `Est. ${org.founded}`}
                </span>
                {org.website && (
                  <a
                    href={`https://${org.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Globe size={11} strokeWidth={1.75} />
                    {org.website}
                    <ExternalLink size={9} strokeWidth={1.75} className="text-muted-foreground/40" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Metrics strip */}
          <div className="mt-7 pt-5 border-t border-border/40 flex items-center gap-7 flex-wrap">
            {[
              { value: org.headcount.toLocaleString(), label: ar ? "الأشخاص" : "People" },
              { value: String(org.branches.length),    label: ar ? "الفروع"   : "Branches" },
              { value: String(depts),                   label: ar ? "الأقسام" : "Departments" },
              { value: String(teams),                   label: ar ? "الفرق"   : "Teams" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <p
                  className="text-[18px] font-medium text-foreground leading-none"
                  style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}
                >
                  {s.value}
                </p>
                <p className="text-[11px] text-muted-foreground/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab navigation ───────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-8 md:px-10 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3.5 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-150 ${
                  activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {ar ? tab.ar : tab.en}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 inset-x-0 h-[2px] bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className={`py-7 ${activeTab === "structure" ? "px-4 md:px-8" : "px-8 md:px-10"} max-w-[1000px]`}>
        {activeTab === "structure"   && <StructureTab   org={org} lang={lang} />}
        {activeTab === "overview"    && <OverviewTab    org={org} lang={lang} />}
        {activeTab === "branches"    && <BranchesTab    org={org} lang={lang} />}
        {activeTab === "departments" && <DepartmentsTab org={org} lang={lang} />}
      </div>

    </div>
  );
}
