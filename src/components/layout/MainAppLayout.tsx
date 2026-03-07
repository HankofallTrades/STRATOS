import { Routes, Route, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

import NavBar from "@/components/layout/NavBar";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/core/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/core/dropdown-menu";
import { SidebarInset, SidebarProvider } from "@/components/core/sidebar";
import AddSingleExerciseDialog from "@/domains/fitness/ui/AddSingleExerciseDialog";
import ProteinLogging from "@/domains/fitness/ui/ProteinLogging";
import SunExposureLogging from "@/domains/fitness/ui/SunExposureLogging";
import { useQuickActions } from "@/domains/fitness/hooks/useQuickActions";
import Home from "@/pages/Home";
import Workout from "@/pages/Workout";
import Analytics from "@/pages/Analytics";
import Coach from "@/pages/Coach";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const MainAppLayout = () => {
  const location = useLocation();
  const {
    userId,
    latestSingleLogData,
    isAddExerciseDialogOpen,
    isProteinModalOpen,
    isSunExposureModalOpen,
    setIsAddExerciseDialogOpen,
    setIsProteinModalOpen,
    setIsSunExposureModalOpen,
    handleAddWorkout,
    handleAddExercise,
    handleLogProtein,
    handleLogSunExposure,
  } = useQuickActions();

  const shouldShowGlobalFab =
    location.pathname !== "/coach" &&
    location.pathname !== "/" &&
    location.pathname !== "/workout";

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="hidden md:block">
        <NavBar />
      </div>
      <SidebarInset className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        {shouldShowGlobalFab && (
          <div className="fixed bottom-20 right-6 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-full h-14 w-14 bg-primary hover:bg-primary/90 shadow-lg text-primary-foreground"
                >
                  <Plus size={24} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56 bg-card border-border">
                <DropdownMenuItem onSelect={handleAddWorkout} className="focus:bg-accent focus:text-accent-foreground">
                  Start New Workout
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleAddExercise} className="focus:bg-accent focus:text-accent-foreground">
                  Log Single Exercise
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogProtein} className="focus:bg-accent focus:text-accent-foreground">
                  Log Protein
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogSunExposure} className="focus:bg-accent focus:text-accent-foreground">
                  Log Sun Exposure
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <ProteinLogging
          isOpen={isProteinModalOpen}
          onClose={() => setIsProteinModalOpen(false)}
          userId={userId}
        />

        <SunExposureLogging
          isOpen={isSunExposureModalOpen}
          onClose={() => setIsSunExposureModalOpen(false)}
          userId={userId}
        />

        <AddSingleExerciseDialog
          open={isAddExerciseDialogOpen}
          onOpenChange={setIsAddExerciseDialogOpen}
          defaultLogData={latestSingleLogData}
        />
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
};

export default MainAppLayout;
