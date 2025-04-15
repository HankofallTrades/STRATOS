import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WorkoutProvider } from "@/state/workout/WorkoutContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import BottomNav from "@/components/layout/BottomNav";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <WorkoutProvider>
          <Router>
            <div className="pb-20">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <BottomNav />
          </Router>
        </WorkoutProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
