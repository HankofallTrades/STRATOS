import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/integrations/supabase/client";
import { OnboardingDialog } from "@/components/features/Onboarding/OnboardingDialog";
import type { Database } from '@/lib/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as true until initial check is done
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    // Attempt to get the session initially
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false); // Initial check complete
      })
      .catch((error) => {
        // console.error("Error getting initial session:", error);
        setLoading(false); // Still finish loading even if there's an error
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // console.log("Auth state changed:", _event, session);
      setSession(session);
      setUser(session?.user ?? null);
      if (_event !== 'INITIAL_SESSION') {
        setLoading(false); // Ensure loading is false after subsequent changes
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Effect to check profile and trigger onboarding if needed
  useEffect(() => {
    // Only run if we have a user, initial auth loading is done, and we haven't checked the profile yet
    if (user && !loading && !profileChecked) {
      const checkProfile = async () => {
        console.log("Checking user profile for onboarding completion...");
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('age, height, weight, focus, preferred_weight_unit, preferred_height_unit, preferred_distance_unit') // Select all required fields
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
            console.error("Error fetching profile for onboarding check:", error);
            // Decide how to handle this - maybe retry later? For now, just log.
          } else {
            // Check if any required fields are missing (null or undefined)
            const needsOnboarding = 
              !profileData || // No profile row exists
              profileData.age === null ||
              profileData.height === null ||
              profileData.weight === null ||
              profileData.focus === null ||
              profileData.preferred_weight_unit === null ||
              profileData.preferred_height_unit === null ||
              profileData.preferred_distance_unit === null;

            if (needsOnboarding) {
              console.log("User needs onboarding.");
              setShowOnboarding(true);
            } else {
              console.log("User has completed onboarding.");
            }
          }
        } catch (err) {
          console.error("Unexpected error during profile check:", err);
        }
        setProfileChecked(true); // Mark profile as checked, even if there was an error
      };

      checkProfile();
    }

    // Reset profile check if user logs out
    if (!user) {
       setProfileChecked(false);
       setShowOnboarding(false); // Ensure dialog is closed on logout
    }

  }, [user, loading, profileChecked]);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      // console.error("Error signing out:", error);
      // Optionally handle sign-out error (e.g., show a toast)
    }
    // State will be updated by onAuthStateChange listener
    setLoading(false);
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  // Don't render children until the initial session check is complete
  return (
    <AuthContext.Provider value={value}>
      {/* {!loading && children}  // Option 1: Render children only when not loading */}
      {children}             {/* Option 2: Render children always, handle loading state in components */}

      {/* Render Onboarding Dialog conditionally */} 
      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding} // Allow closing via overlay click etc.
        onComplete={() => {
          setShowOnboarding(false); // Close dialog on successful completion
          setProfileChecked(true); // Mark as checked since they just completed it
          // Optionally: re-fetch profile data if needed elsewhere immediately
        }}
      />
    </AuthContext.Provider>
  );
};

// Custom hook to use the Auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Optional: Helper component to require authentication
type ProtectedRouteProps = {
  children: ReactNode;
  // You might add roles or permissions here later
};

// export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
//   const { session, loading } = useAuth();
//   const navigate = useNavigate(); // Assuming react-router-dom

//   useEffect(() => {
//     if (!loading && !session) {
//       navigate('/login'); // Redirect to login if not authenticated after loading
//     }
//   }, [session, loading, navigate]);

//   if (loading) {
//     // Optional: Render a loading spinner or skeleton screen
//     return <div>Loading...</div>;
//   }

//   if (!session) {
//     // Should be redirected by useEffect, but return null as a fallback
//     return null;
//   }

//   return <>{children}</>;
// }; 