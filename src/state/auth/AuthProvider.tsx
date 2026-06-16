import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  hasSupabaseBrowserConfig,
  loadSupabaseBrowserClient,
} from '@/lib/integrations/supabase/browserClient';
import { OnboardingDialog } from '@/domains/account/ui/OnboardingDialog';
import { useOnboardingPrompt } from '@/state/auth/hooks/useOnboardingPrompt';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  triggerOnboarding: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    showOnboarding,
    setShowOnboarding,
    triggerOnboarding,
    markOnboardingComplete,
  } = useOnboardingPrompt(user, loading);

  useEffect(() => {
    let isActive = true;
    let unsubscribe = () => undefined;

    void loadSupabaseBrowserClient()
      .then((supabase) => {
        if (!supabase) {
          if (isActive) setLoading(false);
          return;
        }

        supabase.auth
          .getSession()
          .then(({ data: { session: initialSession } }) => {
            if (!isActive) return;
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            setLoading(false);
          })
          .catch(() => {
            if (isActive) {
              setLoading(false);
            }
          });

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (!isActive) return;
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          if (event !== 'INITIAL_SESSION') {
            setLoading(false);
          }
        });

        unsubscribe = () => {
          subscription?.unsubscribe();
        };
      })
      .catch(() => {
        if (!isActive) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = await loadSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signOut,
        triggerOnboarding,
      }}
    >
      {children}
      {hasSupabaseBrowserConfig ? (
        <OnboardingDialog
          open={showOnboarding}
          onOpenChange={setShowOnboarding}
          onComplete={markOnboardingComplete}
        />
      ) : null}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
