import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const authLogger = logger.forComponent('AuthContext');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authLogger.info(`Auth state changed: ${event}`, {
          operation: 'authStateChange',
          context: { 
            event, 
            hasSession: !!session,
            userId: session?.user?.id 
          }
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      authLogger.debug('Initial session check', {
        operation: 'getSession',
        context: { hasSession: !!session }
      });
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const authLogger = logger.forComponent('AuthContext');
    const correlationId = `signin_${Date.now()}`;
    
    try {
      authLogger.info('Sign in attempt initiated', {
        operation: 'signIn',
        correlationId,
        context: { email }
      });
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        authLogger.error('Sign in failed', {
          operation: 'signIn',
          correlationId,
          error,
          context: { email, errorCode: error.status }
        });
      } else {
        authLogger.info('Sign in successful', {
          operation: 'signIn',
          correlationId,
          userId: data.user?.id,
          context: { email }
        });
      }
      
      return { error };
    } catch (error: any) {
      authLogger.error('Sign in exception', {
        operation: 'signIn',
        correlationId,
        error,
        context: { email }
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const authLogger = logger.forComponent('AuthContext');
    const correlationId = `signup_${Date.now()}`;
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      authLogger.info('Sign up attempt initiated', {
        operation: 'signUp',
        correlationId,
        context: { email, fullName, redirectUrl }
      });
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) {
        authLogger.error('Sign up failed', {
          operation: 'signUp',
          correlationId,
          error,
          context: { 
            email, 
            fullName,
            errorCode: error.status,
            errorMessage: error.message 
          }
        });
      } else {
        authLogger.info('Sign up successful', {
          operation: 'signUp',
          correlationId,
          userId: data.user?.id,
          context: { email, fullName }
        });
      }
      
      return { error };
    } catch (error: any) {
      authLogger.error('Sign up exception', {
        operation: 'signUp',
        correlationId,
        error,
        context: { email, fullName }
      });
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    const authLogger = logger.forComponent('AuthContext');
    const correlationId = `google_oauth_${Date.now()}`;
    
    try {
      authLogger.info('Google OAuth initiated', {
        operation: 'signInWithGoogle',
        correlationId,
        context: { redirectTo: `${window.location.origin}/` }
      });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        authLogger.error('Google OAuth failed', {
          operation: 'signInWithGoogle',
          correlationId,
          error
        });
      }
      
      return { error };
    } catch (error: any) {
      authLogger.error('Google OAuth exception', {
        operation: 'signInWithGoogle',
        correlationId,
        error
      });
      return { error };
    }
  };

  const signOut = async () => {
    const authLogger = logger.forComponent('AuthContext');
    
    try {
      authLogger.info('Sign out initiated', {
        operation: 'signOut',
        userId: user?.id
      });
      
      await supabase.auth.signOut();
      navigate("/auth");
      
      authLogger.info('Sign out successful', {
        operation: 'signOut'
      });
    } catch (error: any) {
      authLogger.error('Sign out failed', {
        operation: 'signOut',
        error
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signInWithGoogle, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}