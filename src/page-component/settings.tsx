import type React from "react";

import { useState } from "react";
import { ArrowLeft, Download, Upload, Trash2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/hooks/use-media-store";
import { useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useVaultStore } from "@/hooks/use-vault-store";
import { verifyPasscode } from "@/lib/crypto";

export default function SettingsPage() {
  const { items, hiddenItems } = useMediaStore();
  const { config, rememberTTL, setRememberTTL, lock } = useVaultStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [openClearDialog, setOpenClearDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [pendingImport, setPendingImport] = useState<any[]>([]);
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    const html = document.documentElement;
    if (newTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("theme", newTheme);
    toast.success("Theme updated", {
      description: `Switched to ${newTheme} mode`,
    });
  };

  const triggerExport = () => {
    if (hiddenItems.length > 0) {
      setOpenExportDialog(true);
    } else {
      doExport(false);
    }
  };

  const doExport = async (includeHidden: boolean) => {
    if (includeHidden) {
      if (!config) {
        toast.error("Hidden vault not configured");
        return;
      }
      if (otp.length !== 5) {
        toast.error("Enter 5-digit passcode");
        return;
      }
      const ok = await verifyPasscode(otp, config);
      if (!ok) {
        toast.error("Invalid passcode");
        return;
      }
    }

    const payload: any = {
      version: "1.1",
      exportedAt: new Date().toISOString(),
      items,
    };
    if (includeHidden) payload.hiddenItems = hiddenItems;
    if (config) payload.vaultConfig = config;

    const dataStr = JSON.stringify(payload, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `previewboard-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Export successful", {
      description: includeHidden
        ? `Exported ${items.length + hiddenItems.length} items (with hidden)`
        : `Exported ${items.length} public items`,
    });

    setOpenExportDialog(false);
    setOtp("");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Invalid backup file format");
      }

      // If backup contains hidden items or a vault config, we’ll route via Home to perform import there (reuse existing mechanism);
      // we store the whole payload and the mode in sessionStorage for Home to process.
      const payload = data;

      // If there are existing items, ask the user whether to merge or overwrite
      if (items.length > 0) {
        setPendingImport(payload.items);
        setOpenImportDialog(true);
      } else {
        // No existing items, proceed with overwrite-like behavior by default
        sessionStorage.setItem("importedData", JSON.stringify(payload));
        sessionStorage.setItem("importMode", "overwrite");
        window.location.href = "/";
        toast.success("Import started", {
          description: "Redirecting to add imported items...",
        });
      }
    } catch (error) {
      toast.error("Import failed", {
        description:
          error instanceof Error ? error.message : "Failed to import backup",
      });
    }
  };

  const proceedImport = (mode: "merge" | "overwrite") => {
    // Store full payload (we only saved items in pendingImport, but we’ll reconstruct minimal payload)
    const payload = {
      items: pendingImport,
    } as any;
    sessionStorage.setItem("importedData", JSON.stringify(payload));
    sessionStorage.setItem("importMode", mode);
    setOpenImportDialog(false);
    window.location.href = "/";
    toast.success("Import started", {
      description:
        mode === "overwrite"
          ? "Overwriting existing data..."
          : "Merging with existing data...",
    });
  };

  const handleClearAll = () => {
    console.log("Clearing all data...");

    // close the db connection first
    useMediaStore.getState().closeDB();

    // Clear DB
    const request = indexedDB.deleteDatabase("PreviewzDB");
    request.onsuccess = () => {
      localStorage.clear();
      toast.success("All data cleared", {
        description: "Your media library has been reset",
      });
      window.location.href = "/";
    };
    request.onerror = () => {
      toast.error("Error", {
        description: "Failed to clear data",
      });
    };
  };

  if (!mounted) return null;

  return (
    <>
      <Dialog open={openClearDialog} onOpenChange={setOpenClearDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>Confirm Clear All Data</DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete all media? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpenClearDialog(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearAll}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export dialog if hidden items exist */}
      <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>Export Data</DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Hidden items detected ({hiddenItems.length}). Choose what to
              export:
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => doExport(false)}
              >
                Public only
              </Button>
              <Button
                onClick={() => {
                  /* wait for otp below */
                }}
                disabled
              >
                Export all
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Passcode required to export hidden items
              </p>
              <InputOTP maxLength={5} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <div className="flex justify-end">
                <Button
                  onClick={() => doExport(true)}
                  disabled={otp.length !== 5}
                >
                  Export all (with hidden)
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import mode choice dialog */}
      <Dialog open={openImportDialog} onOpenChange={setOpenImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>Existing Data Detected</DialogHeader>
          <div className="space-y-4">
            <p>
              Your library already has {items.length} item(s). How would you
              like to handle the import?
            </p>
            <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
              <li>
                Merge: Keep current items and add new ones (duplicates by URL
                will be skipped).
              </li>
              <li>
                Overwrite: Remove all current items and replace with the
                imported items.
              </li>
            </ul>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpenImportDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => proceedImport("merge")}
              >
                Merge
              </Button>
              <Button
                variant="destructive"
                onClick={() => proceedImport("overwrite")}
              >
                Overwrite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <a href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">
            Manage your Previewz preferences and data
          </p>

          <div className="space-y-8">
            {/* Theme Settings */}
            <div className="rounded-lg border border-border/40 p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Appearance
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    Choose between light and dark mode
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="gap-2 bg-transparent"
                >
                  {theme === "light" ? (
                    <>
                      <Moon className="h-4 w-4" />
                      Dark
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4" />
                      Light
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Data Management */}
            <div className="rounded-lg border border-border/40 p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Data Management
              </h2>
              <div className="space-y-4">
                {/* Hidden Vault Session */}
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                  <div>
                    <p className="font-medium text-foreground">
                      Hidden Vault Session
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Remember unlock for 20 minutes in this session. If off,
                      passcode is required every time.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={rememberTTL}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setRememberTTL(next);
                        // Clear any existing session unlock whenever toggled
                        try {
                          sessionStorage.removeItem("vaultUnlockedUntil");
                        } catch {}
                        lock();
                      }}
                    />
                    {rememberTTL ? "On" : "Off"}
                  </label>
                </div>
                {/* Export */}
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Export Data</p>
                    <p className="text-sm text-muted-foreground">
                      Download all your media as a JSON backup
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={triggerExport}
                    className="gap-2 bg-transparent"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>

                {/* Import */}
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Import Data</p>
                    <p className="text-sm text-muted-foreground">
                      Restore media from a previous backup
                    </p>
                  </div>
                  <label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 cursor-pointer bg-transparent"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4" />
                        Import
                      </span>
                    </Button>
                  </label>
                </div>

                {/* Clear All */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Clear All Data
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Delete all media permanently
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setOpenClearDialog(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-lg border border-border/40 p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Library Info
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total Media Items
                  </span>
                  <span className="font-medium text-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage Used</span>
                  <span className="font-medium text-foreground">IndexedDB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
