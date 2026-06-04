// ─── Core types ───────────────────────────────────────────

export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type DealPriority = "high" | "medium" | "low";

export interface Deal {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  stage: DealStage;
  priority: DealPriority;
  value: number;
  currency: string;
  probability: number;
  ownerEn: string;
  ownerAr: string;
  contactNameEn: string;
  contactNameAr: string;
  contactRole?: string;
  orgId?: string;
  orgNameEn?: string;
  orgNameAr?: string;
  expectedCloseDateEn: string;
  expectedCloseDateAr: string;
  expectedCloseDateISO?: string;
  createdEn: string;
  createdAr: string;
  // For linking
  relatedWorkIds?: string[];
}

// ─── Stage order ──────────────────────────────────────────

export const STAGE_ORDER: DealStage[] = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];
export const PIPELINE_STAGES: DealStage[] = ["lead", "qualified", "proposal", "negotiation"];

// ─── Label maps ───────────────────────────────────────────

export const STAGE_META: Record<DealStage, { en: string; ar: string; dot: string; pill: string }> = {
  lead:        { en: "Lead",        ar: "عميل محتمل",  dot: "bg-stone-400",    pill: "bg-stone-100 text-stone-600 border border-stone-200" },
  qualified:   { en: "Qualified",   ar: "مؤهل",       dot: "bg-primary",      pill: "bg-primary/8 text-primary border border-primary/20" },
  proposal:    { en: "Proposal",    ar: "عرض سعر",    dot: "bg-amber-500",    pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  negotiation: { en: "Negotiation", ar: "تفاوض",      dot: "bg-violet-500",   pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  won:         { en: "Won",         ar: "فاز",        dot: "bg-emerald-500",  pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  lost:        { en: "Lost",        ar: "خسر",        dot: "bg-rose-500",     pill: "bg-rose-50 text-rose-600 border border-rose-200" },
};

export const DEAL_PRIORITY_META: Record<DealPriority, { en: string; ar: string; dot: string; pill: string }> = {
  high:   { en: "High",   ar: "مرتفع",  dot: "bg-amber-500",  pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  medium: { en: "Medium", ar: "متوسط",  dot: "bg-primary",    pill: "bg-primary/8 text-primary border border-primary/20" },
  low:    { en: "Low",    ar: "منخفض",  dot: "bg-muted-foreground/40", pill: "bg-muted text-muted-foreground border border-border" },
};

// ─── Helpers ──────────────────────────────────────────────

export function formatCurrency(value: number, currency: string = "SAR"): string {
  return new Intl.NumberFormat("en-SA", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function formatCurrencyAr(value: number, currency: string = "SAR"): string {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// ─── Default data ─────────────────────────────────────────

const DEFAULT_DEALS: Deal[] = [
  {
    id: "d-001",
    titleEn: "Meridian Group — Corporate Office Furniture Package",
    titleAr: "مجموعة ميريديان — حزمة أثاث مكتبي",
    descEn: "Full office furniture fit-out for the new Meridian Group headquarters in Riyadh. 3 floors, 120 workstations, executive suite, meeting rooms, and reception area. Client prefers Italian-style design with local manufacturing.",
    descAr: "تجهيز كامل بالأثاث المكتبي للمقر الجديد لمجموعة ميريديان في الرياض. ٣ طوابق، ١٢٠ محطة عمل، جناح تنفيذي، غرف اجتماعات، ومنطقة استقبال. يفضل العميل التصميم الإيطالي مع التصنيع المحلي.",
    stage: "negotiation",
    priority: "high",
    value: 2400000,
    currency: "SAR",
    probability: 75,
    ownerEn: "Khalid Al-Mansouri",
    ownerAr: "خالد المنصوري",
    contactNameEn: "Omar Al-Rashidi",
    contactNameAr: "عمر الراشدي",
    contactRole: "Procurement Director",
    orgId: "org-1",
    orgNameEn: "Meridian Group",
    orgNameAr: "مجموعة ميريديان",
    expectedCloseDateEn: "Sep 15, 2025",
    expectedCloseDateAr: "١٥ سبتمبر ٢٠٢٥",
    expectedCloseDateISO: "2025-09-15",
    createdEn: "Jul 10, 2025",
    createdAr: "١٠ يوليو ٢٠٢٥",
    relatedWorkIds: ["w-001"],
  },
  {
    id: "d-002",
    titleEn: "Gulf Traders — Warehouse Racking System",
    titleAr: "تجار الخليج — نظام أرفف المستودعات",
    descEn: "Industrial racking and shelving system for Gulf Traders' expanded warehouse facility. Heavy-duty pallet racks, selective shelving, and mezzanine platform. Installation included.",
    descAr: "نظام أرفف ورفوف صناعية لمستودع تجار الخليج الموسع. أرفف بالتات ثقيلة، رفوف انتقائية، ومنصة ميزانين. يشمل التركيب.",
    stage: "proposal",
    priority: "medium",
    value: 850000,
    currency: "SAR",
    probability: 60,
    ownerEn: "Sara Mahmoud",
    ownerAr: "سارة محمود",
    contactNameEn: "Fahad Al-Otaibi",
    contactNameAr: "فهد العتيبي",
    contactRole: "Operations Manager",
    orgId: "org-2",
    orgNameEn: "Gulf Traders LLC",
    orgNameAr: "تجار الخليج",
    expectedCloseDateEn: "Aug 28, 2025",
    expectedCloseDateAr: "٢٨ أغسطس ٢٠٢٥",
    expectedCloseDateISO: "2025-08-28",
    createdEn: "Jul 22, 2025",
    createdAr: "٢٢ يوليو ٢٠٢٥",
    relatedWorkIds: ["w-002", "w-009"],
  },
  {
    id: "d-003",
    titleEn: "Al-Bayt Real Estate — Model Home Staging",
    titleAr: "البيت للعقارات — تجهيز بيت نموذجي",
    descEn: "Complete staging of 3 model homes in the new Al-Bayt residential compound. Modern furniture, soft furnishings, art, and accessories. 6-month lease option with buyout clause.",
    descAr: "تجهيز كامل لـ ٣ بيوت نموذجية في مجمع البيت السكني الجديد. أثاث عصري، مفروشات ناعمة، لوحات، وإكسسوارات. خيار إيجار ٦ أشهر مع بند شراء.",
    stage: "qualified",
    priority: "medium",
    value: 420000,
    currency: "SAR",
    probability: 45,
    ownerEn: "Nora Al-Farsi",
    ownerAr: "نورة الفارسي",
    contactNameEn: "Layla Hassan",
    contactNameAr: "ليلى حسن",
    contactRole: "Marketing Director",
    orgNameEn: "Al-Bayt Real Estate",
    orgNameAr: "البيت للعقارات",
    expectedCloseDateEn: "Sep 5, 2025",
    expectedCloseDateAr: "٥ سبتمبر ٢٠٢٥",
    expectedCloseDateISO: "2025-09-05",
    createdEn: "Aug 1, 2025",
    createdAr: "١ أغسطس ٢٠٢٥",
  },
  {
    id: "d-004",
    titleEn: "Ministry of Education — School Furniture Tender",
    titleAr: "وزارة التعليم — مناقصة أثاث مدارس",
    descEn: "Government tender for school desks, chairs, and teacher stations across 15 schools in the Eastern Province. Standard spec with 3-year warranty requirement.",
    descAr: "مناقصة حكومية لمقاعد ومكاتب وأماكن المعلمين في ١٥ مدرسة بالمنطقة الشرقية. مواصفات قياسية مع ضمان ٣ سنوات.",
    stage: "lead",
    priority: "high",
    value: 3200000,
    currency: "SAR",
    probability: 25,
    ownerEn: "Khalid Al-Mansouri",
    ownerAr: "خالد المنصوري",
    contactNameEn: "Ahmed Khalil",
    contactNameAr: "أحمد خليل",
    contactRole: "Procurement Officer",
    orgNameEn: "Ministry of Education",
    orgNameAr: "وزارة التعليم",
    expectedCloseDateEn: "Nov 1, 2025",
    expectedCloseDateAr: "١ نوفمبر ٢٠٢٥",
    expectedCloseDateISO: "2025-11-01",
    createdEn: "Aug 3, 2025",
    createdAr: "٣ أغسطس ٢٠٢٥",
    relatedWorkIds: ["w-008"],
  },
  {
    id: "d-005",
    titleEn: "Jeddah Grand Hotel — Lobby Renovation",
    titleAr: "فندق جدة الكبير — تجديد اللوبي",
    descEn: "Luxury lobby furniture replacement for Jeddah Grand Hotel. Custom-designed sofas, coffee tables, reception desk, and accent lighting furniture. VIP lounge included.",
    descAr: "استبدال أثاث اللوبي الفاخر لفندق جدة الكبير. أرائك مصممة خصيصاً، طاولات قهوة، مكتب استقبال، وأثاث إضاءة. يشمل صالة كبار الشخصيات.",
    stage: "negotiation",
    priority: "high",
    value: 1800000,
    currency: "SAR",
    probability: 80,
    ownerEn: "Sara Mahmoud",
    ownerAr: "سارة محمود",
    contactNameEn: "Fatima Al-Zahra",
    contactNameAr: "فاطمة الزهراء",
    contactRole: "General Manager",
    orgNameEn: "Jeddah Grand Hotel",
    orgNameAr: "فندق جدة الكبير",
    expectedCloseDateEn: "Aug 20, 2025",
    expectedCloseDateAr: "٢٠ أغسطس ٢٠٢٥",
    expectedCloseDateISO: "2025-08-20",
    createdEn: "Jul 15, 2025",
    createdAr: "١٥ يوليو ٢٠٢٥",
  },
  {
    id: "d-006",
    titleEn: "Atlas Manufacturing — Break Room Refresh",
    titleAr: "أطلس للتصنيع — تجديد غرفة الاستراحة",
    descEn: "New break room furniture for Atlas Manufacturing plant. Cafeteria tables, stackable chairs, lounge seating, and outdoor patio furniture for 200+ employees.",
    descAr: "أثاث جديد لغرفة الاستراحة في مصنع أطلس. طاولات كافيتيريا، كراسي قابلة للتكديس، مقاعد صالة، وأثاث فناء خارجي لأكثر من ٢٠٠ موظف.",
    stage: "won",
    priority: "medium",
    value: 280000,
    currency: "SAR",
    probability: 100,
    ownerEn: "Fahad Al-Otaibi",
    ownerAr: "فهد العتيبي",
    contactNameEn: "Omar Al-Rashidi",
    contactNameAr: "عمر الراشدي",
    contactRole: "Facilities Director",
    orgId: "org-3",
    orgNameEn: "Atlas Manufacturing",
    orgNameAr: "أطلس للتصنيع",
    expectedCloseDateEn: "Jul 30, 2025",
    expectedCloseDateAr: "٣٠ يوليو ٢٠٢٥",
    expectedCloseDateISO: "2025-07-30",
    createdEn: "Jun 20, 2025",
    createdAr: "٢٠ يونيو ٢٠٢٥",
    relatedWorkIds: ["w-004"],
  },
  {
    id: "d-007",
    titleEn: "Riyadh Tech Hub — Co-working Space Fit-out",
    titleAr: "مركز الرياض التقني — تجهيز مساحة عمل مشتركة",
    descEn: "Modern co-working space furniture for new tech hub. Hot desks, phone booths, collaboration zones, and event space. Sustainable materials preferred.",
    descAr: "أثاث عصري لمساحة عمل مشتركة في مركز التقنية الجديد. مكاتب مشتركة، أكشاك هاتفية، مناطق تعاون، ومساحة فعاليات. يُفضل المواد المستدامة.",
    stage: "lead",
    priority: "medium",
    value: 950000,
    currency: "SAR",
    probability: 20,
    ownerEn: "Nora Al-Farsi",
    ownerAr: "نورة الفارسي",
    contactNameEn: "Layla Hassan",
    contactNameAr: "ليلى حسن",
    contactRole: "Founder",
    orgNameEn: "Riyadh Tech Hub",
    orgNameAr: "مركز الرياض التقني",
    expectedCloseDateEn: "Oct 15, 2025",
    expectedCloseDateAr: "١٥ أكتوبر ٢٠٢٥",
    expectedCloseDateISO: "2025-10-15",
    createdEn: "Aug 5, 2025",
    createdAr: "٥ أغسطس ٢٠٢٥",
  },
  {
    id: "d-008",
    titleEn: "National Hospital — Patient Room Furniture",
    titleAr: "المستشفى الوطني — أثاث غرف المرضى",
    descEn: "Healthcare-grade furniture for 50 patient rooms in the new wing. Adjustable overbed tables, visitor chairs, bedside cabinets, and nurse station desks.",
    descAr: "أثاث طبي لـ ٥٠ غرفة مريض في الجناح الجديد. طاولات سرير قابلة للتعديل، كراسي زوار، خزائن بجانب السرير، ومكاتب محطة التمريض.",
    stage: "qualified",
    priority: "high",
    value: 1500000,
    currency: "SAR",
    probability: 40,
    ownerEn: "Khalid Al-Mansouri",
    ownerAr: "خالد المنصوري",
    contactNameEn: "Ahmed Khalil",
    contactNameAr: "أحمد خليل",
    contactRole: "Chief Operating Officer",
    orgNameEn: "National Hospital",
    orgNameAr: "المستشفى الوطني",
    expectedCloseDateEn: "Oct 1, 2025",
    expectedCloseDateAr: "١ أكتوبر ٢٠٢٥",
    expectedCloseDateISO: "2025-10-01",
    createdEn: "Jul 28, 2025",
    createdAr: "٢٨ يوليو ٢٠٢٥",
  },
  {
    id: "d-009",
    titleEn: "Startup Accelerator — Office Setup (Lost)",
    titleAr: "مسرعة الأعمال — تجهيز مكتب (خسر)",
    descEn: "Office furniture for a startup accelerator program. Lost to competitor with lower pricing. Client chose imported flat-pack furniture over our custom offering.",
    descAr: "أثاث مكتبي لبرنامج مسرعة أعمال. خُسرت لصالح منافس بسعر أقل. اختار العميل أثاثاً مستورداً جاهزاً بدلاً من عرضنا المخصص.",
    stage: "lost",
    priority: "low",
    value: 180000,
    currency: "SAR",
    probability: 0,
    ownerEn: "Fahad Al-Otaibi",
    ownerAr: "فهد العتيبي",
    contactNameEn: "Fatima Al-Zahra",
    contactNameAr: "فاطمة الزهراء",
    contactRole: "Program Manager",
    orgNameEn: "Innovation Bay",
    orgNameAr: "خليج الابتكار",
    expectedCloseDateEn: "Jul 15, 2025",
    expectedCloseDateAr: "١٥ يوليو ٢٠٢٥",
    expectedCloseDateISO: "2025-07-15",
    createdEn: "Jun 10, 2025",
    createdAr: "١٠ يونيو ٢٠٢٥",
  },
  {
    id: "d-010",
    titleEn: "Premium Residences — Penthouse Collection",
    titleAr: "المساكن الفاخرة — مجموعة البنتهاوس",
    descEn: "Bespoke luxury furniture for 5 penthouse units. Italian leather sofas, marble dining tables, custom wardrobes, and designer accent pieces. White-glove delivery and installation.",
    descAr: "أثاث فاخر مخصص لـ ٥ وحدات بنتهاوس. أرائك جلد إيطالي، طاولات طعام رخامية، خزائن مخصصة، وقطع تصميمية. توصيل وتركيب مميز.",
    stage: "proposal",
    priority: "high",
    value: 4500000,
    currency: "SAR",
    probability: 55,
    ownerEn: "Sara Mahmoud",
    ownerAr: "سارة محمود",
    contactNameEn: "Omar Al-Rashidi",
    contactNameAr: "عمر الراشدي",
    contactRole: "Developer",
    orgNameEn: "Premium Residences Co.",
    orgNameAr: "شركة المساكن الفاخرة",
    expectedCloseDateEn: "Sep 30, 2025",
    expectedCloseDateAr: "٣٠ سبتمبر ٢٠٢٥",
    expectedCloseDateISO: "2025-09-30",
    createdEn: "Jul 18, 2025",
    createdAr: "١٨ يوليو ٢٠٢٥",
  },
];

// ─── localStorage persistence ─────────────────────────────

const STORAGE_KEY = "thoth_deals";

export function loadDeals(): Deal[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_DEALS;
}

export function saveDeals(deals: Deal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  } catch (_) {}
}
