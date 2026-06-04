import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getSupabaseClient } from "../lib/supabase";
import { Loader2, Building2, Globe, ChevronRight, AlertCircle } from "lucide-react";

const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Retail & E-commerce",
  "Manufacturing", "Construction & Real Estate", "Energy & Utilities",
  "Education", "Consulting & Professional Services", "Media & Entertainment",
  "Logistics & Supply Chain", "Government & Public Sector", "Other",
];

const COMPANY_TYPES = [
  "LLC", "Corporation", "Sole Proprietorship", "Partnership",
  "Non-Profit", "Government Entity", "Startup", "Other",
];

const CURRENCIES = [
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EGP", label: "EGP — Egyptian Pound" },
  { code: "KWD", label: "KWD — Kuwaiti Dinar" },
  { code: "QAR", label: "QAR — Qatari Riyal" },
  { code: "BHD", label: "BHD — Bahraini Dinar" },
  { code: "OMR", label: "OMR — Omani Rial" },
];

const COUNTRIES = [
  "Saudi Arabia", "United Arab Emirates", "Kuwait", "Qatar", "Bahrain",
  "Oman", "Egypt", "Jordan", "Lebanon", "Iraq", "Morocco", "Tunisia",
  "United Kingdom", "United States", "Germany", "France", "Other",
];

interface FormState {
  companyName: string;
  companyType: string;
  industry: string;
  website: string;
  country: string;
  city: string;
  currency: string;
  phone: string;
  ownerName: string;
  ownerEmail: string;
}

