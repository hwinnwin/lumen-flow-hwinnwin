import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Inbox from "./pages/Inbox";
import Workflow from "./pages/Workflow";
import SOPs from "./pages/SOPs";
import Principles from "./pages/Principles";
import Projects from "./pages/Projects";
import Codex from "./pages/Codex";
import Insights from "./pages/Insights";
import Library from "./pages/Library";
import Assistant from "./pages/Assistant";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Layout><Inbox /></Layout></ProtectedRoute>} />
            <Route path="/workflow" element={<ProtectedRoute><Layout><Workflow /></Layout></ProtectedRoute>} />
              <Route path="/sops" element={<ProtectedRoute><Layout><SOPs /></Layout></ProtectedRoute>} />
              <Route path="/principles" element={<ProtectedRoute><Layout><Principles /></Layout></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
              <Route path="/codex" element={<ProtectedRoute><Layout><Codex /></Layout></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Layout><Insights /></Layout></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><Layout><Library /></Layout></ProtectedRoute>} />
            <Route path="/assistant" element={<ProtectedRoute><Layout><Assistant /></Layout></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute><Layout><NotFound /></Layout></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
