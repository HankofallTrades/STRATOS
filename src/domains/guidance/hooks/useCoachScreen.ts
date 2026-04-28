import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  fetchWeeklyArchetypeSets,
  type WeeklyArchetypeSetData,
} from "@/domains/analytics/data/analyticsRepository";
import {
  buildVolumeProgressDisplayData,
  getCurrentWeekRange,
} from "@/domains/analytics/hooks/useVolumeChart";
import {
  createCoachErrorMessage,
  createCoachToolResultMessage,
  createCoachUserMessage,
  isClientCoachToolCallMessage,
  type CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";
import { sendCoachMessage } from "@/domains/guidance/agent/transport";
import {
  executeCoachTool,
  getCoachToolLabel,
} from "@/domains/guidance/agent/tools";
import {
  fetchGuidanceExercises,
  fetchMovementArchetypes,
} from "@/domains/guidance/data/guidanceRepository";
import {
  buildMissingProviderConfigurationMessage,
  providerRequiresApiKey,
  readLlmPreferences,
} from "@/domains/guidance/data/llmPreferences";
import { fetchProviderCredentialStatus } from "@/domains/guidance/data/providerCredentialRepository";
import { generateStrengthWorkout } from "@/domains/guidance/hooks/useWorkoutGenerator";
import { getActiveMesocycleProgram } from "@/domains/periodization/data/repository";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import type { PrimerButton } from "@/domains/guidance/ui/ChatPrimers";
import type { ChatMessage } from "@/lib/llm/llmClient";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectWorkoutHistory } from "@/state/history/historySlice";

