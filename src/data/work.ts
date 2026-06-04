// ─── Core types ───────────────────────────────────────────

export type WorkStatus = "backlog" | "planned" | "in_progress" | "review" | "done";
export type WorkPriority = "urgent" | "high" | "medium" | "low";
export type WorkKind =
  | "task" | "ticket" | "work_order" | "request"
  | "production_order" | "service_order";

export interface WorkItem {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  status: WorkStatus;
  priority: WorkPriority;
  kind: WorkKind;
  assigneeEn: string;
  assigneeAr: string;
  relatedPersonId?: string;
  relatedPersonNameEn?: string;
  relatedPersonNameAr?: string;
  relatedOrgId?: string;
  relatedOrgNameEn?: string;
  relatedOrgNameAr?: string;
  dueDateEn: string;
  dueDateAr: string;
  dueDateISO?: string;
  createdEn: string;
  createdAr: string;
  progress: number;
}

// ─── Status column order ─────────────────────────────────

export const STATUS_ORDER: WorkStatus[] = ["backlog", "planned", "in_progress", "review", "done"];

// ─── Label maps ───────────────────────────────────────────

export const STATUS_META: Record<WorkStatus, { en: string; ar: string; dot: string; pill: string }> = {
  backlog:     { en: "Backlog",     ar: "قائمة الانتظار", dot: "bg-stone-400",          pill: "bg-stone-100 text-stone-600 border border-stone-200" },
  planned:     { en: "Planned",     ar: "مخطط",          dot: "bg-primary",             pill: "bg-primary/8 text-primary border border-primary/20" },
  in_progress: { en: "In Progress", ar: "قيد التنفيذ",    dot: "bg-amber-500",           pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  review:      { en: "Review",      ar: "مراجعة",        dot: "bg-violet-500",           pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  done:        { en: "Done",        ar: "مكتمل",         dot: "bg-emerald-500",          pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

export const PRIORITY_META: Record<WorkPriority, { en: string; ar: string; dot: string; pill: string }> = {
  urgent: { en: "Urgent", ar: "عاجل",   dot: "bg-rose-500",   pill: "bg-rose-50 text-rose-700 border border-rose-200" },
  high:   { en: "High",   ar: "مرتفع",  dot: "bg-amber-500",  pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  medium: { en: "Medium", ar: "متوسط",  dot: "bg-primary",    pill: "bg-primary/8 text-primary border border-primary/20" },
  low:    { en: "Low",    ar: "منخفض",  dot: "bg-muted-foreground/40", pill: "bg-muted text-muted-foreground border border-border" },
};

export const KIND_META: Record<WorkKind, { en: string; ar: string; pill: string }> = {
  task:             { en: "Task",             ar: "مهمة",        pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  ticket:           { en: "Ticket",           ar: "تذكرة",       pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  work_order:       { en: "Work Order",       ar: "أمر عمل",     pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  request:          { en: "Request",          ar: "طلب",         pill: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  production_order: { en: "Production Order", ar: "أمر إنتاج",   pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  service_order:    { en: "Service Order",    ar: "أمر خدمة",    pill: "bg-rose-50 text-rose-600 border border-rose-200" },
};

// ─── Default data ─────────────────────────────────────────

const DEFAULT_WORK_ITEMS: WorkItem[] = [
  {
    id: "w-001",
    titleEn: "Al-Noor Office Furniture — Production Run",
    titleAr: "أثاث مكتبي النور — دورة إنتاج",
    descEn: "Complete manufacturing run for 24 executive desks and 48 chairs. Material has been sourced, cutting stage is in progress. Assembly scheduled for next week.",
    descAr: "إكمال دورة التصنيع لـ ٢٤ مكتب تنفيذي و ٤٨ كرسي. تم توفير المواد، ومرحلة القطع جارية. التجميع مجدول للأسبوع القادم.",
    status: "in_progress",
    priority: "high",
    kind: "production_order",
    assigneeEn: "Khalid Al-Mansouri",
    assigneeAr: "خالد المنصوري",
    relatedPersonId: "p1",
    relatedPersonNameEn: "Omar Al-Rashidi",
    relatedPersonNameAr: "عمر الراشدي",
    relatedOrgId: "org-1",
    relatedOrgNameEn: "Meridian Group",
    relatedOrgNameAr: "مجموعة ميريديان",
    dueDateEn: "Aug 14, 2025",
    dueDateAr: "١٤ أغسطس ٢٠٢٥",
    dueDateISO: "2025-08-14",
    createdEn: "Jul 28, 2025",
    createdAr: "٢٨ يوليو ٢٠٢٥",
    progress: 67,
  },
  {
    id: "w-002",
    titleEn: "Q3 Export Documentation Review",
    titleAr: "مراجعة وثائق تصدير الربع الثالث",
    descEn: "Review and finalize all export documentation for Q3 shipments. Customs declarations, certificates of origin, and packing lists need final sign-off from Finance.",
    descAr: "مراجعة وإتمام جميع وثائق التصدير لشحنات الربع الثالث. التصريحات الجمركية وشهادات المنشأ وقوائم التعبئة تحتاج موافقة نهائية من المالية.",
    status: "review",
    priority: "medium",
    kind: "task",
    assigneeEn: "Sara Mahmoud",
    assigneeAr: "سارة محمود",
    relatedOrgId: "org-2",
    relatedOrgNameEn: "Gulf Traders LLC",
    relatedOrgNameAr: "تجار الخليج",
    dueDateEn: "Aug 5, 2025",
    dueDateAr: "٥ أغسطس ٢٠٢٥",
    dueDateISO: "2025-08-05",
    createdEn: "Jul 22, 2025",
    createdAr: "٢٢ يوليو ٢٠٢٥",
    progress: 45,
  },
  {
    id: "w-003",
    titleEn: "Retail Chain POS Setup — 3 Locations",
    titleAr: "إعداد نقاط البيع لسلسلة التجزئة — ٣ مواقع",
    descEn: "Install and configure POS terminals across three new retail locations. Includes hardware setup, software configuration, staff training, and integration testing with central inventory.",
    descAr: "تركيب وتهيئة أجهزة نقاط البيع في ثلاثة مواقع تجزئة جديدة. يشمل إعداد الأجهزة وتهيئة البرامج وتدريب الموظفين واختبار التكامل مع المخزون المركزي.",
    status: "in_progress",
    priority: "high",
    kind: "service_order",
    assigneeEn: "Fahad Al-Otaibi",
    assigneeAr: "فهد العتيبي",
    relatedPersonId: "p3",
    relatedPersonNameEn: "Layla Hassan",
    relatedPersonNameAr: "ليلى حسن",
    dueDateEn: "Aug 20, 2025",
    dueDateAr: "٢٠ أغسطس ٢٠٢٥",
    dueDateISO: "2025-08-20",
    createdEn: "Aug 1, 2025",
    createdAr: "١ أغسطس ٢٠٢٥",
    progress: 30,
  },
  {
    id: "w-004",
    titleEn: "Annual Supplier Audit — Atlas Manufacturing",
    titleAr: "مراجعة الموردين السنوية — أطلس للتصنيع",
    descEn: "Conduct annual supplier performance review. Evaluate delivery timelines, quality metrics, pricing competitiveness, and compliance with contractual terms.",
    descAr: "إجراء المراجعة السنوية لأداء المورد. تقييم مواعيد التسليم ومعايير الجودة وتنافسية الأسعار والامتثال للشروط التعاقدية.",
    status: "backlog",
    priority: "medium",
    kind: "task",
    assigneeEn: "Ops Team",
    assigneeAr: "فريق العمليات",
    relatedOrgId: "org-3",
    relatedOrgNameEn: "Atlas Manufacturing",
    relatedOrgNameAr: "أطلس للتصنيع",
    dueDateEn: "Sep 1, 2025",
    dueDateAr: "١ سبتمبر ٢٠٢٥",
    dueDateISO: "2025-09-01",
    createdEn: "Jul 15, 2025",
    createdAr: "١٥ يوليو ٢٠٢٥",
    progress: 0,
  },
  {
    id: "w-005",
    titleEn: "Warehouse AC Maintenance Request",
    titleAr: "طلب صيانة تكييف المستودع",
    descEn: "Unit 3 cooling system is underperforming. Temperature rising above threshold for furniture storage. Maintenance vendor has been contacted, awaiting scheduling confirmation.",
    descAr: "نظام التبريد في الوحدة ٣ أداؤه منخفض. درجة الحرارة ترتفع فوق الحد المسموح لتخزين الأثاث. تم التواصل مع مزود الصيانة وننتظر تأكيد الموعد.",
    status: "planned",
    priority: "urgent",
    kind: "request",
    assigneeEn: "Facilities",
    assigneeAr: "المرافق",
    dueDateEn: "Aug 3, 2025",
    dueDateAr: "٣ أغسطس ٢٠٢٥",
    dueDateISO: "2025-08-03",
    createdEn: "Aug 1, 2025",
    createdAr: "١ أغسطس ٢٠٢٥",
    progress: 20,
  },
  {
    id: "w-006",
    titleEn: "Customer Support Ticket — Defective Delivery",
    titleAr: "تذكرة دعم عملاء — توصيل معيب",
    descEn: "Client reported 2 damaged chairs in latest shipment (Order #2847). Photos received. Replacement units need to be dispatched from Riyadh warehouse.",
    descAr: "أبلغ العميل عن كرسيين تالفين في آخر شحنة (طلب #٢٨٤٧). تم استلام الصور. يجب إرسال وحدات بديلة من مستودع الرياض.",
    status: "in_progress",
    priority: "high",
    kind: "ticket",
    assigneeEn: "Nora Al-Farsi",
    assigneeAr: "نورة الفارسي",
    relatedPersonId: "p2",
    relatedPersonNameEn: "Ahmed Khalil",
    relatedPersonNameAr: "أحمد خليل",
    relatedOrgId: "org-1",
    relatedOrgNameEn: "Meridian Group",
    relatedOrgNameAr: "مجموعة ميريديان",
    dueDateEn: "Aug 6, 2025",
    dueDateAr: "٦ أغسطس ٢٠٢٥",
    dueDateISO: "2025-08-06",
    createdEn: "Aug 2, 2025",
    createdAr: "٢ أغسطس ٢٠٢٥",
    progress: 40,
  },
  {
    id: "w-007",
    titleEn: "Custom Boardroom Table — Design & Fabrication",
    titleAr: "طاولة اجتماعات مخصصة — تصميم وتصنيع",
    descEn: "Design and fabricate a 16-seat walnut boardroom table with integrated cable management. Client has approved initial sketches. Material procurement underway.",
    descAr: "تصميم وتصنيع طاولة اجتماعات من خشب الجوز تتسع ١٦ شخصاً مع نظام إدارة كابلات مدمج. وافق العميل على المخططات الأولية. جارٍ توفير المواد.",
    status: "in_progress",
    priority: "medium",
    kind: "work_order",
    assigneeEn: "Khalid Al-Mansouri",
    assigneeAr: "خالد المنصوري",
    relatedPersonId: "p4",
    relatedPersonNameEn: "Fatima Al-Zahra",
    relatedPersonNameAr: "فاطمة الزهراء",
    dueDateEn: "Sep 15, 2025",
    dueDateAr: "١٥ سبتمبر ٢٠٢٥",
    dueDateISO: "2025-09-15",
    createdEn: "Jul 20, 2025",
    createdAr: "٢٠ يوليو ٢٠٢٥",
    progress: 35,
  },
  {
    id: "w-008",
    titleEn: "Batch Production — School Desk Order #3102",
    titleAr: "إنتاج دفعة — طلب مقاعد مدرسية #٣١٠٢",
    descEn: "Manufacture 200 standard school desks for Ministry of Education order. Steel frames complete. Laminate tops in final QC stage before packaging.",
    descAr: "تصنيع ٢٠٠ مقعد مدرسي قياسي لطلب وزارة التعليم. الهياكل المعدنية مكتملة. أسطح اللامينيت في مرحلة فحص الجودة النهائية قبل التغليف.",
    status: "review",
    priority: "high",
    kind: "production_order",
    assigneeEn: "Production Line B",
    assigneeAr: "خط الإنتاج ب",
    dueDateEn: "Aug 10, 2025",
    dueDateAr: "١٠ أغسطس ٢٠٢٥",
    dueDateISO: "2025-08-10",
    createdEn: "Jul 10, 2025",
    createdAr: "١٠ يوليو ٢٠٢٥",
    progress: 82,
  },
  {
    id: "w-009",
    titleEn: "IT Infrastructure Upgrade — Jeddah Branch",
    titleAr: "تطوير البنية التحتية — فرع جدة",
    descEn: "Upgrade network switches, access points, and server room cooling. Weekend installation window approved. Backup plan confirmed with IT.",
    descAr: "تطوير مفاتيح الشبكة ونقاط الوصول وتبريد غرفة الخوادم. تمت الموافقة على نافذة التثبيت في عطلة نهاية الأسبوع. خطة الطوارئ مؤكدة مع تقنية المعلومات.",
    status: "planned",
    priority: "medium",
    kind: "work_order",
    assigneeEn: "IT Department",
    assigneeAr: "قسم تقنية المعلومات",
    relatedOrgId: "org-2",
    relatedOrgNameEn: "Gulf Traders LLC",
    relatedOrgNameAr: "تجار الخليج",
    dueDateEn: "Aug 18, 2025",
    dueDateAr: "١٨ أغسطس ٢٠٢٥",
    dueDateISO: "2025-08-18",
    createdEn: "Aug 1, 2025",
    createdAr: "١ أغسطس ٢٠٢٥",
    progress: 0,
  },
  {
    id: "w-010",
    titleEn: "Monthly Inventory Reconciliation",
    titleAr: "تسوية المخزون الشهرية",
    descEn: "Reconcile physical inventory counts with system records across all three warehouses. Flag discrepancies for investigation. July cycle.",
    descAr: "تسوية حسابات المخزون الفعلي مع سجلات النظام في المستودعات الثلاثة. تحديد التباينات للتحقيق. دورة يوليو.",
    status: "done",
    priority: "medium",
    kind: "task",
    assigneeEn: "Warehouse Team",
    assigneeAr: "فريق المستودعات",
    dueDateEn: "Jul 31, 2025",
    dueDateAr: "٣١ يوليو ٢٠٢٥",
    dueDateISO: "2025-07-31",
    createdEn: "Jul 25, 2025",
    createdAr: "٢٥ يوليو ٢٠٢٥",
    progress: 100,
  },
  {
    id: "w-011",
    titleEn: "HVAC Service — Main Showroom",
    titleAr: "خدمة تكييف — صالة العرض الرئيسية",
    descEn: "Quarterly HVAC service completed. Filters replaced, coils cleaned, refrigerant levels checked. System running within normal parameters.",
    descAr: "تمت خدمة التكييف الفصلية. تم تبديل الفلاتر وتنظيف الملفات وفحص مستويات المبرد. النظام يعمل ضمن المعايير الطبيعية.",
    status: "done",
    priority: "low",
    kind: "service_order",
    assigneeEn: "Facilities",
    assigneeAr: "المرافق",
    dueDateEn: "Jul 28, 2025",
    dueDateAr: "٢٨ يوليو ٢٠٢٥",
    dueDateISO: "2025-07-28",
    createdEn: "Jul 20, 2025",
    createdAr: "٢٠ يوليو ٢٠٢٥",
    progress: 100,
  },
  {
    id: "w-012",
    titleEn: "New Employee Laptop Setup — Batch 4",
    titleAr: "إعداد أجهزة الموظفين الجدد — الدفعة ٤",
    descEn: "Configure and deploy 6 laptops for new hires joining in August. Install standard software stack, enroll in MDM, and prepare welcome kits.",
    descAr: "تهيئة وتسليم ٦ أجهزة كمبيوتر محمول للموظفين الجدد الملتحقين في أغسطس. تثبيت البرامج القياسية والتسجيل في نظام إدارة الأجهزة وإعداد حقائب الترحيب.",
    status: "backlog",
    priority: "low",
    kind: "request",
    assigneeEn: "IT Department",
    assigneeAr: "قسم تقنية المعلومات",
    dueDateEn: "Aug 25, 2025",
    dueDateAr: "٢٥ أغسطس ٢٠٢٥",
    dueDateISO: "2025-08-25",
    createdEn: "Aug 2, 2025",
    createdAr: "٢ أغسطس ٢٠٢٥",
    progress: 0,
  },
];

// ─── localStorage persistence ─────────────────────────────

const STORAGE_KEY = "thoth_work_items";

export function loadWorkItems(): WorkItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_WORK_ITEMS;
}

export function saveWorkItems(items: WorkItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (_) {}
}
