import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

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
  isRuntimeLoading: boolean;
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

export interface PresenceAgentRuntimeBridgeValue {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  conversation: CoachConversationMessage[];
  setConversation: Dispatch<SetStateAction<CoachConversationMessage[]>>;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  statusMessage: string | null;
  setStatusMessage: Dispatch<SetStateAction<string | null>>;
  hasAttention: boolean;
  setHasAttention: Dispatch<SetStateAction<boolean>>;
  proactiveInsights: ProactiveInsight[];
  setProactiveInsights: Dispatch<SetStateAction<ProactiveInsight[]>>;
  registerRuntimeApi: (api: PresenceAgentRuntimeApi) => void;
  clearRuntimeApi: () => void;
}

export interface PresenceAgentRuntimeApi {
  applyArtifact: (artifact: CoachArtifact) => void | Promise<void>;
  dismissInsight: (insight: ProactiveInsight) => void;
  engageInsight: (insight: ProactiveInsight) => void;
  devResetCooldowns: () => void;
  devToolsEnabled: boolean;
  devTriggerInsight: (insight: ProactiveInsight) => void;
  send: (text?: string) => Promise<void>;
}

export const PresenceAgentRuntimeBridgeContext =
  createContext<PresenceAgentRuntimeBridgeValue | null>(null);

export const usePresenceAgentRuntimeBridge =
  (): PresenceAgentRuntimeBridgeValue => {
    const value = useContext(PresenceAgentRuntimeBridgeContext);
    if (!value) {
      throw new Error(
        "usePresenceAgentRuntimeBridge must be used within a PresenceAgentProvider."
      );
    }
    return value;
  };
