import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PageSkeleton } from "../components/ui/Skeleton";
import { useOptionalAuth } from "../app/AuthGate";
import { AdminLayout } from "../components/admin/AdminLayout";

// ─── Lazy page imports ────────────────────────────────────────────────────────

const ProfessionalHomepage = lazy(() => import("../pages/home/ProfessionalHomepage"));
const RegisterFlow         = lazy(() => import("../pages/auth/RegisterFlow"));
const LoginFlow            = lazy(() => import("../pages/auth/LoginFlow"));
const AdminLoginFlow       = lazy(() => import("../pages/auth/AdminLoginFlow"));

// ─── Public market pages ──────────────────────────────────────────────────────
const ForexPage            = lazy(() => import("../pages/public/markets/ForexPage"));
const IndicesPage          = lazy(() => import("../pages/public/markets/IndicesPage"));
const CommoditiesPage      = lazy(() => import("../pages/public/markets/CommoditiesPage"));
const CryptoPage           = lazy(() => import("../pages/public/markets/CryptoPage"));
const EquitiesPage         = lazy(() => import("../pages/public/markets/EquitiesPage"));

// ─── Public legal pages ───────────────────────────────────────────────────────
const TermsPage            = lazy(() => import("../pages/public/legal/TermsPage"));
const PrivacyPage          = lazy(() => import("../pages/public/legal/PrivacyPage"));
const CookiePolicyPage     = lazy(() => import("../pages/public/legal/CookiePolicyPage"));
const RiskDisclosurePage   = lazy(() => import("../pages/public/legal/RiskDisclosurePage"));
const ClientAgreementPage  = lazy(() => import("../pages/public/legal/ClientAgreementPage"));

// ─── Public company pages ─────────────────────────────────────────────────────
const AboutPage            = lazy(() => import("../pages/public/company/AboutPage"));
const ContactPage          = lazy(() => import("../pages/public/company/ContactPage"));
const CareersPage          = lazy(() => import("../pages/public/company/CareersPage"));

// ─── Public platform pages ────────────────────────────────────────────────────
const OlosAiPublicPage     = lazy(() => import("../pages/public/platform/OlosAiPublicPage"));
const RiskPublicPage       = lazy(() => import("../pages/public/platform/RiskPublicPage"));
const WalletPublicPage     = lazy(() => import("../pages/public/platform/WalletPublicPage"));
const AcademyPublicPage    = lazy(() => import("../pages/public/platform/AcademyPublicPage"));
const AutopilotPublicPage  = lazy(() => import("../pages/public/platform/AutopilotPublicPage"));

// Client pages
const ClientDashboard      = lazy(() => import("../pages/dashboard/ClientDashboard"));
const ClientServicePage    = lazy(() => import("../pages/dashboard/ClientServicePage"));
const OverviewPage         = lazy(() => import("../pages/overview/OverviewPage"));
const PortfolioPage        = lazy(() => import("../pages/portfolio/PortfolioPage"));
const OrdersPage           = lazy(() => import("../pages/orders/OrdersPage"));
const TradingPage          = lazy(() => import("../pages/trading/TradingPage"));
const DOMDepthPage         = lazy(() => import("../pages/trading/DOMDepthPage"));
const TimeAndSalesPage     = lazy(() => import("../pages/trading/TimeAndSales"));
const TradeHistoryPage     = lazy(() => import("../pages/trading/TradeHistoryPage"));
const MultiChartWorkspace  = lazy(() => import("../pages/trading/MultiChartWorkspace"));
const WalletDashboard      = lazy(() => import("../pages/wallet/WalletDashboard"));
const PositionsPage        = lazy(() => import("../pages/trading/PositionsPage"));
const OlosAiPage           = lazy(() => import("../pages/ai/OlosAiPage"));
const RiskPage             = lazy(() => import("../pages/risk/RiskPage"));
const CompliancePage       = lazy(() => import("../pages/compliance/CompliancePage"));
const WalletPage           = lazy(() => import("../pages/wallet/WalletPage"));
const OnboardingPage       = lazy(() => import("../pages/onboarding/OnboardingPage"));
const AcademyPage          = lazy(() => import("../pages/academy/AcademyPage"));
const SupportPage          = lazy(() => import("../pages/support/SupportPage"));
const SettingsPage         = lazy(() => import("../pages/settings/SettingsPage"));
const PlatformServicesPage = lazy(() => import("../pages/platform/PlatformServicesPage"));
const SignalFeed            = lazy(() => import("../pages/signals/SignalFeed"));
const KYCPage              = lazy(() => import("../pages/auth/KYC"));
const AutopilotDashboard   = lazy(() => import("../pages/autopilot/AutopilotDashboard"));
const WatchlistCenter      = lazy(() => import("../pages/watchlist/WatchlistCenter"));
const TradingAnalyticsPage  = lazy(() => import("../pages/analytics/TradingAnalyticsPage"));
const ReportsPage           = lazy(() => import("../pages/reports/ReportsPage"));
const PortfolioComparison   = lazy(() => import("../pages/portfolio/PortfolioComparison"));
const EconomicCalendarPage  = lazy(() => import("../pages/calendar/EconomicCalendar"));
const PaperTradingPage      = lazy(() => import("../pages/dashboard/PaperTradingPage"));
const ApiKeysPage           = lazy(() => import("../pages/settings/ApiKeysPage"));
const TaxReportPage         = lazy(() => import("../pages/reports/TaxReportPage"));

