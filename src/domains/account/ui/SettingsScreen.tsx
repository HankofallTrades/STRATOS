import { Button } from "@/components/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/core/Dialog";
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import { RadioGroup, RadioGroupItem } from "@/components/core/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/core/select";
import { useSettingsScreen } from "@/domains/account/hooks/useSettingsScreen";
import {
  formatSessionFocusLabel,
  sessionFocusOptions,
} from "@/domains/fitness/data/workoutScreen";
import {
  OPENROUTER_MODEL_OPTIONS,
  type LlmProviderPreference,
} from "@/domains/guidance/data/llmPreferences";
import type { MesocycleProtocol } from "@/domains/periodization";

const providerDescriptions: Record<LlmProviderPreference, string> = {
  local: "Local (LM Studio/Ollama)",
  openrouter: "OpenRouter",
};

const SettingsScreen = () => {
  const {
    activeProgram,
    availableThemes,
    bodyweight,
    handleLlmModelChange,
    handleOpenPeriodDialog,
    handleLlmProviderChange,
    handleSavePeriod,
    handleSignOut,
    handleThemeChange,
    handleUnitChange,
    handleUpdateBodyweight,
    isLoadingActiveProgram,
    isPeriodDialogOpen,
    isPeriodUpdating,
    isPeriodWorkoutInProgress,
    isProfileBusy,
    isSigningOut,
    llmModelPref,
    llmProviderPref,
    periodDurationWeeks,
    periodGoalFocus,
    periodProtocol,
    selectedThemeId,
    setBodyweight,
    setIsPeriodDialogOpen,
    setPeriodDurationWeeks,
    setPeriodGoalFocus,
    setPeriodProtocol,
    triggerOnboarding,
    unitPref,
    userEmail,
  } = useSettingsScreen();

  return (
    <div className="app-page max-w-3xl">
      <header className="mb-8 space-y-2">
        <div className="app-kicker">Settings</div>
        <h1 className="app-page-title">Tune the environment.</h1>
        {userEmail && <p className="app-page-subtitle">Logged in as {userEmail}</p>}
      </header>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">App Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-select">Theme</Label>
              <Select value={selectedThemeId} onValueChange={handleThemeChange}>
                <SelectTrigger id="theme-select" className="app-form-select">
                  <SelectValue placeholder="Select Theme" />
                </SelectTrigger>
                <SelectContent className="stone-surface border-white/8 text-foreground">
                  {availableThemes.map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{theme.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {theme.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose your preferred app theme. Changes apply immediately.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateBodyweight} className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred Unit</Label>
                <RadioGroup
                  value={unitPref}
                  onValueChange={value => handleUnitChange(value as "kg" | "lb")}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="kg" id="weight-unit-kg" />
                    <Label htmlFor="weight-unit-kg">kg</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lb" id="weight-unit-lb" />
                    <Label htmlFor="weight-unit-lb">lb</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyweight">Weight ({unitPref})</Label>
                <Input
                  id="bodyweight"
                  type="number"
                  value={bodyweight}
                  onChange={event => setBodyweight(event.target.value)}
                  placeholder={`Enter your weight in ${unitPref}`}
                  disabled={isProfileBusy}
                  step="0.1"
                  className="app-form-input"
                />
                <p className="text-xs text-muted-foreground">
                  Used for calculating strength benchmarks.
                </p>
              </div>
              <Button
                type="submit"
                disabled={isProfileBusy}
                className="app-primary-action rounded-[16px]"
              >
                {isProfileBusy ? "Saving..." : "Save Weight"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Training Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingActiveProgram ? (
              <p className="text-sm text-muted-foreground">
                Loading your active period...
              </p>
            ) : activeProgram ? (
              <div className="space-y-2">
                <p className="font-medium text-foreground">
                  {activeProgram.mesocycle.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Week {activeProgram.current_week} of{" "}
                  {activeProgram.mesocycle.duration_weeks}
                </p>
                <p className="text-xs text-muted-foreground">
                  {`${formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)} focus · ${
                    activeProgram.mesocycle.protocol === "occams" ? "Occam's" : "Custom"
                  }`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active period. Start one here if you want block-based progression.
              </p>
            )}

            <Button
              onClick={handleOpenPeriodDialog}
              disabled={isLoadingActiveProgram || isPeriodWorkoutInProgress}
              className="app-primary-action rounded-[16px]"
            >
              {activeProgram ? "Reset / Change Period" : "Start Period"}
            </Button>

            {isPeriodWorkoutInProgress ? (
              <p className="text-xs text-muted-foreground">
                Finish or discard the active block workout before resetting your period.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Developer Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="llm-provider">LLM Provider</Label>
              <Select value={llmProviderPref} onValueChange={handleLlmProviderChange}>
                <SelectTrigger id="llm-provider" className="app-form-select">
                  <SelectValue placeholder="Select LLM Provider" />
                </SelectTrigger>
                <SelectContent className="stone-surface border-white/8 text-foreground">
                  {Object.entries(providerDescriptions).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {llmProviderPref === "openrouter" && (
                <div className="space-y-2 pt-4">
                  <Label htmlFor="llm-model">Model (OpenRouter)</Label>
                  <Select value={llmModelPref} onValueChange={handleLlmModelChange}>
                    <SelectTrigger id="llm-model" className="app-form-select">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent className="stone-surface border-white/8 text-foreground">
                      {OPENROUTER_MODEL_OPTIONS.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <p className="pt-2 text-xs text-muted-foreground">
                Select the LLM provider and model for the AI Coach feature.
                Changes take effect immediately. Ensure necessary API keys and URLs
                are still configured in{" "}
                <code className="font-mono text-xs">.env.local</code>.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={triggerOnboarding}
                className="app-tonal-control rounded-[16px] px-4"
              >
                Re-Trigger Onboarding Flow
              </Button>
              <p className="pt-1 text-xs text-muted-foreground">
                Test the onboarding dialog even if already completed.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="destructive"
              className="rounded-[16px]"
            >
              {isSigningOut ? "Logging out..." : "Log Out"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPeriodDialogOpen} onOpenChange={setIsPeriodDialogOpen}>
        <DialogContent className="stone-panel rounded-[24px] border-white/10">
          <DialogHeader>
            <DialogTitle>
              {activeProgram ? "Reset Training Period" : "Start Training Period"}
            </DialogTitle>
            <DialogDescription>
              {activeProgram
                ? "Start a fresh block from week 1 today. Your current active block will be marked as cancelled."
                : "Create a new active training period."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-period-focus">Focus</Label>
              <Select
                value={periodGoalFocus}
                onValueChange={value => setPeriodGoalFocus(value as typeof periodGoalFocus)}
              >
                <SelectTrigger id="settings-period-focus" className="app-form-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="stone-surface border-white/8 text-foreground">
                  {sessionFocusOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {formatSessionFocusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-period-protocol">Protocol</Label>
              <Select
                value={periodProtocol}
                onValueChange={value => setPeriodProtocol(value as MesocycleProtocol)}
              >
                <SelectTrigger id="settings-period-protocol" className="app-form-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="stone-surface border-white/8 text-foreground">
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="occams">Occam&apos;s</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-period-duration">Duration (weeks)</Label>
              <Input
                id="settings-period-duration"
                type="number"
                min={4}
                max={12}
                value={periodDurationWeeks}
                onChange={event => setPeriodDurationWeeks(Number(event.target.value))}
                className="app-form-input"
              />
              <p className="text-xs text-muted-foreground">
                Choose a value between 4 and 12 weeks.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsPeriodDialogOpen(false)}
              className="stone-chip rounded-[16px] px-4 hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePeriod}
              disabled={isPeriodUpdating}
              className="app-primary-action rounded-[16px]"
            >
              {isPeriodUpdating
                ? activeProgram
                  ? "Resetting..."
                  : "Creating..."
                : activeProgram
                  ? "Reset Period"
                  : "Create Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsScreen;
