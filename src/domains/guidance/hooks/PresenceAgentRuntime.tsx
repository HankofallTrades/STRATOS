import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  createCoachErrorMessage,
  createCoachToolResultMessage,
  createCoachUserMessage,
  isClientCoachToolCallMessage,
  type CoachArtifact,
  type CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";
import { buildScreenContext } from "@/domains/guidance/agent/screenContext";
import { sendCoachMessage } from "@/domains/guidance/agent/transport";
import {
  getCoachToolLabel,
  type ClientCoachToolName,
} from "@/domains/guidance/agent/tools";
import { useClientCoachToolRunners } from "@/domains/guidance/hooks/useClientCoachToolRunners";
import { useProactiveEngine } from "@/domains/guidance/hooks/useProactiveEngine";
import { useCoachMutations } from "@/domains/guidance/hooks/useCoachMutations";
import { useIsDeveloper } from "@/domains/account/hooks/useIsDeveloper";
import {
  buildMissingProviderConfigurationMessage,
  providerRequiresApiKey,
  readLlmPreferences,
} from "@/domains/guidance/data/llmPreferences";
import { readProviderApiKey } from "@/domains/guidance/data/providerKeyStore";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import {
  selectCurrentWorkout,
  selectIsWorkoutActive,
  startWorkout,
} from "@/state/workout/workoutSlice";
import {
  usePresenceAgentRuntimeBridge,
  type PresenceAgentRuntimeApi,
} from "@/domains/guidance/hooks/usePresenceAgent";

const PresenceAgentRuntime = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const {
    clearRuntimeApi,
    conversation,
    input,
    isLoading,
    isOpen,
    registerRuntimeApi,
    setConversation,
    setHasAttention,
    setInput,
    setIsLoading,
    setIsOpen,
    setProactiveInsights,
    setStatusMessage,
  } = usePresenceAgentRuntimeBridge();

  const conversationRef = useRef<CoachConversationMessage[]>([]);
  conversationRef.current = conversation;
  const seenAgentCountRef = useRef(0);

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
  }, [conversation, isOpen, setHasAttention]);

  const clientToolRunners = useClientCoachToolRunners();
  const { applyMutation } = useCoachMutations();

  const applyWorkoutDraft = useCallback(
    (startWorkoutPayload: Record<string, unknown>) => {
      dispatch(startWorkout(startWorkoutPayload as never));
      setIsOpen(false);
      navigate("/workout");
    },
    [dispatch, navigate, setIsOpen]
  );

  const applyArtifact = useCallback(
    (artifact: CoachArtifact): void | Promise<void> => {
      const appliers: {
        [T in CoachArtifact["type"]]:
          | ((artifact: Extract<CoachArtifact, { type: T }>) => void | Promise<void>)
          | null;
      } = {
        volume_chart: null,
        workout_draft: (a) => applyWorkoutDraft(a.apply.startWorkoutPayload),
        program_draft: (a) => applyMutation("program_created", a.apply),
        program_edit: (a) => applyMutation("program_edited", a.apply),
        workout_edit: (a) => applyMutation("workout_edited", a.apply),
      };
      const applier = appliers[artifact.type] as
        | ((artifact: CoachArtifact) => void | Promise<void>)
        | null;
      return applier?.(artifact);
    },
    [applyMutation, applyWorkoutDraft]
  );

  const send = useCallback(
    async (textArg?: string) => {
      if (isLoading) return;
      const messageToSend = (textArg ?? input).trim();
      if (!messageToSend) return;

      const { model, provider } = readLlmPreferences();
      if (providerRequiresApiKey(provider) && !readProviderApiKey(provider)) {
        const missing = buildMissingProviderConfigurationMessage(provider);
        toast.error(missing);
        setConversation((prev) => [
          ...prev,
          createCoachErrorMessage(missing ?? "Coach is not configured."),
        ]);
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
                const runTool =
                  clientToolRunners[toolCall.toolName as ClientCoachToolName];
                if (!runTool) {
                  throw new Error(
                    `No client runner for Coach tool ${toolCall.toolName}.`
                  );
                }
                const result = await runTool(toolCall.input);
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
      clientToolRunners,
      currentWorkout?.id,
      input,
      isLoading,
      isWorkoutActive,
      location.pathname,
      navigate,
      session?.access_token,
      setConversation,
      setInput,
      setIsLoading,
      setIsOpen,
      setStatusMessage,
    ]
  );

  const summon = useCallback(() => setIsOpen(true), [setIsOpen]);
  const {
    insights,
    engageInsight,
    dismissInsight,
    devTriggerInsight,
    devResetCooldowns,
  } = useProactiveEngine({ summon, send, isLoading });

  useEffect(() => {
    setProactiveInsights(insights);
  }, [insights, setProactiveInsights]);

  const devToolsEnabled = useIsDeveloper();

  const runtimeApi = useMemo<PresenceAgentRuntimeApi>(
    () => ({
      applyArtifact,
      dismissInsight,
      engageInsight,
      devResetCooldowns,
      devToolsEnabled,
      devTriggerInsight,
      send,
    }),
    [
      applyArtifact,
      dismissInsight,
      engageInsight,
      devResetCooldowns,
      devToolsEnabled,
      devTriggerInsight,
      send,
    ]
  );

  useEffect(() => {
    registerRuntimeApi(runtimeApi);
    return clearRuntimeApi;
  }, [clearRuntimeApi, registerRuntimeApi, runtimeApi]);

  return null;
};

export default PresenceAgentRuntime;
