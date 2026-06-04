// ─── Core types ───────────────────────────────────────────

export type ActivityModule =
  | "people" | "organizations" | "finance" | "sales"
  | "operations" | "work" | "knowledge";

export type ActivityKind =
  | "customer_added"    | "quotation_created" | "invoice_sent"
  | "invoice_paid"      | "payment_received"  | "order_placed"
  | "work_completed"    | "employee_assigned" | "note_added"
  | "meeting_scheduled" | "contract_signed"   | "file_uploaded"
  | "organization_added"| "status_changed"    | "contact_updated"
  | "work_created"      | "work_assigned"     | "work_status_changed"
  | "deal_created"      | "deal_stage_changed"| "deal_won" | "deal_lost"
  | "person_added"      | "contacted";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  module: ActivityModule;
  titleEn: string;
  titleAr: string;
  detailEn?: string;
  detailAr?: string;
  entityType?: "person" | "organization" | "invoice" | "order" | "contract" | "quote";
  entityId?: string;
  entityNameEn?: string;
  entityNameAr?: string;
  authorEn: string;
  authorAr: string;
  authorColor: string;
  valueEn?: string;
  valueAr?: string;
  timeEn: string;
  timeAr: string;
  dateGroupEn: string;
  dateGroupAr: string;
}

// ─── Label maps ───────────────────────────────────────────

export const KIND_LABELS: Record<ActivityKind, { en: string; ar: string }> = {
  customer_added:     { en: "Contact Added",      ar: "جهة اتصال مضافة" },
  quotation_created:  { en: "Quote Created",       ar: "عرض سعر أُنشئ" },
  invoice_sent:       { en: "Invoice Sent",        ar: "فاتورة أُرسلت" },
  invoice_paid:       { en: "Invoice Paid",        ar: "فاتورة مدفوعة" },
  payment_received:   { en: "Payment Received",    ar: "دفعة مستلمة" },
  order_placed:       { en: "Order Placed",        ar: "طلب أُضيف" },
  work_completed:     { en: "Work Completed",      ar: "عمل مكتمل" },
  employee_assigned:  { en: "Employee Assigned",   ar: "موظف معيّن" },
  note_added:         { en: "Note Added",          ar: "ملاحظة مضافة" },
  meeting_scheduled:  { en: "Meeting Scheduled",   ar: "اجتماع مجدوَل" },
  contract_signed:    { en: "Contract Signed",     ar: "عقد موقَّع" },
  file_uploaded:      { en: "File Uploaded",       ar: "ملف مُحمَّل" },
  organization_added: { en: "Organization Added",  ar: "منظمة مضافة" },
  status_changed:     { en: "Status Changed",      ar: "حالة تغيّرت" },
  contact_updated:    { en: "Contact Updated",     ar: "جهة اتصال مُحدَّثة" },
  work_created:       { en: "Work Created",        ar: "عمل أُنشئ" },
  work_assigned:      { en: "Work Assigned",       ar: "عمل مُعيَّن" },
  work_status_changed:{ en: "Work Status Changed", ar: "حالة العمل تغيّرت" },
  deal_created:       { en: "Deal Created",        ar: "صفقة أُنشئت" },
  deal_stage_changed: { en: "Deal Stage Changed",  ar: "مرحلة الصفقة تغيّرت" },
  deal_won:           { en: "Deal Won",            ar: "صفقة فائزة" },
  deal_lost:          { en: "Deal Lost",           ar: "صفقة خاسرة" },
  person_added:       { en: "Person Added",        ar: "شخص مُضاف" },
  contacted:          { en: "Contacted",           ar: "تم التواصل" },
};

export const MODULE_META: Record<ActivityModule, { en: string; ar: string; dot: string; subtle: string }> = {
  people:        { en: "People",        ar: "الأشخاص",   dot: "bg-violet-400",  subtle: "text-violet-600" },
  finance:       { en: "Finance",       ar: "المالية",   dot: "bg-emerald-500", subtle: "text-emerald-700" },
  sales:         { en: "Sales",         ar: "المبيعات",  dot: "bg-amber-500",   subtle: "text-amber-600" },
  operations:    { en: "Operations",    ar: "العمليات",  dot: "bg-orange-400",  subtle: "text-orange-600" },
  work:          { en: "Work",          ar: "العمل",     dot: "bg-blue-400",    subtle: "text-blue-600" },
  organizations: { en: "Organizations", ar: "المنظمات",  dot: "bg-cyan-400",    subtle: "text-cyan-600" },
  knowledge:     { en: "Knowledge",     ar: "المعرفة",   dot: "bg-rose-400",    subtle: "text-rose-600" },
};

