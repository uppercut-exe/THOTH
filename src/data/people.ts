// ─── Core types ───────────────────────────────────────────

export type Status = "active" | "lead" | "inactive";
export type PersonType = "customer" | "employee" | "supplier" | "contractor" | "partner";

export interface RoleEntry {
  type: PersonType;
  sinceEn: string;
  sinceAr: string;
  descEn: string;
  descAr: string;
}

export interface ActivityItem {
  id: string;
  kind: "email" | "call" | "payment" | "order" | "note" | "contract" | "meeting" | "added";
  textEn: string;
  textAr: string;
  dateEn: string;
  dateAr: string;
  authorEn?: string;
  authorAr?: string;
  valueEn?: string;
  valueAr?: string;
}

export interface NoteItem {
  id: string;
  textEn: string;
  textAr: string;
  authorEn: string;
  authorAr: string;
  dateEn: string;
  dateAr: string;
}

export interface FileItem {
  id: string;
  nameEn: string;
  nameAr: string;
  kind: "pdf" | "doc" | "zip" | "xls" | "img";
  size: string;
  dateEn: string;
  dateAr: string;
}

export interface RelatedRecord {
  id: string;
  kind: "invoice" | "order" | "contract" | "quote";
  refEn: string;
  refAr: string;
  descEn: string;
  descAr: string;
  valueEn: string;
  valueAr: string;
  statusEn: string;
  statusAr: string;
  statusTone: "active" | "warning" | "neutral" | "success";
  dateEn: string;
  dateAr: string;
}

export interface PersonMetrics {
  totalValue: string;
  totalValueAr: string;
  transactionCount: number;
  sinceEn: string;
  sinceAr: string;
  openItems: number;
}

export interface Person {
  id: string;
  name: string;
  nameAr: string;
  company: string;
  companyAr: string;
  role: string;
  roleAr: string;
  status: Status;
  type: PersonType;
  roles: RoleEntry[];
  phone: string;
  email: string;
  address?: string;
  addressAr?: string;
  city?: string;
  cityAr?: string;
  country?: string;
  countryAr?: string;
  website?: string;
  linkedin?: string;
  bioEn?: string;
  bioAr?: string;
  lastContactEn: string;
  lastContactAr: string;
  avatarColor: string;
  metrics?: PersonMetrics;
  activity?: ActivityItem[];
  notes?: NoteItem[];
  files?: FileItem[];
  related?: RelatedRecord[];
}

// ─── Label maps (shared) ──────────────────────────────────

