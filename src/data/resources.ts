// ─── Core types ───────────────────────────────────────────

export type ResourceType = "equipment" | "inventory" | "vehicle" | "facility" | "license" | "other";
export type ResourceStatus = "active" | "idle" | "maintenance" | "retired";

export interface MaintenanceRecord {
  id: string;
  titleEn: string;
  titleAr: string;
  status: "upcoming" | "completed" | "overdue";
  dateEn: string;
  dateAr: string;
  costEn?: string;
  costAr?: string;
}

export interface Resource {
  id: string;
  nameEn: string;
  nameAr: string;
  type: ResourceType;
  status: ResourceStatus;
  descEn: string;
  descAr: string;
  ownerEn: string;
  ownerAr: string;
  locationEn: string;
  locationAr: string;
  value: number;
  currency: string;
  utilization: number; // 0-100
  sku?: string;
  quantity?: number;
  unitCost?: number;
  assignedToEn?: string;
  assignedToAr?: string;
  relatedWorkId?: string;
  purchaseDateEn: string;
  purchaseDateAr: string;
  maintenance: MaintenanceRecord[];
}

// ─── Label maps ───────────────────────────────────────────

export const RESOURCE_TYPE_META: Record<ResourceType, { en: string; ar: string; pill: string }> = {
  equipment: { en: "Equipment",  ar: "معدات",    pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  inventory: { en: "Inventory",  ar: "مخزون",    pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  vehicle:   { en: "Vehicle",    ar: "مركبة",    pill: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  facility:  { en: "Facility",   ar: "منشأة",    pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  license:   { en: "License",    ar: "ترخيص",    pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  other:     { en: "Other",      ar: "أخرى",     pill: "bg-muted text-muted-foreground border border-border" },
};

export const RESOURCE_STATUS_META: Record<ResourceStatus, { en: string; ar: string; dot: string; pill: string }> = {
  active:      { en: "Active",      ar: "نشط",       dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  idle:        { en: "Idle",        ar: "خامل",      dot: "bg-stone-400",   pill: "bg-stone-100 text-stone-600 border border-stone-200" },
  maintenance: { en: "Maintenance", ar: "صيانة",     dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  retired:     { en: "Retired",     ar: "متقاعد",    dot: "bg-muted-foreground/40", pill: "bg-muted text-muted-foreground border border-border" },
};

export const MAINT_STATUS_META: Record<MaintenanceRecord["status"], { en: string; ar: string; dot: string }> = {
  upcoming:  { en: "Upcoming",  ar: "قادمة",   dot: "bg-primary" },
  completed: { en: "Completed", ar: "مكتملة",  dot: "bg-emerald-500" },
  overdue:   { en: "Overdue",   ar: "متأخرة",  dot: "bg-rose-500" },
};

export function fmtVal(value: number, currency: string = "SAR", locale: string = "en-SA"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// ─── Default data ─────────────────────────────────────────

const DEFAULT_RESOURCES: Resource[] = [
  {
    id: "res-001", nameEn: "CNC Router — 5-Axis", nameAr: "جهاز توجيه CNC — ٥ محاور",
    type: "equipment", status: "active",
    descEn: "High-precision 5-axis CNC router for custom furniture fabrication. 2400×1200mm bed, automatic tool changer, dust extraction system.", descAr: "جهاز توجيه CNC عالي الدقة بـ ٥ محاور لتصنيع الأثاث المخصص. سرير ٢٤٠٠×١٢٠٠ مم، مبدّل أدوات تلقائي، نظام شفط الغبار.",
    ownerEn: "Production Line A", ownerAr: "خط الإنتاج أ",
    locationEn: "Riyadh Plant, Bay 3", locationAr: "مصنع الرياض، الخليج ٣",
    value: 450000, currency: "SAR", utilization: 87,
    assignedToEn: "Khalid Al-Mansouri", assignedToAr: "خالد المنصوري", relatedWorkId: "w-001",
    purchaseDateEn: "Jan 2023", purchaseDateAr: "يناير ٢٠٢٣",
    maintenance: [
      { id: "m1", titleEn: "Spindle bearing replacement", titleAr: "استبدال محمل المغزل", status: "completed", dateEn: "Jul 15, 2025", dateAr: "١٥ يوليو ٢٠٢٥", costEn: "SAR 12,000", costAr: "١٢,٠٠٠ ر.س" },
      { id: "m2", titleEn: "Annual calibration", titleAr: "المعايرة السنوية", status: "upcoming", dateEn: "Sep 1, 2025", dateAr: "١ سبتمبر ٢٠٢٥" },
    ],
  },
  {
    id: "res-002", nameEn: "Edge Banding Machine", nameAr: "ماكينة حواف",
    type: "equipment", status: "maintenance",
    descEn: "Automatic edge banding machine for laminate and veneer. Currently undergoing motor replacement.", descAr: "ماكينة حواف تلقائية للامينيت والقشرة. تخضع حالياً لاستبدال المحرك.",
    ownerEn: "Production Line B", ownerAr: "خط الإنتاج ب",
    locationEn: "Riyadh Plant, Bay 5", locationAr: "مصنع الرياض، الخليج ٥",
    value: 180000, currency: "SAR", utilization: 0,
    purchaseDateEn: "Mar 2021", purchaseDateAr: "مارس ٢٠٢١",
    maintenance: [
      { id: "m3", titleEn: "Motor replacement", titleAr: "استبدال المحرك", status: "overdue", dateEn: "Aug 1, 2025", dateAr: "١ أغسطس ٢٠٢٥", costEn: "SAR 25,000", costAr: "٢٥,٠٠٠ ر.س" },
    ],
  },
  {
    id: "res-003", nameEn: "Delivery Truck — Fleet #7", nameAr: "شاحنة توصيل — أسطول #٧",
    type: "vehicle", status: "active",
    descEn: "6-ton box truck for local furniture deliveries. GPS tracked, padded interior, tail lift.", descAr: "شاحنة صندوقية ٦ أطنان لتوصيل الأثاث المحلي. تتبع GPS، داخلية مبطنة، رافعة خلفية.",
    ownerEn: "Logistics Team", ownerAr: "فريق اللوجستيات",
    locationEn: "Dubai Warehouse", locationAr: "مستودع دبي",
    value: 220000, currency: "SAR", utilization: 72,
    assignedToEn: "Hassan Younis", assignedToAr: "حسن يونس",
    purchaseDateEn: "Jun 2022", purchaseDateAr: "يونيو ٢٠٢٢",
    maintenance: [
      { id: "m4", titleEn: "Oil change + brake inspection", titleAr: "تغيير الزيت + فحص الفرامل", status: "upcoming", dateEn: "Aug 20, 2025", dateAr: "٢٠ أغسطس ٢٠٢٥" },
    ],
  },
  {
    id: "res-004", nameEn: "Walnut Lumber — Grade A", nameAr: "خشب جوز — درجة أ",
    type: "inventory", status: "active",
    descEn: "Premium American walnut lumber for high-end custom pieces. Air-dried, 8/4 thickness.", descAr: "خشب جوز أمريكي ممتاز للقطع المخصصة الفاخرة. مجفف بالهواء، سماكة ٨/٤.",
    ownerEn: "Warehouse Team", ownerAr: "فريق المستودعات",
    locationEn: "Riyadh Plant, Store A", locationAr: "مصنع الرياض، مخزن أ",
    value: 340000, currency: "SAR", utilization: 65,
    sku: "WLN-A-84", quantity: 420, unitCost: 810,
    purchaseDateEn: "May 2025", purchaseDateAr: "مايو ٢٠٢٥",
    maintenance: [],
  },
  {
    id: "res-005", nameEn: "Steel Frames — School Desk", nameAr: "هياكل معدنية — مقاعد مدرسية",
    type: "inventory", status: "active",
    descEn: "Pre-fabricated steel desk frames for school furniture line. Powder-coated, stackable.", descAr: "هياكل مكاتب معدنية مسبقة التصنيع لخط أثاث المدارس. مطلية بالبودرة، قابلة للتكديس.",
    ownerEn: "Production Line B", ownerAr: "خط الإنتاج ب",
    locationEn: "Riyadh Plant, Store B", locationAr: "مصنع الرياض، مخزن ب",
    value: 96000, currency: "SAR", utilization: 82, relatedWorkId: "w-008",
    sku: "STL-SD-200", quantity: 200, unitCost: 480,
    purchaseDateEn: "Jul 2025", purchaseDateAr: "يوليو ٢٠٢٥",
    maintenance: [],
  },
  {
    id: "res-006", nameEn: "Dubai Showroom", nameAr: "صالة عرض دبي",
    type: "facility", status: "active",
    descEn: "500 sqm premium showroom in Design District. Client-facing display area, meeting rooms, and VIP lounge.", descAr: "صالة عرض فاخرة ٥٠٠ م² في حي التصميم. منطقة عرض للعملاء، غرف اجتماعات، وصالة كبار الشخصيات.",
    ownerEn: "Sales Team", ownerAr: "فريق المبيعات",
    locationEn: "Dubai Design District, Building 4", locationAr: "حي التصميم دبي، مبنى ٤",
    value: 1200000, currency: "SAR", utilization: 60,
    purchaseDateEn: "Feb 2020", purchaseDateAr: "فبراير ٢٠٢٠",
    maintenance: [
      { id: "m5", titleEn: "HVAC service", titleAr: "خدمة تكييف", status: "completed", dateEn: "Jul 28, 2025", dateAr: "٢٨ يوليو ٢٠٢٥", costEn: "SAR 3,500", costAr: "٣,٥٠٠ ر.س" },
      { id: "m6", titleEn: "Fire safety inspection", titleAr: "فحص السلامة من الحريق", status: "upcoming", dateEn: "Oct 1, 2025", dateAr: "١ أكتوبر ٢٠٢٥" },
    ],
  },
  {
    id: "res-007", nameEn: "Riyadh Warehouse", nameAr: "مستودع الرياض",
    type: "facility", status: "active",
    descEn: "2,000 sqm climate-controlled warehouse for finished goods storage and dispatch. 24/7 security.", descAr: "مستودع ٢,٠٠٠ م² مكيف لتخزين البضائع الجاهزة والإرسال. حراسة ٢٤/٧.",
    ownerEn: "Warehouse Team", ownerAr: "فريق المستودعات",
    locationEn: "Industrial City, Zone 3, Riyadh", locationAr: "المدينة الصناعية، المنطقة ٣، الرياض",
    value: 800000, currency: "SAR", utilization: 78,
    purchaseDateEn: "Jan 2019", purchaseDateAr: "يناير ٢٠١٩",
    maintenance: [
      { id: "m7", titleEn: "AC unit replacement — Unit 3", titleAr: "استبدال وحدة تكييف — الوحدة ٣", status: "overdue", dateEn: "Aug 3, 2025", dateAr: "٣ أغسطس ٢٠٢٥", costEn: "SAR 18,000", costAr: "١٨,٠٠٠ ر.س" },
    ],
  },
  {
    id: "res-008", nameEn: "Trade License — Dubai", nameAr: "رخصة تجارية — دبي",
    type: "license", status: "active",
    descEn: "Dubai Department of Economic Development trade license. Valid through Dec 2025.", descAr: "رخصة تجارية من دائرة التنمية الاقتصادية في دبي. صالحة حتى ديسمبر ٢٠٢٥.",
    ownerEn: "Admin", ownerAr: "المدير",
    locationEn: "Dubai, UAE", locationAr: "دبي، الإمارات",
    value: 15000, currency: "SAR", utilization: 100,
    purchaseDateEn: "Jan 2025", purchaseDateAr: "يناير ٢٠٢٥",
    maintenance: [{ id: "m8", titleEn: "License renewal", titleAr: "تجديد الرخصة", status: "upcoming", dateEn: "Dec 1, 2025", dateAr: "١ ديسمبر ٢٠٢٥", costEn: "SAR 15,000", costAr: "١٥,٠٠٠ ر.س" }],
  },
  {
    id: "res-009", nameEn: "Forklift — 3T Capacity", nameAr: "رافعة شوكية — سعة ٣ طن",
    type: "equipment", status: "active",
    descEn: "Electric counterbalance forklift for warehouse operations. 3-ton lift capacity.", descAr: "رافعة شوكية كهربائية لعمليات المستودع. سعة رفع ٣ أطنان.",
    ownerEn: "Warehouse Team", ownerAr: "فريق المستودعات",
    locationEn: "Riyadh Warehouse", locationAr: "مستودع الرياض",
    value: 95000, currency: "SAR", utilization: 55,
    purchaseDateEn: "Aug 2023", purchaseDateAr: "أغسطس ٢٠٢٣",
    maintenance: [{ id: "m9", titleEn: "Battery replacement", titleAr: "استبدال البطارية", status: "upcoming", dateEn: "Sep 15, 2025", dateAr: "١٥ سبتمبر ٢٠٢٥", costEn: "SAR 8,000", costAr: "٨,٠٠٠ ر.س" }],
  },
  {
    id: "res-010", nameEn: "Delivery Van — Fleet #12", nameAr: "فان توصيل — أسطول #١٢",
    type: "vehicle", status: "idle",
    descEn: "Light commercial van for small deliveries. Currently unassigned.", descAr: "فان تجاري خفيف للتوصيلات الصغيرة. غير مُعيّن حالياً.",
    ownerEn: "Logistics Team", ownerAr: "فريق اللوجستيات",
    locationEn: "Dubai Warehouse", locationAr: "مستودع دبي",
    value: 85000, currency: "SAR", utilization: 0,
    purchaseDateEn: "Nov 2023", purchaseDateAr: "نوفمبر ٢٠٢٣",
    maintenance: [],
  },
  {
    id: "res-011", nameEn: "Laminate Sheets — Oak", nameAr: "ألواح لامينيت — بلوط",
    type: "inventory", status: "active",
    descEn: "High-pressure laminate sheets, oak finish. Standard 1220×2440mm sheets.", descAr: "ألواح لامينيت عالية الضغط، تشطيب بلوط. ألواح قياسية ١٢٢٠×٢٤٤٠ مم.",
    ownerEn: "Production Line A", ownerAr: "خط الإنتاج أ",
    locationEn: "Riyadh Plant, Store A", locationAr: "مصنع الرياض، مخزن أ",
    value: 72000, currency: "SAR", utilization: 70,
    sku: "LAM-OAK-STD", quantity: 600, unitCost: 120,
    purchaseDateEn: "Jun 2025", purchaseDateAr: "يونيو ٢٠٢٥",
    maintenance: [],
  },
  {
    id: "res-012", nameEn: "Spray Booth — Automated", nameAr: "كابينة رش — آلية",
    type: "equipment", status: "retired",
    descEn: "Legacy automated spray booth. Replaced by new downdraft model. Pending disposal.", descAr: "كابينة رش آلية قديمة. تم استبدالها بنموذج تدفق هابط جديد. بانتظار التخلص.",
    ownerEn: "Facilities", ownerAr: "المرافق",
    locationEn: "Riyadh Plant, Bay 8", locationAr: "مصنع الرياض، الخليج ٨",
    value: 35000, currency: "SAR", utilization: 0,
    purchaseDateEn: "Apr 2018", purchaseDateAr: "أبريل ٢٠١٨",
    maintenance: [],
  },
];

// ─── localStorage persistence ─────────────────────────────

const STORAGE_KEY = "thoth_resources";

export function loadResources(): Resource[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; } } catch (_) {}
  return DEFAULT_RESOURCES;
}

export function saveResources(d: Resource[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (_) {}
}
