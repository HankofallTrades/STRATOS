import { Button } from "@/components/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
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
  OPENROUTER_MODEL_OPTIONS,
  type LlmProviderPreference,
} from "@/domains/guidance/data/llmPreferences";

const providerDescriptions: Record<LlmProviderPreference, string> = {
  local: "Local (LM Studio/Ollama)",
  openrouter: "OpenRouter",
};

const SettingsScreen = () => {
  const {
    availableThemes,
    bodyweight,
    handleLlmModelChange,
    handleLlmProviderChange,
    handleSignOut,
    handleThemeChange,
    handleUnitChange,
    handleUpdateBodyweight,
    isProfileBusy,
    isSigningOut,
    llmModelPref,
    llmProviderPref,
    selectedThemeId,
    setBodyweight,
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
    </div>
  );
};

export default SettingsScreen;