export const useCoachScreen = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, user } = useAuth();
  const workoutHistory = useAppSelector(selectWorkoutHistory);
  const [conversation, setConversation] = useState<CoachConversationMessage[]>(
    []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const llmPreferences = readLlmPreferences();
  const [hasStoredProviderCredential, setHasStoredProviderCredential] =
    useState(!providerRequiresApiKey(llmPreferences.provider));
  const [isProviderCredentialLoading, setIsProviderCredentialLoading] =
    useState(providerRequiresApiKey(llmPreferences.provider));
  const configurationMessage =
    !providerRequiresApiKey(llmPreferences.provider) ||
    isProviderCredentialLoading ||
    hasStoredProviderCredential
      ? null
      : buildMissingProviderConfigurationMessage(llmPreferences.provider);
  const isCoachConfigured =
    !providerRequiresApiKey(llmPreferences.provider) || hasStoredProviderCredential;
  const hasShownConfigurationToastRef = useRef(false);

  useEffect(() => {
    hasShownConfigurationToastRef.current = false;
  }, [configurationMessage]);

  useEffect(() => {
    if (!providerRequiresApiKey(llmPreferences.provider)) {
      setHasStoredProviderCredential(true);
      setIsProviderCredentialLoading(false);
      return;
    }

    if (!session?.access_token) {
      setHasStoredProviderCredential(false);
      setIsProviderCredentialLoading(false);
      return;
    }

    setIsProviderCredentialLoading(true);
    let isCancelled = false;

    void fetchProviderCredentialStatus({
      accessToken: session.access_token,
      provider: llmPreferences.provider,
    })
      .then(status => {
        if (!isCancelled) {
          setHasStoredProviderCredential(status.hasStoredCredential);
        }
      })
      .catch(error => {
        console.error("Error fetching provider credential status:", error);
        if (!isCancelled) {
          setHasStoredProviderCredential(false);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsProviderCredentialLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [llmPreferences.provider, session?.access_token]);

  const generateWorkoutOnDemand = async () => {
    const userId = user?.id ?? null;
    const weekRange = getCurrentWeekRange();

    const [baseExercises, movementArchetypes, activeProgram, weeklyArchetypeSets] =
      await Promise.all([
        queryClient.ensureQueryData({
          queryKey: ["exercises"],
          queryFn: fetchGuidanceExercises,
          staleTime: Infinity,
        }),
        queryClient.ensureQueryData({
          queryKey: ["movementArchetypes"],
          queryFn: fetchMovementArchetypes,
          staleTime: Infinity,
        }),
        userId
          ? queryClient.ensureQueryData({
              queryKey: ["activeMesocycleProgram", userId],
              queryFn: () => getActiveMesocycleProgram(userId),
              staleTime: 60 * 1000,
            })
          : Promise.resolve(null),
        userId
          ? queryClient.ensureQueryData({
              queryKey: [
                "weeklyArchetypeSets_v2",
                userId,
                weekRange.start,
                weekRange.end,
              ],
              queryFn: () =>
                fetchWeeklyArchetypeSets(userId, weekRange.start, weekRange.end),
              staleTime: 5 * 60 * 1000,
            })
          : Promise.resolve([] as WeeklyArchetypeSetData[]),
      ]);

    return generateStrengthWorkout({
      baseExercises,
      dispatch,
      movementArchetypes,
      planningContext: {
        activeProgram,
        volumeProgress: buildVolumeProgressDisplayData(weeklyArchetypeSets),
      },
      userId,
      workoutHistory,
    });
  };

  const handleSend = async (textOrEvent?: string | FormEvent<HTMLFormElement>) => {
    let messageToSend = "";

    if (isLoading) {
      return;
    }

    if (typeof textOrEvent === "string") {
      messageToSend = textOrEvent.trim();
    } else {
      textOrEvent?.preventDefault();
      messageToSend = input.trim();
    }

    if (!messageToSend) {
      return;
    }

    const { model, provider } = readLlmPreferences();

    if (providerRequiresApiKey(provider) && isProviderCredentialLoading) {
      toast.error("Checking your saved Coach provider key. Try again in a moment.");
      return;
    }

    const missingConfigurationMessage =
      providerRequiresApiKey(provider) && !hasStoredProviderCredential
        ? buildMissingProviderConfigurationMessage(provider)
        : null;

    if (missingConfigurationMessage) {
      const errorMessage = createCoachErrorMessage(missingConfigurationMessage);
      toast.error(missingConfigurationMessage);
      setConversation(previousMessages => [...previousMessages, errorMessage]);
      return;
    }

    const userMessage = createCoachUserMessage(messageToSend);
    let nextConversation = [...conversation, userMessage];
    let pendingNavigation: string | undefined;

    setConversation(nextConversation);
    setInput("");
    setIsLoading(true);
    setStatusMessage("Coach is reviewing your training context...");

    try {
      for (let step = 0; step < 4; step += 1) {
        const agentResponse = await sendCoachMessage({
          auth: {
            supabaseAccessToken: session?.access_token ?? null,
          },
          messages: nextConversation,
          provider,
          model,
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
            "Coach agent requested client tool execution without returning a client tool call."
          );
        }

        setStatusMessage(
          `Running ${getCoachToolLabel(clientToolCalls[0].toolName)}...`
        );

        const toolResults = await Promise.all(clientToolCalls.map(async toolCall => {
          try {
            const result = await executeCoachTool(toolCall, {
              generateWorkout: generateWorkoutOnDemand,
            });

            if (result.nextRoute) {
              pendingNavigation = result.nextRoute;
            }

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
        }));

        nextConversation = [...nextConversation, ...toolResults];
        setConversation(nextConversation);
        setStatusMessage("Coach is finalizing the workout plan...");
      }

      throw new Error("Coach agent exceeded the client tool loop limit.");
    } catch (error) {
      console.error("Error running coach agent:", error);
      const errorMessage = createCoachErrorMessage(
        `Sorry, I encountered an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`
      );
      setConversation(previousMessages => [...previousMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
      if (pendingNavigation) {
        navigate(pendingNavigation);
      }
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleInputFocus = () => {
    if (!configurationMessage || hasShownConfigurationToastRef.current) {
      return;
    }

    toast.error(configurationMessage);
    hasShownConfigurationToastRef.current = true;
  };

  const messages: ChatMessage[] = conversation.reduce<ChatMessage[]>(
    (visibleMessages, message) => {
      switch (message.kind) {
        case "user":
          visibleMessages.push({ content: message.content, role: "user" });
          return visibleMessages;
        case "assistant":
        case "error":
          visibleMessages.push({
            content: message.content,
            role: "assistant",
          });
          return visibleMessages;
        case "tool_call":
        case "tool_result":
          return visibleMessages;
        default:
          return visibleMessages;
      }
    },
    []
  );

  const showPrimers = !conversation.some(message => message.kind === "user");

  const primerButtons: PrimerButton[] = [
    {
      label: "Next workout",
      onClick: () => {
        void handleSend(
          "Create a workout based on my current period and movement archetype volume."
        );
      },
      disabled:
        isLoading ||
        !isCoachConfigured ||
        isProviderCredentialLoading,
    },
    {
      label: "Hypertrophy",
      onClick: () => {
        void handleSend(
          "How can I improve hypertrophy with my current training setup?"
        );
      },
      disabled: isLoading || !isCoachConfigured || isProviderCredentialLoading,
    },
    {
      label: "Recovery",
      onClick: () => {
        void handleSend("What should I do for post-workout recovery?");
      },
      disabled: isLoading || !isCoachConfigured || isProviderCredentialLoading,
    },
  ];

  return {
    configurationMessage,
    conversation,
    handleInputChange,
    handleInputFocus,
    handleSend,
    input,
    isLoading,
    messages,
    primerButtons,
    showPrimers,
    statusMessage,
  };
};
