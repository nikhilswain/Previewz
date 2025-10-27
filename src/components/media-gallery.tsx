import { useState } from "react";
import type { MediaItem } from "@/hooks/use-media-store";
import { useLayoutStore } from "@/hooks/use-layout-store";
import { MediaCard } from "./media-card";
import { PreviewModal } from "./preview-modal";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { BoxIcon } from "lucide-react";

interface MediaGalleryProps {
  items: MediaItem[];
  isHidden?: boolean;
}

export function MediaGallery({ items, isHidden = false }: MediaGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const { layout } = useLayoutStore();

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BoxIcon className="h-12 w-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>
            {isHidden ? "No hidden items" : "No media yet"}
          </EmptyTitle>
          <EmptyDescription>
            {isHidden
              ? "Your hidden vault is empty"
              : "Start building your collection by adding some URLs"}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // lookup for layout-specific wrappers
  const layoutClasses: Record<string, string> = {
    grid: "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    overlay:
      "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    large: "flex flex-col items-center gap-8 max-w-2xl mx-auto",
    masonry:
      "columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4",
  };

  // fallback layout class if invalid layout value
  const containerClass = layoutClasses[layout] ?? layoutClasses.masonry;

  const renderItems = () =>
    layout === "masonry"
      ? items.map((item) => (
          <div key={item.id} className="break-inside-avoid mb-4">
            <MediaCard
              item={item}
              onClick={() => setSelectedItem(item)}
              layout={layout}
            />
          </div>
        ))
      : items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onClick={() => setSelectedItem(item)}
            layout={layout}
          />
        ));

  return (
    <>
      <div className={containerClass}>{renderItems()}</div>

      {selectedItem && (
        <PreviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          isHidden={isHidden}
        />
      )}
    </>
  );
}
