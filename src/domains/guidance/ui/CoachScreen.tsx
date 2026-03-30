import { Bot, Dumbbell, Radar, Wrench } from "lucide-react";

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

  const coachSignals = [
    {
      label: configurationMessage ? "Setup required" : "Ready",
      tone: configurationMessage
        ? "border-[rgba(200,160,108,0.22)] bg-[rgba(123,94,66,0.14)] text-[#f1dec0]"
        : "border-[rgba(var(--stone-accent-rgb),0.2)] bg-[rgba(var(--stone-accent-rgb),0.12)] text-[#dff3ec]",
    },
    {
      label: "Workout builder",
      tone: "border-white/10 bg-white/[0.03] text-foreground/80",
    },
    {
      label: "Period-aware",
      tone: "border-white/10 bg-white/[0.03] text-foreground/80",
    },
  ];

  const coachCapabilities = [
    {
      description: "Generate sessions from your current block and movement volume.",
      icon: Dumbbell,
      label: "Programming",
    },
    {
      description: "Read recent work and recovery signals before suggesting changes.",
      icon: Radar,
      label: "Context",
    },
    {
      description: "Pull tools when the answer needs more than text.",
      icon: Wrench,
      label: "Execution",
    },
  ];

  return (
    <div className="app-page flex h-[calc(100svh-5rem)] max-w-6xl flex-col gap-5 pb-24 pt-4 md:h-[calc(100svh-1rem)] md:gap-6 md:pb-8 md:pt-6">
      <section className="stone-panel stone-panel-hero relative shrink-0 overflow-hidden rounded-[30px] px-5 py-6 md:px-6 md:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-14 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(var(--stone-accent-rgb),0.22)_0%,rgba(var(--stone-accent-rgb),0)_72%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(200,160,108,0.12)_0%,rgba(200,160,108,0)_72%)]"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="app-kicker">Coach</div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 verdigris-text" />
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Ask for training signal.
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
              STRATOS Coach can reason over your recent work, current period,
              and recovery context before it answers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {coachSignals.map(signal => (
              <div
                key={signal.label}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${signal.tone}`}
              >
                {signal.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-6 grid gap-4 border-t border-white/8 pt-5 md:grid-cols-3">
          {coachCapabilities.map(({ description, icon: Icon, label }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 verdigris-text" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

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
