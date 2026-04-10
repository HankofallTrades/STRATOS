import { supabase } from "@/lib/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
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

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-8 lg:px-10">
        <div className="w-full">
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
                    defaultButtonBackgroundHover:
                      "rgba(255,255,255,0.05)",
                    defaultButtonBorder: "rgba(91,105,97,0.15)",
                    defaultButtonText: "#eef7f4",
                    dividerBackground: "rgba(255,255,255,0.08)",
                    inputBackground: "rgba(255,255,255,0.03)",
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
      </div>
    </div>
  );
};
