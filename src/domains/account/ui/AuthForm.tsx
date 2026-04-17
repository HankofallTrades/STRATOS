import { supabase } from "@/lib/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/state/auth/AuthProvider";

const GOOGLE_PROVIDER_DISABLED_ERROR = "Unsupported provider";

const GoogleLogo = () => (
  <svg
    aria-hidden="true"
    className="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21.805 12.23c0-.72-.065-1.41-.186-2.07H12v3.92h5.498a4.703 4.703 0 0 1-2.037 3.084v2.56h3.298c1.93-1.777 3.046-4.398 3.046-7.494Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.755 0 5.065-.913 6.753-2.476l-3.298-2.56c-.913.613-2.082.976-3.455.976-2.655 0-4.905-1.792-5.71-4.201H2.88v2.641A9.997 9.997 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path
      d="M6.29 13.74A5.993 5.993 0 0 1 5.971 12c0-.604.108-1.19.318-1.74V7.619H2.88A9.997 9.997 0 0 0 2 12c0 1.61.385 3.135 1.08 4.38l3.21-2.64Z"
      fill="#FBBC05"
    />
    <path
      d="M12 6.06c1.499 0 2.844.516 3.904 1.53l2.927-2.927C17.06 3.013 14.75 2 12 2a9.997 9.997 0 0 0-9.12 5.619l3.41 2.641C7.095 7.852 9.345 6.06 12 6.06Z"
      fill="#EA4335"
    />
  </svg>
);

export const AuthForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  const handleGoogleSignIn = async () => {
    setGoogleError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (!error) {
      return;
    }

    if (error.message.includes(GOOGLE_PROVIDER_DISABLED_ERROR)) {
      setGoogleError(
        "Google sign-in is not enabled yet. In Supabase, enable Google under Authentication → Providers and add this app URL as a redirect.",
      );
      return;
    }

    setGoogleError(error.message);
  };

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-8 lg:px-10">
        <div className="w-full space-y-4">
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

          <button
            type="button"
            className="stratos-auth-button stratos-google-button"
            onClick={handleGoogleSignIn}
          >
            <GoogleLogo />
            <span>Continue with Google</span>
          </button>

          {googleError ? (
            <p className="stratos-auth-message text-sm">{googleError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
