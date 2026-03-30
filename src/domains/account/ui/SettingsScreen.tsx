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
  getLlmModelOptions,
  getLlmProviderOption,
  llmProviderOptions,
  providerRequiresApiKey,
} from "@/domains/guidance/data/llmPreferences";
import type { MesocycleProtocol } from "@/domains/periodization";

const SettingsScreen = () => {
  const {
    activeProgram,
    bodyweight,
    hasStoredProviderCredential,
    handleClearProviderApiKey,
    handleLlmModelChange,
    handleOpenPeriodDialog,
    handleProviderApiKeyChange,
    handleSaveProviderApiKey,
    handleLlmProviderChange,
    handleSavePeriod,
    handleSignOut,
    handleUnitChange,
    handleUpdateBodyweight,
    isLoadingActiveProgram,
    isPeriodDialogOpen,
    isPeriodUpdating,
    isPeriodWorkoutInProgress,
    isProviderCredentialBusy,
    isProviderCredentialLoading,
    isProviderCredentialSaving,
    isProfileBusy,
    isSigningOut,
    llmModelPref,
    llmProviderPref,
    providerApiKeyDraft,
    providerCredentialLastFour,
    periodDurationWeeks,
    periodGoalFocus,
    periodProtocol,
    setBodyweight,
    setIsPeriodDialogOpen,
    setPeriodDurationWeeks,
    setPeriodGoalFocus,
    setPeriodProtocol,
    triggerOnboarding,
    unitPref,
    userEmail,
  } = useSettingsScreen();

  const selectedProvider = getLlmProviderOption(llmProviderPref);
  const providerModelOptions = getLlmModelOptions(llmProviderPref);
  const shouldShowApiKeyInput = providerRequiresApiKey(llmProviderPref);

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
            <CardTitle className="text-xl">Coach Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="llm-provider">LLM Provider</Label>
              <Select value={llmProviderPref} onValueChange={handleLlmProviderChange}>
                <SelectTrigger id="llm-provider" className="app-form-select">
                  <SelectValue placeholder="Select LLM Provider" />
                </SelectTrigger>
                <SelectContent className="stone-surface border-white/8 text-foreground">
                  {llmProviderOptions.map(provider => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedProvider.description}
              </p>

              {shouldShowApiKeyInput ? (
                <div className="space-y-2 pt-4">
                  <Label htmlFor="provider-api-key">
                    {selectedProvider.apiKeyLabel}
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="provider-api-key"
                      type="password"
                      value={providerApiKeyDraft}
                      onChange={event => handleProviderApiKeyChange(event.target.value)}
                      placeholder={selectedProvider.apiKeyPlaceholder}
                      disabled={isProviderCredentialBusy}
                      autoComplete="off"
                      className="app-form-input"
                    />
                    <Button
                      type="button"
                      onClick={handleSaveProviderApiKey}
                      disabled={isProviderCredentialBusy || !providerApiKeyDraft.trim()}
                      className="rounded-[16px]"
                    >
                      {isProviderCredentialSaving ? "Saving..." : "Save Key"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearProviderApiKey}
                      disabled={isProviderCredentialBusy || !hasStoredProviderCredential}
                      className="rounded-[16px]"
                    >
                      Delete Saved Key
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isProviderCredentialLoading
                      ? "Checking whether this provider already has a saved key..."
                      : hasStoredProviderCredential
                      ? `A saved key is on file${
                          providerCredentialLastFour
                            ? ` and ends in ${providerCredentialLastFour}.`
                            : "."
                        }`
                      : "No saved key is on file for this provider yet."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    API keys are sent to the server once when you save them, then
                    stored encrypted in Supabase. STRATOS does not keep the
                    plaintext key in browser storage and never shows it back to
                    the client after save.
                  </p>

                  <Label htmlFor="llm-model">Model</Label>
                  <Select value={llmModelPref} onValueChange={handleLlmModelChange}>
                    <SelectTrigger id="llm-model" className="app-form-select">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent className="stone-surface border-white/8 text-foreground">
                      {providerModelOptions.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <p className="pt-2 text-xs text-muted-foreground">
                Local mode expects an OpenAI-compatible runtime URL configured in{" "}
                <code className="font-mono text-xs">.env.local</code>. Hosted
                providers are all BYOK and use your own billing account.
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
