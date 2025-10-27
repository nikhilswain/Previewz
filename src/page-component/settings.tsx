import type React from "react";

import { useState } from "react";
import { ArrowLeft, Download, Upload, Trash2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/hooks/use-media-store";
import { useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

export default function SettingsPage() {
  const { items } = useMediaStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [openClearDialog, setOpenClearDialog] = useState(false);

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

  const handleExport = () => {
    const dataToExport = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      items,
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
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
      description: `Exported ${items.length} media items`,
    });
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

      // Store imported items in localStorage for the main page to handle
      sessionStorage.setItem("importedData", JSON.stringify(data.items));
      window.location.href = "/";

      toast.success("Import started", {
        description: "Redirecting to add imported items...",
      });
    } catch (error) {
      toast.error("Import failed", {
        description:
          error instanceof Error ? error.message : "Failed to import backup",
      });
    }
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
                    onClick={handleExport}
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
