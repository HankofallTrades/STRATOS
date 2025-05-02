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
import { toast } from "sonner";

// Key for localStorage
const LLM_PROVIDER_PREF_KEY = 'llmProviderPref';

// Read the provider from environment variable as a fallback/initial default
const runtimeLlmProviderFallback = import.meta.env.VITE_LLM_PROVIDER || 'local';

const Settings: React.FC = () => {
  const { signOut, user } = useAuth();
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [loadingBodyweight, setLoadingBodyweight] = useState(false);
  const [bodyweight, setBodyweight] = useState<number | string>('');
  // State for developer LLM provider preference - load from localStorage
  const [llmProviderPref, setLlmProviderPref] = useState<string>(() => {
    return localStorage.getItem(LLM_PROVIDER_PREF_KEY) || runtimeLlmProviderFallback;
  });
  const navigate = useNavigate();

  // Save preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LLM_PROVIDER_PREF_KEY, llmProviderPref);
    // Optionally, notify user the change takes effect immediately for the Coach feature
    // toast.info(`LLM Provider set to: ${llmProviderPref}. Changes apply immediately to the Coach feature.`);
  }, [llmProviderPref]);


  useEffect(() => {
    const fetchBodyweight = async () => {
      if (!user) return;
      setLoadingBodyweight(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('bodyweight')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching bodyweight:", error);
        } else if (data && data.bodyweight !== null) {
          setBodyweight(data.bodyweight);
        }
      } catch (err) {
        console.error("Client-side error fetching bodyweight:", err);
      } finally {
        setLoadingBodyweight(false);
      }
    };

    fetchBodyweight();
  }, [user]);

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
    if (!user || bodyweight === '' || isNaN(Number(bodyweight))) {
      toast.error("Please enter a valid bodyweight.");
      return;
    }

    setLoadingBodyweight(true);
    const weightInKg = Number(bodyweight);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bodyweight: weightInKg })
        .eq('id', user.id);

      if (error) {
        console.error("Error updating bodyweight:", error);
        toast.error("Failed to update bodyweight. Please try again.");
      } else {
        toast.success("Bodyweight updated successfully!");
        setBodyweight(weightInKg);
      }
    } catch (err) {
      console.error("Client-side error updating bodyweight:", err);
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
            <Label htmlFor="bodyweight">Bodyweight (kg)</Label>
            <Input
              id="bodyweight"
              type="number"
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value)}
              placeholder="Enter your bodyweight in kg"
              disabled={loadingBodyweight}
              step="0.1"
            />
            <p className="text-xs text-muted-foreground">
                Used for calculating strength benchmarks.
            </p>
         </div>
         <Button type="submit" disabled={loadingBodyweight}>
             {loadingBodyweight ? "Saving..." : "Save Bodyweight"}
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