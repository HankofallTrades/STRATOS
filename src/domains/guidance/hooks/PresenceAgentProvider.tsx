import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  CoachArtifact,
  CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";
import {
  buildMissingProviderConfigurationMessage,
  providerRequiresApiKey,
  readLlmPreferences,
} from "@/domains/guidance/data/llmPreferences";
import { readProviderApiKey } from "@/domains/guidance/data/providerKeyStore";
import {
  PresenceAgentContext,
  PresenceAgentRuntimeBridgeContext,
  type PresenceAgentContextValue,
  type PresenceAgentRuntimeApi,
} from "@/domains/guidance/hooks/usePresenceAgent";
import type { ProactiveInsight } from "@/domains/guidance/data/proactiveGates";

const PresenceAgentRuntime = lazy(
  () => import("@/domains/guidance/hooks/PresenceAgentRuntime")
);

const scheduleRuntimePreload = (callback: () => void) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 1800 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(callback, 700);
  return () => window.clearTimeout(timeoutId);
};

export const PresenceAgentProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<CoachConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasAttention, setHasAttention] = useState(false);
  const [proactiveInsights, setProactiveInsights] = useState<ProactiveInsight[]>([]);
  const [shouldLoadRuntime, setShouldLoadRuntime] = useState(false);
  const [runtimeApi, setRuntimeApi] = useState<PresenceAgentRuntimeApi | null>(null);
  const pendingSendRef = useRef<{ text?: string } | null>(null);

  const llmPreferences = readLlmPreferences();
  const isCoachConfigured =
    !providerRequiresApiKey(llmPreferences.provider) ||
    Boolean(readProviderApiKey(llmPreferences.provider));
  const configurationMessage = isCoachConfigured
    ? null
    : buildMissingProviderConfigurationMessage(llmPreferences.provider);

  const ensureRuntime = useCallback(() => {
    setShouldLoadRuntime(true);
  }, []);

  useEffect(() => scheduleRuntimePreload(ensureRuntime), [ensureRuntime]);

  useEffect(() => {
    if (!isOpen) return;
    ensureRuntime();
  }, [ensureRuntime, isOpen]);

  useEffect(() => {
    if (!runtimeApi || !pendingSendRef.current) return;
    const pending = pendingSendRef.current;
    pendingSendRef.current = null;
    void runtimeApi.send(pending.text);
  }, [runtimeApi]);

  const summon = useCallback(() => {
    ensureRuntime();
    setIsOpen(true);
  }, [ensureRuntime]);

  const dismiss = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    ensureRuntime();
    setIsOpen((open) => !open);
  }, [ensureRuntime]);

  const send = useCallback(
    async (text?: string) => {
      if (runtimeApi) {
        await runtimeApi.send(text);
        return;
      }
      pendingSendRef.current = { text };
      ensureRuntime();
    },
    [ensureRuntime, runtimeApi]
  );

  const applyArtifact = useCallback(
    (artifact: CoachArtifact) => {
      ensureRuntime();
      return runtimeApi?.applyArtifact(artifact);
    },
    [ensureRuntime, runtimeApi]
  );

  const engageInsight = useCallback(
    (insight: ProactiveInsight) => {
      ensureRuntime();
      runtimeApi?.engageInsight(insight);
    },
    [ensureRuntime, runtimeApi]
  );

  const dismissInsight = useCallback(
    (insight: ProactiveInsight) => {
      runtimeApi?.dismissInsight(insight);
    },
    [runtimeApi]
  );

  const devTriggerInsight = useCallback(
    (insight: ProactiveInsight) => {
      ensureRuntime();
      if (runtimeApi) {
        runtimeApi.devTriggerInsight(insight);
        return;
      }
      setProactiveInsights((previous) => [
        insight,
        ...previous.filter((existing) => existing.id !== insight.id),
      ]);
    },
    [ensureRuntime, runtimeApi]
  );

  const devResetCooldowns = useCallback(() => {
    ensureRuntime();
    runtimeApi?.devResetCooldowns();
  }, [ensureRuntime, runtimeApi]);

  const bridgeValue = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      conversation,
      setConversation,
      input,
      setInput,
      isLoading,
      setIsLoading,
      statusMessage,
      setStatusMessage,
      hasAttention,
      setHasAttention,
      proactiveInsights,
      setProactiveInsights,
      registerRuntimeApi: setRuntimeApi,
      clearRuntimeApi: () => setRuntimeApi(null),
    }),
    [
      conversation,
      hasAttention,
      input,
      isLoading,
      isOpen,
      proactiveInsights,
      statusMessage,
    ]
  );

  const value = useMemo<PresenceAgentContextValue>(
    () => ({
      isOpen,
      hasAttention: hasAttention || proactiveInsights.length > 0,
      summon,
      dismiss,
      toggle,
      conversation,
      isLoading: isLoading || (shouldLoadRuntime && !runtimeApi),
      statusMessage,
      input,
      setInput,
      send,
      applyArtifact,
      proactiveInsights,
      engageInsight,
      dismissInsight,
      devTriggerInsight,
      devResetCooldowns,
      devToolsEnabled: runtimeApi?.devToolsEnabled ?? false,
      isCoachConfigured,
      configurationMessage,
      isRuntimeLoading: shouldLoadRuntime && !runtimeApi,
    }),
    [
      applyArtifact,
      configurationMessage,
      conversation,
      devResetCooldowns,
      devTriggerInsight,
      dismiss,
      dismissInsight,
      engageInsight,
      hasAttention,
      input,
      isCoachConfigured,
      isLoading,
      isOpen,
      proactiveInsights,
      runtimeApi,
      send,
      shouldLoadRuntime,
      statusMessage,
      summon,
      toggle,
    ]
  );

  return (
    <PresenceAgentRuntimeBridgeContext.Provider value={bridgeValue}>
      <PresenceAgentContext.Provider value={value}>
        {children}
        {shouldLoadRuntime ? (
          <Suspense fallback={null}>
            <PresenceAgentRuntime />
          </Suspense>
        ) : null}
      </PresenceAgentContext.Provider>
    </PresenceAgentRuntimeBridgeContext.Provider>
  );
};
