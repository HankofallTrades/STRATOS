import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  fetchUserProfile,
  updateUserProfile,
} from "@/domains/account/data/accountRepository";
import {
  readLlmPreferences,
  resolveStoredModelForProvider,
  writeLlmModelPreference,
  writeLlmProviderPreference,
  type LlmProviderPreference,
} from "@/domains/guidance/data/llmPreferences";
import { useTheme } from "@/lib/themes";
import type { ThemeId } from "@/lib/themes";
import { useAuth } from "@/state/auth/AuthProvider";

type WeightUnit = "kg" | "lb";

const KG_TO_LB = 2.20462;

const isThemeId = (value: string): value is ThemeId => {
  return value === "fantasy" || value === "modern" || value === "cyberpunk";
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

export const useSettingsScreen = () => {
  const { signOut, user, triggerOnboarding } = useAuth();
  const { themeId, setTheme, availableThemes } = useTheme();

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

  const handleThemeChange = (value: string) => {
    if (isThemeId(value)) {
      setTheme(value);
    }
  };

  const handleLlmProviderChange = (value: string) => {
    const provider: LlmProviderPreference =
      value === "openrouter" ? "openrouter" : "local";
    const nextModel = resolveStoredModelForProvider(provider);

    setLlmProviderPref(provider);
    setLlmModelPref(nextModel);
    writeLlmProviderPreference(provider);
    writeLlmModelPreference(provider, nextModel);
  };

  const handleLlmModelChange = (value: string) => {
    setLlmModelPref(value);
    writeLlmModelPreference(llmProviderPref, value);
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

  return {
    availableThemes,
    bodyweight,
    handleLlmModelChange,
    handleLlmProviderChange,
    handleSignOut,
    handleThemeChange,
    handleUnitChange,
    handleUpdateBodyweight,
    isProfileBusy: isLoadingProfile || isSavingProfile,
    isSigningOut,
    llmModelPref,
    llmProviderPref,
    selectedThemeId: themeId,
    setBodyweight,
    triggerOnboarding,
    unitPref,
    userEmail: user?.email ?? null,
  };
};