export const STATUS_META: Record<Status, { en: string; ar: string; dot: string; pill: string }> = {
  active:   { en: "Active",   ar: "نشط",     dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  lead:     { en: "Lead",     ar: "محتمل",    dot: "bg-primary",     pill: "bg-primary/8 text-primary border border-primary/20" },
  inactive: { en: "Inactive", ar: "غير نشط", dot: "bg-muted-foreground/35", pill: "bg-muted text-muted-foreground border border-border" },
};

export const TYPE_META: Record<PersonType, { en: string; ar: string; pill: string; subtle: string }> = {
  customer:   { en: "Customer",   ar: "عميل",    pill: "bg-violet-50 text-violet-700 border border-violet-200",   subtle: "text-violet-600" },
  employee:   { en: "Employee",   ar: "موظف",    pill: "bg-emerald-50 text-emerald-700 border border-emerald-200", subtle: "text-emerald-600" },
  supplier:   { en: "Supplier",   ar: "مورد",    pill: "bg-amber-50 text-amber-700 border border-amber-200",       subtle: "text-amber-600" },
  contractor: { en: "Contractor", ar: "متعاقد",  pill: "bg-blue-50 text-blue-700 border border-blue-200",         subtle: "text-blue-600" },
  partner:    { en: "Partner",    ar: "شريك",    pill: "bg-cyan-50 text-cyan-700 border border-cyan-200",          subtle: "text-cyan-600" },
};

// ─── People data ──────────────────────────────────────────

export const PEOPLE: Person[] = [
  // ── p01: Omar — rich profile ──────────────────────────
  {
    id: "p01",
    name: "Omar Al-Rashidi",
    nameAr: "عمر الراشدي",
    company: "Meridian Trading",
    companyAr: "ميريديان للتجارة",
    role: "Procurement Manager",
    roleAr: "مدير المشتريات",
    status: "active",
    type: "customer",
    roles: [
      {
        type: "customer",
        sinceEn: "January 2022",
        sinceAr: "يناير ٢٠٢٢",
        descEn: "Key procurement contact for office furniture and facilities. Handles all purchase orders and vendor approvals for Meridian's UAE operations.",
        descAr: "جهة الاتصال الرئيسية للمشتريات للأثاث المكتبي والمرافق. يتولى جميع أوامر الشراء والموافقات على البائعين لعمليات ميريديان في الإمارات.",
      },
      {
        type: "partner",
        sinceEn: "March 2023",
        sinceAr: "مارس ٢٠٢٣",
        descEn: "Co-referral partner for the Northern Gulf region. Introduces qualified leads in exchange for a 5% referral fee on closed deals.",
        descAr: "شريك إحالة مشترك لمنطقة الخليج الشمالي. يقدم عملاء مؤهلين مقابل رسوم إحالة 5٪ على الصفقات المُغلقة.",
      },
    ],
    phone: "+971 50 234 5678",
    email: "omar@meridian.ae",
    address: "Level 14, Meridian Tower",
    addressAr: "المستوى ١٤، برج ميريديان",
    city: "Dubai",
    cityAr: "دبي",
    country: "United Arab Emirates",
    countryAr: "الإمارات العربية المتحدة",
    website: "meridiantrading.ae",
    linkedin: "linkedin.com/in/omaralrashidi",
    bioEn: "Omar has led procurement for Meridian Trading since 2018, overseeing a portfolio of over 40 active suppliers across the GCC. He is known for his methodical approach to vendor selection and his emphasis on long-term relationship value over transactional cost savings.",
    bioAr: "يقود عمر المشتريات في ميريديان للتجارة منذ عام ٢٠١٨، ويشرف على محفظة تضم أكثر من ٤٠ مورداً نشطاً في منطقة الخليج. يُعرف بنهجه المنهجي في اختيار الموردين وتركيزه على قيمة العلاقة طويلة الأمد.",
    lastContactEn: "Today",
    lastContactAr: "اليوم",
    avatarColor: "bg-violet-100 text-violet-700",
    metrics: {
      totalValue: "$284,500",
      totalValueAr: "٢٨٤٥٠٠ دولار",
      transactionCount: 12,
      sinceEn: "Jan 2022",
      sinceAr: "يناير ٢٠٢٢",
      openItems: 2,
    },
    activity: [
      {
        id: "a01", kind: "email",
        textEn: "Invoice #1042 sent",
        textAr: "تم إرسال الفاتورة #١٠٤٢",
        dateEn: "Today, 10:24 AM", dateAr: "اليوم، ١٠:٢٤ ص",
        valueEn: "$18,400", valueAr: "١٨٤٠٠ دولار",
      },
      {
        id: "a02", kind: "meeting",
        textEn: "Video call — Q3 planning session",
        textAr: "مكالمة فيديو — جلسة تخطيط الربع الثالث",
        dateEn: "2 days ago", dateAr: "منذ يومين",
        authorEn: "Nour Al-Haddad", authorAr: "نور الحداد",
      },
      {
        id: "a03", kind: "payment",
        textEn: "Payment received — Invoice #1038",
        textAr: "تم استلام الدفع — فاتورة #١٠٣٨",
        dateEn: "Last week", dateAr: "الأسبوع الماضي",
        valueEn: "$45,000", valueAr: "٤٥٠٠٠ دولار",
      },
      {
        id: "a04", kind: "order",
        textEn: "New order placed — 200 office chairs",
        textAr: "طلب جديد — ٢٠٠ كرسي مكتبي",
        dateEn: "2 weeks ago", dateAr: "منذ أسبوعين",
        valueEn: "$28,000", valueAr: "٢٨٠٠٠ دولار",
      },
      {
        id: "a05", kind: "call",
        textEn: "Phone call — introduction to referral program",
        textAr: "مكالمة هاتفية — تعريف ببرنامج الإحالة",
        dateEn: "Mar 2023", dateAr: "مارس ٢٠٢٣",
        authorEn: "Tariq Nassar", authorAr: "طارق نصار",
      },
      {
        id: "a06", kind: "contract",
        textEn: "Supply agreement signed",
        textAr: "توقيع اتفاقية التوريد",
        dateEn: "Jan 2022", dateAr: "يناير ٢٠٢٢",
        valueEn: "$120,000 / year", valueAr: "١٢٠٠٠٠ دولار / سنة",
      },
      {
        id: "a07", kind: "added",
        textEn: "Contact added to THOTH",
        textAr: "تمت إضافة جهة الاتصال إلى ثوث",
        dateEn: "Jan 5, 2022", dateAr: "٥ يناير ٢٠٢٢",
      },
    ],
    notes: [
      {
        id: "n01",
        textEn: "Prefers all formal communication in Arabic. Responds quickly to WhatsApp but prefers email for official matters. Best time to reach him is 9–11 AM GST.",
        textAr: "يفضل جميع الاتصالات الرسمية باللغة العربية. يرد بسرعة على واتساب لكن يفضل البريد الإلكتروني للمسائل الرسمية. أفضل وقت للتواصل معه هو ٩–١١ صباحاً.",
        authorEn: "Nour Al-Haddad", authorAr: "نور الحداد",
        dateEn: "Yesterday", dateAr: "أمس",
      },
      {
        id: "n02",
        textEn: "Q4 procurement budget has been approved — $180K allocated for furniture. Targeting to close at least 2 more orders before year end. He mentioned possible expansion to Riyadh office.",
        textAr: "تمت الموافقة على ميزانية مشتريات الربع الرابع — ١٨٠ ألف دولار مخصصة للأثاث. يستهدف إغلاق طلبين على الأقل قبل نهاية العام. أشار إلى توسع محتمل في مكتب الرياض.",
        authorEn: "Tariq Nassar", authorAr: "طارق نصار",
        dateEn: "1 week ago", dateAr: "منذ أسبوع",
      },
      {
        id: "n03",
        textEn: "Referred Coastal Suppliers to us as a potential new vendor. Introduction email sent. Mentioned he expects a commission if we proceed.",
        textAr: "أحال إلينا موردي الساحل كمورد محتمل جديد. تم إرسال بريد تعريف. أشار إلى توقعه عمولة إذا تابعنا.",
        authorEn: "Rana Khalil", authorAr: "رنا خليل",
        dateEn: "3 weeks ago", dateAr: "منذ ٣ أسابيع",
      },
    ],
    files: [
      { id: "f01", nameEn: "Supply Agreement 2024.pdf", nameAr: "اتفاقية التوريد ٢٠٢٤.pdf", kind: "pdf", size: "284 KB", dateEn: "Jan 2024", dateAr: "يناير ٢٠٢٤" },
      { id: "f02", nameEn: "KYC Documents.zip", nameAr: "وثائق اعرف عميلك.zip", kind: "zip", size: "1.2 MB", dateEn: "Dec 2023", dateAr: "ديسمبر ٢٠٢٣" },
      { id: "f03", nameEn: "Invoice #1038.pdf", nameAr: "فاتورة #١٠٣٨.pdf", kind: "pdf", size: "98 KB", dateEn: "Last week", dateAr: "الأسبوع الماضي" },
      { id: "f04", nameEn: "Order History 2022–2024.xls", nameAr: "تاريخ الطلبات ٢٠٢٢–٢٠٢٤.xls", kind: "xls", size: "512 KB", dateEn: "Oct 2024", dateAr: "أكتوبر ٢٠٢٤" },
      { id: "f05", nameEn: "Referral Agreement.pdf", nameAr: "اتفاقية الإحالة.pdf", kind: "pdf", size: "156 KB", dateEn: "Mar 2023", dateAr: "مارس ٢٠٢٣" },
    ],
    related: [
      { id: "r01", kind: "invoice", refEn: "Invoice #1042", refAr: "فاتورة #١٠٤٢", descEn: "Office Chairs — Batch 3", descAr: "كراسي مكتبية — دفعة ٣", valueEn: "$18,400", valueAr: "١٨٤٠٠ دولار", statusEn: "Sent", statusAr: "مُرسلة", statusTone: "active", dateEn: "Today", dateAr: "اليوم" },
      { id: "r02", kind: "order", refEn: "Order #3891", refAr: "طلب #٣٨٩١", descEn: "Office Chairs — 200 units", descAr: "كراسي مكتبية — ٢٠٠ وحدة", valueEn: "$28,000", valueAr: "٢٨٠٠٠ دولار", statusEn: "In Production", statusAr: "قيد الإنتاج", statusTone: "active", dateEn: "2 weeks ago", dateAr: "منذ أسبوعين" },
      { id: "r03", kind: "invoice", refEn: "Invoice #1038", refAr: "فاتورة #١٠٣٨", descEn: "Executive Desks — Batch 2", descAr: "مكاتب تنفيذية — دفعة ٢", valueEn: "$45,000", valueAr: "٤٥٠٠٠ دولار", statusEn: "Paid", statusAr: "مدفوعة", statusTone: "success", dateEn: "Last week", dateAr: "الأسبوع الماضي" },
      { id: "r04", kind: "contract", refEn: "Supply Agreement 2024", refAr: "اتفاقية التوريد ٢٠٢٤", descEn: "Annual supply contract", descAr: "عقد توريد سنوي", valueEn: "$120,000", valueAr: "١٢٠٠٠٠ دولار", statusEn: "Active", statusAr: "نشط", statusTone: "active", dateEn: "Jan 2024", dateAr: "يناير ٢٠٢٤" },
      { id: "r05", kind: "quote", refEn: "Quote #Q-0077", refAr: "عرض سعر #Q-٠٠٧٧", descEn: "Riyadh office expansion", descAr: "توسع مكتب الرياض", valueEn: "$67,200", valueAr: "٦٧٢٠٠ دولار", statusEn: "Draft", statusAr: "مسودة", statusTone: "neutral", dateEn: "3 days ago", dateAr: "منذ ٣ أيام" },
    ],
  },

  // ── p02: Sarah Chen ───────────────────────────────────
  {
    id: "p02", name: "Sarah Chen", nameAr: "سارة تشن",
    company: "Gulf Traders LLC", companyAr: "تجار الخليج",
    role: "Chief Executive Officer", roleAr: "الرئيس التنفيذي",
    status: "active", type: "customer",
    roles: [{ type: "customer", sinceEn: "June 2021", sinceAr: "يونيو ٢٠٢١", descEn: "Strategic customer. Primary contact for Gulf Traders' procurement decisions.", descAr: "عميل استراتيجي. جهة الاتصال الرئيسية لقرارات الشراء في تجار الخليج." }],
    phone: "+971 55 876 1234", email: "sarah.chen@gulftrad.com",
    city: "Dubai", cityAr: "دبي", country: "United Arab Emirates", countryAr: "الإمارات العربية المتحدة",
    lastContactEn: "Yesterday", lastContactAr: "أمس",
    avatarColor: "bg-pink-100 text-pink-700",
    metrics: { totalValue: "$198,000", totalValueAr: "١٩٨٠٠٠ دولار", transactionCount: 8, sinceEn: "Jun 2021", sinceAr: "يونيو ٢٠٢١", openItems: 1 },
    activity: [
      { id: "a01", kind: "meeting", textEn: "Quarterly business review call", textAr: "مراجعة الأعمال الفصلية", dateEn: "Yesterday", dateAr: "أمس" },
      { id: "a02", kind: "payment", textEn: "Payment received", textAr: "تم استلام الدفع", dateEn: "2 weeks ago", dateAr: "منذ أسبوعين", valueEn: "$32,000", valueAr: "٣٢٠٠٠ دولار" },
    ],
    notes: [{ id: "n01", textEn: "Prefers concise email summaries. Very data-driven in decisions.", textAr: "تفضل ملخصات البريد الإلكتروني الموجزة. تتخذ قرارات مبنية على البيانات.", authorEn: "Rana Khalil", authorAr: "رنا خليل", dateEn: "1 week ago", dateAr: "منذ أسبوع" }],
    files: [{ id: "f01", nameEn: "Framework Agreement.pdf", nameAr: "اتفاقية الإطار.pdf", kind: "pdf", size: "310 KB", dateEn: "Jun 2021", dateAr: "يونيو ٢٠٢١" }],
    related: [{ id: "r01", kind: "invoice", refEn: "Invoice #1039", refAr: "فاتورة #١٠٣٩", descEn: "Q3 Supply", descAr: "توريد الربع الثالث", valueEn: "$32,000", valueAr: "٣٢٠٠٠ دولار", statusEn: "Paid", statusAr: "مدفوعة", statusTone: "success", dateEn: "2 weeks ago", dateAr: "منذ أسبوعين" }],
  },

  // ── p03: Fatima ───────────────────────────────────────
  {
    id: "p03", name: "Fatima Al-Zahra", nameAr: "فاطمة الزهراء",
    company: "Oasis Retail Group", companyAr: "مجموعة أوسيس",
    role: "Senior Buyer", roleAr: "مشترية أولى",
    status: "lead", type: "customer",
    roles: [{ type: "customer", sinceEn: "Aug 2024", sinceAr: "أغسطس ٢٠٢٤", descEn: "Prospective customer. Interested in bulk furniture procurement for 3 locations.", descAr: "عميل محتمل. مهتمة بشراء الأثاث بالجملة لـ٣ مواقع." }],
    phone: "+971 52 447 8800", email: "f.alzahra@oasisretail.com",
    city: "Abu Dhabi", cityAr: "أبوظبي", country: "UAE", countryAr: "الإمارات",
    lastContactEn: "3 days ago", lastContactAr: "منذ ٣ أيام",
    avatarColor: "bg-teal-100 text-teal-700",
    metrics: { totalValue: "$0", totalValueAr: "٠ دولار", transactionCount: 0, sinceEn: "Aug 2024", sinceAr: "أغسطس ٢٠٢٤", openItems: 1 },
    activity: [{ id: "a01", kind: "call", textEn: "Discovery call — 3 location expansion", textAr: "مكالمة استكشافية — توسع ٣ مواقع", dateEn: "3 days ago", dateAr: "منذ ٣ أيام" }],
    notes: [{ id: "n01", textEn: "Warm lead. Decision pending CFO approval. Follow up end of month.", textAr: "عميل محتمل دافئ. القرار معلق على موافقة المدير المالي. متابعة في نهاية الشهر.", authorEn: "Rana Khalil", authorAr: "رنا خليل", dateEn: "3 days ago", dateAr: "منذ ٣ أيام" }],
    files: [],
    related: [{ id: "r01", kind: "quote", refEn: "Quote #Q-0075", refAr: "عرض سعر #Q-٠٠٧٥", descEn: "Multi-location furniture", descAr: "أثاث متعدد المواقع", valueEn: "$54,000", valueAr: "٥٤٠٠٠ دولار", statusEn: "Sent", statusAr: "مُرسل", statusTone: "active", dateEn: "3 days ago", dateAr: "منذ ٣ أيام" }],
  },

  // ── p04–p20: Remaining people (basic data) ────────────
  {
    id: "p04", name: "Mohammed Al-Qassim", nameAr: "محمد القاسم", company: "Desert Rose Hotels", companyAr: "فنادق وردة الصحراء",
    role: "F&B Director", roleAr: "مدير الأغذية والمشروبات", status: "lead", type: "customer",
    roles: [{ type: "customer", sinceEn: "Sep 2024", sinceAr: "سبتمبر ٢٠٢٤", descEn: "Prospective customer in the hospitality sector.", descAr: "عميل محتمل في قطاع الضيافة." }],
    phone: "+974 55 100 2233", email: "mq@desertrose.qa",
    city: "Doha", cityAr: "الدوحة", country: "Qatar", countryAr: "قطر",
    lastContactEn: "5 days ago", lastContactAr: "منذ ٥ أيام", avatarColor: "bg-rose-100 text-rose-700",
    metrics: { totalValue: "$0", totalValueAr: "٠ دولار", transactionCount: 0, sinceEn: "Sep 2024", sinceAr: "سبتمبر ٢٠٢٤", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p05", name: "Diana Park", nameAr: "ديانا بارك", company: "East Gate Traders", companyAr: "تجار البوابة الشرقية",
    role: "Managing Director", roleAr: "المديرة التنفيذية", status: "active", type: "customer",
    roles: [{ type: "customer", sinceEn: "Mar 2022", sinceAr: "مارس ٢٠٢٢", descEn: "Long-standing customer. Korean market gateway.", descAr: "عميلة راسخة. بوابة السوق الكورية." }],
    phone: "+82 10 5678 9012", email: "diana@eastgate.kr",
    city: "Seoul", cityAr: "سيول", country: "South Korea", countryAr: "كوريا الجنوبية",
    lastContactEn: "Yesterday", lastContactAr: "أمس", avatarColor: "bg-emerald-100 text-emerald-700",
    metrics: { totalValue: "$112,300", totalValueAr: "١١٢٣٠٠ دولار", transactionCount: 5, sinceEn: "Mar 2022", sinceAr: "مارس ٢٠٢٢", openItems: 1 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p06", name: "Khalid Al-Mansoori", nameAr: "خالد المنصوري", company: "Prime Distributors", companyAr: "برايم للتوزيع",
    role: "General Manager", roleAr: "المدير العام", status: "inactive", type: "customer",
    roles: [{ type: "customer", sinceEn: "Jan 2021", sinceAr: "يناير ٢٠٢١", descEn: "Previously active customer. Relationship on hold.", descAr: "عميل نشط سابق. العلاقة معلقة حالياً." }],
    phone: "+971 50 554 3322", email: "k.mansoori@primedist.ae",
    city: "Dubai", cityAr: "دبي", country: "UAE", countryAr: "الإمارات",
    lastContactEn: "3 weeks ago", lastContactAr: "منذ ٣ أسابيع", avatarColor: "bg-slate-100 text-slate-600",
    metrics: { totalValue: "$89,000", totalValueAr: "٨٩٠٠٠ دولار", transactionCount: 4, sinceEn: "Jan 2021", sinceAr: "يناير ٢٠٢١", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p07", name: "Nour Al-Haddad", nameAr: "نور الحداد", company: "THOTH", companyAr: "ثوث",
    role: "Operations Lead", roleAr: "قائدة العمليات", status: "active", type: "employee",
    roles: [{ type: "employee", sinceEn: "Feb 2023", sinceAr: "فبراير ٢٠٢٣", descEn: "Leads day-to-day operations, client delivery, and vendor coordination.", descAr: "تقود العمليات اليومية وتسليم العملاء وتنسيق الموردين." }],
    phone: "+971 50 112 3344", email: "nour@thoth.io",
    city: "Dubai", cityAr: "دبي", country: "UAE", countryAr: "الإمارات",
    lastContactEn: "Today", lastContactAr: "اليوم", avatarColor: "bg-emerald-100 text-emerald-700",
    metrics: { totalValue: "—", totalValueAr: "—", transactionCount: 0, sinceEn: "Feb 2023", sinceAr: "فبراير ٢٠٢٣", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p08", name: "Tariq Nassar", nameAr: "طارق نصار", company: "THOTH", companyAr: "ثوث",
    role: "Finance Manager", roleAr: "مدير المالية", status: "active", type: "employee",
    roles: [{ type: "employee", sinceEn: "Jan 2022", sinceAr: "يناير ٢٠٢٢", descEn: "Manages all financial operations, reporting, and compliance.", descAr: "يدير جميع العمليات المالية والتقارير والامتثال." }],
    phone: "+971 55 667 8899", email: "tariq@thoth.io",
    city: "Dubai", cityAr: "دبي", country: "UAE", countryAr: "الإمارات",
    lastContactEn: "Today", lastContactAr: "اليوم", avatarColor: "bg-cyan-100 text-cyan-700",
    metrics: { totalValue: "—", totalValueAr: "—", transactionCount: 0, sinceEn: "Jan 2022", sinceAr: "يناير ٢٠٢٢", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p09", name: "Rana Khalil", nameAr: "رنا خليل", company: "THOTH", companyAr: "ثوث",
    role: "Sales Executive", roleAr: "مديرة مبيعات", status: "active", type: "employee",
    roles: [{ type: "employee", sinceEn: "Apr 2023", sinceAr: "أبريل ٢٠٢٣", descEn: "Responsible for new business development and key account management.", descAr: "مسؤولة عن تطوير الأعمال الجديدة وإدارة الحسابات الرئيسية." }],
    phone: "+971 52 990 1122", email: "rana@thoth.io",
    city: "Dubai", cityAr: "دبي", country: "UAE", countryAr: "الإمارات",
    lastContactEn: "Yesterday", lastContactAr: "أمس", avatarColor: "bg-violet-100 text-violet-700",
    metrics: { totalValue: "—", totalValueAr: "—", transactionCount: 0, sinceEn: "Apr 2023", sinceAr: "أبريل ٢٠٢٣", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p10", name: "Hassan Younis", nameAr: "حسن يونس", company: "THOTH", companyAr: "ثوث",
    role: "Logistics Coordinator", roleAr: "منسق اللوجستيات", status: "active", type: "employee",
    roles: [{ type: "employee", sinceEn: "Jul 2023", sinceAr: "يوليو ٢٠٢٣", descEn: "Handles shipment tracking, warehouse coordination, and last-mile delivery.", descAr: "يتولى تتبع الشحنات وتنسيق المستودعات والتسليم." }],
    phone: "+971 56 334 5566", email: "hassan@thoth.io",
    city: "Dubai", cityAr: "دبي", country: "UAE", countryAr: "الإمارات",
    lastContactEn: "2 days ago", lastContactAr: "منذ يومين", avatarColor: "bg-amber-100 text-amber-700",
    metrics: { totalValue: "—", totalValueAr: "—", transactionCount: 0, sinceEn: "Jul 2023", sinceAr: "يوليو ٢٠٢٣", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p11", name: "Ahmed Khalil", nameAr: "أحمد خليل", company: "Al-Noor Furniture", companyAr: "النور للأثاث",
    role: "Operations Director", roleAr: "مدير العمليات", status: "active", type: "supplier",
    roles: [{ type: "supplier", sinceEn: "Mar 2021", sinceAr: "مارس ٢٠٢١", descEn: "Primary furniture supplier. Handles custom manufacturing and bulk orders.", descAr: "المورد الرئيسي للأثاث. يتولى التصنيع المخصص والطلبات الكبيرة." }],
    phone: "+966 55 321 9876", email: "ahmed@alnoor-furn.sa",
    city: "Riyadh", cityAr: "الرياض", country: "Saudi Arabia", countryAr: "المملكة العربية السعودية",
    lastContactEn: "2 days ago", lastContactAr: "منذ يومين", avatarColor: "bg-amber-100 text-amber-700",
    metrics: { totalValue: "$520,000", totalValueAr: "٥٢٠٠٠٠ دولار", transactionCount: 28, sinceEn: "Mar 2021", sinceAr: "مارس ٢٠٢١", openItems: 1 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p12", name: "James Wilson", nameAr: "جيمس ويلسون", company: "Atlas Manufacturing", companyAr: "أطلس للتصنيع",
    role: "Sales Director", roleAr: "مدير المبيعات", status: "active", type: "supplier",
    roles: [{ type: "supplier", sinceEn: "Nov 2020", sinceAr: "نوفمبر ٢٠٢٠", descEn: "Steel and metal components supplier. Long-term strategic partner.", descAr: "مورد مكونات الصلب والمعادن. شريك استراتيجي طويل الأمد." }],
    phone: "+44 7700 900123", email: "j.wilson@atlasmanuf.co.uk",
    city: "Manchester", cityAr: "مانشستر", country: "United Kingdom", countryAr: "المملكة المتحدة",
    lastContactEn: "1 week ago", lastContactAr: "منذ أسبوع", avatarColor: "bg-blue-100 text-blue-700",
    metrics: { totalValue: "$880,000", totalValueAr: "٨٨٠٠٠٠ دولار", transactionCount: 42, sinceEn: "Nov 2020", sinceAr: "نوفمبر ٢٠٢٠", openItems: 2 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p13", name: "Yusuf Al-Farsi", nameAr: "يوسف الفارسي", company: "Northern Steel Works", companyAr: "الشمال للصلب",
    role: "Plant Manager", roleAr: "مدير المصنع", status: "active", type: "supplier",
    roles: [{ type: "supplier", sinceEn: "May 2022", sinceAr: "مايو ٢٠٢٢", descEn: "Oman-based steel fabricator. Handles heavy structural components.", descAr: "مصنع صلب في عُمان. يتولى المكونات الهيكلية الثقيلة." }],
    phone: "+968 9900 1122", email: "yfarsi@northernsteel.om",
    city: "Muscat", cityAr: "مسقط", country: "Oman", countryAr: "عُمان",
    lastContactEn: "4 days ago", lastContactAr: "منذ ٤ أيام", avatarColor: "bg-zinc-100 text-zinc-700",
    metrics: { totalValue: "$240,000", totalValueAr: "٢٤٠٠٠٠ دولار", transactionCount: 11, sinceEn: "May 2022", sinceAr: "مايو ٢٠٢٢", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p14", name: "Emma Rodriguez", nameAr: "إيما رودريغيز", company: "Coastal Suppliers", companyAr: "موردو الساحل",
    role: "Head of Purchasing", roleAr: "رئيسة المشتريات", status: "lead", type: "supplier",
    roles: [{ type: "supplier", sinceEn: "Oct 2024", sinceAr: "أكتوبر ٢٠٢٤", descEn: "Prospective supplier referred by Omar Al-Rashidi.", descAr: "مورد محتمل أحاله عمر الراشدي." }],
    phone: "+34 600 123 456", email: "e.rodriguez@coastalsup.es",
    city: "Barcelona", cityAr: "برشلونة", country: "Spain", countryAr: "إسبانيا",
    lastContactEn: "1 week ago", lastContactAr: "منذ أسبوع", avatarColor: "bg-orange-100 text-orange-700",
    metrics: { totalValue: "$0", totalValueAr: "٠ دولار", transactionCount: 0, sinceEn: "Oct 2024", sinceAr: "أكتوبر ٢٠٢٤", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p15", name: "Sami Al-Otaibi", nameAr: "سامي العتيبي", company: "SamTech Consulting", companyAr: "سام تك",
    role: "IT Infrastructure", roleAr: "بنية تحتية تقنية", status: "active", type: "contractor",
    roles: [{ type: "contractor", sinceEn: "Jun 2024", sinceAr: "يونيو ٢٠٢٤", descEn: "Manages internal IT systems, network security, and device provisioning.", descAr: "يدير أنظمة تكنولوجيا المعلومات الداخلية وأمن الشبكات." }],
    phone: "+966 50 777 8800", email: "sami@samtech.sa",
    city: "Riyadh", cityAr: "الرياض", country: "Saudi Arabia", countryAr: "المملكة العربية السعودية",
    lastContactEn: "Today", lastContactAr: "اليوم", avatarColor: "bg-indigo-100 text-indigo-700",
    metrics: { totalValue: "$48,000", totalValueAr: "٤٨٠٠٠ دولار", transactionCount: 6, sinceEn: "Jun 2024", sinceAr: "يونيو ٢٠٢٤", openItems: 1 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p16", name: "Mia Johansson", nameAr: "ميا يوهانسن", company: "Freelance", companyAr: "مستقل",
    role: "UX / Product Design", roleAr: "تصميم المنتج", status: "active", type: "contractor",
    roles: [{ type: "contractor", sinceEn: "Mar 2024", sinceAr: "مارس ٢٠٢٤", descEn: "Lead product designer. Working on the THOTH interface and design system.", descAr: "مصممة منتج رائدة. تعمل على واجهة ثوث ونظام التصميم." }],
    phone: "+46 70 123 4567", email: "mia.j@designmail.se",
    city: "Stockholm", cityAr: "ستوكهولم", country: "Sweden", countryAr: "السويد",
    lastContactEn: "3 days ago", lastContactAr: "منذ ٣ أيام", avatarColor: "bg-fuchsia-100 text-fuchsia-700",
    metrics: { totalValue: "$62,000", totalValueAr: "٦٢٠٠٠ دولار", transactionCount: 8, sinceEn: "Mar 2024", sinceAr: "مارس ٢٠٢٤", openItems: 1 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p17", name: "Rami Azouri", nameAr: "رامي عزوري", company: "Azouri Legal", companyAr: "عزوري للقانون",
    role: "Legal Counsel", roleAr: "مستشار قانوني", status: "inactive", type: "contractor",
    roles: [{ type: "contractor", sinceEn: "Feb 2022", sinceAr: "فبراير ٢٠٢٢", descEn: "Provided legal review and contract drafting. Engagement ended Dec 2023.", descAr: "قدم المراجعة القانونية وصياغة العقود. انتهى التعاقد في ديسمبر ٢٠٢٣." }],
    phone: "+961 3 456 789", email: "razouri@azourilegal.lb",
    city: "Beirut", cityAr: "بيروت", country: "Lebanon", countryAr: "لبنان",
    lastContactEn: "2 months ago", lastContactAr: "منذ شهرين", avatarColor: "bg-slate-100 text-slate-600",
    metrics: { totalValue: "$38,000", totalValueAr: "٣٨٠٠٠ دولار", transactionCount: 4, sinceEn: "Feb 2022", sinceAr: "فبراير ٢٠٢٢", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p18", name: "Layla Hassan", nameAr: "ليلى حسن", company: "Blue Ocean Logistics", companyAr: "المحيط الأزرق للوجستيات",
    role: "Fleet Manager", roleAr: "مديرة الأسطول", status: "active", type: "partner",
    roles: [{ type: "partner", sinceEn: "Aug 2022", sinceAr: "أغسطس ٢٠٢٢", descEn: "Logistics and last-mile delivery partner. 30+ vehicles across UAE.", descAr: "شريك اللوجستيات والتوصيل. أكثر من ٣٠ مركبة في الإمارات." }],
    phone: "+971 56 998 7654", email: "layla@blueocean.ae",
    city: "Dubai", cityAr: "دبي", country: "UAE", countryAr: "الإمارات",
    lastContactEn: "2 days ago", lastContactAr: "منذ يومين", avatarColor: "bg-cyan-100 text-cyan-700",
    metrics: { totalValue: "$156,000", totalValueAr: "١٥٦٠٠٠ دولار", transactionCount: 18, sinceEn: "Aug 2022", sinceAr: "أغسطس ٢٠٢٢", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p19", name: "Priya Sharma", nameAr: "بريا شارما", company: "TechBridge Solutions", companyAr: "تك بريدج",
    role: "Account Executive", roleAr: "مديرة حسابات", status: "active", type: "partner",
    roles: [{ type: "partner", sinceEn: "Jan 2023", sinceAr: "يناير ٢٠٢٣", descEn: "Technology reseller and integration partner for India/South Asia markets.", descAr: "موزع تقنية وشريك تكامل لأسواق الهند وجنوب آسيا." }],
    phone: "+91 98765 43210", email: "priya@techbridge.in",
    city: "Mumbai", cityAr: "مومباي", country: "India", countryAr: "الهند",
    lastContactEn: "Today", lastContactAr: "اليوم", avatarColor: "bg-indigo-100 text-indigo-700",
    metrics: { totalValue: "$92,000", totalValueAr: "٩٢٠٠٠ دولار", transactionCount: 7, sinceEn: "Jan 2023", sinceAr: "يناير ٢٠٢٣", openItems: 1 },
    activity: [], notes: [], files: [], related: [],
  },
  {
    id: "p20", name: "Faris Al-Jabri", nameAr: "فارس الجابري", company: "Gulf Finance Partners", companyAr: "شركاء الخليج المالية",
    role: "Investment Director", roleAr: "مدير الاستثمار", status: "lead", type: "partner",
    roles: [{ type: "partner", sinceEn: "Nov 2024", sinceAr: "نوفمبر ٢٠٢٤", descEn: "Potential investment and co-venture partner in Bahrain.", descAr: "شريك استثمار محتمل في البحرين." }],
    phone: "+973 3300 4422", email: "faris@gulffinance.bh",
    city: "Manama", cityAr: "المنامة", country: "Bahrain", countryAr: "البحرين",
    lastContactEn: "1 week ago", lastContactAr: "منذ أسبوع", avatarColor: "bg-lime-100 text-lime-700",
    metrics: { totalValue: "$0", totalValueAr: "٠ دولار", transactionCount: 0, sinceEn: "Nov 2024", sinceAr: "نوفمبر ٢٠٢٤", openItems: 0 },
    activity: [], notes: [], files: [], related: [],
  },
];
