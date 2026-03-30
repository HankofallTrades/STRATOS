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
  } =
    useCoachScreen();

  return (
    <div className="fixed inset-x-0 bottom-16 top-0 overflow-hidden">
      <div className="mx-auto flex h-full max-w-screen-md flex-col pt-4">
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
          className="min-h-0 flex-grow"
        />
      </div>
    </div>
  );
};

export default CoachScreen;
