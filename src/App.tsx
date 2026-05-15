import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GlobalMemoHotkey } from "@/components/GlobalMemoHotkey";
import { DailyBriefingMount } from "@/components/DailyBriefingMount";
import { AuthProvider } from "@/contexts/AuthContext";

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
const Memos = lazy(() => import("./pages/Memos"));
const Whiteboard = lazy(() => import("./pages/Whiteboard"));
const Journal = lazy(() => import("./pages/Journal"));
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
            <GlobalMemoHotkey />
            <DailyBriefingMount />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/mockup" element={<Mockup />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/wiki" element={<Wiki />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/memos" element={<Memos />} />
              <Route path="/whiteboard" element={<Whiteboard />} />
              <Route path="/journal" element={<Journal />} />
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
