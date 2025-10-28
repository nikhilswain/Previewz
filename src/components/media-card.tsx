import { useEffect, useState } from "react";
import { type MediaItem, useMediaStore } from "@/hooks/use-media-store";
import type { LayoutType } from "@/hooks/use-layout-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Trash2, MoreVertical, Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import type React from "react";
import { Video } from "./video-preview";

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
  layout?: LayoutType;
  isHiddenPage?: boolean;
  blurMedia?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (checked: boolean) => void;
}

export function MediaCard({
  item,
  onClick,
  layout = "grid",
  isHiddenPage = false,
  blurMedia = false,
  selectable = false,
  selected = false,
  onSelectToggle,
}: MediaCardProps) {
  const { deleteItem, hideItem, unhideItem } = useMediaStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [validThumbnail, setValidThumbnail] = useState<string | null>(null);

  const thumbnailUrl =
    item.format === "image"
      ? item.url
      : item.format === "website"
      ? undefined
      : item.thumbnail;

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    toast.success("Copied!", { description: "Media URL copied to clipboard" });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      toast.success("Deleted!", { description: "Media removed" });
    } catch {
      toast.error("Error", { description: "Failed to delete media" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await hideItem(item.id);
      toast.success("Hidden!", { description: "Media moved to hidden vault" });
    } catch {
      toast.error("Error", { description: "Failed to hide media" });
    }
  };

  const handleUnhide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unhideItem(item.id);
      toast.success("Unhidden!", { description: "Media moved to public" });
    } catch {
      toast.error("Error", { description: "Failed to unhide media" });
    }
  };

  useEffect(() => {
    if (!thumbnailUrl) return;
    const img = new Image();
    img.src = thumbnailUrl;
    img.onload = () => setValidThumbnail(thumbnailUrl);
    img.onerror = () => setValidThumbnail(null);
  }, [thumbnailUrl]);

  // ---------- shared renderers ----------
  const renderMedia = () => {
    if (item.format === "image" && validThumbnail) {
      return (
        <img
          src={validThumbnail}
          alt={item.name}
          className={`h-full w-full transition-transform duration-300 group-hover:scale-105 ${
            layout === "large" ? "object-contain" : "object-cover"
          }`}
          loading="lazy"
          decoding="async"
          onError={(e) => (e.currentTarget.src = "/media-placeholder.png")}
        />
      );
    }
    if (item.format === "website") {
      return (
        <iframe
          src={item.url}
          className="h-full w-full pointer-events-none"
          sandbox="allow-same-origin"
        />
      );
    }

    if (item.format === "video") {
      return (
        <Video
          src={item.url}
          title={item.name}
          className="max-w-full rounded w-full h-full object-cover"
        />
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/20 to-secondary/20">
        <div className="text-5xl">{"📎"}</div>
      </div>
    );
  };

  const ActionButtons = (
    <>
      {isHiddenPage ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUnhide}
          className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-black"
        >
          <Lock className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleHide}
          className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-black"
        >
          <Lock className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        size="sm"
        variant="secondary"
        onClick={onClick}
        className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-black"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleCopyUrl}
        className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-black"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 w-7 p-0 bg-white/90 hover:bg-white text-black"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyUrl}>
            <Copy className="mr-2 h-4 w-4" /> Copy URL
          </DropdownMenuItem>
          {isHiddenPage ? (
            <DropdownMenuItem onClick={handleUnhide}>
              <Lock className="mr-2 h-4 w-4" /> Unhide
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleHide}>
              <Lock className="mr-2 h-4 w-4" /> Hide
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  // ---------- layout config ----------
  const layoutMap: Record<
    LayoutType,
    { wrapper: string; overlay?: React.ReactNode; showDetails?: boolean }
  > = {
    grid: {
      wrapper:
        "group relative overflow-hidden rounded-lg bg-card cursor-pointer shadow-md hover:shadow-lg transition-all border border-border/50 hover:border-primary/50 flex flex-col",
      overlay: (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {ActionButtons}
        </div>
      ),
      showDetails: true,
    },
    overlay: {
      wrapper:
        "group relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer shadow-md hover:shadow-lg transition-all border border-border/50 hover:border-primary/50",
      overlay: (
        <>
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {ActionButtons}
          </div>
          <div className="absolute top-0 left-0 right-0 bg-linear-to-b from-black/60 via-black/30 to-transparent p-3">
            <h3 className="font-semibold text-sm text-white line-clamp-2">
              {item.name}
            </h3>
          </div>
        </>
      ),
    },
    large: {
      wrapper:
        "group relative overflow-hidden rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-all hover:border-primary/50 w-full bg-transparent",
    },
    masonry: {
      wrapper:
        "group relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer shadow-md hover:shadow-lg transition-all border border-border/50 hover:border-primary/50",
      overlay: (
        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          {ActionButtons}
        </div>
      ),
    },
  };

  const { wrapper, overlay, showDetails } = layoutMap[layout] ?? layoutMap.grid;

  // ---------- final render ----------
  const handleCardClick = (e: React.MouseEvent) => {
    if (selectable && onSelectToggle) {
      e.stopPropagation();
      onSelectToggle(!selected);
      return;
    }
    onClick();
  };

  return (
    <div className={wrapper} onClick={handleCardClick}>
      <div className={`relative w-full aspect-square bg-muted overflow-hidden`}>
        {selectable && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onSelectToggle?.(e.target.checked)}
            />
          </div>
        )}
        <div className={blurMedia ? "filter blur-sm" : undefined}>
          {renderMedia()}
        </div>
        {overlay}
      </div>

      {showDetails && (
        <div className="p-3 space-y-2 flex-1 flex flex-col">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2">
            {item.name}
          </h3>
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{item.tags.length - 2}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
