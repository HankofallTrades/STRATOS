import { Button } from "@/components/core/button";
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
import { cn } from "@/lib/utils/cn";

const FIELD_LABEL_CLASS =
  "text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground";
const SECTION_CLASS = "stone-surface rounded-[24px] p-5 md:p-6";

const unitOptions = [
  { label: "kg", value: "kg" },
  { label: "lb", value: "lb" },
] as const;

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
    periodDurationWeeks,
    periodGoalFocus,
    periodProtocol,
    providerApiKeyDraft,
    providerCredentialLastFour,
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
  const selectedModelLabel =
    providerModelOptions.find(model => model.value === llmModelPref)?.label ??
    llmModelPref;

  const periodSummary = isLoadingActiveProgram
    ? "Loading..."
    : activeProgram
      ? `Week ${activeProgram.current_week} of ${
          activeProgram.mesocycle.duration_weeks
        } · ${formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)} · ${
          activeProgram.mesocycle.protocol === "occams" ? "Occam's" : "Custom"
        }`
      : "No active period";

  const coachSummary = shouldShowApiKeyInput
    ? `${selectedProvider.label}${selectedModelLabel ? ` · ${selectedModelLabel}` : ""}`
    : "Local runtime";
  const credentialStatus = shouldShowApiKeyInput
    ? isProviderCredentialLoading
      ? "Checking key"
      : hasStoredProviderCredential
        ? providerCredentialLastFour
          ? `Saved ••••${providerCredentialLastFour}`
          : "Saved"
        : "No saved key"
    : null;

  return (
    <div className="app-page max-w-5xl">
      <section className="stone-panel stone-panel-hero relative overflow-hidden rounded-[30px] px-5 py-6 md:px-6 md:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(var(--stone-accent-rgb),0.12),rgba(var(--stone-accent-rgb),0))]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(var(--stone-accent-rgb),0.14)_0%,rgba(var(--stone-accent-rgb),0)_72%)]"
        />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <h1 className="app-page-title">Settings</h1>

          {userEmail ? (
            <p className="text-sm text-muted-foreground md:text-right">{userEmail}</p>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <div className="space-y-4">
          <section className={SECTION_CLASS}>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Profile
                </h2>

                <RadioGroup
                  value={unitPref}
                  onValueChange={value => handleUnitChange(value as "kg" | "lb")}
                  className="settings-segmented"
                >
                  {unitOptions.map(option => {
                    const isActive = unitPref === option.value;

                    return (
                      <label
                        key={option.value}
                        htmlFor={`weight-unit-${option.value}`}
                        className="settings-segment"
                        data-active={isActive ? "true" : "false"}
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`weight-unit-${option.value}`}
                          className="sr-only"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>

              <form
                onSubmit={handleUpdateBodyweight}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="w-full max-w-xs space-y-2">
                  <Label htmlFor="bodyweight" className={FIELD_LABEL_CLASS}>
                    Weight ({unitPref})
                  </Label>
                  <Input
                    id="bodyweight"
                    type="number"
                    value={bodyweight}
                    onChange={event => setBodyweight(event.target.value)}
                    placeholder={unitPref}
                    disabled={isProfileBusy}
                    step="0.1"
                    className="app-form-input h-12 rounded-[16px]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isProfileBusy}
                  className="settings-action-primary h-11 rounded-[16px] px-5 text-sm font-semibold sm:min-w-[7.5rem]"
                >
                  {isProfileBusy ? "Saving..." : "Save"}
                </Button>
              </form>
            </div>
          </section>

          <section className={SECTION_CLASS}>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Session
              </h2>

              <div className="flex flex-col gap-3">
                <Button
                  variant="ghost"
                  onClick={triggerOnboarding}
                  className="settings-action-secondary h-11 justify-start rounded-[16px] px-4 text-sm font-semibold"
                >
                  Re-run onboarding
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="settings-action-danger h-11 justify-start rounded-[16px] px-4 text-sm font-semibold"
                >
                  {isSigningOut ? "Logging out..." : "Log out"}
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className={SECTION_CLASS}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Training period
                </h2>
                {activeProgram ? (
                  <>
                    <p className="text-lg font-semibold text-foreground">
                      {activeProgram.mesocycle.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{periodSummary}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{periodSummary}</p>
                )}
              </div>

              <Button
                onClick={handleOpenPeriodDialog}
                disabled={isLoadingActiveProgram || isPeriodWorkoutInProgress}
                variant="ghost"
                className={cn(
                  "h-11 rounded-[16px] px-5 text-sm font-semibold",
                  activeProgram
                    ? "settings-action-secondary"
                    : "settings-action-primary"
                )}
              >
                {activeProgram ? "Reset period" : "Start period"}
              </Button>
            </div>

            {isPeriodWorkoutInProgress ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Finish or discard the active block workout first.
              </p>
            ) : null}
          </section>

          <section className={SECTION_CLASS}>
            <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Coach
              </h2>
              <p className="text-sm text-muted-foreground">
                {credentialStatus ? `${coachSummary} · ${credentialStatus}` : coachSummary}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div className={cn("grid gap-4", shouldShowApiKeyInput && "sm:grid-cols-2")}>
                <div className="space-y-2">
                  <Label htmlFor="llm-provider" className={FIELD_LABEL_CLASS}>
                    Provider
                  </Label>
                  <Select value={llmProviderPref} onValueChange={handleLlmProviderChange}>
                    <SelectTrigger
                      id="llm-provider"
                      className="app-form-select h-12 rounded-[16px]"
                    >
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent className="stone-surface border-white/8 text-foreground">
                      {llmProviderOptions.map(provider => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {shouldShowApiKeyInput ? (
                  <div className="space-y-2">
                    <Label htmlFor="llm-model" className={FIELD_LABEL_CLASS}>
                      Model
                    </Label>
                    <Select value={llmModelPref} onValueChange={handleLlmModelChange}>
                      <SelectTrigger
                        id="llm-model"
                        className="app-form-select h-12 rounded-[16px]"
                      >
                        <SelectValue placeholder="Model" />
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
              </div>

              {shouldShowApiKeyInput ? (
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="provider-api-key" className={FIELD_LABEL_CLASS}>
                      API key
                    </Label>
                    <Input
                      id="provider-api-key"
                      type="password"
                      value={providerApiKeyDraft}
                      onChange={event =>
                        handleProviderApiKeyChange(event.target.value)
                      }
                      placeholder={selectedProvider.apiKeyPlaceholder}
                      disabled={isProviderCredentialBusy}
                      autoComplete="off"
                      className="app-form-input h-12 rounded-[16px]"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleSaveProviderApiKey}
                    disabled={isProviderCredentialBusy || !providerApiKeyDraft.trim()}
                    className="settings-action-primary h-11 rounded-[16px] px-5 text-sm font-semibold"
                  >
                    {isProviderCredentialSaving ? "Saving..." : "Save key"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearProviderApiKey}
                    disabled={isProviderCredentialBusy || !hasStoredProviderCredential}
                    className="settings-action-secondary h-11 rounded-[16px] px-5 text-sm font-semibold"
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <Dialog open={isPeriodDialogOpen} onOpenChange={setIsPeriodDialogOpen}>
        <DialogContent className="stone-panel rounded-[24px] border-white/10">
          <DialogHeader>
            <DialogTitle>
              {activeProgram ? "Reset period" : "Start period"}
            </DialogTitle>
            <DialogDescription>
              {activeProgram ? "Starts again at week 1." : "Creates a new block."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="settings-period-focus"
                className={FIELD_LABEL_CLASS}
              >
                Focus
              </Label>
              <Select
                value={periodGoalFocus}
                onValueChange={value =>
                  setPeriodGoalFocus(value as typeof periodGoalFocus)
                }
              >
                <SelectTrigger
                  id="settings-period-focus"
                  className="app-form-select h-12 rounded-[16px]"
                >
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
              <Label
                htmlFor="settings-period-protocol"
                className={FIELD_LABEL_CLASS}
              >
                Protocol
              </Label>
              <Select
                value={periodProtocol}
                onValueChange={value => setPeriodProtocol(value as MesocycleProtocol)}
              >
                <SelectTrigger
                  id="settings-period-protocol"
                  className="app-form-select h-12 rounded-[16px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="stone-surface border-white/8 text-foreground">
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="occams">Occam&apos;s</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="settings-period-duration"
                className={FIELD_LABEL_CLASS}
              >
                Duration
              </Label>
              <Input
                id="settings-period-duration"
                type="number"
                min={4}
                max={12}
                value={periodDurationWeeks}
                onChange={event => setPeriodDurationWeeks(Number(event.target.value))}
                className="app-form-input h-12 rounded-[16px]"
              />
              <p className="text-xs text-muted-foreground">4-12 weeks</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsPeriodDialogOpen(false)}
              className="settings-action-secondary rounded-[16px] px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePeriod}
              disabled={isPeriodUpdating}
              className="settings-action-primary rounded-[16px]"
            >
              {isPeriodUpdating
                ? activeProgram
                  ? "Resetting..."
                  : "Creating..."
                : activeProgram
                  ? "Reset period"
                  : "Create period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsScreen;
