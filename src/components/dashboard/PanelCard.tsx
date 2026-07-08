import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PanelCardProps = {
  title: string;
  accent: string;
  to: string;
  className?: string;
  children: ReactNode;
};

export default function PanelCard({ title, accent, to, className, children }: PanelCardProps) {
  return (
    <Card className={cn("col-span-12 rounded-3xl border-zinc-100 shadow-sm shadow-zinc-950/[0.02]", className)}>
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 space-y-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", accent)} />
          <CardTitle className="truncate text-sm font-semibold">{title}</CardTitle>
        </div>
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-dark hover:underline"
        >
          Open <ArrowUpRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}