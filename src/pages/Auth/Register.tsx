import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { Mail, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PickleballIcon } from "@/components/icons/pickleball-icons";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

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
              MixFlow<span className="text-brand-dark">.</span>
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

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-ink text-white shadow-lg shadow-ink/20 hover:bg-zinc-800"
              >
                Create account <ArrowRight className="size-4" />
              </Button>
            </form>
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
