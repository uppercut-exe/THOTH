import { useState, useRef, useEffect } from "react";
import {
  Cog, ShoppingBag, Globe, Headphones, Building2,
  Heart, Megaphone, Coffee, Truck, Circle,
  Check, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";
import { useOnboarding } from "../context/OnboardingContext";

// ─── Constants ────────────────────────────────────────────

const TOTAL_STEPS = 7;

const INDUSTRIES = [
  { value: "Manufacturing", en: "Manufacturing", ar: "التصنيع",        icon: Cog },
  { value: "Retail",        en: "Retail",        ar: "التجزئة",        icon: ShoppingBag },
  { value: "Ecommerce",     en: "E-commerce",    ar: "التجارة الرقمية", icon: Globe },
  { value: "Service",       en: "Service",       ar: "الخدمات",        icon: Headphones },
  { value: "Construction",  en: "Construction",  ar: "البناء",          icon: Building2 },
  { value: "Healthcare",    en: "Healthcare",    ar: "الرعاية الصحية", icon: Heart },
  { value: "Agency",        en: "Agency",        ar: "الوكالات",       icon: Megaphone },
  { value: "Hospitality",   en: "Hospitality",   ar: "الضيافة",        icon: Coffee },
  { value: "Logistics",     en: "Logistics",     ar: "اللوجستيات",     icon: Truck },
  { value: "Other",         en: "Other",         ar: "أخرى",           icon: Circle },
] as const;

const SIZES = [
  { value: "1–10",   en: "1 – 10",   ar: "١ – ١٠",   descEn: "Solo or small team", descAr: "فردي أو فريق صغير" },
  { value: "11–50",  en: "11 – 50",  ar: "١١ – ٥٠",  descEn: "Growing team",       descAr: "فريق في نمو" },
  { value: "51–200", en: "51 – 200", ar: "٥١ – ٢٠٠", descEn: "Mid-size company",   descAr: "شركة متوسطة" },
  { value: "200+",   en: "200+",     ar: "+٢٠٠",     descEn: "Large enterprise",   descAr: "مؤسسة كبيرة" },
] as const;

const LOCATIONS = [
  { value: "1",    en: "1",    ar: "١",    descEn: "Single location",    descAr: "موقع واحد" },
  { value: "2–5",  en: "2–5",  ar: "٢–٥",  descEn: "A few offices",      descAr: "عدة مكاتب" },
  { value: "6–20", en: "6–20", ar: "٦–٢٠", descEn: "Multiple locations", descAr: "مواقع متعددة" },
  { value: "20+",  en: "20+",  ar: "+٢٠",  descEn: "Wide network",       descAr: "شبكة واسعة" },
] as const;

// ─── THOTH symbol ─────────────────────────────────────────

function ThothMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-primary">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.75" />
    </svg>
  );
}

// ─── Motion config ────────────────────────────────────────

const TRANSITION = { duration: 0.22, ease: "easeOut" } as const;

const slide = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 20, filter: "blur(2px)" }),
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit:    (dir: number) => ({ opacity: 0, x: dir * -20, filter: "blur(2px)" }),
};

// ─── Shared UI pieces ─────────────────────────────────────

function StepHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="text-center mb-8">
      <h2
        className="text-[22px] font-medium text-foreground leading-tight mb-2"
        style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      {sub && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">{sub}</p>
      )}
    </div>
  );
}

function ContinueButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        w-full h-11 rounded-xl mt-6
        bg-primary text-primary-foreground
        text-[13px] font-medium
        shadow-sm
        disabled:opacity-40 disabled:cursor-not-allowed
        hover:opacity-90 active:opacity-80
        transition-opacity duration-150
        flex items-center justify-center gap-2
      "
    >
      {label}
      <ChevronRight size={14} strokeWidth={2} />
    </button>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex justify-start mt-5">
      <button
        onClick={onClick}
        className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
      </button>
    </div>
  );
}

// ─── Selection card (2-col grid item) ─────────────────────

function SelectCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex flex-col items-center justify-center
        py-4 px-3 rounded-xl border
        transition-all duration-150 gap-2
        ${selected
          ? "thoth-primary-selected shadow-sm"
          : "bg-card border-border hover:border-primary/30 hover:shadow-xs"
        }
      `}
    >
      {children}
      {selected && (
        <span className="absolute top-2 end-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check size={9} strokeWidth={2.5} className="text-primary-foreground" />
        </span>
      )}
    </button>
  );
}

// ─── Step progress bar ─────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === current
              ? "w-5 h-1.5 bg-primary"
              : i + 1 < current
              ? "w-1.5 h-1.5 bg-primary/40"
              : "w-1.5 h-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Summary row ──────────────────────────────────────────

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <p className="thoth-eyebrow mb-1">{label}</p>
        <p className="text-[14px] font-medium text-foreground">{value}</p>
      </div>
      <button
        onClick={onEdit}
        className="text-[12px] text-primary hover:text-primary/70 transition-colors mt-0.5 shrink-0 ms-4"
      >
        Edit
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────

interface FormData {
  companyName: string;
  industry: string;
  companySize: string;
  locations: string;
  language: "en" | "ar";
}

export default function Onboarding() {
  const { lang, setLang } = useLanguage();
  const { completeOnboarding } = useOnboarding();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormData>({
    companyName: "",
    industry: "",
    companySize: "",
    locations: "",
    language: "en",
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const ar = lang === "ar";

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => nameInputRef.current?.focus(), 200);
    }
  }, [step]);

  const next = () => { setDirection(1);  setStep((s) => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 1)); };
  const goTo = (s: number) => { setDirection(s > step ? 1 : -1); setStep(s); };

  const setLangAndNext = (l: "en" | "ar") => {
    setLang(l);
    setForm((f) => ({ ...f, language: l }));
    setTimeout(next, 180);
  };

  const finish = () => completeOnboarding(form);

  // ── Industry label helper ──
  const industryLabel = (val: string) => {
    const ind = INDUSTRIES.find((i) => i.value === val);
    return ind ? (ar ? ind.ar : ind.en) : val;
  };

  // ── Size label helper ──
  const sizeLabel = (val: string) => {
    const s = SIZES.find((s) => s.value === val);
    return s ? (ar ? s.ar : s.value) : val;
  };

  // ── Locations label helper ──
  const locationsLabel = (val: string) => {
    const l = LOCATIONS.find((l) => l.value === val);
    return l ? (ar ? `${l.ar} ${l.descAr}` : `${l.en} — ${l.descEn}`) : val;
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col bg-background"
      style={{ fontFamily: "var(--app-font-sans)" }}
    >
      {/* Top progress bar */}
      <div className="w-full h-[2px] bg-border/30">
        <motion.div
          className="h-full bg-primary/50"
          initial={false}
          animate={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Step dots */}
      <ProgressDots current={step} total={TOTAL_STEPS} />

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-6 pb-10">
        <div className="w-full max-w-[460px]">
          <AnimatePresence mode="wait" custom={direction}>

            {/* ────────────────────────────────────────────
                STEP 1 — WELCOME
            ──────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div key="s1" custom={direction} variants={slide}
                initial="initial" animate="animate" exit="exit"
                transition={TRANSITION}
                className="flex flex-col items-center text-center"
              >
                <div className="w-[64px] h-[64px] rounded-2xl bg-primary/8 border border-primary/12 flex items-center justify-center mb-8 shadow-sm">
                  <ThothMark size={28} />
                </div>

                <h1
                  className="text-[30px] font-medium text-foreground leading-tight mb-3"
                  style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}
                >
                  {ar ? "مرحباً بك في ثوث" : "Welcome to THOTH"}
                </h1>

                <p className="text-[14px] text-muted-foreground leading-relaxed mb-10 max-w-[320px]">
                  {ar
                    ? "نظام تشغيل أعمالك. دعنا نُعدّ كل شيء في دقائق."
                    : "Your business operating system. Let's get you set up in a few minutes."}
                </p>

                <button
                  onClick={next}
                  data-testid="button-get-started"
                  className="h-11 px-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium shadow-sm hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  {ar ? "البدء" : "Get Started"}
                </button>
              </motion.div>
            )}

            {/* ────────────────────────────────────────────
                STEP 2 — COMPANY NAME
            ──────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div key="s2" custom={direction} variants={slide}
                initial="initial" animate="animate" exit="exit"
                transition={TRANSITION}
              >
                <StepHeading
                  title={ar ? "ما اسم شركتك؟" : "What's your company called?"}
                  sub={ar ? "يمكنك تغييره لاحقاً من الإعدادات." : "You can change this later in Settings."}
                />

                <input
                  ref={nameInputRef}
                  type="text"
                  data-testid="input-company-name"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && form.companyName.trim() && next()}
                  placeholder={ar ? "اسم شركتك" : "Your company name"}
                  className="
                    w-full h-12 px-4 rounded-xl
                    border border-border/80 bg-card
                    text-[15px] text-foreground placeholder:text-muted-foreground/60
                    focus:outline-none focus:border-primary/40 focus:bg-card
                    transition-colors duration-150
                  "
                />

                <ContinueButton
                  label={ar ? "متابعة" : "Continue"}
                  onClick={next}
                  disabled={!form.companyName.trim()}
                />
                <BackButton label={ar ? "رجوع" : "Back"} onClick={back} />
              </motion.div>
            )}

            {/* ────────────────────────────────────────────
                STEP 3 — INDUSTRY
            ──────────────────────────────────────────── */}
            {step === 3 && (
              <motion.div key="s3" custom={direction} variants={slide}
                initial="initial" animate="animate" exit="exit"
                transition={TRANSITION}
              >
                <StepHeading
                  title={ar ? "ما قطاع عملك؟" : "What industry are you in?"}
                  sub={ar ? "اختر الأقرب لطبيعة نشاطك." : "Pick the one that best describes your business."}
                />

                <div className="grid grid-cols-2 gap-2.5">
                  {INDUSTRIES.map((ind) => {
                    const Icon = ind.icon;
                    const selected = form.industry === ind.value;
                    return (
                      <button
                        key={ind.value}
                        data-testid={`industry-${ind.value.toLowerCase()}`}
                        onClick={() => setForm((f) => ({ ...f, industry: ind.value }))}
                        className={`
                          relative flex items-center gap-3 px-4 py-3 rounded-xl border
                          transition-all duration-150 text-start
                          ${selected
                            ? "thoth-primary-selected shadow-sm"
                            : "bg-card border-border hover:border-primary/30 hover:bg-card"
                          }
                        `}
                      >
                        <Icon
                          size={15}
                          strokeWidth={1.75}
                          className={selected ? "text-primary shrink-0" : "text-muted-foreground shrink-0"}
                        />
                        <span className={`text-[13px] leading-snug ${selected ? "text-primary font-medium" : "text-foreground"}`}>
                          {ar ? ind.ar : ind.en}
                        </span>
                        {selected && (
                          <span className="absolute top-2 end-2 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                            <Check size={8} strokeWidth={2.5} className="text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <ContinueButton
                  label={ar ? "متابعة" : "Continue"}
                  onClick={next}
                  disabled={!form.industry}
                />
                <BackButton label={ar ? "رجوع" : "Back"} onClick={back} />
              </motion.div>
            )}

            {/* ────────────────────────────────────────────
                STEP 4 — COMPANY SIZE
            ──────────────────────────────────────────── */}
            {step === 4 && (
              <motion.div key="s4" custom={direction} variants={slide}
                initial="initial" animate="animate" exit="exit"
                transition={TRANSITION}
              >
                <StepHeading
                  title={ar ? "كم حجم فريقك؟" : "How large is your team?"}
                  sub={ar ? "عدد الموظفين التقريبي." : "Approximate number of employees."}
                />

                <div className="grid grid-cols-2 gap-3">
                  {SIZES.map((s) => {
                    const selected = form.companySize === s.value;
                    return (
                      <button
                        key={s.value}
                        data-testid={`size-${s.value}`}
                        onClick={() => {
                          setForm((f) => ({ ...f, companySize: s.value }));
                          setTimeout(next, 160);
                        }}
                        className={`
                          relative flex flex-col items-center justify-center
                          py-5 rounded-xl border
                          transition-all duration-150
                          ${selected
                            ? "thoth-primary-selected shadow-sm"
                            : "bg-card border-border hover:border-primary/30 hover:shadow-xs"
                          }
                        `}
                      >
                        <span
                          className={`text-[20px] font-medium leading-tight ${selected ? "text-primary" : "text-foreground"}`}
                          style={{ fontFamily: "var(--app-font-serif)" }}
                        >
                          {ar ? s.ar : s.en}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-1.5 text-center px-2 leading-snug">
                          {ar ? s.descAr : s.descEn}
                        </span>
                        {selected && (
                          <span className="absolute top-2 end-2 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                            <Check size={8} strokeWidth={2.5} className="text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <BackButton label={ar ? "رجوع" : "Back"} onClick={back} />
              </motion.div>
            )}

            {/* ────────────────────────────────────────────
                STEP 5 — LOCATIONS
            ──────────────────────────────────────────── */}
            {step === 5 && (
              <motion.div key="s5" custom={direction} variants={slide}
                initial="initial" animate="animate" exit="exit"
                transition={TRANSITION}
              >
                <StepHeading
                  title={ar ? "كم موقعاً تعمل منه؟" : "How many locations do you operate?"}
                  sub={ar ? "المكاتب، الفروع، أو المستودعات." : "Offices, branches, or warehouses."}
                />

                <div className="grid grid-cols-2 gap-3">
                  {LOCATIONS.map((loc) => {
                    const selected = form.locations === loc.value;
                    return (
                      <button
                        key={loc.value}
                        data-testid={`locations-${loc.value}`}
                        onClick={() => {
                          setForm((f) => ({ ...f, locations: loc.value }));
                          setTimeout(next, 160);
                        }}
                        className={`
                          relative flex flex-col items-center justify-center
                          py-5 rounded-xl border
                          transition-all duration-150
                          ${selected
                            ? "thoth-primary-selected shadow-sm"
                            : "bg-card border-border hover:border-primary/30 hover:shadow-xs"
                          }
                        `}
                      >
                        <span
                          className={`text-[20px] font-medium leading-tight ${selected ? "text-primary" : "text-foreground"}`}
                          style={{ fontFamily: "var(--app-font-serif)" }}
                        >
                          {ar ? loc.ar : loc.en}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-1.5 text-center px-2 leading-snug">
                          {ar ? loc.descAr : loc.descEn}
                        </span>
                        {selected && (
                          <span className="absolute top-2 end-2 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                            <Check size={8} strokeWidth={2.5} className="text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <BackButton label={ar ? "رجوع" : "Back"} onClick={back} />
              </motion.div>
            )}

            {/* ────────────────────────────────────────────
                STEP 6 — LANGUAGE
            ──────────────────────────────────────────── */}
            {step === 6 && (
              <motion.div key="s6" custom={direction} variants={slide}
                initial="initial" animate="animate" exit="exit"
                transition={TRANSITION}
              >
                <StepHeading
                  title="Choose your language"
                  sub="اختر لغة الواجهة / Select your preferred language"
                />

                <div className="flex flex-col gap-3">
                  {[
                    { code: "en" as const, primary: "English",  secondary: "English interface", badge: "EN" },
                    { code: "ar" as const, primary: "العربية",  secondary: "واجهة عربية مع دعم RTL", badge: "AR" },
                  ].map((opt) => {
                    const selected = form.language === opt.code;
                    return (
                      <button
                        key={opt.code}
                        data-testid={`lang-${opt.code}`}
                        onClick={() => setLangAndNext(opt.code)}
                        className={`
                          w-full flex items-center justify-between
                          px-5 py-4 rounded-xl border
                          transition-all duration-150 text-start
                          ${selected
                            ? "thoth-primary-selected shadow-sm"
                            : "bg-card border-border hover:border-primary/30 hover:shadow-xs"
                          }
                        `}
                      >
                        <div>
                          <div className="text-[15px] font-medium text-foreground">{opt.primary}</div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">{opt.secondary}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selected && (
                            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check size={10} strokeWidth={2.5} className="text-primary-foreground" />
                            </span>
                          )}
                          <span className="text-[11px] font-medium tracking-wider px-2.5 py-1 rounded-md bg-background border border-border text-muted-foreground">
                            {opt.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <BackButton label={ar ? "رجوع" : "Back"} onClick={back} />
              </motion.div>
            )}

            {/* ────────────────────────────────────────────
                STEP 7 — SUMMARY
            ──────────────────────────────────────────── */}
            {step === 7 && (
              <motion.div key="s7" custom={direction} variants={slide}
                initial="initial" animate="animate" exit="exit"
                transition={TRANSITION}
              >
                <StepHeading
                  title={ar ? "كل شيء جاهز" : "Here's your setup"}
                  sub={ar
                    ? "راجع تفاصيلك قبل الانطلاق."
                    : "Review your details before we get started."}
                />

                <div className="thoth-card px-5 mb-2">
                  <SummaryRow
                    label={ar ? "اسم الشركة" : "Company Name"}
                    value={form.companyName}
                    onEdit={() => goTo(2)}
                  />
                  <SummaryRow
                    label={ar ? "القطاع" : "Industry"}
                    value={industryLabel(form.industry)}
                    onEdit={() => goTo(3)}
                  />
                  <SummaryRow
                    label={ar ? "حجم الفريق" : "Team Size"}
                    value={sizeLabel(form.companySize)}
                    onEdit={() => goTo(4)}
                  />
                  <SummaryRow
                    label={ar ? "المواقع" : "Locations"}
                    value={locationsLabel(form.locations)}
                    onEdit={() => goTo(5)}
                  />
                  <SummaryRow
                    label={ar ? "اللغة" : "Language"}
                    value={form.language === "ar" ? "العربية (AR)" : "English (EN)"}
                    onEdit={() => goTo(6)}
                  />
                </div>

                <button
                  onClick={finish}
                  data-testid="button-finish"
                  className="
                    w-full h-11 rounded-xl mt-4
                    bg-primary text-primary-foreground
                    text-[13px] font-medium shadow-sm
                    hover:opacity-90 active:opacity-80
                    transition-opacity duration-150
                    flex items-center justify-center gap-2
                  "
                >
                  {ar ? "انطلق إلى ثوث" : "Launch THOTH"}
                  <ChevronRight size={14} strokeWidth={2} />
                </button>

                <BackButton label={ar ? "رجوع" : "Back"} onClick={back} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="py-5 text-center shrink-0">
        <span className="thoth-eyebrow opacity-60">THOTH</span>
      </div>
    </div>
  );
}