// Admin pages
const AdminPage            = lazy(() => import("../pages/admin/AdminPage"));
const ClientDetailPage     = lazy(() => import("../pages/admin/ClientDetailPage"));
const AutopilotOversight   = lazy(() => import("../pages/admin/AutopilotOversight"));
const AdminDashboard       = lazy(() => import("../pages/admin/AdminDashboard"));
const AMLAlerts            = lazy(() => import("../pages/admin/AMLAlerts"));
const AffiliateCenter      = lazy(() => import("../pages/admin/AffiliateCenter"));
const AIBehaviorControl    = lazy(() => import("../pages/admin/AIBehaviorControl"));
const AIModelGovernance    = lazy(() => import("../pages/admin/AIModelGovernance"));
const BrokerHealthDashboard = lazy(() => import("../pages/admin/BrokerHealthDashboard"));
const ClientExposureMap    = lazy(() => import("../pages/admin/ClientExposureMap"));
const ComplianceDashboard  = lazy(() => import("../pages/admin/ComplianceDashboard"));
const EventRiskShield      = lazy(() => import("../pages/admin/EventRiskShield"));
const ExposureNetting      = lazy(() => import("../pages/admin/ExposureNetting"));
const FailoverPanel        = lazy(() => import("../pages/admin/FailoverPanel"));
const FeatureFlags         = lazy(() => import("../pages/admin/FeatureFlags"));
const HedgeEngineMonitor   = lazy(() => import("../pages/admin/HedgeEngineMonitor"));
const InfrastructureOverview = lazy(() => import("../pages/admin/InfrastructureOverview"));
const KYCReviewPanel       = lazy(() => import("../pages/admin/KYCReviewPanel"));
const LatencyMonitor       = lazy(() => import("../pages/admin/LatencyMonitor"));
const LiquidityLiveMonitor = lazy(() => import("../pages/admin/LiquidityLiveMonitor"));
const MarginRiskBoard      = lazy(() => import("../pages/admin/MarginRiskBoard"));
const MarketFreezeControl  = lazy(() => import("../pages/admin/MarketFreezeControl"));
const SupportQueue         = lazy(() => import("../pages/admin/SupportQueue"));
const RevenueDashboard     = lazy(() => import("../pages/admin/RevenueDashboard"));
const ServiceHealth        = lazy(() => import("../pages/admin/ServiceHealth"));
const SignalControlCenter  = lazy(() => import("../pages/admin/SignalControlCenter"));
const SpreadController     = lazy(() => import("../pages/admin/SpreadController"));
const SystemLogs           = lazy(() => import("../pages/admin/SystemLogs"));
const TierManagement       = lazy(() => import("../pages/admin/TierManagement"));
const UserBehaviorAnalytics = lazy(() => import("../pages/admin/UserBehaviorAnalytics"));

