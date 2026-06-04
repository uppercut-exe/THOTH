// ─── Core types ───────────────────────────────────────────

export type OrgType         = "company" | "subsidiary" | "jv";
export type OrgStatus       = "active" | "inactive" | "forming";
export type OrgRelationship = "customer" | "prospect" | "supplier" | "partner";
export type OrgLifecycle    = "new" | "onboarding" | "active" | "at_risk" | "churned";

export interface Team {
  id: string;
  nameEn: string;
  nameAr: string;
  headcount: number;
  leadEn?: string;
  leadAr?: string;
}

export interface Department {
  id: string;
  nameEn: string;
  nameAr: string;
  headcount: number;
  leadEn?: string;
  leadAr?: string;
  teams: Team[];
}

export interface Branch {
  id: string;
  nameEn: string;
  nameAr: string;
  cityEn: string;
  cityAr: string;
  countryEn: string;
  countryAr: string;
  headcount: number;
  isHQ?: boolean;
  departments: Department[];
}

export interface Organization {
  id: string;
  nameEn: string;
  nameAr: string;
  type: OrgType;
  relationship: OrgRelationship;
  industryEn: string;
  industryAr: string;
  status: OrgStatus;
  lifecycle: OrgLifecycle;
  founded: string;
  headcount: number;
  healthScore: number;
  website?: string;
  email?: string;
  phone?: string;
  addressEn?: string;
  addressAr?: string;
  ownerEn: string;
  ownerAr: string;
  descEn: string;
  descAr: string;
  avatarColor: string;
  branches: Branch[];
}

// ─── Label maps ───────────────────────────────────────────

