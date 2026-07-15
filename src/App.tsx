import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DailyBriefingMount } from "@/components/DailyBriefingMount";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppWorkspaceShell } from "@/components/AppWorkspaceShell";
import { PLANNER_RAIL_ITEMS } from "@/components/planner/plannerRailItems";

const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Mockup = lazy(() => import("./pages/Mockup"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Wiki = lazy(() => import("./pages/Wiki"));
const Planner = lazy(() => import("./pages/Planner"));
const Journal = lazy(() => import("./pages/Journal"));
const Notes = lazy(() => import("./pages/Notes"));
const Career = lazy(() => import("./pages/Career"));
const People = lazy(() => import("./pages/People"));
const Archive = lazy(() => import("./pages/Archive"));
const Health = lazy(() => import("./pages/Health"));
const Today = lazy(() => import("./pages/Today"));
const Cloud = lazy(() => import("./pages/Cloud"));
const CloudDocEditor = lazy(() => import("./pages/CloudDocEditor"));
const CloudSheetEditor = lazy(() => import("./pages/CloudSheetEditor"));
const CloudSlideEditor = lazy(() => import("./pages/CloudSlideEditor"));

function RouteFallback() {
  return <div className="min-h-screen bg-background" aria-hidden="true" />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <BrowserRouter>
            <DailyBriefingMount />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/mockup" element={<Mockup />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/wiki" element={<AppWorkspaceShell current="wiki"><Wiki /></AppWorkspaceShell>} />
              <Route path="/planner" element={<AppWorkspaceShell current="planner" railExtra={PLANNER_RAIL_ITEMS}><Planner /></AppWorkspaceShell>} />
              <Route path="/journal" element={<AppWorkspaceShell current="journal"><Journal /></AppWorkspaceShell>} />
              <Route path="/notes" element={<AppWorkspaceShell current="notes"><Notes /></AppWorkspaceShell>} />
              <Route path="/career" element={<AppWorkspaceShell current="career"><Career /></AppWorkspaceShell>} />
              {/* 트래블 로그는 데일리로그 방의 섹션 — 옛 주소는 리다이렉트 */}
              <Route path="/travel" element={<Navigate to="/journal?view=travel" replace />} />
              <Route path="/people" element={<AppWorkspaceShell current="people"><People /></AppWorkspaceShell>} />
              <Route path="/archive" element={<AppWorkspaceShell current="archive"><Archive /></AppWorkspaceShell>} />
              <Route path="/health" element={<AppWorkspaceShell current="health"><Health /></AppWorkspaceShell>} />
              <Route path="/today" element={<AppWorkspaceShell current="today"><Today /></AppWorkspaceShell>} />
              <Route path="/cloud" element={<Cloud />} />
              <Route path="/cloud/doc/:id" element={<CloudDocEditor />} />
              <Route path="/cloud/sheet/:id" element={<CloudSheetEditor />} />
              <Route path="/cloud/slide/:id" element={<CloudSlideEditor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
