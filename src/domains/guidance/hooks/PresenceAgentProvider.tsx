import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  createCoachErrorMessage,
  createCoachToolResultMessage,
  createCoachUserMessage,
  isClientCoachToolCallMessage,
  type CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";
import { buildScreenContext } from "@/domains/guidance/agent/screenContext";
import { sendCoachMessage } from "@/domains/guidance/agent/transport";
import { executeCoachTool, getCoachToolLabel } from "@/domains/guidance/agent/tools";
import { useProposeWorkout } from "@/domains/guidance/hooks/useWorkoutGenerator";
import {
  buildMissingProviderConfigurationMessage,
  providerRequiresApiKey,
  readLlmPreferences,
} from "@/domains/guidance/data/llmPreferences";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import {
  selectCurrentWorkout,
  selectIsWorkoutActive,
  startWorkout,
} from "@/state/workout/workoutSlice";
import {
  PresenceAgentContext,
  type PresenceAgentContextValue,
} from "@/domains/guidance/hooks/usePresenceAgent";

export const PresenceAgentProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);
  const currentWorkout = useAppSelector(selectCurrentWorkout);

  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<CoachConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasAttention, setHasAttention] = useState(false);
  const conversationRef = useRef<CoachConversationMessage[]>([]);
  conversationRef.current = conversation;
  const seenAgentCountRef = useRef(0);

  // Attention = an agent message or an actionable artifact arrived while the
  // surface was closed. Reset whenever the user opens the surface.
  useEffect(() => {
    const agentCount = conversation.filter(
      (message) =>
        message.kind === "assistant" ||
        (message.kind === "tool_result" && Boolean(message.output.artifact))
    ).length;
    if (isOpen) {
      seenAgentCountRef.current = agentCount;
      setHasAttention(false);
    } else if (agentCount > seenAgentCountRef.current) {
      setHasAttention(true);
    }
  }, [conversation, isOpen]);

  const proposeWorkout = useProposeWorkout();

  const llmPreferences = readLlmPreferences();
  const isCoachConfigured = !providerRequiresApiKey(llmPreferences.provider);
  const configurationMessage = isCoachConfigured
    ? null
    : buildMissingProviderConfigurationMessage(llmPreferences.provider);

  const summon = useCallback(() => setIsOpen(true), []);
  const dismiss = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((open) => !open), []);

  const applyWorkoutDraft = useCallback(
    (startWorkoutPayload: Record<string, unknown>) => {
      dispatch(startWorkout(startWorkoutPayload as never));
      setIsOpen(false);
      navigate("/workout");
    },
    [dispatch, navigate]
  );

  const send = useCallback(
    async (textArg?: string) => {
      if (isLoading) return;
      const messageToSend = (textArg ?? input).trim();
      if (!messageToSend) return;

      const { model, provider } = readLlmPreferences();
      if (providerRequiresApiKey(provider)) {
        const missing = buildMissingProviderConfigurationMessage(provider);
        toast.error(missing);
        setConversation((prev) => [...prev, createCoachErrorMessage(missing ?? "Coach is not configured.")]);
        return;
      }

      const screenContext = buildScreenContext({
        route: location.pathname,
        workoutInProgress: isWorkoutActive,
        activeWorkoutId: currentWorkout?.id ?? null,
      });

      let nextConversation = [
        ...conversationRef.current,
        createCoachUserMessage(messageToSend),
      ];
      let pendingNavigation: string | undefined;
      setConversation(nextConversation);
      setInput("");
      setIsLoading(true);
      setStatusMessage("Coach is reviewing your training context...");

      try {
        for (let step = 0; step < 4; step += 1) {
          const agentResponse = await sendCoachMessage({
            auth: { supabaseAccessToken: session?.access_token ?? null },
            messages: nextConversation,
            provider,
            model,
            screenContext,
          });

          if (agentResponse.messages.length > 0) {
            nextConversation = [...nextConversation, ...agentResponse.messages];
            setConversation(nextConversation);
          }

          if (agentResponse.status !== "client_tool_required") {
            setStatusMessage(null);
            return;
          }

          const clientToolCalls = agentResponse.messages.filter(
            isClientCoachToolCallMessage
          );
          if (clientToolCalls.length === 0) {
            throw new Error(
              "Coach requested a client tool without returning a client tool call."
            );
          }

          setStatusMessage(
            `Running ${getCoachToolLabel(clientToolCalls[0].toolName)}...`
          );

          const toolResults = await Promise.all(
            clientToolCalls.map(async (toolCall) => {
              try {
                const result = await executeCoachTool(toolCall, {
                  proposeWorkout,
                });
                if (result.nextRoute) pendingNavigation = result.nextRoute;
                return createCoachToolResultMessage({
                  execution: toolCall.execution,
                  output: result,
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                });
              } catch (error) {
                return createCoachToolResultMessage({
                  execution: toolCall.execution,
                  isError: true,
                  output: {
                    message:
                      error instanceof Error
                        ? error.message
                        : "Coach tool execution failed.",
                  },
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                });
              }
            })
          );

          nextConversation = [...nextConversation, ...toolResults];
          setConversation(nextConversation);
          setStatusMessage("Coach is finalizing...");
        }
        throw new Error("Coach exceeded the client tool loop limit.");
      } catch (error) {
        setConversation((prev) => [
          ...prev,
          createCoachErrorMessage(
            `Sorry, I hit an error: ${
              error instanceof Error ? error.message : "Unknown error"
            }.`
          ),
        ]);
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
        if (pendingNavigation) {
          setIsOpen(false);
          navigate(pendingNavigation);
        }
      }
    },
    [
      currentWorkout?.id,
      input,
      isLoading,
      isWorkoutActive,
      location.pathname,
      navigate,
      proposeWorkout,
      session?.access_token,
    ]
  );

  const value = useMemo<PresenceAgentContextValue>(
    () => ({
      isOpen,
      hasAttention,
      summon,
      dismiss,
      toggle,
      conversation,
      isLoading,
      statusMessage,
      input,
      setInput,
      send,
      applyWorkoutDraft,
      isCoachConfigured,
      configurationMessage,
    }),
    [
      applyWorkoutDraft,
      configurationMessage,
      conversation,
      dismiss,
      hasAttention,
      input,
      isCoachConfigured,
      isLoading,
      isOpen,
      send,
      statusMessage,
      summon,
      toggle,
    ]
  );

  return (
    <PresenceAgentContext.Provider value={value}>
      {children}
    </PresenceAgentContext.Provider>
  );
};
