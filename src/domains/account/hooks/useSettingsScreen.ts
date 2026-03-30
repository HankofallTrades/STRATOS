import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { useAppSelector } from "@/hooks/redux";
import {
  fetchUserProfile,
  updateUserProfile,
} from "@/domains/account/data/accountRepository";
import { usePeriodization, type MesocycleProtocol } from "@/domains/periodization";
import {
  resolveStoredModelForProvider,
  readLlmPreferences,
  writeLlmModelPreference,
  writeLlmProviderPreference,
  type LlmProviderPreference,
} from "@/domains/guidance/data/llmPreferences";
import {
  deleteProviderCredential,
  fetchProviderCredentialStatus,
  upsertProviderCredential,
} from "@/domains/guidance/data/providerCredentialRepository";
import type { SessionFocus } from "@/lib/types/workout";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

type WeightUnit = "kg" | "lb";

const KG_TO_LB = 2.20462;
const DEFAULT_PERIOD_DURATION_WEEKS = 6;
const DEFAULT_PERIOD_GOAL_FOCUS: SessionFocus = "hypertrophy";
const DEFAULT_PERIOD_PROTOCOL: MesocycleProtocol = "custom";

const SESSION_FOCUS_LABELS: Record<SessionFocus, string> = {
  hypertrophy: "Hypertrophy",
  strength: "Strength",
  zone2: "Zone 2",
  zone5: "Zone 5",
  speed: "Speed",
  recovery: "Recovery",
  mixed: "Mixed",
};

const isWeightUnit = (value: string | null | undefined): value is WeightUnit => {
  return value === "kg" || value === "lb";
};

const formatDisplayWeight = (weightKg: number, unit: WeightUnit): number => {
  if (unit === "lb") {
    return Number((weightKg * KG_TO_LB).toFixed(1));
  }

  return Number(weightKg.toFixed(1));
};

const toKilograms = (weight: number, unit: WeightUnit): number => {
  if (unit === "lb") {
    return Number((weight / KG_TO_LB).toFixed(4));
  }

  return weight;
};

const buildPeriodName = (
  focus: SessionFocus,
  protocol: MesocycleProtocol
) => {
  const focusLabel = SESSION_FOCUS_LABELS[focus];
  return protocol === "occams"
    ? `Occam ${focusLabel} Block`
    : `${focusLabel} Block`;
};

