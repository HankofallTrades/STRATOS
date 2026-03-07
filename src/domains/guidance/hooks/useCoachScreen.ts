import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  createCoachErrorMessage,
  createCoachToolResultMessage,
  createCoachUserMessage,
  isClientCoachToolCallMessage,
  type CoachConversationMessage,
} from "@/domains/guidance/agent/contracts";
import { sendCoachMessage } from "@/domains/guidance/agent/transport";
import {
  coachToolDefinitions,
  executeCoachTool,
} from "@/domains/guidance/agent/tools";
import { readLlmPreferences } from "@/domains/guidance/data/llmPreferences";
import { useGuidanceWorkoutCatalog } from "@/domains/guidance/hooks/useGuidanceWorkoutCatalog";
import { useWorkoutGenerator } from "@/domains/guidance/hooks/useWorkoutGenerator";
import type { PrimerButton } from "@/domains/guidance/ui/ChatPrimers";
import type { ChatMessage } from "@/lib/llm/llmClient";
import { useAuth } from "@/state/auth/AuthProvider";

export const useCoachScreen = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [conversation, setConversation] = useState<CoachConversationMessage[]>(
    []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { baseExercises, movementArchetypes, isLoading: isLoadingWorkoutCatalog } =
    useGuidanceWorkoutCatalog();
  const { generateWorkout } = useWorkoutGenerator(baseExercises, movementArchetypes);

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

    const userMessage = createCoachUserMessage(messageToSend);
    let nextConversation = [...conversation, userMessage];
    let pendingNavigation: string | undefined;

    setConversation(nextConversation);
    setInput("");
    setIsLoading(true);

    try {
      const { provider, model } = readLlmPreferences();

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

        const toolResults = clientToolCalls.map(toolCall => {
          try {
            const result = executeCoachTool(toolCall, {
              generateWorkout,
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
        });

        nextConversation = [...nextConversation, ...toolResults];
        setConversation(nextConversation);
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
      if (pendingNavigation) {
        navigate(pendingNavigation);
      }
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
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
      label: coachToolDefinitions.generate_strength_workout.label,
      onClick: () => {
        void handleSend("Generate a strength workout for me.");
      },
      disabled:
        isLoading ||
        isLoadingWorkoutCatalog ||
        !baseExercises ||
        !movementArchetypes,
    },
    {
      label: "How can I get max swol?",
      onClick: () => {
        void handleSend("How can I get max swol?");
      },
    },
    {
      label: "What can I do for post-workout recovery?",
      onClick: () => {
        void handleSend("What can I do for post-workout recovery?");
      },
    },
  ];

  return {
    handleInputChange,
    handleSend,
    input,
    isLoading,
    messages,
    primerButtons,
    showPrimers,
  };
};