// ─── Shared authors ───────────────────────────────────────

const A = {
  nour:   { authorEn: "Nour Al-Haddad",  authorAr: "نور الحداد",  authorColor: "bg-emerald-100 text-emerald-700" },
  tariq:  { authorEn: "Tariq Nassar",    authorAr: "طارق نصار",   authorColor: "bg-cyan-100 text-cyan-700" },
  rana:   { authorEn: "Rana Khalil",     authorAr: "رنا خليل",    authorColor: "bg-violet-100 text-violet-700" },
  hassan: { authorEn: "Hassan Younis",   authorAr: "حسن يونس",    authorColor: "bg-amber-100 text-amber-700" },
  system: { authorEn: "System",          authorAr: "النظام",      authorColor: "bg-muted text-muted-foreground" },
};

// ─── Activity events (newest first) ──────────────────────

export const ACTIVITY_EVENTS: ActivityEvent[] = [

  // ── Today ────────────────────────────────────────────
  {
    id: "ev01", kind: "invoice_sent", module: "finance",
    titleEn: "Invoice #1042 sent to", titleAr: "تم إرسال فاتورة #١٠٤٢ إلى",
    entityType: "person", entityId: "p01",
    entityNameEn: "Omar Al-Rashidi", entityNameAr: "عمر الراشدي",
    valueEn: "$18,400", valueAr: "١٨٤٠٠ دولار",
    detailEn: "Due in 30 days", detailAr: "تستحق خلال ٣٠ يوماً",
    ...A.nour, timeEn: "10:24 AM", timeAr: "١٠:٢٤ ص",
    dateGroupEn: "Today", dateGroupAr: "اليوم",
  },
  {
    id: "ev02", kind: "meeting_scheduled", module: "sales",
    titleEn: "Discovery call scheduled with", titleAr: "مكالمة استكشافية مجدولة مع",
    entityType: "person", entityId: "p03",
    entityNameEn: "Fatima Al-Zahra", entityNameAr: "فاطمة الزهراء",
    detailEn: "Q4 budget approval — Oasis Retail", detailAr: "اعتماد ميزانية الربع الرابع — أوسيس",
    ...A.rana, timeEn: "9:15 AM", timeAr: "٩:١٥ ص",
    dateGroupEn: "Today", dateGroupAr: "اليوم",
  },
  {
    id: "ev03", kind: "employee_assigned", module: "operations",
    titleEn: "Hassan Younis assigned to", titleAr: "تم تعيين حسن يونس على",
    entityType: "order", entityId: "ord-3891",
    entityNameEn: "Order #3891", entityNameAr: "طلب #٣٨٩١",
    detailEn: "Production oversight — 200 office chairs", detailAr: "إشراف على الإنتاج — ٢٠٠ كرسي مكتبي",
    ...A.nour, timeEn: "8:45 AM", timeAr: "٨:٤٥ ص",
    dateGroupEn: "Today", dateGroupAr: "اليوم",
  },
  {
    id: "ev04", kind: "note_added", module: "people",
    titleEn: "Note added to", titleAr: "تمت إضافة ملاحظة على",
    entityType: "person", entityId: "p01",
    entityNameEn: "Omar Al-Rashidi", entityNameAr: "عمر الراشدي",
    detailEn: "Q4 budget approved · $180K allocated for furniture", detailAr: "تمت الموافقة على ميزانية الربع الرابع · ١٨٠ ألف دولار",
    ...A.nour, timeEn: "8:00 AM", timeAr: "٨:٠٠ ص",
    dateGroupEn: "Today", dateGroupAr: "اليوم",
  },

  // ── Yesterday ─────────────────────────────────────────
  {
    id: "ev05", kind: "payment_received", module: "finance",
    titleEn: "Payment received — Invoice #1038", titleAr: "تم استلام الدفع — فاتورة #١٠٣٨",
    entityType: "person", entityId: "p01",
    entityNameEn: "Omar Al-Rashidi", entityNameAr: "عمر الراشدي",
    valueEn: "$45,000", valueAr: "٤٥٠٠٠ دولار",
    detailEn: "Executive Desks — Batch 2", detailAr: "مكاتب تنفيذية — دفعة ٢",
    ...A.tariq, timeEn: "11:00 AM", timeAr: "١١:٠٠ ص",
    dateGroupEn: "Yesterday", dateGroupAr: "أمس",
  },
  {
    id: "ev06", kind: "quotation_created", module: "sales",
    titleEn: "Quote #Q-0077 created —", titleAr: "تم إنشاء عرض سعر #Q-٠٠٧٧ —",
    entityType: "person", entityId: "p01",
    entityNameEn: "Meridian Trading", entityNameAr: "ميريديان للتجارة",
    valueEn: "$67,200", valueAr: "٦٧٢٠٠ دولار",
    detailEn: "Riyadh office expansion", detailAr: "توسع مكتب الرياض",
    ...A.rana, timeEn: "3:15 PM", timeAr: "٣:١٥ م",
    dateGroupEn: "Yesterday", dateGroupAr: "أمس",
  },
  {
    id: "ev07", kind: "customer_added", module: "people",
    titleEn: "Mia Johansson added as contractor", titleAr: "تمت إضافة ميا يوهانسن كمتعاقدة",
    entityType: "person", entityId: "p16",
    entityNameEn: "Freelance · UX / Product Design", entityNameAr: "مستقل · تصميم المنتج",
    detailEn: "Working on THOTH interface and design system", detailAr: "تعمل على واجهة ثوث ونظام التصميم",
    ...A.rana, timeEn: "2:00 PM", timeAr: "٢:٠٠ م",
    dateGroupEn: "Yesterday", dateGroupAr: "أمس",
  },
  {
    id: "ev08", kind: "file_uploaded", module: "people",
    titleEn: "KYC Documents uploaded for", titleAr: "تم تحميل وثائق اعرف عميلك لـ",
    entityType: "person", entityId: "p01",
    entityNameEn: "Omar Al-Rashidi", entityNameAr: "عمر الراشدي",
    detailEn: "1.2 MB · KYC Documents.zip", detailAr: "١.٢ ميجابايت · وثائق.zip",
    ...A.nour, timeEn: "9:30 AM", timeAr: "٩:٣٠ ص",
    dateGroupEn: "Yesterday", dateGroupAr: "أمس",
  },

  // ── Friday, 29 May ────────────────────────────────────
  {
    id: "ev09", kind: "order_placed", module: "sales",
    titleEn: "Order #3891 placed —", titleAr: "تم تقديم طلب #٣٨٩١ —",
    entityType: "person", entityId: "p01",
    entityNameEn: "Omar Al-Rashidi", entityNameAr: "عمر الراشدي",
    valueEn: "$28,000", valueAr: "٢٨٠٠٠ دولار",
    detailEn: "200 office chairs — 6 week production lead time", detailAr: "٢٠٠ كرسي مكتبي — مهلة إنتاج ٦ أسابيع",
    ...A.rana, timeEn: "4:00 PM", timeAr: "٤:٠٠ م",
    dateGroupEn: "Friday, 29 May", dateGroupAr: "الجمعة، ٢٩ مايو",
  },
  {
    id: "ev10", kind: "meeting_scheduled", module: "people",
    titleEn: "Q3 planning call scheduled with", titleAr: "مكالمة تخطيط الربع الثالث مجدولة مع",
    entityType: "person", entityId: "p02",
    entityNameEn: "Sarah Chen", entityNameAr: "سارة تشن",
    detailEn: "Video call — Gulf Traders LLC quarterly review", detailAr: "مكالمة فيديو — مراجعة تجار الخليج الفصلية",
    ...A.rana, timeEn: "3:30 PM", timeAr: "٣:٣٠ م",
    dateGroupEn: "Friday, 29 May", dateGroupAr: "الجمعة، ٢٩ مايو",
  },
  {
    id: "ev11", kind: "file_uploaded", module: "finance",
    titleEn: "Supply Agreement 2024 uploaded for", titleAr: "تم تحميل اتفاقية التوريد ٢٠٢٤ لـ",
    entityType: "organization", entityId: "o02",
    entityNameEn: "Meridian Trading", entityNameAr: "ميريديان للتجارة",
    detailEn: "284 KB · Supply Agreement 2024.pdf", detailAr: "٢٨٤ كيلوبايت · اتفاقية التوريد.pdf",
    ...A.tariq, timeEn: "2:00 PM", timeAr: "٢:٠٠ م",
    dateGroupEn: "Friday, 29 May", dateGroupAr: "الجمعة، ٢٩ مايو",
  },
  {
    id: "ev12", kind: "status_changed", module: "sales",
    titleEn: "Fatima Al-Zahra status →", titleAr: "حالة فاطمة الزهراء →",
    entityType: "person", entityId: "p03",
    entityNameEn: "Active Lead", entityNameAr: "عميل محتمل نشط",
    detailEn: "3-location expansion quote sent", detailAr: "تم إرسال عرض سعر لتوسع ٣ مواقع",
    ...A.rana, timeEn: "10:30 AM", timeAr: "١٠:٣٠ ص",
    dateGroupEn: "Friday, 29 May", dateGroupAr: "الجمعة، ٢٩ مايو",
  },

  // ── Thursday, 28 May ──────────────────────────────────
  {
    id: "ev13", kind: "organization_added", module: "organizations",
    titleEn: "Blue Ocean Logistics partnership formalized", titleAr: "تم رسمنة شراكة المحيط الأزرق للوجستيات",
    entityType: "organization", entityId: "o04",
    entityNameEn: "Blue Ocean Logistics", entityNameAr: "المحيط الأزرق للوجستيات",
    detailEn: "30+ vehicles across UAE · Logistics & Transportation", detailAr: "أكثر من ٣٠ مركبة في الإمارات",
    ...A.rana, timeEn: "11:30 AM", timeAr: "١١:٣٠ ص",
    dateGroupEn: "Thursday, 28 May", dateGroupAr: "الخميس، ٢٨ مايو",
  },
  {
    id: "ev14", kind: "invoice_sent", module: "finance",
    titleEn: "Invoice #1040 sent to", titleAr: "تم إرسال فاتورة #١٠٤٠ إلى",
    entityType: "person", entityId: "p05",
    entityNameEn: "Diana Park", entityNameAr: "ديانا بارك",
    valueEn: "$32,000", valueAr: "٣٢٠٠٠ دولار",
    detailEn: "Q3 Supply — East Gate Traders", detailAr: "توريد الربع الثالث — تجار البوابة الشرقية",
    ...A.tariq, timeEn: "10:00 AM", timeAr: "١٠:٠٠ ص",
    dateGroupEn: "Thursday, 28 May", dateGroupAr: "الخميس، ٢٨ مايو",
  },
  {
    id: "ev15", kind: "employee_assigned", module: "people",
    titleEn: "Hassan Younis onboarded to", titleAr: "تم استيعاب حسن يونس في",
    entityType: "organization", entityId: "o01",
    entityNameEn: "Logistics Team · Dubai HQ", entityNameAr: "فريق اللوجستيات · المقر الرئيسي دبي",
    detailEn: "Day-one setup complete · Equipment provisioned", detailAr: "اكتمل إعداد اليوم الأول · تم توفير المعدات",
    ...A.nour, timeEn: "9:00 AM", timeAr: "٩:٠٠ ص",
    dateGroupEn: "Thursday, 28 May", dateGroupAr: "الخميس، ٢٨ مايو",
  },

  // ── Wednesday, 27 May ─────────────────────────────────
  {
    id: "ev16", kind: "quotation_created", module: "sales",
    titleEn: "Renewal quote created for", titleAr: "تم إنشاء عرض سعر تجديد لـ",
    entityType: "organization", entityId: "o02",
    entityNameEn: "Meridian Trading", entityNameAr: "ميريديان للتجارة",
    valueEn: "$120,000 / yr", valueAr: "١٢٠٠٠٠ دولار / سنة",
    detailEn: "Annual supply contract renewal · 3 year term proposed", detailAr: "تجديد عقد التوريد السنوي · مقترح لمدة ٣ سنوات",
    ...A.rana, timeEn: "4:45 PM", timeAr: "٤:٤٥ م",
    dateGroupEn: "Wednesday, 27 May", dateGroupAr: "الأربعاء، ٢٧ مايو",
  },
  {
    id: "ev17", kind: "work_completed", module: "operations",
    titleEn: "Production complete — Executive Desks Batch 2", titleAr: "اكتمل الإنتاج — مكاتب تنفيذية دفعة ٢",
    entityType: "order", entityId: "ord-3840",
    entityNameEn: "Order #3840", entityNameAr: "طلب #٣٨٤٠",
    detailEn: "Ready for dispatch · Quality check passed", detailAr: "جاهز للإرسال · اجتاز فحص الجودة",
    ...A.hassan, timeEn: "3:00 PM", timeAr: "٣:٠٠ م",
    dateGroupEn: "Wednesday, 27 May", dateGroupAr: "الأربعاء، ٢٧ مايو",
  },
  {
    id: "ev18", kind: "meeting_scheduled", module: "sales",
    titleEn: "Meeting scheduled with", titleAr: "تم تحديد موعد اجتماع مع",
    entityType: "organization", entityId: "o05",
    entityNameEn: "Gulf Finance Partners", entityNameAr: "شركاء الخليج المالية",
    detailEn: "Investment and co-venture discussion", detailAr: "نقاش حول الاستثمار والمشروع المشترك",
    ...A.tariq, timeEn: "11:00 AM", timeAr: "١١:٠٠ ص",
    dateGroupEn: "Wednesday, 27 May", dateGroupAr: "الأربعاء، ٢٧ مايو",
  },

  // ── Tuesday, 26 May ───────────────────────────────────
  {
    id: "ev19", kind: "invoice_paid", module: "finance",
    titleEn: "Invoice #1039 paid —", titleAr: "تم دفع فاتورة #١٠٣٩ —",
    entityType: "person", entityId: "p02",
    entityNameEn: "Gulf Traders LLC", entityNameAr: "تجار الخليج",
    valueEn: "$28,000", valueAr: "٢٨٠٠٠ دولار",
    detailEn: "Funds cleared · Account balance updated", detailAr: "تم تحصيل الأموال · تحديث رصيد الحساب",
    ...A.tariq, timeEn: "2:30 PM", timeAr: "٢:٣٠ م",
    dateGroupEn: "Tuesday, 26 May", dateGroupAr: "الثلاثاء، ٢٦ مايو",
  },
  {
    id: "ev20", kind: "organization_added", module: "organizations",
    titleEn: "Gulf Finance Partners added", titleAr: "تمت إضافة شركاء الخليج المالية",
    entityType: "organization", entityId: "o05",
    entityNameEn: "Gulf Finance Partners", entityNameAr: "شركاء الخليج المالية",
    detailEn: "Financial Services · Manama, Bahrain", detailAr: "الخدمات المالية · المنامة، البحرين",
    ...A.rana, timeEn: "10:15 AM", timeAr: "١٠:١٥ ص",
    dateGroupEn: "Tuesday, 26 May", dateGroupAr: "الثلاثاء، ٢٦ مايو",
  },
  {
    id: "ev21", kind: "customer_added", module: "people",
    titleEn: "Mohammed Al-Qassim added as lead", titleAr: "تمت إضافة محمد القاسم كعميل محتمل",
    entityType: "person", entityId: "p04",
    entityNameEn: "Desert Rose Hotels · Doha", entityNameAr: "فنادق وردة الصحراء · الدوحة",
    detailEn: "F&B Director — prospective furniture client", detailAr: "مدير الأغذية والمشروبات — عميل محتمل للأثاث",
    ...A.rana, timeEn: "9:30 AM", timeAr: "٩:٣٠ ص",
    dateGroupEn: "Tuesday, 26 May", dateGroupAr: "الثلاثاء، ٢٦ مايو",
  },

  // ── Monday, 25 May ────────────────────────────────────
  {
    id: "ev22", kind: "contract_signed", module: "finance",
    titleEn: "Supply Agreement reviewed and archived", titleAr: "تمت مراجعة اتفاقية التوريد وأرشفتها",
    entityType: "organization", entityId: "o02",
    entityNameEn: "Meridian Trading", entityNameAr: "ميريديان للتجارة",
    detailEn: "2024 contract · Verified and filed", detailAr: "عقد ٢٠٢٤ · تم التحقق والحفظ",
    ...A.tariq, timeEn: "3:00 PM", timeAr: "٣:٠٠ م",
    dateGroupEn: "Monday, 25 May", dateGroupAr: "الاثنين، ٢٥ مايو",
  },
  {
    id: "ev23", kind: "note_added", module: "organizations",
    titleEn: "Note added to", titleAr: "تمت إضافة ملاحظة على",
    entityType: "organization", entityId: "o02",
    entityNameEn: "Meridian Trading", entityNameAr: "ميريديان للتجارة",
    detailEn: "Possible Riyadh office expansion — Q1 2027 target", detailAr: "توسع مكتب الرياض المحتمل — هدف الربع الأول ٢٠٢٧",
    ...A.nour, timeEn: "1:30 PM", timeAr: "١:٣٠ م",
    dateGroupEn: "Monday, 25 May", dateGroupAr: "الاثنين، ٢٥ مايو",
  },
  {
    id: "ev24", kind: "meeting_scheduled", module: "operations",
    titleEn: "Weekly operations review scheduled", titleAr: "تم تحديد مراجعة العمليات الأسبوعية",
    detailEn: "Internal · Dubai HQ · All department leads", detailAr: "داخلي · المقر الرئيسي دبي · جميع رؤساء الأقسام",
    ...A.nour, timeEn: "9:00 AM", timeAr: "٩:٠٠ ص",
    dateGroupEn: "Monday, 25 May", dateGroupAr: "الاثنين، ٢٥ مايو",
  },

  // ── Last Week (18–24 May) ─────────────────────────────
  {
    id: "ev25", kind: "customer_added", module: "people",
    titleEn: "Priya Sharma added as partner", titleAr: "تمت إضافة بريا شارما كشريكة",
    entityType: "person", entityId: "p19",
    entityNameEn: "TechBridge Solutions · Mumbai", entityNameAr: "تك بريدج · مومباي",
    detailEn: "Technology reseller — India/South Asia markets", detailAr: "موزع تقنية — أسواق الهند وجنوب آسيا",
    ...A.rana, timeEn: "4:30 PM", timeAr: "٤:٣٠ م",
    dateGroupEn: "Last Week", dateGroupAr: "الأسبوع الماضي",
  },
  {
    id: "ev26", kind: "invoice_sent", module: "finance",
    titleEn: "Invoice #1038 sent to", titleAr: "تم إرسال فاتورة #١٠٣٨ إلى",
    entityType: "person", entityId: "p01",
    entityNameEn: "Omar Al-Rashidi", entityNameAr: "عمر الراشدي",
    valueEn: "$45,000", valueAr: "٤٥٠٠٠ دولار",
    detailEn: "Executive Desks — Batch 2", detailAr: "مكاتب تنفيذية — دفعة ٢",
    ...A.tariq, timeEn: "11:15 AM", timeAr: "١١:١٥ ص",
    dateGroupEn: "Last Week", dateGroupAr: "الأسبوع الماضي",
  },
  {
    id: "ev27", kind: "quotation_created", module: "sales",
    titleEn: "Quote #Q-0075 sent to", titleAr: "تم إرسال عرض سعر #Q-٠٠٧٥ إلى",
    entityType: "person", entityId: "p03",
    entityNameEn: "Fatima Al-Zahra", entityNameAr: "فاطمة الزهراء",
    valueEn: "$54,000", valueAr: "٥٤٠٠٠ دولار",
    detailEn: "Multi-location furniture — 3 Oasis Retail branches", detailAr: "أثاث لمواقع متعددة — ٣ فروع أوسيس ريتيل",
    ...A.rana, timeEn: "10:00 AM", timeAr: "١٠:٠٠ ص",
    dateGroupEn: "Last Week", dateGroupAr: "الأسبوع الماضي",
  },
  {
    id: "ev28", kind: "work_completed", module: "operations",
    titleEn: "Production complete — Office Chairs", titleAr: "اكتمل الإنتاج — كراسي المكاتب",
    entityType: "order", entityId: "ord-3820",
    entityNameEn: "Order #3820", entityNameAr: "طلب #٣٨٢٠",
    detailEn: "120 units · Ready for shipment", detailAr: "١٢٠ وحدة · جاهزة للشحن",
    ...A.hassan, timeEn: "5:00 PM", timeAr: "٥:٠٠ م",
    dateGroupEn: "Last Week", dateGroupAr: "الأسبوع الماضي",
  },
  {
    id: "ev29", kind: "employee_assigned", module: "sales",
    titleEn: "Rana Khalil assigned to", titleAr: "تم تعيين رنا خليل على",
    entityType: "person", entityId: "p03",
    entityNameEn: "Fatima Al-Zahra account", entityNameAr: "حساب فاطمة الزهراء",
    detailEn: "Key lead — 3-location deal in pipeline", detailAr: "عميل محتمل رئيسي — صفقة ٣ مواقع في المسار",
    ...A.nour, timeEn: "11:00 AM", timeAr: "١١:٠٠ ص",
    dateGroupEn: "Last Week", dateGroupAr: "الأسبوع الماضي",
  },
  {
    id: "ev30", kind: "contract_signed", module: "organizations",
    titleEn: "Partnership agreement signed —", titleAr: "تم توقيع اتفاقية الشراكة —",
    entityType: "organization", entityId: "o04",
    entityNameEn: "Blue Ocean Logistics", entityNameAr: "المحيط الأزرق للوجستيات",
    detailEn: "3-year logistics partnership · UAE-wide coverage", detailAr: "شراكة لوجستية ٣ سنوات · تغطية الإمارات",
    ...A.rana, timeEn: "3:30 PM", timeAr: "٣:٣٠ م",
    dateGroupEn: "Last Week", dateGroupAr: "الأسبوع الماضي",
  },
  {
    id: "ev31", kind: "invoice_paid", module: "finance",
    titleEn: "Invoice #1037 paid —", titleAr: "تم دفع فاتورة #١٠٣٧ —",
    entityType: "person", entityId: "p02",
    entityNameEn: "Gulf Traders LLC", entityNameAr: "تجار الخليج",
    valueEn: "$24,500", valueAr: "٢٤٥٠٠ دولار",
    ...A.tariq, timeEn: "2:00 PM", timeAr: "٢:٠٠ م",
    dateGroupEn: "Last Week", dateGroupAr: "الأسبوع الماضي",
  },
  {
    id: "ev32", kind: "customer_added", module: "people",
    titleEn: "Layla Hassan added as partner", titleAr: "تمت إضافة ليلى حسن كشريكة",
    entityType: "person", entityId: "p18",
    entityNameEn: "Blue Ocean Logistics · Dubai", entityNameAr: "المحيط الأزرق للوجستيات · دبي",
    detailEn: "Fleet Manager — logistics partnership contact", detailAr: "مديرة الأسطول — جهة اتصال الشراكة اللوجستية",
    ...A.rana, timeEn: "10:30 AM", timeAr: "١٠:٣٠ ص",
    dateGroupEn: "Last Week", dateGroupAr: "الأسبوع الماضي",
  },

  // ── Earlier ───────────────────────────────────────────
  {
    id: "ev33", kind: "contact_updated", module: "people",
    titleEn: "Contact details updated —", titleAr: "تم تحديث بيانات جهة الاتصال —",
    entityType: "person", entityId: "p01",
    entityNameEn: "Omar Al-Rashidi", entityNameAr: "عمر الراشدي",
    detailEn: "New procurement role confirmed", detailAr: "تم تأكيد دور المشتريات الجديد",
    ...A.nour, timeEn: "May 17", timeAr: "١٧ مايو",
    dateGroupEn: "Earlier", dateGroupAr: "سابقاً",
  },
  {
    id: "ev34", kind: "customer_added", module: "people",
    titleEn: "Emma Rodriguez added as prospective supplier", titleAr: "تمت إضافة إيما رودريغيز كمورد محتمل",
    entityType: "person", entityId: "p14",
    entityNameEn: "Coastal Suppliers · Barcelona", entityNameAr: "موردو الساحل · برشلونة",
    detailEn: "Referral from Omar Al-Rashidi", detailAr: "إحالة من عمر الراشدي",
    ...A.rana, timeEn: "May 16", timeAr: "١٦ مايو",
    dateGroupEn: "Earlier", dateGroupAr: "سابقاً",
  },
  {
    id: "ev35", kind: "work_completed", module: "operations",
    titleEn: "Order #3800 delivered to", titleAr: "تم تسليم طلب #٣٨٠٠ إلى",
    entityType: "person", entityId: "p02",
    entityNameEn: "Gulf Traders LLC", entityNameAr: "تجار الخليج",
    detailEn: "Final delivery confirmed · Customer sign-off received", detailAr: "تأكيد التسليم النهائي · موافقة العميل",
    ...A.hassan, timeEn: "May 15", timeAr: "١٥ مايو",
    dateGroupEn: "Earlier", dateGroupAr: "سابقاً",
  },
  {
    id: "ev36", kind: "invoice_paid", module: "finance",
    titleEn: "Invoice #1035 paid —", titleAr: "تم دفع فاتورة #١٠٣٥ —",
    entityType: "organization", entityId: "o03",
    entityNameEn: "Al-Noor Furniture", entityNameAr: "النور للأثاث",
    valueEn: "$72,000", valueAr: "٧٢٠٠٠ دولار",
    detailEn: "Annual supplier settlement", detailAr: "التسوية السنوية للمورد",
    ...A.tariq, timeEn: "May 14", timeAr: "١٤ مايو",
    dateGroupEn: "Earlier", dateGroupAr: "سابقاً",
  },
  {
    id: "ev37", kind: "customer_added", module: "people",
    titleEn: "Faris Al-Jabri added as lead", titleAr: "تمت إضافة فارس الجابري كعميل محتمل",
    entityType: "person", entityId: "p20",
    entityNameEn: "Gulf Finance Partners · Manama", entityNameAr: "شركاء الخليج المالية · المنامة",
    detailEn: "Investment Director — potential co-venture", detailAr: "مدير الاستثمار — مشروع مشترك محتمل",
    ...A.rana, timeEn: "May 13", timeAr: "١٣ مايو",
    dateGroupEn: "Earlier", dateGroupAr: "سابقاً",
  },
  {
    id: "ev38", kind: "meeting_scheduled", module: "sales",
    titleEn: "Business development call scheduled —", titleAr: "تم تحديد مكالمة تطوير أعمال —",
    entityType: "organization", entityId: "o05",
    entityNameEn: "TechBridge Solutions", entityNameAr: "تك بريدج",
    detailEn: "Partnership scope and revenue model discussion", detailAr: "نقاش نطاق الشراكة ونموذج الإيرادات",
    ...A.rana, timeEn: "May 12", timeAr: "١٢ مايو",
    dateGroupEn: "Earlier", dateGroupAr: "سابقاً",
  },
];

