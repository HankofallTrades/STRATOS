import { createContext, useContext } from "react";

import type { CoachConversationMessage } from "@/domains/guidance/agent/contracts";

export interface PresenceAgentContextValue {
  isOpen: boolean;
  hasAttention: boolean;
  summon: () => void;
  dismiss: () => void;
  toggle: () => void;
  conversation: CoachConversationMessage[];
  isLoading: boolean;
  statusMessage: string | null;
  input: string;
  setInput: (value: string) => void;
  send: (text?: string) => Promise<void>;
  applyWorkoutDraft: (startWorkoutPayload: Record<string, unknown>) => void;
  isCoachConfigured: boolean;
  configurationMessage: string | null;
}

export const PresenceAgentContext =
  createContext<PresenceAgentContextValue | null>(null);

export const usePresenceAgent = (): PresenceAgentContextValue => {
  const value = useContext(PresenceAgentContext);
  if (!value) {
    throw new Error(
      "usePresenceAgent must be used within a PresenceAgentProvider."
    );
  }
  return value;
};