export const ORG_TYPE_META: Record<OrgType, { en: string; ar: string; pill: string }> = {
  company:    { en: "Company",    ar: "شركة",    pill: "bg-primary/8 text-primary border border-primary/20" },
  subsidiary: { en: "Subsidiary", ar: "شركة تابعة", pill: "bg-violet-50 text-violet-700 border border-violet-200" },
  jv:         { en: "Joint Venture", ar: "مشروع مشترك", pill: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
};

export const ORG_STATUS_META: Record<OrgStatus, { en: string; ar: string; dot: string }> = {
  active:   { en: "Active",   ar: "نشطة",      dot: "bg-emerald-500" },
  inactive: { en: "Inactive", ar: "غير نشطة",  dot: "bg-muted-foreground/35" },
  forming:  { en: "Forming",  ar: "قيد التأسيس", dot: "bg-amber-400" },
};

export const ORG_RELATIONSHIP_META: Record<OrgRelationship, { en: string; ar: string; pill: string }> = {
  customer: { en: "Customer", ar: "عميل",    pill: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  prospect: { en: "Prospect", ar: "محتمل",   pill: "bg-amber-50 text-amber-700 border border-amber-200" },
  supplier: { en: "Supplier", ar: "مورد",    pill: "bg-blue-50 text-blue-700 border border-blue-200" },
  partner:  { en: "Partner",  ar: "شريك",    pill: "bg-violet-50 text-violet-700 border border-violet-200" },
};

export const ORG_LIFECYCLE_META: Record<OrgLifecycle, { en: string; ar: string; dot: string }> = {
  new:        { en: "New",        ar: "جديد",       dot: "bg-primary" },
  onboarding: { en: "Onboarding", ar: "قيد الإعداد", dot: "bg-amber-500" },
  active:     { en: "Active",     ar: "نشط",        dot: "bg-emerald-500" },
  at_risk:    { en: "At Risk",    ar: "في خطر",     dot: "bg-rose-500" },
  churned:    { en: "Churned",    ar: "مفقود",      dot: "bg-muted-foreground/40" },
};

// ─── Derived helpers ──────────────────────────────────────

export function totalDepartments(org: Organization): number {
  return org.branches.reduce((s, b) => s + b.departments.length, 0);
}

export function totalTeams(org: Organization): number {
  return org.branches.reduce((s, b) => s + b.departments.reduce((s2, d) => s2 + d.teams.length, 0), 0);
}

// ─── Data ────────────────────────────────────────────────

export const ORGANIZATIONS: Organization[] = [

  // ── o01: THOTH (the user's own company) ──────────────
  {
    id: "o01",
    nameEn: "THOTH", nameAr: "ثوث",
    type: "company",
    relationship: "partner",
    industryEn: "Technology & Business Solutions", industryAr: "التقنية وحلول الأعمال",
    status: "active",
    lifecycle: "active",
    founded: "2021",
    headcount: 58,
    healthScore: 92,
    website: "thoth.io",
    email: "info@thoth.io",
    phone: "+971 4 555 0100",
    addressEn: "DIFC Gate Village, Building 5, Dubai, UAE",
    addressAr: "بوابة مركز دبي المالي العالمي، مبنى ٥، دبي، الإمارات",
    ownerEn: "Admin", ownerAr: "المدير",
    descEn: "THOTH is a premium business operating system built to help founders and executives run their companies with clarity. Serving clients across the GCC and beyond, THOTH combines intelligent tools with elegant design.",
    descAr: "ثوث هو نظام تشغيل أعمال متميز مصمم لمساعدة المؤسسين والمديرين التنفيذيين على إدارة شركاتهم بوضوح. يخدم العملاء عبر منطقة الخليج وما بعدها، ويجمع ثوث بين الأدوات الذكية والتصميم الأنيق.",
    avatarColor: "bg-primary/10 text-primary",
    branches: [
      {
        id: "b01", nameEn: "Dubai HQ", nameAr: "المقر الرئيسي دبي",
        cityEn: "Dubai", cityAr: "دبي",
        countryEn: "UAE", countryAr: "الإمارات",
        headcount: 45, isHQ: true,
        departments: [
          {
            id: "d01", nameEn: "Operations", nameAr: "العمليات",
            headcount: 12, leadEn: "Nour Al-Haddad", leadAr: "نور الحداد",
            teams: [
              { id: "t01", nameEn: "Logistics Team",   nameAr: "فريق اللوجستيات",  headcount: 6, leadEn: "Hassan Younis", leadAr: "حسن يونس" },
              { id: "t02", nameEn: "Quality Team",     nameAr: "فريق الجودة",      headcount: 6 },
            ],
          },
          {
            id: "d02", nameEn: "Finance", nameAr: "المالية",
            headcount: 8, leadEn: "Tariq Nassar", leadAr: "طارق نصار",
            teams: [
              { id: "t03", nameEn: "Accounting Team", nameAr: "فريق المحاسبة", headcount: 4 },
              { id: "t04", nameEn: "Treasury Team",   nameAr: "فريق الخزانة",  headcount: 4 },
            ],
          },
          {
            id: "d03", nameEn: "Sales & Business Dev.", nameAr: "المبيعات وتطوير الأعمال",
            headcount: 10, leadEn: "Rana Khalil", leadAr: "رنا خليل",
            teams: [
              { id: "t05", nameEn: "Enterprise Team", nameAr: "فريق المؤسسات", headcount: 6, leadEn: "Rana Khalil", leadAr: "رنا خليل" },
              { id: "t06", nameEn: "SMB Team",        nameAr: "فريق الشركات الصغيرة", headcount: 4 },
            ],
          },
          {
            id: "d04", nameEn: "Technology", nameAr: "التقنية",
            headcount: 15, leadEn: "Sami Al-Otaibi", leadAr: "سامي العتيبي",
            teams: [
              { id: "t07", nameEn: "Product Team",        nameAr: "فريق المنتج",      headcount: 8 },
              { id: "t08", nameEn: "Infrastructure Team", nameAr: "فريق البنية التحتية", headcount: 7, leadEn: "Sami Al-Otaibi", leadAr: "سامي العتيبي" },
            ],
          },
        ],
      },
      {
        id: "b02", nameEn: "Riyadh Office", nameAr: "مكتب الرياض",
        cityEn: "Riyadh", cityAr: "الرياض",
        countryEn: "Saudi Arabia", countryAr: "المملكة العربية السعودية",
        headcount: 13,
        departments: [
          {
            id: "d05", nameEn: "Sales MENA", nameAr: "مبيعات الشرق الأوسط وأفريقيا",
            headcount: 8,
            teams: [
              { id: "t09", nameEn: "KSA Enterprise Team", nameAr: "فريق المؤسسات السعودية", headcount: 5 },
              { id: "t10", nameEn: "Gulf Accounts Team",  nameAr: "فريق حسابات الخليج",     headcount: 3 },
            ],
          },
          {
            id: "d06", nameEn: "Client Services", nameAr: "خدمات العملاء",
            headcount: 5,
            teams: [
              { id: "t11", nameEn: "Implementation Team", nameAr: "فريق التنفيذ", headcount: 3 },
              { id: "t12", nameEn: "Support Team",        nameAr: "فريق الدعم",   headcount: 2 },
            ],
          },
        ],
      },
    ],
  },

  // ── o02: Meridian Trading ─────────────────────────────
  {
    id: "o02",
    nameEn: "Meridian Trading", nameAr: "ميريديان للتجارة",
    type: "company",
    relationship: "customer",
    industryEn: "Trading & Distribution", industryAr: "التجارة والتوزيع",
    status: "active",
    lifecycle: "active",
    founded: "2009",
    headcount: 120,
    healthScore: 87,
    website: "meridiantrading.ae",
    email: "procurement@meridiantrading.ae",
    phone: "+971 4 555 0200",
    addressEn: "Business Bay, Tower A, Floor 14, Dubai, UAE",
    addressAr: "الخليج التجاري، برج أ، الطابق ١٤، دبي، الإمارات",
    ownerEn: "Khalid Al-Mansouri", ownerAr: "خالد المنصوري",
    descEn: "Meridian Trading is a leading GCC distribution company specializing in office furniture, facilities equipment, and corporate interiors. Operating across the UAE and Saudi Arabia with a network of 40+ strategic suppliers.",
    descAr: "ميريديان للتجارة شركة توزيع رائدة في الخليج متخصصة في أثاث المكاتب ومعدات المرافق والتصميم الداخلي للشركات. تعمل عبر الإمارات والمملكة العربية السعودية بشبكة من أكثر من ٤٠ موردًا استراتيجيًا.",
    avatarColor: "bg-violet-100 text-violet-700",
    branches: [
      {
        id: "b03", nameEn: "Dubai HQ", nameAr: "المقر الرئيسي دبي",
        cityEn: "Dubai", cityAr: "دبي",
        countryEn: "UAE", countryAr: "الإمارات",
        headcount: 85, isHQ: true,
        departments: [
          {
            id: "d07", nameEn: "Procurement", nameAr: "المشتريات",
            headcount: 30, leadEn: "Omar Al-Rashidi", leadAr: "عمر الراشدي",
            teams: [
              { id: "t13", nameEn: "Supplier Relations Team",    nameAr: "فريق علاقات الموردين",   headcount: 15, leadEn: "Omar Al-Rashidi", leadAr: "عمر الراشدي" },
              { id: "t14", nameEn: "Category Management Team",   nameAr: "فريق إدارة الفئات",       headcount: 15 },
            ],
          },
          {
            id: "d08", nameEn: "Logistics", nameAr: "اللوجستيات",
            headcount: 25,
            teams: [
              { id: "t15", nameEn: "Import Team",  nameAr: "فريق الاستيراد", headcount: 12 },
              { id: "t16", nameEn: "Export Team",  nameAr: "فريق التصدير",   headcount: 13 },
            ],
          },
          {
            id: "d09", nameEn: "Finance", nameAr: "المالية",
            headcount: 20,
            teams: [
              { id: "t17", nameEn: "AP/AR Team",    nameAr: "فريق الحسابات",  headcount: 10 },
              { id: "t18", nameEn: "Treasury Team", nameAr: "فريق الخزانة",   headcount: 10 },
            ],
          },
          {
            id: "d10", nameEn: "Administration", nameAr: "الإدارة",
            headcount: 10,
            teams: [
              { id: "t19", nameEn: "HR Team", nameAr: "فريق الموارد البشرية", headcount: 5 },
              { id: "t20", nameEn: "IT Team", nameAr: "فريق تقنية المعلومات", headcount: 5 },
            ],
          },
        ],
      },
      {
        id: "b04", nameEn: "Abu Dhabi Office", nameAr: "مكتب أبوظبي",
        cityEn: "Abu Dhabi", cityAr: "أبوظبي",
        countryEn: "UAE", countryAr: "الإمارات",
        headcount: 35,
        departments: [
          {
            id: "d11", nameEn: "Sales", nameAr: "المبيعات",
            headcount: 25,
            teams: [
              { id: "t21", nameEn: "Government Sales Team",  nameAr: "فريق المبيعات الحكومية",   headcount: 15 },
              { id: "t22", nameEn: "Private Sector Team",    nameAr: "فريق القطاع الخاص",        headcount: 10 },
            ],
          },
          {
            id: "d12", nameEn: "Operations", nameAr: "العمليات",
            headcount: 10,
            teams: [
              { id: "t23", nameEn: "Warehouse Team", nameAr: "فريق المستودع", headcount: 7 },
              { id: "t24", nameEn: "Admin Team",     nameAr: "فريق الإدارة",  headcount: 3 },
            ],
          },
        ],
      },
    ],
  },

  // ── o03: Al-Noor Furniture ────────────────────────────
  {
    id: "o03",
    nameEn: "Al-Noor Furniture", nameAr: "النور للأثاث",
    type: "company",
    relationship: "supplier",
    industryEn: "Manufacturing", industryAr: "التصنيع",
    status: "active",
    lifecycle: "active",
    founded: "1998",
    headcount: 200,
    healthScore: 78,
    website: "alnoor-furn.sa",
    email: "sales@alnoor-furn.sa",
    phone: "+966 11 555 0300",
    addressEn: "Industrial City, Zone 3, Riyadh, Saudi Arabia",
    addressAr: "المدينة الصناعية، المنطقة ٣، الرياض، المملكة العربية السعودية",
    ownerEn: "Sara Mahmoud", ownerAr: "سارة محمود",
    descEn: "Al-Noor Furniture is one of the largest furniture manufacturers in the Kingdom of Saudi Arabia, producing high-quality commercial and residential furniture for regional and export markets.",
    descAr: "النور للأثاث من أكبر مصنّعي الأثاث في المملكة العربية السعودية، وتنتج أثاثاً تجارياً وسكنياً عالي الجودة للأسواق الإقليمية وأسواق التصدير.",
    avatarColor: "bg-amber-100 text-amber-700",
    branches: [
      {
        id: "b05", nameEn: "Riyadh Plant", nameAr: "مصنع الرياض",
        cityEn: "Riyadh", cityAr: "الرياض",
        countryEn: "Saudi Arabia", countryAr: "المملكة العربية السعودية",
        headcount: 200, isHQ: true,
        departments: [
          {
            id: "d13", nameEn: "Manufacturing", nameAr: "التصنيع",
            headcount: 120, leadEn: "Ahmed Khalil", leadAr: "أحمد خليل",
            teams: [
              { id: "t25", nameEn: "Production Team A",      nameAr: "فريق الإنتاج أ", headcount: 40 },
              { id: "t26", nameEn: "Production Team B",      nameAr: "فريق الإنتاج ب", headcount: 40 },
              { id: "t27", nameEn: "Quality Control Team",   nameAr: "فريق مراقبة الجودة", headcount: 40 },
            ],
          },
          {
            id: "d14", nameEn: "Sales & Distribution", nameAr: "المبيعات والتوزيع",
            headcount: 50,
            teams: [
              { id: "t28", nameEn: "Domestic Sales Team", nameAr: "فريق المبيعات المحلية", headcount: 30 },
              { id: "t29", nameEn: "Export Team",         nameAr: "فريق التصدير",          headcount: 20 },
            ],
          },
          {
            id: "d15", nameEn: "Administration", nameAr: "الإدارة",
            headcount: 30,
            teams: [
              { id: "t30", nameEn: "HR Team",      nameAr: "فريق الموارد البشرية", headcount: 15 },
              { id: "t31", nameEn: "Finance Team", nameAr: "فريق المالية",         headcount: 15 },
            ],
          },
        ],
      },
    ],
  },

  // ── o04: Blue Ocean Logistics ─────────────────────────
  {
    id: "o04",
    nameEn: "Blue Ocean Logistics", nameAr: "المحيط الأزرق للوجستيات",
    type: "company",
    relationship: "partner",
    industryEn: "Logistics & Transportation", industryAr: "اللوجستيات والنقل",
    status: "active",
    lifecycle: "active",
    founded: "2014",
    headcount: 160,
    healthScore: 82,
    website: "blueocean.ae",
    email: "ops@blueocean.ae",
    phone: "+971 4 555 0400",
    addressEn: "Jebel Ali Free Zone, Warehouse 12, Dubai, UAE",
    addressAr: "منطقة جبل علي الحرة، مستودع ١٢، دبي، الإمارات",
    ownerEn: "Fahad Al-Otaibi", ownerAr: "فهد العتيبي",
    descEn: "Blue Ocean Logistics operates one of the UAE's largest last-mile delivery fleets, providing warehousing, distribution, and express delivery services across all seven emirates and the Northern Gulf.",
    descAr: "تدير المحيط الأزرق للوجستيات أحد أكبر أساطيل التوصيل في الإمارات، وتقدم خدمات التخزين والتوزيع والتوصيل السريع عبر جميع الإمارات السبع وشمال الخليج.",
    avatarColor: "bg-cyan-100 text-cyan-700",
    branches: [
      {
        id: "b06", nameEn: "Dubai HQ", nameAr: "المقر الرئيسي دبي",
        cityEn: "Dubai", cityAr: "دبي",
        countryEn: "UAE", countryAr: "الإمارات",
        headcount: 80, isHQ: true,
        departments: [
          {
            id: "d16", nameEn: "Fleet Management", nameAr: "إدارة الأسطول",
            headcount: 45, leadEn: "Layla Hassan", leadAr: "ليلى حسن",
            teams: [
              { id: "t32", nameEn: "Dispatch Team",           nameAr: "فريق الإرسال",           headcount: 20, leadEn: "Layla Hassan", leadAr: "ليلى حسن" },
              { id: "t33", nameEn: "Maintenance Team",        nameAr: "فريق الصيانة",            headcount: 15 },
              { id: "t34", nameEn: "Driver Supervision Team", nameAr: "فريق إشراف السائقين",     headcount: 10 },
            ],
          },
          {
            id: "d17", nameEn: "Operations", nameAr: "العمليات",
            headcount: 25,
            teams: [
              { id: "t35", nameEn: "Warehouse Team",  nameAr: "فريق المستودع",   headcount: 15 },
              { id: "t36", nameEn: "Last Mile Team",  nameAr: "فريق آخر ميل",    headcount: 10 },
            ],
          },
          {
            id: "d18", nameEn: "Support", nameAr: "الدعم",
            headcount: 10,
            teams: [
              { id: "t37", nameEn: "Customer Service Team", nameAr: "فريق خدمة العملاء",    headcount: 6 },
              { id: "t38", nameEn: "IT & Systems Team",     nameAr: "فريق تقنية المعلومات",  headcount: 4 },
            ],
          },
        ],
      },
      {
        id: "b07", nameEn: "Sharjah Depot", nameAr: "مستودع الشارقة",
        cityEn: "Sharjah", cityAr: "الشارقة",
        countryEn: "UAE", countryAr: "الإمارات",
        headcount: 55,
        departments: [
          {
            id: "d19", nameEn: "Depot Operations", nameAr: "عمليات المستودع",
            headcount: 40,
            teams: [
              { id: "t39", nameEn: "Receiving Team", nameAr: "فريق الاستلام", headcount: 20 },
              { id: "t40", nameEn: "Sorting Team",   nameAr: "فريق الفرز",    headcount: 20 },
            ],
          },
          {
            id: "d20", nameEn: "Fleet", nameAr: "الأسطول",
            headcount: 15,
            teams: [
              { id: "t41", nameEn: "Sharjah Fleet Team", nameAr: "فريق أسطول الشارقة", headcount: 15 },
            ],
          },
        ],
      },
      {
        id: "b08", nameEn: "Abu Dhabi Office", nameAr: "مكتب أبوظبي",
        cityEn: "Abu Dhabi", cityAr: "أبوظبي",
        countryEn: "UAE", countryAr: "الإمارات",
        headcount: 25,
        departments: [
          {
            id: "d21", nameEn: "Operations", nameAr: "العمليات",
            headcount: 20,
            teams: [
              { id: "t42", nameEn: "Delivery Team", nameAr: "فريق التوصيل", headcount: 12 },
              { id: "t43", nameEn: "Customs Team",  nameAr: "فريق الجمارك", headcount: 8 },
            ],
          },
          {
            id: "d22", nameEn: "Sales", nameAr: "المبيعات",
            headcount: 5,
            teams: [
              { id: "t44", nameEn: "Abu Dhabi Sales Team", nameAr: "فريق مبيعات أبوظبي", headcount: 5 },
            ],
          },
        ],
      },
    ],
  },

  // ── o05: Gulf Finance Partners ────────────────────────
  {
    id: "o05",
    nameEn: "Gulf Finance Partners", nameAr: "شركاء الخليج المالية",
    type: "company",
    relationship: "prospect",
    industryEn: "Financial Services", industryAr: "الخدمات المالية",
    status: "forming",
    lifecycle: "new",
    founded: "2024",
    headcount: 35,
    healthScore: 45,
    website: "gulffinance.bh",
    email: "contact@gulffinance.bh",
    phone: "+973 17 555 050",
    addressEn: "Bahrain Financial Harbour, Tower 2, Manama, Bahrain",
    addressAr: "ميناء البحرين المالي، برج ٢، المنامة، البحرين",
    ownerEn: "Nora Al-Farsi", ownerAr: "نورة الفارسي",
    descEn: "Gulf Finance Partners is a Bahrain-based investment and advisory firm focused on private equity and corporate finance across the GCC. Currently in a growth phase with active recruitment.",
    descAr: "شركاء الخليج المالية شركة استثمار وإستشارات مقرها البحرين متخصصة في الأسهم الخاصة والتمويل المؤسسي عبر الخليج. حالياً في مرحلة نمو مع توظيف نشط.",
    avatarColor: "bg-lime-100 text-lime-700",
    branches: [
      {
        id: "b09", nameEn: "Manama HQ", nameAr: "المقر الرئيسي المنامة",
        cityEn: "Manama", cityAr: "المنامة",
        countryEn: "Bahrain", countryAr: "البحرين",
        headcount: 35, isHQ: true,
        departments: [
          {
            id: "d23", nameEn: "Investment", nameAr: "الاستثمار",
            headcount: 20, leadEn: "Faris Al-Jabri", leadAr: "فارس الجابري",
            teams: [
              { id: "t45", nameEn: "Private Equity Team",     nameAr: "فريق الأسهم الخاصة",    headcount: 10, leadEn: "Faris Al-Jabri", leadAr: "فارس الجابري" },
              { id: "t46", nameEn: "Portfolio Management Team",nameAr: "فريق إدارة المحافظ",    headcount: 10 },
            ],
          },
          {
            id: "d24", nameEn: "Advisory", nameAr: "الاستشارات",
            headcount: 15,
            teams: [
              { id: "t47", nameEn: "Corporate Finance Team",  nameAr: "فريق التمويل المؤسسي",   headcount: 8 },
              { id: "t48", nameEn: "Risk & Compliance Team",  nameAr: "فريق المخاطر والامتثال", headcount: 7 },
            ],
          },
        ],
      },
    ],
  },
];
