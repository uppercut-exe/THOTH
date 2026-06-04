# THOTH ERP — Product Roadmap

## Phase 1: Production UX Cleanup (Current)

- Remove all hardcoded demo data from logged-in experience
- Replace fake KPIs, metrics, and statistics with real Supabase queries
- Implement professional empty states for all modules
- Welcome dashboard with guided onboarding for new workspaces
- Remove developer language (demo mode, mock mode, sample mode)
- Remove placeholder widgets and meaningless metrics
- Fix workspace creation RLS blocker
- Egyptian-business-friendly Arabic localization
- Ensure Supabase live mode is the only source for authenticated users
- Demo fallback retained only when Supabase env variables are missing

## Phase 2: CRM Foundation

- Organization profiles with full detail views
- Contact management with relationship mapping
- Customer health scoring based on real activity
- Organization-to-person linking
- Import/export contacts (CSV)
- Activity timeline per organization and person
- Notes and file attachments per record
- Tags and custom fields

## Phase 3: Finance Foundation

- Invoice lifecycle management (draft, sent, paid, overdue, cancelled)
- Expense tracking and categorization
- Payment recording and reconciliation
- Revenue and expense reporting
- Multi-currency support using workspace settings
- Tax configuration per country
- Basic financial dashboard with real metrics
- Export invoices as PDF

## Phase 4: HR Foundation

- Employee directory with profiles
- Department and team structure
- Leave and attendance tracking
- Document management (contracts, IDs)
- Onboarding checklists for new hires
- Employee self-service portal
- Performance notes and reviews

## Phase 5: Operations Foundation

- Work order management (create, assign, track)
- Project tracking with milestones
- Resource allocation and scheduling
- Inventory management basics
- Vendor management and purchase orders
- Operational dashboards with live data
- SLA tracking

## Phase 6: Executive Intelligence

- Real-time business health scoring (live from Supabase)
- Revenue forecasting based on pipeline data
- Risk detection from overdue invoices, stalled deals, blocked work
- Automated executive briefings
- Work queue prioritization engine
- Operating rhythms (daily, weekly, monthly, quarterly reviews)
- Cross-module trend analysis

## Phase 7: THOTH Signature AI Layer

- Natural language search across all modules
- AI-powered decision recommendations
- Anomaly detection in financial data
- Smart relationship suggestions
- Predictive analytics for sales pipeline
- Automated insights and summaries
- Voice-first interface (Arabic and English)
- Memory graph for business context awareness

---

Each phase builds on the previous one. No phase should introduce fake data or placeholder content — every feature should work with real Supabase data from day one.
