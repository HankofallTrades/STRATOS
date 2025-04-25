import { supabase } from "@/lib/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export const AuthForm = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          console.log("User signed in:", session.user);
          // Redirect to a protected route after sign-in
          navigate("/"); // Navigate to home page after successful sign-in
        }
        // No need to handle SIGNED_OUT redirect here if we gate the app
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="w-full max-w-sm mx-auto mt-12 p-6 flex flex-col items-center">
      {/* You might want a logo or title here */}
      <h2 className="text-2xl font-semibold mb-6 text-center">Login</h2>
      <div className="w-full p-6 border rounded-lg shadow-md bg-card">
        <Auth
          supabaseClient={supabase}
          view="sign_in"
          showLinks={false}
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
        Don't have an account?{" "}
        {/* Link this to your waitlist page/modal later */}
        <Link to="/waitlist" className="underline hover:text-primary">
          Join the waitlist
        </Link>
      </p>
      {/* You could add a forgotten password link manually here if desired */}
      {/* <Link to="/forgot-password" className="mt-2 text-sm underline hover:text-primary">
        Forgot password?
      </Link> */}
    </div>
  );
}; 