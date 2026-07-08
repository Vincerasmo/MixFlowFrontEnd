import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PickleballIcon } from "@/components/icons/pickleball-icons";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-soft via-zinc-50 to-white font-sans text-zinc-900">
      <PickleballIcon className="absolute -left-16 -top-16 size-72 opacity-30" />
      <PickleballIcon className="absolute -right-24 top-1/2 size-96 opacity-20" />
      <PickleballIcon className="absolute bottom-[-4rem] left-1/3 size-56 opacity-25" />

      <div className="relative flex min-h-screen flex-col items-center justify-center p-6">
        <Card className="w-full max-w-sm rounded-3xl border-none bg-white/90 shadow-xl shadow-brand/10 ring-1 ring-black/5 backdrop-blur">
          <CardHeader className="flex flex-col items-center text-center">
            <div className="ball-bounce mb-4">
              <PickleballIcon className="size-14" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Baseline<span className="text-brand-dark">.</span>
            </CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Set up your organizer account in seconds.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Rivera"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@club.com"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-ink text-white shadow-lg shadow-ink/20 hover:bg-zinc-800"
              >
                Create account <ArrowRight className="size-4" />
              </Button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-white px-2 text-zinc-400">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="h-11 w-full rounded-xl"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </Button>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link to="/" className="font-semibold text-brand-dark underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