// OLOS AI sub-pages
const OLOSAssistant        = lazy(() => import("../pages/olos-ai/OLOSAssistant"));
const AICommandCenter      = lazy(() => import("../pages/olos-ai/AICommandCenter"));
const AIBacktestingLab     = lazy(() => import("../pages/olos-ai/AIBacktestingLab"));
const AIBehaviorEngine     = lazy(() => import("../pages/olos-ai/AIBehaviorEngine"));
const AIConfidenceEngine   = lazy(() => import("../pages/olos-ai/AIConfidenceEngine"));
const AIExecutionFlow      = lazy(() => import("../pages/olos-ai/AIExecutionFlow"));
const AIHedgeManager       = lazy(() => import("../pages/olos-ai/AIHedgeManager"));
const AILearningCenter     = lazy(() => import("../pages/olos-ai/AILearningCenter"));
const AIModelMonitor       = lazy(() => import("../pages/olos-ai/AIModelMonitor"));
const AIPortfolioBalancer  = lazy(() => import("../pages/olos-ai/AIPortfolioBalancer"));
const AIRegimeMap          = lazy(() => import("../pages/olos-ai/AIRegimeMap"));
const AIStrategyGenerator  = lazy(() => import("../pages/olos-ai/AIStrategyGenerator"));
const AITradeScanner       = lazy(() => import("../pages/olos-ai/AITradeScanner"));
const AITradeSimulation    = lazy(() => import("../pages/olos-ai/AITradeSimulation"));
const AITrainingCenter     = lazy(() => import("../pages/olos-ai/AITrainingCenter"));
const AIVolatilityRadar    = lazy(() => import("../pages/olos-ai/AIVolatilityRadar"));
const OLOSBrain            = lazy(() => import("../pages/olos-ai/OLOSBrain"));

// ─── Auth guards ──────────────────────────────────────────────────────────────

