import { createContext, useContext } from "react";

import type {
  CoachArtifact,
  CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";
import type { ProactiveInsight } from "@/domains/guidance/data/proactiveGates";

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
  applyArtifact: (artifact: CoachArtifact) => void | Promise<void>;
  proactiveInsights: ProactiveInsight[];
  engageInsight: (insight: ProactiveInsight) => void;
  dismissInsight: (insight: ProactiveInsight) => void;
  devTriggerInsight: (insight: ProactiveInsight) => void;
  devResetCooldowns: () => void;
  devToolsEnabled: boolean;
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
