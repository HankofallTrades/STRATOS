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

// Keys for localStorage
const LLM_PROVIDER_PREF_KEY = 'llmProviderPref';
const BODYWEIGHT_UNIT_PREF_KEY = 'bodyweightUnitPref';

// Conversion factor
const KG_TO_LB = 2.20462;

// Read the provider from environment variable as a fallback/initial default
const runtimeLlmProviderFallback = import.meta.env.VITE_LLM_PROVIDER || 'local';

const Settings: React.FC = () => {
  const { signOut, user, triggerOnboarding } = useAuth();
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [loadingBodyweight, setLoadingBodyweight] = useState(false);
  const [bodyweight, setBodyweight] = useState<number | string>('');
  // State for developer LLM provider preference - load from localStorage
  const [llmProviderPref, setLlmProviderPref] = useState<string>(() => {
    return localStorage.getItem(LLM_PROVIDER_PREF_KEY) || runtimeLlmProviderFallback;
  });
  // State for bodyweight unit preference - load from localStorage
  const [unitPref, setUnitPref] = useState<'kg' | 'lb'>(() => {
    return (localStorage.getItem(BODYWEIGHT_UNIT_PREF_KEY) as 'kg' | 'lb') || 'kg';
  });
  const navigate = useNavigate();

  // Save LLM provider preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LLM_PROVIDER_PREF_KEY, llmProviderPref);
    // Optionally, notify user the change takes effect immediately for the Coach feature
    // toast.info(`LLM Provider set to: ${llmProviderPref}. Changes apply immediately to the Coach feature.`);
  }, [llmProviderPref]);

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
          <Select value={llmProviderPref} onValueChange={setLlmProviderPref}>
            <SelectTrigger id="llm-provider">
              <SelectValue placeholder="Select LLM Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local (LM Studio/Ollama)</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="deepseek">DeepSeek (OpenRouter)</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="xai">XAI (Grok)</SelectItem>
              <SelectItem value="custom">Add New...</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the LLM provider for the AI Coach feature.
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