// ─── Core types ───────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";
export type ExpenseCategory = "operations" | "payroll" | "marketing" | "software" | "travel" | "other";
export type ExpenseStatus = "pending" | "approved" | "paid" | "rejected";

export interface Invoice {
  id: string;
  number: string;
  titleEn: string;
  titleAr: string;
  orgNameEn: string;
  orgNameAr: string;
  orgId?: string;
  contactNameEn: string;
  contactNameAr: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDateEn: string;
  issueDateAr: string;
  dueDateEn: string;
  dueDateAr: string;
  dueDateISO?: string;
  paidAmount: number;
  relatedDealId?: string;
  noteEn?: string;
  noteAr?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  dateEn: string;
  dateAr: string;
  referenceEn?: string;
  referenceAr?: string;
}

export interface Expense {
  id: string;
  vendorEn: string;
  vendorAr: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  status: ExpenseStatus;
  dateEn: string;
  dateAr: string;
  descEn: string;
  descAr: string;
}

// ─── Label maps ───────────────────────────────────────────

export const INVOICE_STATUS_META: Record<InvoiceStatus, { en: string; ar: string; dot: string; pill: string }> = {
  draft:     { en: "Draft",     ar: "مسودة",    dot: "bg-stone-400",         pill: "bg-stone-100 text-stone-600 border border-stone-200" },
  sent:      { en: "Sent",      ar: "مُرسلة",   dot: "bg-primary",           pill: "bg-primary/8 text-primary border border-primary/20" },
  paid:      { en: "Paid",      ar: "مدفوعة",   dot: "bg-emerald-500",       pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  overdue:   { en: "Overdue",   ar: "متأخرة",   dot: "bg-rose-500",          pill: "bg-rose-50 text-rose-600 border border-rose-200" },
  cancelled: { en: "Cancelled", ar: "ملغاة",    dot: "bg-muted-foreground/40", pill: "bg-muted text-muted-foreground border border-border" },
};

export const PAYMENT_METHOD_META: Record<PaymentMethod, { en: string; ar: string }> = {
  cash:          { en: "Cash",          ar: "نقدي" },
  bank_transfer: { en: "Bank Transfer", ar: "تحويل بنكي" },
  card:          { en: "Card",          ar: "بطاقة" },
  other:         { en: "Other",         ar: "أخرى" },
};

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { en: string; ar: string; pill: string }> = {
  operations: { en: "Operations", ar: "العمليات",  pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  payroll:    { en: "Payroll",    ar: "الرواتب",   pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  marketing:  { en: "Marketing",  ar: "التسويق",   pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  software:   { en: "Software",   ar: "البرمجيات", pill: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  travel:     { en: "Travel",     ar: "السفر",     pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  other:      { en: "Other",      ar: "أخرى",      pill: "bg-muted text-muted-foreground border border-border" },
};

export const EXPENSE_STATUS_META: Record<ExpenseStatus, { en: string; ar: string; dot: string }> = {
  pending:  { en: "Pending",  ar: "معلقة",    dot: "bg-amber-500" },
  approved: { en: "Approved", ar: "معتمدة",   dot: "bg-primary" },
  paid:     { en: "Paid",     ar: "مدفوعة",   dot: "bg-emerald-500" },
  rejected: { en: "Rejected", ar: "مرفوضة",   dot: "bg-rose-500" },
};

// ─── Helpers ──────────────────────────────────────────────

export function fmtCurrency(value: number, currency: string = "SAR", locale: string = "en-SA"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// ─── Default data ─────────────────────────────────────────

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: "inv-001", number: "INV-2025-001",
    titleEn: "Corporate Office Furniture — Phase 1", titleAr: "أثاث مكتبي — المرحلة ١",
    orgNameEn: "Meridian Group", orgNameAr: "مجموعة ميريديان", orgId: "org-1",
    contactNameEn: "Omar Al-Rashidi", contactNameAr: "عمر الراشدي",
    amount: 960000, currency: "SAR", status: "paid", paidAmount: 960000,
    issueDateEn: "Jul 1, 2025", issueDateAr: "١ يوليو ٢٠٢٥",
    dueDateEn: "Jul 30, 2025", dueDateAr: "٣٠ يوليو ٢٠٢٥", dueDateISO: "2025-07-30",
    relatedDealId: "d-001",
    noteEn: "First milestone payment for the Meridian headquarters fit-out project.",
    noteAr: "دفعة المعلم الأول لمشروع تجهيز مقر ميريديان.",
  },
  {
    id: "inv-002", number: "INV-2025-002",
    titleEn: "Warehouse Racking — Deposit", titleAr: "أرفف المستودعات — عربون",
    orgNameEn: "Gulf Traders LLC", orgNameAr: "تجار الخليج", orgId: "org-2",
    contactNameEn: "Fahad Al-Otaibi", contactNameAr: "فهد العتيبي",
    amount: 425000, currency: "SAR", status: "sent", paidAmount: 0,
    issueDateEn: "Jul 25, 2025", issueDateAr: "٢٥ يوليو ٢٠٢٥",
    dueDateEn: "Aug 25, 2025", dueDateAr: "٢٥ أغسطس ٢٠٢٥", dueDateISO: "2025-08-25",
    relatedDealId: "d-002",
  },
  {
    id: "inv-003", number: "INV-2025-003",
    titleEn: "Break Room Furniture — Final", titleAr: "أثاث غرفة الاستراحة — نهائي",
    orgNameEn: "Atlas Manufacturing", orgNameAr: "أطلس للتصنيع", orgId: "org-3",
    contactNameEn: "Omar Al-Rashidi", contactNameAr: "عمر الراشدي",
    amount: 280000, currency: "SAR", status: "paid", paidAmount: 280000,
    issueDateEn: "Jul 15, 2025", issueDateAr: "١٥ يوليو ٢٠٢٥",
    dueDateEn: "Aug 15, 2025", dueDateAr: "١٥ أغسطس ٢٠٢٥", dueDateISO: "2025-08-15",
    relatedDealId: "d-006",
  },
  {
    id: "inv-004", number: "INV-2025-004",
    titleEn: "Lobby Renovation — Progress", titleAr: "تجديد اللوبي — تقدم",
    orgNameEn: "Jeddah Grand Hotel", orgNameAr: "فندق جدة الكبير",
    contactNameEn: "Fatima Al-Zahra", contactNameAr: "فاطمة الزهراء",
    amount: 720000, currency: "SAR", status: "overdue", paidAmount: 0,
    issueDateEn: "Jul 5, 2025", issueDateAr: "٥ يوليو ٢٠٢٥",
    dueDateEn: "Aug 5, 2025", dueDateAr: "٥ أغسطس ٢٠٢٥", dueDateISO: "2025-08-05",
    relatedDealId: "d-005",
  },
  {
    id: "inv-005", number: "INV-2025-005",
    titleEn: "Penthouse Collection — Deposit", titleAr: "مجموعة البنتهاوس — عربون",
    orgNameEn: "Premium Residences Co.", orgNameAr: "شركة المساكن الفاخرة",
    contactNameEn: "Omar Al-Rashidi", contactNameAr: "عمر الراشدي",
    amount: 1350000, currency: "SAR", status: "draft", paidAmount: 0,
    issueDateEn: "Aug 1, 2025", issueDateAr: "١ أغسطس ٢٠٢٥",
    dueDateEn: "Sep 1, 2025", dueDateAr: "١ سبتمبر ٢٠٢٥", dueDateISO: "2025-09-01",
    relatedDealId: "d-010",
  },
  {
    id: "inv-006", number: "INV-2025-006",
    titleEn: "School Desks — Advance Payment", titleAr: "مقاعد مدرسية — دفعة مقدمة",
    orgNameEn: "Ministry of Education", orgNameAr: "وزارة التعليم",
    contactNameEn: "Ahmed Khalil", contactNameAr: "أحمد خليل",
    amount: 640000, currency: "SAR", status: "sent", paidAmount: 0,
    issueDateEn: "Aug 3, 2025", issueDateAr: "٣ أغسطس ٢٠٢٥",
    dueDateEn: "Sep 3, 2025", dueDateAr: "٣ سبتمبر ٢٠٢٥", dueDateISO: "2025-09-03",
    relatedDealId: "d-004",
  },
  {
    id: "inv-007", number: "INV-2025-007",
    titleEn: "Corporate Office — Phase 2", titleAr: "أثاث مكتبي — المرحلة ٢",
    orgNameEn: "Meridian Group", orgNameAr: "مجموعة ميريديان",
    contactNameEn: "Omar Al-Rashidi", contactNameAr: "عمر الراشدي",
    amount: 720000, currency: "SAR", status: "sent", paidAmount: 0,
    issueDateEn: "Aug 5, 2025", issueDateAr: "٥ أغسطس ٢٠٢٥",
    dueDateEn: "Sep 5, 2025", dueDateAr: "٥ سبتمبر ٢٠٢٥", dueDateISO: "2025-09-05",
    relatedDealId: "d-001",
  },
  {
    id: "inv-008", number: "INV-2025-008",
    titleEn: "Model Home Staging — Package A", titleAr: "تجهيز بيت نموذجي — حزمة أ",
    orgNameEn: "Al-Bayt Real Estate", orgNameAr: "البيت للعقارات",
    contactNameEn: "Layla Hassan", contactNameAr: "ليلى حسن",
    amount: 140000, currency: "SAR", status: "cancelled", paidAmount: 0,
    issueDateEn: "Jun 20, 2025", issueDateAr: "٢٠ يونيو ٢٠٢٥",
    dueDateEn: "Jul 20, 2025", dueDateAr: "٢٠ يوليو ٢٠٢٥", dueDateISO: "2025-07-20",
  },
];

const DEFAULT_PAYMENTS: Payment[] = [
  { id: "pay-001", invoiceId: "inv-001", invoiceNumber: "INV-2025-001", amount: 480000, currency: "SAR", method: "bank_transfer", dateEn: "Jul 10, 2025", dateAr: "١٠ يوليو ٢٠٢٥", referenceEn: "TRF-78421", referenceAr: "TRF-78421" },
  { id: "pay-002", invoiceId: "inv-001", invoiceNumber: "INV-2025-001", amount: 480000, currency: "SAR", method: "bank_transfer", dateEn: "Jul 28, 2025", dateAr: "٢٨ يوليو ٢٠٢٥", referenceEn: "TRF-79103", referenceAr: "TRF-79103" },
  { id: "pay-003", invoiceId: "inv-003", invoiceNumber: "INV-2025-003", amount: 140000, currency: "SAR", method: "bank_transfer", dateEn: "Jul 20, 2025", dateAr: "٢٠ يوليو ٢٠٢٥", referenceEn: "TRF-78890", referenceAr: "TRF-78890" },
  { id: "pay-004", invoiceId: "inv-003", invoiceNumber: "INV-2025-003", amount: 140000, currency: "SAR", method: "card", dateEn: "Aug 1, 2025", dateAr: "١ أغسطس ٢٠٢٥", referenceEn: "CC-45201", referenceAr: "CC-45201" },
  { id: "pay-005", invoiceId: "inv-001", invoiceNumber: "INV-2025-001", amount: 0, currency: "SAR", method: "cash", dateEn: "Jul 5, 2025", dateAr: "٥ يوليو ٢٠٢٥" },
];

const DEFAULT_EXPENSES: Expense[] = [
  { id: "exp-001", vendorEn: "Amazon Web Services", vendorAr: "أمازون ويب سيرفيسز", category: "software", amount: 12500, currency: "SAR", status: "paid", dateEn: "Aug 1, 2025", dateAr: "١ أغسطس ٢٠٢٥", descEn: "Monthly cloud infrastructure", descAr: "بنية تحتية سحابية شهرية" },
  { id: "exp-002", vendorEn: "Office Rent — Dubai HQ", vendorAr: "إيجار مكتب — دبي", category: "operations", amount: 85000, currency: "SAR", status: "paid", dateEn: "Aug 1, 2025", dateAr: "١ أغسطس ٢٠٢٥", descEn: "Monthly office lease", descAr: "إيجار مكتب شهري" },
  { id: "exp-003", vendorEn: "Staff Salaries — August", vendorAr: "رواتب الموظفين — أغسطس", category: "payroll", amount: 420000, currency: "SAR", status: "approved", dateEn: "Aug 1, 2025", dateAr: "١ أغسطس ٢٠٢٥", descEn: "Monthly payroll for 58 employees", descAr: "رواتب شهرية لـ ٥٨ موظف" },
  { id: "exp-004", vendorEn: "Google Ads", vendorAr: "إعلانات جوجل", category: "marketing", amount: 35000, currency: "SAR", status: "paid", dateEn: "Jul 28, 2025", dateAr: "٢٨ يوليو ٢٠٢٥", descEn: "Q3 digital campaign", descAr: "حملة رقمية للربع الثالث" },
  { id: "exp-005", vendorEn: "Dubai → Riyadh Flights", vendorAr: "رحلات دبي → الرياض", category: "travel", amount: 8500, currency: "SAR", status: "pending", dateEn: "Aug 3, 2025", dateAr: "٣ أغسطس ٢٠٢٥", descEn: "Team travel for client meetings", descAr: "سفر الفريق لاجتماعات العملاء" },
  { id: "exp-006", vendorEn: "Figma Enterprise", vendorAr: "فيجما إنتربرايز", category: "software", amount: 4200, currency: "SAR", status: "paid", dateEn: "Jul 15, 2025", dateAr: "١٥ يوليو ٢٠٢٥", descEn: "Annual design tool license", descAr: "ترخيص سنوي لأداة التصميم" },
  { id: "exp-007", vendorEn: "Office Supplies", vendorAr: "لوازم مكتبية", category: "operations", amount: 3200, currency: "SAR", status: "paid", dateEn: "Jul 20, 2025", dateAr: "٢٠ يوليو ٢٠٢٥", descEn: "Stationery and printer supplies", descAr: "قرطاسية ومستلزمات طابعة" },
  { id: "exp-008", vendorEn: "Trade Show Booth — Riyadh", vendorAr: "جناح معرض — الرياض", category: "marketing", amount: 45000, currency: "SAR", status: "approved", dateEn: "Aug 5, 2025", dateAr: "٥ أغسطس ٢٠٢٥", descEn: "Annual furniture expo participation", descAr: "مشاركة في معرض الأثاث السنوي" },
];

// ─── localStorage persistence ─────────────────────────────

const INV_KEY = "thoth_invoices";
const PAY_KEY = "thoth_payments";
const EXP_KEY = "thoth_expenses";

function loadArray<T>(key: string, defaults: T[]): T[] {
  try { const s = localStorage.getItem(key); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; } } catch (_) {}
  return defaults;
}

function saveArray<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
}

export function loadInvoices(): Invoice[] { return loadArray(INV_KEY, DEFAULT_INVOICES); }
export function saveInvoices(d: Invoice[]): void { saveArray(INV_KEY, d); }
export function loadPayments(): Payment[] { return loadArray(PAY_KEY, DEFAULT_PAYMENTS); }
export function savePayments(d: Payment[]): void { saveArray(PAY_KEY, d); }
export function loadExpenses(): Expense[] { return loadArray(EXP_KEY, DEFAULT_EXPENSES); }
export function saveExpenses(d: Expense[]): void { saveArray(EXP_KEY, d); }
