import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PickleballIcon } from "@/components/icons/pickleball-icons";
import { loginWithGoogle, loginWithEmail, decodeGoogleCredential } from "@/services/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function LoginPage() {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    const handleCredential = async (credential: string) => {
      setError(null);
      setLoading(true);
      try {
        const identity = decodeGoogleCredential(credential);
        await loginWithGoogle(identity);
        navigate("/dashboard");
      } catch (err) {
        const apiErr = err as { status?: number; message?: string };
        if (apiErr.status === 404) {
          setError("No account found for this Google account. Try creating one instead.");
        } else {
          setError(apiErr.message ?? "Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    const renderGoogleButton = () => {
      if (cancelled || !window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          void handleCredential(response.credential);
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
      });
    };

    if (window.google) {
      renderGoogleButton();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          renderGoogleButton();
        }
      }, 100);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailLoading(true);
    try {
      await loginWithEmail({ email });
      navigate("/dashboard");
    } catch (err) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 404) {
        setError("No account found for this email. Try creating one instead.");
      } else {
        setError(apiErr.message ?? "Something went wrong. Please try again.");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-brand-soft via-zinc-50 to-white font-sans text-zinc-900">
      <PickleballIcon className="absolute -left-10 -top-10 size-40 opacity-20 sm:-left-16 sm:-top-16 sm:size-56 sm:opacity-25 lg:size-72 lg:opacity-30" />
      <PickleballIcon className="absolute -right-12 top-1/2 size-48 opacity-15 sm:-right-20 sm:size-64 sm:opacity-20 lg:size-96" />
      <PickleballIcon className="absolute -bottom-8 left-1/4 size-32 opacity-15 sm:left-1/3 sm:size-44 sm:opacity-20 lg:size-56 lg:opacity-25" />

      <div className="relative flex min-h-screen flex-col items-center justify-center p-6">
        <Card className="w-full max-w-sm rounded-3xl border-none bg-white/90 shadow-xl shadow-brand/10 ring-1 ring-black/5 backdrop-blur">
          <CardHeader className="flex flex-col items-center text-center">
            <div className="ball-bounce mb-4">
              <PickleballIcon spin className="size-14" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              MixFlow<span className="text-brand-dark">.</span>
            </CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Where every dink, drive, and drop shot counts.
            </p>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" disabled={emailLoading} className="w-full">
                {emailLoading ? "Logging in…" : "Log in"}
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase text-zinc-400">or</span>
              <Separator className="flex-1" />
            </div>

            <div className="flex flex-col items-center gap-2">
              {GOOGLE_CLIENT_ID ? (
                <div ref={buttonRef} />
              ) : (
                <p className="text-center text-sm text-red-500">
                  Google sign-in isn't configured. Set VITE_GOOGLE_CLIENT_ID in your .env file.
                </p>
              )}
            </div>

            {loading && <p className="text-center text-sm text-zinc-500">Signing you in…</p>}
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-center text-sm text-zinc-500">
              New organizer?{" "}
              <Link to="/register" className="font-semibold text-brand-dark underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}