import Chat from "@/domains/guidance/ui/Chat";
import { useCoachScreen } from "@/domains/guidance/hooks/useCoachScreen";

const CoachScreen = () => {
  const {
    messages,
    input,
    isLoading,
    handleInputChange,
    handleSend,
    primerButtons,
    showPrimers,
  } =
    useCoachScreen();

  return (
    <div className="fixed inset-x-0 bottom-16 top-0 overflow-hidden">
      <div className="mx-auto flex h-full max-w-screen-md flex-col pt-4">
        <Chat
          messages={messages}
          input={input}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onSendMessage={handleSend}
          primerButtons={primerButtons}
          showPrimers={showPrimers}
          className="min-h-0 flex-grow"
        />
      </div>
    </div>
  );
};

export default CoachScreen;