export const useSettingsScreen = () => {
  const { session, signOut, user, triggerOnboarding } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const {
    activeProgram,
    isLoading: isLoadingActiveProgram,
    createMesocycle,
    isCreatingMesocycle,
    resetMesocycle,
    isResettingMesocycle,
  } = usePeriodization(user?.id);

  const initialLlmPreferences = readLlmPreferences();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [bodyweight, setBodyweight] = useState<number | string>("");
  const [unitPref, setUnitPref] = useState<WeightUnit>("kg");
  const [llmProviderPref, setLlmProviderPref] = useState<LlmProviderPreference>(
    initialLlmPreferences.provider
  );
  const [llmModelPref, setLlmModelPref] = useState(initialLlmPreferences.model);
  const [providerApiKeyDraft, setProviderApiKeyDraft] = useState("");
  const [hasStoredProviderCredential, setHasStoredProviderCredential] =
    useState(false);
  const [providerCredentialLastFour, setProviderCredentialLastFour] = useState<
    string | null
  >(null);
  const [isProviderCredentialLoading, setIsProviderCredentialLoading] =
    useState(false);
  const [isProviderCredentialSaving, setIsProviderCredentialSaving] =
    useState(false);
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false);
  const [periodDurationWeeks, setPeriodDurationWeeks] = useState(
    DEFAULT_PERIOD_DURATION_WEEKS
  );
  const [periodGoalFocus, setPeriodGoalFocus] = useState<SessionFocus>(
    DEFAULT_PERIOD_GOAL_FOCUS
  );
  const [periodProtocol, setPeriodProtocol] =
    useState<MesocycleProtocol>(DEFAULT_PERIOD_PROTOCOL);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setBodyweight("");
      setUnitPref("kg");
      return;
    }

    setIsLoadingProfile(true);

    try {
      const profile = await fetchUserProfile(user.id);
      const resolvedUnit = isWeightUnit(profile?.preferred_weight_unit)
        ? profile.preferred_weight_unit
        : "kg";

      setUnitPref(resolvedUnit);
      setBodyweight(
        typeof profile?.weight === "number"
          ? formatDisplayWeight(profile.weight, resolvedUnit)
          : ""
      );
    } catch (error) {
      console.error("Error fetching profile settings:", error);
      toast.error("Failed to load your profile settings.");
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (llmProviderPref === "local" || !session?.access_token) {
      setHasStoredProviderCredential(false);
      setIsProviderCredentialLoading(false);
      setProviderCredentialLastFour(null);
      setProviderApiKeyDraft("");
      return;
    }

    let isCancelled = false;
    setIsProviderCredentialLoading(true);

    void fetchProviderCredentialStatus({
      accessToken: session.access_token,
      provider: llmProviderPref,
    })
      .then(status => {
        if (isCancelled) {
          return;
        }

        setHasStoredProviderCredential(status.hasStoredCredential);
        setProviderCredentialLastFour(status.last4);
        setProviderApiKeyDraft("");
      })
      .catch(error => {
        if (isCancelled) {
          return;
        }

        console.error("Error fetching provider credential status:", error);
        toast.error("Failed to load your saved Coach provider key.");
      })
      .finally(() => {
        if (!isCancelled) {
          setIsProviderCredentialLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [llmProviderPref, session?.access_token]);

  const handleLlmProviderChange = (value: string) => {
    const provider: LlmProviderPreference =
      value === "anthropic" ||
      value === "google" ||
      value === "openai" ||
      value === "openrouter"
        ? value
        : "local";
    const nextModel = resolveStoredModelForProvider(provider);

    setLlmProviderPref(provider);
    setLlmModelPref(nextModel);
    setProviderApiKeyDraft("");
    setHasStoredProviderCredential(false);
    setProviderCredentialLastFour(null);
    setIsProviderCredentialLoading(
      provider !== "local" && Boolean(session?.access_token)
    );
    writeLlmProviderPreference(provider);
    writeLlmModelPreference(provider, nextModel);
  };

  const handleLlmModelChange = (value: string) => {
    setLlmModelPref(value);
    writeLlmModelPreference(llmProviderPref, value);
  };

  const handleProviderApiKeyChange = (value: string) => {
    setProviderApiKeyDraft(value);
  };

  const handleSaveProviderApiKey = async () => {
    if (llmProviderPref === "local") {
      toast.error("Local mode does not use a hosted provider API key.");
      return;
    }

    if (!session?.access_token) {
      toast.error("You must be logged in to save a Coach provider key.");
      return;
    }

    if (!providerApiKeyDraft.trim()) {
      toast.error("Enter an API key before saving.");
      return;
    }

    setIsProviderCredentialSaving(true);

    try {
      const status = await upsertProviderCredential({
        accessToken: session.access_token,
        apiKey: providerApiKeyDraft,
        provider: llmProviderPref,
      });
      setHasStoredProviderCredential(status.hasStoredCredential);
      setProviderCredentialLastFour(status.last4);
      setProviderApiKeyDraft("");
      toast.success("Coach provider key saved.");
    } catch (error) {
      console.error("Error saving provider credential:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save your Coach provider key."
      );
    } finally {
      setIsProviderCredentialSaving(false);
    }
  };

  const handleClearProviderApiKey = async () => {
    if (llmProviderPref === "local") {
      return;
    }

    if (!session?.access_token) {
      toast.error("You must be logged in to delete a Coach provider key.");
      return;
    }

    setIsProviderCredentialSaving(true);

    try {
      await deleteProviderCredential({
        accessToken: session.access_token,
        provider: llmProviderPref,
      });
      setHasStoredProviderCredential(false);
      setProviderCredentialLastFour(null);
      setProviderApiKeyDraft("");
      toast.success("Coach provider key deleted.");
    } catch (error) {
      console.error("Error deleting provider credential:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete your Coach provider key."
      );
    } finally {
      setIsProviderCredentialSaving(false);
    }
  };

  const handleUnitChange = (newUnit: WeightUnit) => {
    if (newUnit === unitPref) {
      return;
    }

    const currentBodyweight = Number(bodyweight);

    if (bodyweight === "" || Number.isNaN(currentBodyweight)) {
      setUnitPref(newUnit);
      return;
    }

    const normalizedKilograms =
      unitPref === "lb" ? currentBodyweight / KG_TO_LB : currentBodyweight;
    const nextDisplayValue =
      newUnit === "lb"
        ? normalizedKilograms * KG_TO_LB
        : normalizedKilograms;

    setBodyweight(Number(nextDisplayValue.toFixed(1)));
    setUnitPref(newUnit);
  };

  const handleUpdateBodyweight = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const currentBodyweight = Number(bodyweight);
    if (!user || bodyweight === "" || Number.isNaN(currentBodyweight)) {
      toast.error(`Please enter a valid weight in ${unitPref}.`);
      return;
    }

    const weightInKg = toKilograms(currentBodyweight, unitPref);

    setIsSavingProfile(true);
    try {
      await updateUserProfile(user.id, {
        weight: weightInKg,
        preferred_weight_unit: unitPref,
      });
      setBodyweight(formatDisplayWeight(weightInKg, unitPref));
      toast.success("Weight updated successfully.");
    } catch (error) {
      console.error("Error updating profile settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update weight. Please try again."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out. Please try again.");
      setIsSigningOut(false);
    }
  };

  const seedPeriodDraft = useCallback(() => {
    const activeMesocycle = activeProgram?.mesocycle;

    setPeriodDurationWeeks(
      activeMesocycle?.duration_weeks ?? DEFAULT_PERIOD_DURATION_WEEKS
    );
    setPeriodGoalFocus(
      activeMesocycle?.goal_focus ?? DEFAULT_PERIOD_GOAL_FOCUS
    );
    setPeriodProtocol(activeMesocycle?.protocol ?? DEFAULT_PERIOD_PROTOCOL);
  }, [activeProgram]);

  const handleOpenPeriodDialog = useCallback(() => {
    seedPeriodDraft();
    setIsPeriodDialogOpen(true);
  }, [seedPeriodDraft]);

  const handleSavePeriod = useCallback(async () => {
    if (!user) {
      toast.error("You must be logged in to change your training period.");
      return;
    }

    if (currentWorkout && !currentWorkout.completed && currentWorkout.mesocycle_id) {
      toast.error("Finish or discard the active block workout before changing period.");
      return;
    }

    const duration = Number(periodDurationWeeks);
    if (!Number.isFinite(duration) || duration < 4 || duration > 12) {
      toast.error("Training periods must be between 4 and 12 weeks.");
      return;
    }

    try {
      const input = {
        name: buildPeriodName(periodGoalFocus, periodProtocol),
        goal_focus: periodGoalFocus,
        protocol: periodProtocol,
        start_date: new Date().toISOString().split("T")[0],
        duration_weeks: duration,
      };

      if (activeProgram) {
        await resetMesocycle(input);
        toast.success("Training period reset.");
      } else {
        await createMesocycle(input);
        toast.success("Training period created.");
      }

      setIsPeriodDialogOpen(false);
    } catch (error) {
      console.error("Error updating training period:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update your training period."
      );
    }
  }, [
    activeProgram,
    createMesocycle,
    currentWorkout,
    periodDurationWeeks,
    periodGoalFocus,
    periodProtocol,
    resetMesocycle,
    user,
  ]);

  const isPeriodWorkoutInProgress = Boolean(
    currentWorkout && !currentWorkout.completed && currentWorkout.mesocycle_id
  );

  return {
    activeProgram,
    bodyweight,
    hasStoredProviderCredential,
    handleLlmModelChange,
    handleOpenPeriodDialog,
    handleProviderApiKeyChange,
    handleSaveProviderApiKey,
    handleLlmProviderChange,
    handleSavePeriod,
    handleSignOut,
    handleUnitChange,
    handleUpdateBodyweight,
    handleClearProviderApiKey,
    isLoadingActiveProgram,
    isPeriodDialogOpen,
    isPeriodUpdating: isCreatingMesocycle || isResettingMesocycle,
    isPeriodWorkoutInProgress,
    isProviderCredentialBusy:
      isProviderCredentialLoading || isProviderCredentialSaving,
    isProviderCredentialLoading,
    isProviderCredentialSaving,
    isProfileBusy: isLoadingProfile || isSavingProfile,
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
    userEmail: user?.email ?? null,
  };
};