export default function WorkspaceSetup() {
  const { user, workspace, refreshWorkspace, signOut } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    companyName: "",
    companyType: "",
    industry: "",
    website: "",
    country: "",
    city: "",
    currency: "SAR",
    phone: "",
    ownerName: (user?.user_metadata?.full_name as string) ?? "",
    ownerEmail: user?.email ?? "",
  });

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canProceedStep1() {
    return form.companyName.trim() !== "" && form.industry !== "";
  }

  function canProceedStep2() {
    return form.country !== "";
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);

    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error("Supabase client not available");

      // Always resolve the live auth user directly from the active session.
      // This guarantees owner_id matches auth.uid() server-side (RLS).
      const { data: { user: authUser }, error: sessionErr } = await sb.auth.getUser();
      if (sessionErr || !authUser) {
        console.error("[THOTH] sb.auth.getUser() error:", sessionErr);
        throw new Error("Session not found. Please sign out and sign back in.");
      }
      console.log("[THOTH] authUser.id (will be owner_id):", authUser.id);

      const settings = {
        company_name: form.companyName.trim(),
        company_type: form.companyType,
        industry: form.industry,
        website: form.website.trim(),
        country: form.country,
        city: form.city.trim(),
        currency: form.currency,
        phone: form.phone.trim(),
        onboarding_completed: true,
      };

      const wsName = `${form.companyName.trim()}'s Workspace`;

      if (workspace) {
        console.log("[THOTH] Updating existing workspace:", workspace.id);
        const { error: updateErr } = await sb
          .from("workspaces")
          .update({ name: wsName, settings })
          .eq("id", workspace.id);
        if (updateErr) {
          console.error("[THOTH] workspace update error:", updateErr);
          throw updateErr;
        }
      } else {
        const slug =
          form.companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
          "-" +
          authUser.id.slice(0, 6);

        // Step 1 — ensure profile row exists (workspaces.owner_id FKs to profiles.id)
        console.log("[THOTH] Upserting profile for:", authUser.id);
        const { error: profileErr } = await sb
          .from("profiles")
          .upsert({
            id: authUser.id,
            email: form.ownerEmail.trim() || authUser.email || "",
            full_name: form.ownerName.trim() || (authUser.user_metadata?.full_name as string) || "",
          }, { onConflict: "id" });
        if (profileErr) {
          console.error("[THOTH] profiles upsert error:", JSON.stringify(profileErr));
          // Non-fatal if trigger already created the row — log and continue
        }

        // Step 2 — create workspace
        const insertPayload = {
          name: wsName,
          slug,
          plan: "free",
          owner_id: authUser.id,
          settings,
        };
        console.log("[THOTH] Inserting workspace:", JSON.stringify(insertPayload));

        const { data: ws, error: wsErr } = await sb
          .from("workspaces")
          .insert(insertPayload)
          .select()
          .single();

        if (wsErr) {
          console.error("[THOTH] workspace insert error:", JSON.stringify(wsErr));
          throw new Error(`Workspace creation failed: ${wsErr.message} (code: ${wsErr.code})`);
        }

        // Step 3 — create owner membership
        console.log("[THOTH] Workspace created:", ws.id, "— inserting workspace_member");
        const { error: memberErr } = await sb
          .from("workspace_members")
          .insert({ workspace_id: ws.id, user_id: authUser.id, role: "owner" });

        if (memberErr) {
          console.error("[THOTH] workspace_members insert error:", JSON.stringify(memberErr));
          throw new Error(`Membership creation failed: ${memberErr.message} (code: ${memberErr.code})`);
        }
      }

      await refreshWorkspace();
    } catch (e) {
      console.error("[THOTH] handleFinish caught error:", e);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full h-10 rounded-xl border border-border/60 bg-background px-3.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground/50";
  const selectCls =
    "w-full h-10 rounded-xl border border-border/60 bg-background px-3.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition appearance-none cursor-pointer";
  const labelCls = "text-[11px] font-medium text-muted-foreground mb-1 block";

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">

        {/* Brand */}
        <div className="text-center mb-8">
          <p
            className="text-[24px] font-bold tracking-tight"
            style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}
          >
            THOTH
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">Let's set up your workspace</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                s < step ? "bg-foreground text-background" : s === step ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}>
                {s < step ? "✓" : s}
              </div>
              {s < 3 && <div className={`flex-1 h-px transition-colors ${s < step ? "bg-foreground/30" : "bg-border/40"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-background border border-border/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-8">

            {/* Step 1: Company */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={14} className="text-muted-foreground" />
                    <p className="text-[15px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>Company Information</p>
                  </div>
                  <p className="text-[12px] text-muted-foreground">Tell us about your organization</p>
                </div>

                <div>
                  <label className={labelCls}>Company Name <span className="text-rose-400">*</span></label>
                  <input type="text" value={form.companyName} onChange={(e) => set("companyName", e.target.value)}
                    placeholder="e.g. Gulf Traders LLC" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Company Type</label>
                  <select value={form.companyType} onChange={(e) => set("companyType", e.target.value)} className={selectCls}>
                    <option value="">Select type...</option>
                    {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Industry <span className="text-rose-400">*</span></label>
                  <select value={form.industry} onChange={(e) => set("industry", e.target.value)} className={selectCls}>
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Website</label>
                  <input type="url" value={form.website} onChange={(e) => set("website", e.target.value)}
                    placeholder="https://yourcompany.com" className={inputCls} />
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1()}
                  className="w-full h-10 rounded-xl bg-foreground text-background text-[13px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 mt-2"
                >
                  Continue
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={14} className="text-muted-foreground" />
                    <p className="text-[15px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>Location & Preferences</p>
                  </div>
                  <p className="text-[12px] text-muted-foreground">Region, currency and contact details</p>
                </div>

                <div>
                  <label className={labelCls}>Country <span className="text-rose-400">*</span></label>
                  <select value={form.country} onChange={(e) => set("country", e.target.value)} className={selectCls}>
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)}
                    placeholder="e.g. Riyadh" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={selectCls}>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                    placeholder="+966 5x xxx xxxx" className={inputCls} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2()}
                    className="flex-1 h-10 rounded-xl bg-foreground text-background text-[13px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    Continue <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Owner & Confirm */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[15px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>Owner Details</p>
                  </div>
                  <p className="text-[12px] text-muted-foreground">Your personal information as workspace owner</p>
                </div>

                <div>
                  <label className={labelCls}>Your Name</label>
                  <input type="text" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)}
                    placeholder="Your full name" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Your Email</label>
                  <input type="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)}
                    placeholder="you@company.com" className={inputCls} />
                </div>

                {/* Summary */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-medium">{form.companyName}</span>
                  </div>
                  {form.industry && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Industry</span>
                      <span className="font-medium">{form.industry}</span>
                    </div>
                  )}
                  {form.country && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country</span>
                      <span className="font-medium">{form.country}{form.city ? `, ${form.city}` : ""}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Currency</span>
                    <span className="font-medium">{form.currency}</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} disabled={loading} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors disabled:opacity-50">
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={loading}
                    className="flex-1 h-10 rounded-xl bg-foreground text-background text-[13px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                    {loading ? "Setting up…" : "Launch THOTH"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-5">
          <button onClick={() => signOut()} className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
