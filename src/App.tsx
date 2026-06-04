import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { OnboardingProvider, useOnboarding } from "./context/OnboardingContext";
import { CommandBarProvider } from "./context/CommandBarContext";
import { CommandBar, useCommandBarShortcut } from "./components/CommandBar";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import Onboarding from "./pages/Onboarding";
import AuthPage from "./pages/AuthPage";
import WorkspaceSetup from "./pages/WorkspaceSetup";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Today from "./pages/Today";
import People from "./pages/People";
import PersonProfile from "./pages/PersonProfile360";
import Organizations from "./pages/Organizations";
import OrganizationProfile from "./pages/OrganizationProfile360";
import ActivityFeed from "./pages/Activity";
import Work from "./pages/Work";
import WorkDetail from "./pages/WorkDetail";
import Sales from "./pages/Sales";
import SalesDetail from "./pages/SalesDetail";
import Finance from "./pages/Finance";
import FinanceDetail from "./pages/FinanceDetail";
import Resources from "./pages/Resources";
import ResourceDetail from "./pages/ResourceDetail";
import Intelligence from "./pages/Intelligence";
import Memory from "./pages/Memory";
import DecisionCenter from "./pages/DecisionCenter";
import WorkQueue from "./pages/WorkQueue";
import ForecastEngine from "./pages/ForecastEngine";
import RiskRadar from "./pages/RiskRadar";
import OperatingRhythms from "./pages/OperatingRhythms";
import ExecutiveMode from "./pages/ExecutiveMode";
import Roadmap from "./pages/Roadmap";
import DataManagement from "./pages/DataManagement";
import OperationsPage from "./pages/Operations";
import TeamPage from "./pages/Team";
import PurchasingPage from "./pages/Purchasing";
import InventoryPage from "./pages/Inventory";
import { MemoryProvider } from "./context/MemoryContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { isDemoMode } from "./lib/supabase";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// ─── Placeholder for unbuilt modules ─────────────────────

function ModulePlaceholder({ labelEn, labelAr, descEn, descAr }: { labelEn: string; labelAr: string; descEn?: string; descAr?: string }) {
  const { lang } = useLanguage();
  return (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-3 max-w-[320px]">
        <div className="w-10 h-10 rounded-xl bg-muted mx-auto flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded bg-border" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
            {lang === "ar" ? labelAr : labelEn}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {lang === "ar" ? (descAr || "قريباً إن شاء الله") : (descEn || "Coming soon")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Loading screen ───────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <p className="text-[20px] font-bold tracking-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>
          THOTH
        </p>
        <Loader2 size={16} className="animate-spin text-muted-foreground/50" />
      </div>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────

function ShellInner({ children }: { children: React.ReactNode }) {
  useCommandBarShortcut();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background font-sans">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen((prev) => !prev)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <CommandBar />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MemoryProvider>
      <CommandBarProvider>
        <ShellInner>{children}</ShellInner>
      </CommandBarProvider>
    </MemoryProvider>
  );
}

// ─── App routes (shared between demo and production) ──────

function AppRoutes() {
  return (
    <Shell>
      <Switch>
        {/* ── Executive OS ── */}
        <Route path="/" component={ExecutiveDashboard} />
        <Route path="/queue" component={WorkQueue} />
        <Route path="/forecast" component={ForecastEngine} />
        <Route path="/risk" component={RiskRadar} />
        <Route path="/rhythms" component={OperatingRhythms} />
        <Route path="/exec" component={ExecutiveMode} />

        {/* ── Core modules ── */}
        <Route path="/today" component={Today} />
        <Route path="/people/:id" component={PersonProfile} />
        <Route path="/people" component={People} />
        <Route path="/organizations/:id" component={OrganizationProfile} />
        <Route path="/organizations" component={Organizations} />
        <Route path="/activity" component={ActivityFeed} />
        <Route path="/work/:id" component={WorkDetail} />
        <Route path="/work" component={Work} />
        <Route path="/sales/:id" component={SalesDetail} />
        <Route path="/sales" component={Sales} />
        <Route path="/operations" component={OperationsPage} />
        <Route path="/purchasing" component={PurchasingPage} />
        <Route path="/inventory" component={InventoryPage} />
        <Route path="/resources/:id" component={ResourceDetail} />
        <Route path="/resources" component={Resources} />
        <Route path="/finance/:id" component={FinanceDetail} />
        <Route path="/finance" component={Finance} />
        <Route path="/knowledge">
          <ModulePlaceholder labelEn="Knowledge Base" labelAr="قاعدة المعرفة" descEn="Documents, policies, and company knowledge" descAr="الملفات والسياسات ومعلومات الشركة" />
        </Route>

        {/* ── Intelligence layer ── */}
        <Route path="/intelligence" component={Intelligence} />
        <Route path="/memory" component={Memory} />
        <Route path="/decisions" component={DecisionCenter} />

        <Route path="/team" component={TeamPage} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/data" component={DataManagement} />
        <Route path="/settings">
          <ModulePlaceholder labelEn="Settings" labelAr="الإعدادات" descEn="Workspace and account preferences" descAr="إعدادات مساحة العمل والحساب" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

// ─── Router ───────────────────────────────────────────────

function Router() {
  const { onboardingData } = useOnboarding();
  const { isAuthenticated, loading, workspace, workspaceLoading } = useAuth();

  // ── Demo mode: existing local onboarding flow (unchanged) ─
  if (isDemoMode) {
    if (!onboardingData?.completed) return <Onboarding />;
    return <AppRoutes />;
  }

  // ── Production mode: require Supabase authentication ──────
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <AuthPage />;
  if (workspaceLoading) return <LoadingScreen />;
  if (!workspace) return <WorkspaceSetup />;

  return <AppRoutes />;
}

// ─── Root ─────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <OnboardingProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </OnboardingProvider>
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