// ─── Unique values for filter dropdowns ───────────────────

export const UNIQUE_AUTHORS = Array.from(
  new Set(ACTIVITY_EVENTS.map((e) => e.authorEn))
).map((en) => {
  const ev = ACTIVITY_EVENTS.find((e) => e.authorEn === en)!;
  return { en, ar: ev.authorAr };
});

export const DATE_GROUP_ORDER = [
  "Today", "Yesterday",
  "Friday, 29 May", "Thursday, 28 May", "Wednesday, 27 May",
  "Tuesday, 26 May", "Monday, 25 May",
  "Last Week", "Earlier",
];

// ─── Cross-module event generator ─────────────────────────
// Generates ActivityEvent[] from live Work & Sales data

import { loadWorkItems, STATUS_META as W_STATUS } from "./work";
import { loadDeals, STAGE_META, formatCurrency } from "./sales";

export function generateCrossModuleEvents(): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const work = loadWorkItems();
  const deals = loadDeals();

  work.forEach((w, i) => {
    events.push({
      id: `xw-${w.id}`,
      kind: w.status === "done" ? "work_completed" : "work_created",
      module: "work",
      titleEn: w.status === "done" ? "Work completed —" : "Work created —",
      titleAr: w.status === "done" ? "عمل مكتمل —" : "عمل أُنشئ —",
      entityType: "work" as any,
      entityId: w.id,
      entityNameEn: w.titleEn,
      entityNameAr: w.titleAr,
      detailEn: `Status: ${W_STATUS[w.status].en} · ${w.progress}%`,
      detailAr: `الحالة: ${W_STATUS[w.status].ar} · ${w.progress}%`,
      authorEn: w.assigneeEn,
      authorAr: w.assigneeAr,
      authorColor: "bg-blue-100 text-blue-700",
      timeEn: w.createdEn,
      timeAr: w.createdAr,
      dateGroupEn: i < 3 ? "Today" : i < 6 ? "Yesterday" : "Last Week",
      dateGroupAr: i < 3 ? "اليوم" : i < 6 ? "أمس" : "الأسبوع الماضي",
    });
  });

  deals.forEach((d, i) => {
    const isWon = d.stage === "won";
    const isLost = d.stage === "lost";
    events.push({
      id: `xd-${d.id}`,
      kind: isWon ? "deal_won" : isLost ? "deal_lost" : "deal_created",
      module: "sales",
      titleEn: isWon ? "Deal won —" : isLost ? "Deal lost —" : "Deal created —",
      titleAr: isWon ? "صفقة فائزة —" : isLost ? "صفقة خاسرة —" : "صفقة أُنشئت —",
      entityType: "deal" as any,
      entityId: d.id,
      entityNameEn: d.titleEn,
      entityNameAr: d.titleAr,
      detailEn: `Stage: ${STAGE_META[d.stage].en} · ${formatCurrency(d.value, d.currency)}`,
      detailAr: `المرحلة: ${STAGE_META[d.stage].ar} · ${formatCurrency(d.value, d.currency)}`,
      authorEn: d.ownerEn,
      authorAr: d.ownerAr,
      authorColor: isWon ? "bg-emerald-100 text-emerald-700" : isLost ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700",
      valueEn: formatCurrency(d.value, d.currency),
      valueAr: formatCurrency(d.value, d.currency),
      timeEn: d.createdEn,
      timeAr: d.createdAr,
      dateGroupEn: i < 2 ? "Today" : i < 5 ? "Yesterday" : "Last Week",
      dateGroupAr: i < 2 ? "اليوم" : i < 5 ? "أمس" : "الأسبوع الماضي",
    });
  });

  return events;
}
