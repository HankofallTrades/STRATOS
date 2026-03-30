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
      navigate("/");
    }
  }, [navigate, user]);

  return (
    <div className="w-full max-w-sm mx-auto mt-12 p-6 flex flex-col items-center">
      {/* You might want a logo or title here */}
      <h2 className="text-2xl font-semibold mb-6 text-center">
        Sign In or Create Account
      </h2>
      <div className="w-full p-6 border rounded-lg shadow-md bg-card">
        <Auth
          supabaseClient={supabase}
          view="sign_in"
          showLinks={true}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  inputLabelText: "hsl(var(--muted-foreground))",
                  inputText: "hsl(var(--foreground))",
                  inputPlaceholder: "hsl(var(--muted-foreground))",
                },
              },
            },
          }}
        />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Use email and password to sign in or create your own account. Coach
        provider settings are available after login under Settings.
      </p>
      {/* You could add a forgotten password link manually here if desired */}
      {/* <Link to="/forgot-password" className="mt-2 text-sm underline hover:text-primary">
        Forgot password?
      </Link> */}
    </div>
  );
}; 
