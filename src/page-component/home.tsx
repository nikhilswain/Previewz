import { useState, useEffect } from "react";
import { useMediaStore } from "@/hooks/use-media-store";
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

export default function HomePage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const { items, allTags, allFormats, hiddenTags } = useMediaStore();

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette
        items={items}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
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
            {visibleTags.length > 0 && (
              <TagFilter
                tags={visibleTags}
                selectedTags={selectedTags}
                onTagChange={setSelectedTags}
              />
            )}
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
        <MediaGallery items={filteredItems} />
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
      />
    </div>
  );
}
