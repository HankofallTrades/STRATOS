import { supabase } from "@/lib/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { BarChart3, Bot, Dumbbell, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/state/auth/AuthProvider";

export const AuthForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  const productPillars = [
    {
      description: "Log sessions and track your training block.",
      icon: Dumbbell,
      label: "Training",
    },
    {
      description: "PRs, volume, and recovery in one place.",
      icon: BarChart3,
      label: "Analytics",
    },
    {
      description: "AI coaching with full context of your training.",
      icon: Bot,
      label: "Coach",
    },
  ];

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-center">
          <section className="stone-panel stone-panel-hero relative overflow-hidden rounded-[32px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(var(--stone-accent-rgb),0.24)_0%,rgba(var(--stone-accent-rgb),0)_72%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-8 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(200,160,108,0.14)_0%,rgba(200,160,108,0)_72%)]"
            />

            <div className="relative space-y-8">
              <div className="max-w-2xl space-y-3">
                <div className="app-kicker">STRATOS</div>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Return to the performance system.
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                  Training, recovery, analytics, and Coach all live behind one
                  focused interface.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                {productPillars.map(({ description, icon: Icon, label }) => (
                  <div key={label} className="space-y-2">
                    <Icon className="h-4 w-4 verdigris-text" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {label}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/8 pt-5">
                <div className="flex max-w-xl items-start gap-3 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 warm-metal-text" />
                  <p className="leading-6">
                    Coach is optional — configure a provider key in Settings after signing in.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="stone-surface rounded-[30px] p-6 sm:p-8">
            <div className="space-y-2">
              <div className="app-kicker">Account</div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Continue into STRATOS
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Sign in or create an account.
              </p>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-4 sm:p-5">
              <Auth
                supabaseClient={supabase}
                view="sign_in"
                showLinks={true}
                providers={[]}
                dark={true}
                localization={{
                  variables: {
                    forgotten_password: {
                      button_label: "Send reset link",
                      confirmation_text:
                        "Check your email for the reset link.",
                      email_input_placeholder: "you@domain.com",
                    },
                    sign_in: {
                      button_label: "Sign In",
                      email_input_placeholder: "you@domain.com",
                      password_input_placeholder: "Your password",
                    },
                    sign_up: {
                      button_label: "Create Account",
                      email_input_placeholder: "you@domain.com",
                      password_input_placeholder: "Create a password",
                    },
                  },
                }}
                appearance={{
                  theme: ThemeSupa,
                  className: {
                    anchor: "stratos-auth-anchor",
                    button: "stratos-auth-button",
                    container: "stratos-auth-container",
                    divider: "stratos-auth-divider",
                    input: "stratos-auth-input",
                    label: "stratos-auth-label",
                    message: "stratos-auth-message",
                  },
                  variables: {
                    default: {
                      colors: {
                        anchorTextColor: "var(--stone-accent-text)",
                        anchorTextHoverColor: "#dff3ec",
                        brand: "var(--stone-accent)",
                        brandAccent: "var(--stone-accent-hover)",
                        brandButtonText: "#eef7f4",
                        defaultButtonBackground: "rgba(255,255,255,0.03)",
                        defaultButtonBackgroundHover: "rgba(255,255,255,0.05)",
                        defaultButtonBorder: "rgba(91,105,97,0.15)",
                        defaultButtonText: "#eef7f4",
                        dividerBackground: "rgba(255,255,255,0.08)",
                        inputBackground: "rgba(9,13,16,0.96)",
                        inputBorder: "rgba(76,88,81,0.16)",
                        inputBorderFocus: "rgba(30,92,82,0.4)",
                        inputBorderHover: "rgba(101,119,107,0.22)",
                        inputLabelText: "rgba(214,223,218,0.58)",
                        inputPlaceholder: "rgba(214,223,218,0.55)",
                        inputText: "#f3f7f4",
                        messageBackground: "rgba(123,94,66,0.12)",
                        messageBorder: "rgba(200,160,108,0.18)",
                        messageBorderDanger: "rgba(169,71,71,0.28)",
                        messageText: "#f1dec0",
                        messageTextDanger: "#ffd4d4",
                      },
                      fontSizes: {
                        baseBodySize: "0.95rem",
                        baseButtonSize: "0.95rem",
                        baseInputSize: "0.95rem",
                        baseLabelSize: "0.72rem",
                      },
                      radii: {
                        borderRadiusButton: "1rem",
                        buttonBorderRadius: "1rem",
                        inputBorderRadius: "1rem",
                      },
                      space: {
                        anchorBottomMargin: "0",
                        buttonPadding: "0.85rem 1rem",
                        emailInputSpacing: "0.95rem",
                        inputPadding: "0.85rem 1rem",
                        labelBottomMargin: "0.45rem",
                        socialAuthSpacing: "0.85rem",
                        spaceLarge: "1rem",
                        spaceMedium: "0.85rem",
                        spaceSmall: "0.65rem",
                      },
                    },
                  },
                }}
              />
            </div>

          </section>
        </div>
      </div>
    </div>
  );
};