function ProtectedClient({ children }: { children: React.ReactNode }) {
  const auth = useOptionalAuth();
  if (!auth?.authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const auth = useOptionalAuth();
  if (!auth?.authenticated) return <Navigate to="/admin/login" replace />;
  const isAdmin =
    auth.user !== null &&
    ["admin", "super_admin"].includes(auth.user.role);
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>

        {/* ── Public ── */}
        <Route path="/"             element={<ProfessionalHomepage />} />
        <Route path="/register"     element={<RegisterFlow />} />
        <Route path="/login"        element={<LoginFlow />} />

        {/* ── Public market pages ── */}
        <Route path="/markets/forex"       element={<ForexPage />} />
        <Route path="/markets/indices"     element={<IndicesPage />} />
        <Route path="/markets/commodities" element={<CommoditiesPage />} />
        <Route path="/markets/crypto"      element={<CryptoPage />} />
        <Route path="/markets/equities"    element={<EquitiesPage />} />

        {/* ── Public legal pages ── */}
        <Route path="/legal/terms"            element={<TermsPage />} />
        <Route path="/legal/privacy"          element={<PrivacyPage />} />
        <Route path="/legal/cookies"          element={<CookiePolicyPage />} />
        <Route path="/legal/risk-disclosure"  element={<RiskDisclosurePage />} />
        <Route path="/legal/client-agreement" element={<ClientAgreementPage />} />

        {/* ── Public company pages ── */}
        <Route path="/about"   element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/careers" element={<CareersPage />} />

        {/* ── Public platform pages (no login required) ── */}
        <Route path="/platform/olos-ai"   element={<OlosAiPublicPage />} />
        <Route path="/platform/risk"      element={<RiskPublicPage />} />
        <Route path="/platform/wallet"    element={<WalletPublicPage />} />
        <Route path="/platform/academy"   element={<AcademyPublicPage />} />
        <Route path="/platform/autopilot" element={<AutopilotPublicPage />} />

        {/* ── Client — primary nav ── */}
        <Route path="/dashboard"    element={<ProtectedClient><ClientDashboard /></ProtectedClient>} />
        <Route path="/trading"                   element={<ProtectedClient><TradingPage /></ProtectedClient>} />
        <Route path="/trading/positions"         element={<ProtectedClient><PositionsPage /></ProtectedClient>} />
        <Route path="/trading/history"           element={<ProtectedClient><TradeHistoryPage /></ProtectedClient>} />
        <Route path="/trading/charts"            element={<ProtectedClient><MultiChartWorkspace /></ProtectedClient>} />
        <Route path="/trading/dom"               element={<ProtectedClient><DOMDepthPage /></ProtectedClient>} />
        <Route path="/trading/time-and-sales"    element={<ProtectedClient><TimeAndSalesPage /></ProtectedClient>} />
        <Route path="/portfolio"            element={<ProtectedClient><PortfolioPage /></ProtectedClient>} />
        <Route path="/portfolio/comparison" element={<ProtectedClient><PortfolioComparison /></ProtectedClient>} />
        <Route path="/orders"       element={<ProtectedClient><OrdersPage /></ProtectedClient>} />
        <Route path="/wallet"           element={<ProtectedClient><WalletPage /></ProtectedClient>} />
        <Route path="/wallet/dashboard" element={<ProtectedClient><WalletDashboard /></ProtectedClient>} />

        {/* ── Client — tools nav ── */}
        <Route path="/risk"         element={<ProtectedClient><RiskPage /></ProtectedClient>} />
        <Route path="/compliance"   element={<ProtectedClient><CompliancePage /></ProtectedClient>} />
        <Route path="/analytics"    element={<ProtectedClient><TradingAnalyticsPage /></ProtectedClient>} />
        <Route path="/reports"      element={<ProtectedClient><ReportsPage /></ProtectedClient>} />
        <Route path="/calendar"     element={<ProtectedClient><EconomicCalendarPage /></ProtectedClient>} />
        <Route path="/olos-ai"      element={<ProtectedClient><OlosAiPage /></ProtectedClient>} />

        {/* ── Client — account nav ── */}
        <Route path="/academy"      element={<ProtectedClient><AcademyPage /></ProtectedClient>} />
        <Route path="/settings"     element={<ProtectedClient><SettingsPage /></ProtectedClient>} />
        <Route path="/support"      element={<ProtectedClient><SupportPage /></ProtectedClient>} />

        {/* ── Client — OLOS AI tools ── */}
        <Route path="/signals"      element={<ProtectedClient><SignalFeed /></ProtectedClient>} />
        <Route path="/autopilot"    element={<ProtectedClient><AutopilotDashboard /></ProtectedClient>} />
        <Route path="/watchlist"    element={<ProtectedClient><WatchlistCenter /></ProtectedClient>} />

        {/* ── Client — compliance / KYC ── */}
        <Route path="/documents"    element={<ProtectedClient><KYCPage /></ProtectedClient>} />
        <Route path="/kyc"          element={<ProtectedClient><KYCPage /></ProtectedClient>} />

        {/* ── New World-Class Features ── */}
        <Route path="/paper-trading"  element={<ProtectedClient><PaperTradingPage /></ProtectedClient>} />
        <Route path="/settings/api-keys" element={<ProtectedClient><ApiKeysPage /></ProtectedClient>} />
        <Route path="/reports/tax"    element={<ProtectedClient><TaxReportPage /></ProtectedClient>} />

        {/* ── Client — platform services ── */}
        <Route path="/platform"     element={<ProtectedClient><PlatformServicesPage /></ProtectedClient>} />
        <Route path="/overview"     element={<ProtectedClient><OverviewPage /></ProtectedClient>} />

        {/* ── Client — service sub-pages ── */}
        <Route path="/dashboard/:service"   element={<ProtectedClient><ClientServicePage /></ProtectedClient>} />
        <Route path="/wallet/deposit"       element={<ProtectedClient><ClientServicePage /></ProtectedClient>} />
        <Route path="/wallet/withdraw"      element={<ProtectedClient><ClientServicePage /></ProtectedClient>} />
        <Route path="/wallet/transactions"  element={<ProtectedClient><ClientServicePage /></ProtectedClient>} />
        <Route path="/onboarding"           element={<ProtectedClient><OnboardingPage /></ProtectedClient>} />

        {/* ── Admin (nested layout with sidebar) ── */}
        <Route path="/admin/login" element={<AdminLoginFlow />} />
        <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
          <Route index                  element={<AdminPage />} />
          <Route path="dashboard"       element={<AdminDashboard />} />
          <Route path="client/:email"   element={<ClientDetailPage />} />
          <Route path="autopilot"       element={<AutopilotOversight />} />
          <Route path="aml"             element={<AMLAlerts />} />
          <Route path="affiliates"      element={<AffiliateCenter />} />
          <Route path="ai-behavior"     element={<AIBehaviorControl />} />
          <Route path="ai-governance"   element={<AIModelGovernance />} />
          <Route path="broker-health"   element={<BrokerHealthDashboard />} />
          <Route path="exposure-map"    element={<ClientExposureMap />} />
          <Route path="compliance"      element={<ComplianceDashboard />} />
          <Route path="event-risk"      element={<EventRiskShield />} />
          <Route path="netting"         element={<ExposureNetting />} />
          <Route path="failover"        element={<FailoverPanel />} />
          <Route path="feature-flags"   element={<FeatureFlags />} />
          <Route path="hedge-monitor"   element={<HedgeEngineMonitor />} />
          <Route path="infrastructure"  element={<InfrastructureOverview />} />
          <Route path="kyc"             element={<KYCReviewPanel />} />
          <Route path="latency"         element={<LatencyMonitor />} />
          <Route path="liquidity"       element={<LiquidityLiveMonitor />} />
          <Route path="margin-risk"     element={<MarginRiskBoard />} />
          <Route path="market-freeze"   element={<MarketFreezeControl />} />
          <Route path="revenue"         element={<RevenueDashboard />} />
          <Route path="service-health"  element={<ServiceHealth />} />
          <Route path="signals"         element={<SignalControlCenter />} />
          <Route path="support"         element={<SupportQueue />} />
          <Route path="spreads"         element={<SpreadController />} />
          <Route path="logs"            element={<SystemLogs />} />
          <Route path="tiers"           element={<TierManagement />} />
          <Route path="user-analytics"  element={<UserBehaviorAnalytics />} />
        </Route>

        {/* ── OLOS AI sub-pages ── */}
        <Route path="/olos-ai/assistant"          element={<ProtectedClient><OLOSAssistant /></ProtectedClient>} />
        <Route path="/olos-ai/command-center"     element={<ProtectedClient><AICommandCenter /></ProtectedClient>} />
        <Route path="/olos-ai/backtesting"        element={<ProtectedClient><AIBacktestingLab /></ProtectedClient>} />
        <Route path="/olos-ai/behavior"           element={<ProtectedClient><AIBehaviorEngine /></ProtectedClient>} />
        <Route path="/olos-ai/confidence"         element={<ProtectedClient><AIConfidenceEngine /></ProtectedClient>} />
        <Route path="/olos-ai/execution-flow"     element={<ProtectedClient><AIExecutionFlow /></ProtectedClient>} />
        <Route path="/olos-ai/hedge"              element={<ProtectedClient><AIHedgeManager /></ProtectedClient>} />
        <Route path="/olos-ai/learning"           element={<ProtectedClient><AILearningCenter /></ProtectedClient>} />
        <Route path="/olos-ai/model-monitor"      element={<ProtectedClient><AIModelMonitor /></ProtectedClient>} />
        <Route path="/olos-ai/portfolio-balancer" element={<ProtectedClient><AIPortfolioBalancer /></ProtectedClient>} />
        <Route path="/olos-ai/regime"             element={<ProtectedClient><AIRegimeMap /></ProtectedClient>} />
        <Route path="/olos-ai/strategy"           element={<ProtectedClient><AIStrategyGenerator /></ProtectedClient>} />
        <Route path="/olos-ai/scanner"            element={<ProtectedClient><AITradeScanner /></ProtectedClient>} />
        <Route path="/olos-ai/simulation"         element={<ProtectedClient><AITradeSimulation /></ProtectedClient>} />
        <Route path="/olos-ai/training"           element={<ProtectedClient><AITrainingCenter /></ProtectedClient>} />
        <Route path="/olos-ai/volatility"         element={<ProtectedClient><AIVolatilityRadar /></ProtectedClient>} />
        <Route path="/olos-ai/brain"              element={<ProtectedClient><OLOSBrain /></ProtectedClient>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
