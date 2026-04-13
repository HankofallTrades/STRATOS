import Chat from "@/domains/guidance/ui/Chat";
import { useCoachScreen } from "@/domains/guidance/hooks/useCoachScreen";

const CoachScreen = () => {
  const {
    configurationMessage,
    conversation,
    messages,
    input,
    isLoading,
    handleInputChange,
    handleInputFocus,
    handleSend,
    primerButtons,
    showPrimers,
    statusMessage,
  } = useCoachScreen();

  return (
    <div className="app-page flex h-[calc(100svh-5rem)] max-w-6xl flex-col gap-4 pb-24 pt-4 md:h-[calc(100svh-1rem)] md:gap-5 md:pb-8 md:pt-6">
      <header className="shrink-0 px-1">
        <h1 className="app-page-title">Coach</h1>
      </header>

      <div className="min-h-0 flex-1">
        <Chat
          configurationMessage={configurationMessage}
          conversation={conversation}
          messages={messages}
          input={input}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onInputFocus={handleInputFocus}
          onSendMessage={handleSend}
          primerButtons={primerButtons}
          showPrimers={showPrimers}
          statusMessage={statusMessage}
          className="min-h-0"
        />
      </div>
    </div>
  );
};

export default CoachScreen;
