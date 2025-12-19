import React, { useState, useEffect } from 'react';
import { useAuth } from '@/state/auth/AuthProvider';
import { Button } from '@/components/core/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/integrations/supabase/client';
import { Input } from '@/components/core/input';
import { Label } from '@/components/core/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/core/select";
import { RadioGroup, RadioGroupItem } from "@/components/core/radio-group";
import { toast } from "sonner";
import { useTheme } from '@/lib/themes';

// Keys for localStorage
const LLM_PROVIDER_PREF_KEY = 'llmProviderPref';
const LLM_MODEL_PREF_KEY = 'llmModelPref';
const BODYWEIGHT_UNIT_PREF_KEY = 'bodyweightUnitPref';

// Conversion factor
const KG_TO_LB = 2.20462;

// Read the provider from environment variable as a fallback/initial default
const runtimeLlmProviderFallback = import.meta.env.VITE_LLM_PROVIDER || 'local';
// Default model for OpenRouter if none is selected/persisted - Updated to user's first choice
const defaultOpenRouterModel = 'deepseek/deepseek-chat-v3-0324:free';

const Settings: React.FC = () => {
  const { signOut, user, triggerOnboarding } = useAuth();
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [loadingBodyweight, setLoadingBodyweight] = useState(false);
  const [bodyweight, setBodyweight] = useState<number | string>('');
  // State for developer LLM provider preference - load from localStorage
  const [llmProviderPref, setLlmProviderPref] = useState<string>(() => {
    return localStorage.getItem(LLM_PROVIDER_PREF_KEY) || runtimeLlmProviderFallback;
  });
  // State for developer LLM model preference - load from localStorage
  const [llmModelPref, setLlmModelPref] = useState<string>(() => {
    // Only load model pref if the provider is OpenRouter (or provider that needs a model)
    const savedProvider = localStorage.getItem(LLM_PROVIDER_PREF_KEY);
    if (savedProvider === 'openrouter') {
      return localStorage.getItem(LLM_MODEL_PREF_KEY) || defaultOpenRouterModel; // Fallback to default if no model saved
    }
    return ''; // No model needed for providers like 'local' or 'anthropic' initially? Adjust as needed.
  });
  // State for bodyweight unit preference - load from localStorage
  const [unitPref, setUnitPref] = useState<'kg' | 'lb'>(() => {
    return (localStorage.getItem(BODYWEIGHT_UNIT_PREF_KEY) as 'kg' | 'lb') || 'kg';
  });
  const navigate = useNavigate();

  // Save LLM provider preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LLM_PROVIDER_PREF_KEY, llmProviderPref);
    // Reset model if provider changes to one that doesn't need a model or has different models
    // Add logic here if needed, e.g., setLlmModelPref(getDefaultModelForProvider(llmProviderPref));
  }, [llmProviderPref]);

  // Save LLM model preference to localStorage whenever it changes
  useEffect(() => {
    // Only save model pref if a model is actually selected/relevant for the provider
    if (llmModelPref && llmProviderPref === 'openrouter') {
      localStorage.setItem(LLM_MODEL_PREF_KEY, llmModelPref);
    } else {
      // Optionally remove the key if model is not applicable
      localStorage.removeItem(LLM_MODEL_PREF_KEY);
    }
  }, [llmModelPref, llmProviderPref]); // Depend on provider too

  // Save unit preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(BODYWEIGHT_UNIT_PREF_KEY, unitPref);
  }, [unitPref]);

  // Fetch bodyweight and convert based on initial unit preference
  useEffect(() => {
    const fetchBodyweight = async () => {
      if (!user) return;
      setLoadingBodyweight(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('weight')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching weight:", error);
          toast.error("Failed to fetch weight.");
        } else if (data && data.weight !== null) {
          // Load unit preference again inside effect to ensure it's the latest
          const currentUnitPref = (localStorage.getItem(BODYWEIGHT_UNIT_PREF_KEY) as 'kg' | 'lb') || 'kg';
          const weightKg = data.weight;
          if (currentUnitPref === 'lb') {
            setBodyweight(Number((weightKg * KG_TO_LB).toFixed(1)));
          } else {
            setBodyweight(weightKg);
          }
        }
      } catch (err) {
        console.error("Client-side error fetching weight:", err);
        toast.error("An unexpected error occurred while fetching weight.");
      } finally {
        setLoadingBodyweight(false);
      }
    };

    fetchBodyweight();
  }, [user]);

  // Effect to handle unit changes and convert displayed bodyweight
  useEffect(() => {
    const currentBw = Number(bodyweight);
    if (isNaN(currentBw) || bodyweight === '') return;

    const previousUnitPref = localStorage.getItem(BODYWEIGHT_UNIT_PREF_KEY) || 'kg';

  }, [unitPref]);

  const handleUnitChange = (newUnit: 'kg' | 'lb') => {
    const currentBw = Number(bodyweight);
    if (isNaN(currentBw) || bodyweight === '') {
      setUnitPref(newUnit);
      return;
    }

    let convertedBw: number;
    if (newUnit === 'lb' && unitPref === 'kg') {
      convertedBw = currentBw * KG_TO_LB;
    } else if (newUnit === 'kg' && unitPref === 'lb') {
      convertedBw = currentBw / KG_TO_LB;
    } else {
      setUnitPref(newUnit);
      return;
    }

    setBodyweight(Number(convertedBw.toFixed(1)));
    setUnitPref(newUnit);
  };

  const handleSignOut = async () => {
    setLoadingSignOut(true);
    try {
      await signOut();
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out. Please try again.");
      setLoadingSignOut(false);
    }
  };

  const handleUpdateBodyweight = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentBwInput = Number(bodyweight);
    if (!user || bodyweight === '' || isNaN(currentBwInput)) {
      toast.error(`Please enter a valid weight in ${unitPref}.`);
      return;
    }

    setLoadingBodyweight(true);
    let weightInKg: number;

    if (unitPref === 'lb') {
      weightInKg = currentBwInput / KG_TO_LB;
    } else {
      weightInKg = currentBwInput;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ weight: weightInKg })
        .eq('id', user.id);

      if (error) {
        console.error("Error updating weight:", error);
        toast.error("Failed to update weight. Please try again.");
      } else {
        toast.success("Weight updated successfully!");
      }
    } catch (err) {
      console.error("Client-side error updating weight:", err);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoadingBodyweight(false);
    }
  };

  return (
    <div className="p-4 space-y-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Settings</h1>
      {user && (
        <p className="text-muted-foreground">Logged in as: {user.email}</p>
      )}

      <div className="border p-4 rounded-md space-y-4">
        <h2 className="text-lg font-medium">App Theme</h2>
        <div className="space-y-2">
          <Label htmlFor="theme-select">Theme</Label>
          <Select
            value={currentTheme.id}
            onValueChange={(value) => setTheme(value as any)}
          >
            <SelectTrigger id="theme-select">
              <SelectValue placeholder="Select Theme" />
            </SelectTrigger>
            <SelectContent>
              {availableThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{theme.name}</span>
                    <span className="text-xs text-muted-foreground">{theme.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose your preferred app theme. Changes apply immediately.
          </p>
        </div>
      </div>

      <form onSubmit={handleUpdateBodyweight} className="space-y-4 border p-4 rounded-md">
        <h2 className="text-lg font-medium">Profile Information</h2>
        <div className="space-y-2">
          <Label>Preferred Unit</Label>
          <RadioGroup
            value={unitPref}
            onValueChange={(value) => handleUnitChange(value as 'kg' | 'lb')}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="kg" id="r1" />
              <Label htmlFor="r1">kg</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lb" id="r2" />
              <Label htmlFor="r2">lb</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bodyweight">Weight ({unitPref})</Label>
          <Input
            id="bodyweight"
            type="number"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            placeholder={`Enter your weight in ${unitPref}`}
            disabled={loadingBodyweight}
            step="0.1"
          />
          <p className="text-xs text-muted-foreground">
            Used for calculating strength benchmarks.
          </p>
        </div>
        <Button type="submit" disabled={loadingBodyweight}>
          {loadingBodyweight ? "Saving..." : "Save Weight"}
        </Button>
      </form>

      <div className="border p-4 rounded-md space-y-4">
        <h2 className="text-lg font-medium">Developer Settings</h2>
        <div className="space-y-2">
          <Label htmlFor="llm-provider">LLM Provider</Label>
          <Select
            value={llmProviderPref}
            onValueChange={(value) => {
              setLlmProviderPref(value);
              // Reset model when provider changes - adjust logic as needed
              if (value === 'openrouter') {
                setLlmModelPref(localStorage.getItem(LLM_MODEL_PREF_KEY) || defaultOpenRouterModel); // Restore saved or default
              } else {
                setLlmModelPref(''); // Clear model for providers that don't need it
              }
            }}
          >
            <SelectTrigger id="llm-provider">
              <SelectValue placeholder="Select LLM Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local (LM Studio/Ollama)</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
            </SelectContent>
          </Select>
          {/* Conditionally render Model selection based on Provider */}
          {llmProviderPref === 'openrouter' && ( // Show only for providers needing a model
            <div className="space-y-2 pt-4"> {/* Add padding */}
              <Label htmlFor="llm-model">Model (OpenRouter)</Label>
              <Select value={llmModelPref} onValueChange={setLlmModelPref}>
                <SelectTrigger id="llm-model">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  {/* Updated list for OpenRouter/DeepSeek based on user request */}
                  {llmProviderPref === 'openrouter' && (
                    <>
                      <SelectItem value="deepseek/deepseek-chat-v3-0324:free">Deepseek V3</SelectItem>
                      <SelectItem value="google/gemini-2.5-pro-exp-03-25">Gemini 2.5 Pro Exp.</SelectItem>
                      <SelectItem value="deepseek/deepseek-r1:free">Deepseek R1</SelectItem>
                      <SelectItem value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash Exp.</SelectItem>
                      {/* Add other specific OpenRouter models here if needed */}
                    </>
                  )}
                  {/* Removed hardcoded OpenAI models as per user request */}
                  {/* {llmProviderPref === 'openai' && ( ... )} */}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-2"> {/* Adjust padding */}
            Select the LLM provider and model for the AI Coach feature.
            Changes take effect immediately. Ensure necessary API keys/URLs
            are still configured in <code className="font-mono text-xs">.env.local</code> for the selected provider.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="secondary" onClick={triggerOnboarding}>
            Re-Trigger Onboarding Flow
          </Button>
          <p className="text-xs text-muted-foreground pt-1">
            Test the onboarding dialog even if already completed.
          </p>
        </div>
      </div>

      <div className="border p-4 rounded-md">
        <h2 className="text-lg font-medium mb-4">Account</h2>
        <Button onClick={handleSignOut} disabled={loadingSignOut} variant="destructive">
          {loadingSignOut ? "Logging out..." : "Log Out"}
        </Button>
      </div>
    </div>
  );
};

export default Settings; 