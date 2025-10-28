import { useEffect, useMemo, useState } from "react";
import { useMediaStore } from "@/hooks/use-media-store";
import { useVaultStore } from "@/hooks/use-vault-store";
import { AddMediaModal } from "@/components/add-media-modal";
import { MediaGallery } from "@/components/media-gallery";
import { CommandPalette } from "@/components/command-pallete";
import { TagFilter } from "@/components/tag-filter";
import { FormatFilter } from "@/components/format-filter";
import { LayoutSwitcher } from "@/components/layout-switcher";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

function HiddenGate({ children }: { children: React.ReactNode }) {
  const {
    config,
    isUnlocked,
    hydrateFromSession,
    verifyAndUnlock,
    setupPasscode,
    rememberTTL,
    setRememberTTL,
    lock,
  } = useVaultStore();
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");
  const [setupValue, setSetupValue] = useState("");
  const [setupStep, setSetupStep] = useState<0 | 1>(0);

  useEffect(() => {
    hydrateFromSession();
    if (!rememberTTL) {
      // Force lock when not remembering session
      lock();
    }
  }, [hydrateFromSession]);

  useEffect(() => {
    setOpen(!isUnlocked);
  }, [isUnlocked]);

  const onSubmit = async () => {
    if (value.length !== 5) return;
    const ok = await verifyAndUnlock(value);
    if (!ok) toast.error("Invalid passcode");
    setValue("");
  };

  const onSetupNext = async () => {
    if (setupValue.length !== 5) return;
    await setupPasscode(setupValue);
    toast.success("Vault configured");
    setSetupValue("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          {!config ? (
            <>
              <DialogHeader>
                <DialogTitle>Hidden Vault</DialogTitle>
                <DialogDescription>
                  Keep sensitive items out of your main library. Items here
                  won’t show up on Home.
                </DialogDescription>
              </DialogHeader>
              {setupStep === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Set a 5‑digit passcode to protect your Hidden Vault. You’ll
                    need it to unlock each session.
                  </p>
                  <div className="flex justify-end">
                    <Button onClick={() => setSetupStep(1)}>
                      Set passcode
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm">Enter a 5‑digit passcode</p>
                  <InputOTP
                    maxLength={5}
                    value={setupValue}
                    onChange={setSetupValue}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <div className="flex justify-end">
                    <Button
                      onClick={onSetupNext}
                      disabled={setupValue.length !== 5}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Unlock Hidden Vault</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <InputOTP maxLength={5} value={value} onChange={setValue}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberTTL}
                    onChange={(e) => setRememberTTL(e.target.checked)}
                  />
                  Remember for 20 minutes (this session)
                </label>
                <div className="flex justify-end">
                  <Button onClick={onSubmit} disabled={value.length !== 5}>
                    Unlock
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {isUnlocked && children}
    </>
  );
}

export default function HiddenPage() {
  const { items, hiddenItems, allTags, unhideItem } = useMediaStore();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { blurHidden, setBlurHidden, unlockUntil, lock } = useVaultStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  const visibleHidden = useMemo(() => hiddenItems, [hiddenItems]);
  const hiddenTags = useMemo(
    () => Array.from(new Set(visibleHidden.flatMap((i) => i.tags))).sort(),
    [visibleHidden]
  );
  const hiddenFormats = useMemo(
    () => Array.from(new Set(visibleHidden.map((i) => i.format))).sort(),
    [visibleHidden]
  );

  const oppositeCount = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
    ).length;
  }, [items, searchQuery]);

  const filteredHidden = visibleHidden.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => item.tags.includes(tag));
    const matchesFormats =
      selectedFormats.length === 0 || selectedFormats.includes(item.format);
    return matchesSearch && matchesTags && matchesFormats;
  });

  // Auto-lock when TTL expires
  useEffect(() => {
    if (!unlockUntil) return;
    const ms = unlockUntil - Date.now();
    if (ms <= 0) {
      lock();
      return;
    }
    const t = setTimeout(() => lock(), ms);
    return () => clearTimeout(t);
  }, [unlockUntil, lock]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const bulkUnhide = async () => {
    for (const id of selectedIds) await unhideItem(id);
    setSelectedIds([]);
    setSelectMode(false);
    toast.success("Moved to Public", {
      description: "Selected items unhidden",
    });
  };

  return (
    <HiddenGate>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <a href="/">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Home
                    </Button>
                  </a>
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-2">
                    <Lock className="h-6 w-6" /> Hidden Vault
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only visible when unlocked
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    placeholder="Search... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-md bg-muted/50 border border-muted-foreground/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/40">
                  <span className="text-sm">Blur</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={blurHidden}
                    onChange={(e) => setBlurHidden(e.target.checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <LayoutSwitcher />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={selectMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectMode((v) => !v)}
                  className="bg-transparent"
                >
                  {selectMode ? "Cancel Selection" : "Select"}
                </Button>
                {selectMode && selectedIds.length > 0 && (
                  <Button size="sm" onClick={bulkUnhide}>
                    Unhide Selected
                  </Button>
                )}
              </div>
              {hiddenTags.length > 0 && (
                <TagFilter
                  tags={hiddenTags}
                  selectedTags={selectedTags}
                  onTagChange={setSelectedTags}
                />
              )}
              {hiddenFormats.length > 0 && (
                <FormatFilter
                  formats={hiddenFormats}
                  selectedFormats={selectedFormats}
                  onFormatChange={setSelectedFormats}
                />
              )}
            </div>
          </div>

          <MediaGallery
            items={filteredHidden}
            isHidden={true}
            blurAll={blurHidden}
            selectable={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50"
          aria-label="Add media"
        >
          <Plus className="h-7 w-7" />
        </button>

        <AddMediaModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          target="hidden"
        />
      </div>
      <CommandPalette
        items={filteredHidden}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        otherScopeCount={searchQuery.trim() ? oppositeCount : undefined}
        otherScopeCountLabel="public items matched (open Home)"
      />
    </HiddenGate>
  );
}
