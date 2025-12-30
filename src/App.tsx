
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AppLayout from "./components/layout/AppLayout";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Programs from "./pages/Programs";
import ProgramCatalog from "./pages/ProgramCatalog";
import ActiveProgram from "./pages/ActiveProgram";
import Workout from "./pages/Workout";
import Stats from "./pages/Stats";
import History from "./pages/History";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProgramEditor from "./pages/ProgramEditor";
import ProgramEditorEdit from "./pages/ProgramEditorEdit";
import ProgramCustomize from "./pages/ProgramCustomize";
import ProgramUserEdit from "./pages/ProgramUserEdit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner richColors closeButton position="top-center" />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes with AppLayout */}
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/programs"
              element={
                <AppLayout>
                  <Programs />
                </AppLayout>
              }
            />
            <Route
              path="/program-catalog"
              element={
                <AppLayout>
                  <ProgramCatalog />
                </AppLayout>
              }
            />
            <Route
              path="/active-program"
              element={
                <AppLayout>
                  <ActiveProgram />
                </AppLayout>
              }
            />
            <Route
              path="/workout/:treinoId"
              element={
                <AppLayout>
                  <Workout />
                </AppLayout>
              }
            />
            <Route
              path="/programs/new"
              element={
                <AppLayout>
                  <ProgramEditor />
                </AppLayout>
              }
            />
            <Route
              path="/programs/edit/:programId"
              element={
                <AppLayout>
                  <ProgramEditorEdit />
                </AppLayout>
              }
            />
            <Route
              path="/programs/customize/:programId"
              element={
                <AppLayout>
                  <ProgramCustomize />
                </AppLayout>
              }
            />
            <Route
              path="/programs/user/edit/:programaUsuarioId"
              element={
                <AppLayout>
                  <ProgramUserEdit />
                </AppLayout>
              }
            />
            <Route
              path="/stats"
              element={
                <AppLayout>
                  <Stats />
                </AppLayout>
              }
            />
            <Route
              path="/history"
              element={
                <AppLayout>
                  <History />
                </AppLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <Profile />
                </AppLayout>
              }
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
