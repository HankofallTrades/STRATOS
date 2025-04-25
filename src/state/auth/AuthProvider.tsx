import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/integrations/supabase/client";

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
        console.error("Error getting initial session:", error);
        setLoading(false); // Still finish loading even if there's an error
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session);
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

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
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