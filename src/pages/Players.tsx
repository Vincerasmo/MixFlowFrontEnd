import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, MoreVertical } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getAllPlayers, createPlayer, updatePlayer, deletePlayer } from "@/services/players";
import type { PlayerDto } from "@/services/players";

const SKILL_CATEGORIES = ["Novice", "Intermediate", "Advanced"] as const;

const TIER_STYLE: Record<string, string> = {
  Advanced: "bg-ink text-white",
  Intermediate: "bg-brand text-zinc-900",
  Novice: "bg-zinc-200 text-zinc-700",
};

const emptyForm = { fullName: "", skillCategory: "Novice" as string };

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlayerDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPlayers();
      setPlayers(data);
    } catch {
      setError("Couldn't load players.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      const matchesSearch = !q || p.fullName.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "All" || p.skillCategory === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [players, search, categoryFilter]);

  const openAddDialog = () => {
    setEditingPlayer(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (player: PlayerDto) => {
    setEditingPlayer(player);
    setForm({ fullName: player.fullName, skillCategory: player.skillCategory });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      if (editingPlayer) {
        await updatePlayer(editingPlayer.playerId, {
          fullName: form.fullName,
          skillCategory: form.skillCategory,
        });
      } else {
        await createPlayer({
          fullName: form.fullName,
          skillCategory: form.skillCategory,
        });
      }
      setDialogOpen(false);
      await loadPlayers();
    } catch (err) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message ?? "Couldn't save this player. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlayer(deleteTarget.playerId);
      setDeleteTarget(null);
      await loadPlayers();
    } catch {
      setError("Couldn't delete that player. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Roster"
        title="Players"
        subtitle={`${players.length} member${players.length === 1 ? "" : "s"} across ${SKILL_CATEGORIES.length} skill tiers.`}
        action={
          <Button
            onClick={openAddDialog}
            className="shrink-0 rounded-full bg-brand text-zinc-900 shadow-lg shadow-brand/30 hover:bg-brand-dark hover:text-white"
          >
            <Plus className="size-4" /> Add Player
          </Button>
        }
      />

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players…"
          className="pl-9"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["All", ...SKILL_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              categoryFilter === cat
                ? "bg-ink text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {cat}
            {cat !== "All" && (
              <span className="ml-1.5 opacity-60">
                {players.filter((p) => p.skillCategory === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading roster…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : filteredPlayers.length === 0 ? (
        <Panel className="text-center text-sm text-zinc-400">
          {players.length === 0
            ? "No players yet. Add one to get started."
            : "No players match your search or filter."}
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPlayers.map((p) => (
            <Panel key={p.playerId} className="group relative overflow-hidden">
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-brand-soft transition-transform group-hover:scale-110" />

              {/* Desktop / wide screens: hover-to-reveal icons */}
              <div className="absolute right-3 top-3 z-10 hidden gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                <button
                  onClick={() => openEditDialog(p)}
                  className="grid size-7 place-items-center rounded-full bg-white text-zinc-500 ring-1 ring-black/5 hover:text-zinc-900"
                  aria-label={`Edit ${p.fullName}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="grid size-7 place-items-center rounded-full bg-white text-zinc-500 ring-1 ring-black/5 hover:text-red-500"
                  aria-label={`Delete ${p.fullName}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Small screens: always-visible menu — hover doesn't exist on touch,
                  so the icons above would otherwise be permanently unreachable here. */}
              <div className="absolute right-3 top-3 z-10 sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="grid size-7 place-items-center rounded-full bg-white text-zinc-500 ring-1 ring-black/5"
                      aria-label={`Actions for ${p.fullName}`}
                    >
                      <MoreVertical className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(p)}>
                      <Pencil className="size-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(p)}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-ball to-brand text-sm font-bold text-zinc-900 ring-2 ring-white shadow-sm">
                    {p.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.fullName}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        TIER_STYLE[p.skillCategory] ?? "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {p.skillCategory}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 border-t border-zinc-100 pt-3">
                  <Stat label="Rating" value={Number(p.skillLevel).toFixed(1)} />
                  <Stat label="Wins" value={String(p.totalWins)} accent />
                  <Stat label="Losses" value={String(p.totalLosses)} />
                  <Stat label="Win %" value={`${p.winPercentage.toFixed(0)}%`} accent />
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlayer ? "Edit player" : "Add a player"}</DialogTitle>
            <DialogDescription>
              {editingPlayer
                ? "Update this player's name or skill category."
                : "Skill level is assigned automatically based on category."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                required
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Jane Player"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skillCategory">Skill category</Label>
              <Select
                value={form.skillCategory}
                onValueChange={(value) => setForm((f) => ({ ...f, skillCategory: value }))}
              >
                <SelectTrigger id="skillCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Saving…" : editingPlayer ? "Save changes" : "Add player"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes them from the roster permanently. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`text-base font-bold tabular-nums ${accent ? "text-brand-dark" : "text-zinc-900"}`}>{value}</p>
    </div>
  );
}