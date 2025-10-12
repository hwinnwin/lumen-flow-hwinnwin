import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { LogIn, UserPlus, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import lumenLogo from "@/assets/lumen-logo.png";
import { logger } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [signupForm, setSignupForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const authLogger = logger.forComponent('Auth');
    
    try {
      authLogger.debug('Login form validation started', {
        operation: 'handleLogin',
        context: { email: loginForm.email }
      });
      
      loginSchema.parse(loginForm);
      setLoading(true);

      authLogger.info('Login form validated, calling signIn', {
        operation: 'handleLogin',
        context: { email: loginForm.email }
      });

      const { error } = await signIn(loginForm.email, loginForm.password);

      if (error) {
        authLogger.error('Login error received from AuthContext', {
          operation: 'handleLogin',
          error,
          context: { 
            email: loginForm.email,
            errorMessage: error.message 
          }
        });
        
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login failed",
            description: "Invalid email or password",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      authLogger.info('Login successful, redirecting', {
        operation: 'handleLogin',
        context: { email: loginForm.email }
      });

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in",
      });
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        authLogger.warn('Login form validation failed', {
          operation: 'handleLogin',
          error,
          context: { 
            email: loginForm.email,
            validationErrors: error.issues 
          }
        });
        
        toast({
          title: "Validation error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        authLogger.error('Unexpected error during login', {
          operation: 'handleLogin',
          error,
          context: { email: loginForm.email }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const authLogger = logger.forComponent('Auth');
    
    try {
      authLogger.debug('Signup form validation started', {
        operation: 'handleSignup',
        context: { 
          email: signupForm.email,
          fullName: signupForm.fullName 
        }
      });
      
      signupSchema.parse(signupForm);
      setLoading(true);

      authLogger.info('Signup form validated, calling signUp', {
        operation: 'handleSignup',
        context: { 
          email: signupForm.email,
          fullName: signupForm.fullName 
        }
      });

      const { error } = await signUp(
        signupForm.email,
        signupForm.password,
        signupForm.fullName
      );

      if (error) {
        authLogger.error('Signup error received from AuthContext', {
          operation: 'handleSignup',
          error,
          context: { 
            email: signupForm.email,
            fullName: signupForm.fullName,
            errorMessage: error.message,
            errorStatus: error.status 
          }
        });
        
        if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      authLogger.info('Signup successful, redirecting', {
        operation: 'handleSignup',
        context: { 
          email: signupForm.email,
          fullName: signupForm.fullName 
        }
      });

      toast({
        title: "Account created!",
        description: "Welcome to Lumen Flow",
      });
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        authLogger.warn('Signup form validation failed', {
          operation: 'handleSignup',
          error,
          context: { 
            email: signupForm.email,
            fullName: signupForm.fullName,
            validationErrors: error.issues 
          }
        });
        
        toast({
          title: "Validation error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      } else {
        authLogger.error('Unexpected error during signup', {
          operation: 'handleSignup',
          error,
          context: { 
            email: signupForm.email,
            fullName: signupForm.fullName 
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const authLogger = logger.forComponent('Auth');
    
    authLogger.info('Google sign-in button clicked', {
      operation: 'handleGoogleSignIn'
    });
    
    setLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      authLogger.error('Google sign-in failed', {
        operation: 'handleGoogleSignIn',
        error
      });
      
      toast({
        title: "Google sign-in failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-subtle">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <img 
                src={lumenLogo} 
                alt="Lumen Flow" 
                className="w-16 h-16 rounded-xl shadow-glow"
              />
              <div className="absolute inset-0 bg-gradient-glow opacity-30 rounded-xl" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
              Lumen Flow
            </CardTitle>
            <CardDescription className="mt-2">
              Your AI-powered knowledge & workflow organizer
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={isLogin ? "login" : "signup"} onValueChange={(v) => setIsLogin(v === "login")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup">
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary shadow-royal hover:shadow-glow transition-royal"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Google
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary shadow-royal hover:shadow-glow transition-royal"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}