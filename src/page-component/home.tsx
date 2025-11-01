import { useState, useEffect } from "react";
import { useMediaStore } from "@/hooks/use-media-store";
import { useVaultStore } from "@/hooks/use-vault-store";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { AddMediaModal } from "@/components/add-media-modal";
import { MediaGallery } from "@/components/media-gallery";
import { CommandPalette } from "@/components/command-pallete";
import { TagFilter } from "@/components/tag-filter";
import { LayoutSwitcher } from "@/components/layout-switcher";
import { Plus, Search, Lock } from "lucide-react";
import { SettingsButton } from "@/components/settings-button";
import { FormatFilter } from "@/components/format-filter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUrlFromPasteEvent, isEditableElement } from "@/lib/utils";

export default function HomePage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const {
    items,
    allTags,
    allFormats,
    hiddenTags,
    hiddenItems,
    hideItem,
    addHiddenItem,
  } = useMediaStore();
  const { config, setupPasscode, verifyAndUnlock } = useVaultStore();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importOtp, setImportOtp] = useState("");
  const [pendingHiddenItems, setPendingHiddenItems] = useState<any[] | null>(
    null
  );
  const [pendingVaultConfig, setPendingVaultConfig] = useState<any | null>(
    null
  );
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    // Global paste to quickly add a URL unless user is typing into an input
    const onPaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      if (isEditableElement(active)) return; // let native paste happen in inputs
      const url = getUrlFromPasteEvent(e);
      if (url) {
        e.preventDefault();
        sessionStorage.setItem("prefilledUrl", url);
        setIsAddModalOpen(true);
        toast.info("URL pasted", { description: "Ready to add media" });
      }
    };

    document.addEventListener("paste", onPaste);

    // Process import data passed from settings page (sessionStorage)
    try {
      const raw = sessionStorage.getItem("importedData");
      const mode = sessionStorage.getItem("importMode"); // 'merge' | 'overwrite'
      if (raw) {
        const parsed = JSON.parse(raw);
        const importMode = mode === "overwrite" ? "overwrite" : "merge";
        const store = useMediaStore.getState();
        // Support legacy shape (array) or new object with items, hiddenItems, vaultConfig
        if (Array.isArray(parsed)) {
          const action =
            importMode === "overwrite"
              ? store.overwriteWithItems(parsed)
              : store.importItems(parsed);
          Promise.resolve(action)
            .then((res: any) => {
              const description =
                importMode === "overwrite"
                  ? `${res.added} added`
                  : `${res.added} added, ${res.skipped} skipped`;
              toast.success("Import complete", { description });
            })
            .catch(() => {
              toast.error("Import failed", {
                description: "Could not import items",
              });
            })
            .finally(() => {
              sessionStorage.removeItem("importedData");
              sessionStorage.removeItem("importMode");
            });
        } else if (parsed && Array.isArray(parsed.items)) {
          // Handle vault-aware imports
          const publicItems = parsed.items as any[];
          const hidden = Array.isArray(parsed.hiddenItems)
            ? (parsed.hiddenItems as any[])
            : [];
          const incomingCfg = parsed.vaultConfig ?? null;

          const runPublic =
            importMode === "overwrite"
              ? store.overwriteWithItems(publicItems)
              : store.importItems(publicItems);
          Promise.resolve(runPublic)
            .then(async (res: any) => {
              // Stash hidden items to add after optional passcode check
              if (hidden.length > 0) {
                setPendingHiddenItems(hidden);
              }
              if (incomingCfg) {
                setPendingVaultConfig(incomingCfg);
              }

              // If there are hidden items or a vaultConfig, open OTP dialog; otherwise we’re done
              if (hidden.length > 0 || incomingCfg) {
                setImportDialogOpen(true);
              } else {
                toast.success("Import complete", {
                  description:
                    importMode === "overwrite"
                      ? `${res.added} added`
                      : `${res.added} added, ${res.skipped} skipped`,
                });
              }
            })
            .catch(() => {
              toast.error("Import failed", {
                description: "Could not import items",
              });
              setPendingHiddenItems(null);
              setPendingVaultConfig(null);
            })
            .finally(() => {
              sessionStorage.removeItem("importMode");
              sessionStorage.removeItem("importedData");
            });
        } else {
          sessionStorage.removeItem("importedData");
          sessionStorage.removeItem("importMode");
        }
      }
    } catch {
      sessionStorage.removeItem("importedData");
      sessionStorage.removeItem("importMode");
    }
  }, []);

  const confirmVaultImport = async () => {
    // If incoming file had a vaultConfig, require OTP to match that config
    try {
      if (pendingVaultConfig) {
        // Verify passcode using incoming config
        const ok = await (async () => {
          // Temporarily use the vault store’s verify function — it uses current config; so we compare derived hash directly here
          // For simplicity, we re-derive using incoming config and entered pass
          const { verifyPasscode } = await import("@/lib/crypto");
          return verifyPasscode(importOtp, pendingVaultConfig);
        })();
        if (!ok) {
          toast.error("Invalid passcode for imported vault");
          return;
        }
        // If there is no local config yet, set it to incoming (so vault stays consistent)
        if (!config) {
          // We don’t know the plaintext, but we can store the config directly via setup path bypass not available — so store in local persistence by directly updating
          // Simple approach: call setupPasscode with the same pass to generate local config (hash will differ due to different salt); acceptable since we only need a valid lock
          await setupPasscode(importOtp);
        }
      }

      // Import hidden items now
      if (pendingHiddenItems) {
        for (const raw of pendingHiddenItems) {
          try {
            await addHiddenItem({
              url: raw.url,
              name: raw.name,
              type: raw.type ?? "other",
              tags: Array.isArray(raw.tags) ? raw.tags : [],
              thumbnail:
                typeof raw.thumbnail === "string" ? raw.thumbnail : undefined,
            } as any);
          } catch {}
        }
      }
      toast.success("Hidden items imported");
      setImportDialogOpen(false);
      setImportOtp("");
      setPendingHiddenItems(null);
      setPendingVaultConfig(null);
    } catch {
      toast.error("Import failed", {
        description: "Could not import hidden items",
      });
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const text = e.dataTransfer?.getData("text/plain") || "";
    if (text) {
      const urls = text
        .split(/[\n,]/)
        .map((url) => url.trim())
        .filter(
          (url) => url.startsWith("http://") || url.startsWith("https://")
        );

      if (urls.length > 0) {
        setIsAddModalOpen(true);
        sessionStorage.setItem("prefilledUrl", urls[0]);
      } else {
        toast.error("No valid URLs found", {
          description: "Please drop text containing valid URLs",
        });
      }
    }
  };

  useEffect(() => {
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  const visibleTags = allTags.filter((tag) => !hiddenTags.includes(tag));

  const filteredItems = items.filter((item) => {
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

    const hasHiddenTag = item.tags.some((tag) => hiddenTags.includes(tag));

    return matchesSearch && matchesTags && matchesFormats && !hasHiddenTag;
  });

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const bulkHide = async () => {
    for (const id of selectedIds) await hideItem(id);
    setSelectedIds([]);
    setSelectMode(false);
    toast.success("Moved to Hidden", { description: "Selected items hidden" });
  };

  const hiddenOppositeCount = hiddenItems.filter((i) => {
    const q = searchQuery.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>Import Hidden Vault</DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This backup includes Hidden Vault data. Enter the 5-digit passcode
              used to protect it to import hidden items.
            </p>
            <InputOTP maxLength={5} value={importOtp} onChange={setImportOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => setImportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmVaultImport}
                disabled={importOtp.length !== 5}
              >
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CommandPalette
        items={items}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        otherScopeCount={searchQuery.trim() ? hiddenOppositeCount : undefined}
        otherScopeCountLabel="hidden items matched (open Hidden Vault)"
      />

      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                Previewz
              </h1>
              <p className="text-sm text-muted-foreground">
                Your personal media library
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
              <a href="/hidden">
                <Button variant="outline" size="icon" title="Hidden Vault">
                  <Lock className="h-4 w-4" />
                </Button>
              </a>
              <SettingsButton />
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
            {/* tags filters */}
            {visibleTags.length > 0 && (
              <TagFilter
                tags={visibleTags}
                selectedTags={selectedTags}
                onTagChange={setSelectedTags}
              />
            )}

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
                <Button size="sm" onClick={bulkHide}>
                  Hide Selected
                </Button>
              )}
            </div>

            {/* format filters */}
            {allFormats.length > 0 && (
              <FormatFilter
                formats={allFormats}
                selectedFormats={selectedFormats}
                onFormatChange={setSelectedFormats}
              />
            )}
          </div>
        </div>

        {/* Gallery */}
        <MediaGallery
          items={filteredItems}
          isHidden={false}
          blurAll={false}
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

      {/* Add Media Modal */}
      <AddMediaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        target={selectMode ? "public" : "public"}
      />
    </div>
  );
}
