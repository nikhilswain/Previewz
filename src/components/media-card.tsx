import type React from "react";

import { useState } from "react";
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

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
  layout?: LayoutType;
}

export function MediaCard({ item, onClick, layout = "grid" }: MediaCardProps) {
  const { deleteItem, hideItem } = useMediaStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const thumbnailUrl =
    item.format === "image"
      ? item.url
      : item.format === "website"
      ? undefined
      : item.thumbnail;

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    toast.message("Copied!", {
      description: "Media URL copied to clipboard",
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      toast.message("Deleted!", {
        description: "Media removed from your collection",
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to delete media",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await hideItem(item.id);
      toast.message("Hidden!", {
        description: "Media moved to hidden vault",
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to hide media",
      });
    }
  };

  if (layout === "grid") {
    return (
      <div
        className="group relative overflow-hidden rounded-lg bg-card cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/50 flex flex-col"
        onClick={onClick}
      >
        <div className="aspect-square overflow-hidden bg-muted relative">
          {item.format === "image" && thumbnailUrl ? (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={item.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.src = "/media-placeholder.jpg";
              }}
            />
          ) : item.format === "website" ? (
            <iframe
              src={item.url}
              className="h-full w-full pointer-events-none"
              sandbox="allow-same-origin"
              onError={() => {
                console.error("Failed to load iframe");
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <div className="text-5xl">
                {item.format === "video" ? "▶" : "📎"}
              </div>
            </div>
          )}

          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleHide}>
                  <Lock className="mr-2 h-4 w-4" />
                  Hide
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-3 space-y-2 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground line-clamp-2">
              {item.name}
            </h3>
          </div>

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
      </div>
    );
  }

  if (layout === "overlay") {
    return (
      <div
        className="group relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/50"
        onClick={onClick}
      >
        {item.format === "image" && thumbnailUrl ? (
          <img
            src={thumbnailUrl || "/placeholder.svg"}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.src = "/media-placeholder.jpg";
            }}
          />
        ) : item.format === "website" ? (
          <iframe
            src={item.url}
            className="h-full w-full pointer-events-none"
            sandbox="allow-same-origin"
            onError={() => {
              console.error("Failed to load iframe");
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <div className="text-6xl">
              {item.format === "video" ? "▶" : "📎"}
            </div>
          </div>
        )}

        {/* Top gradient overlay with title */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent p-3">
          <h3 className="font-semibold text-sm text-white line-clamp-2">
            {item.name}
          </h3>
        </div>

        {/* Bottom gradient overlay with tags */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-3">
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 1).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-white/90 text-black"
              >
                {tag}
              </Badge>
            ))}
            {item.tags.length > 1 && (
              <Badge
                variant="secondary"
                className="text-xs bg-white/90 text-black"
              >
                +{item.tags.length - 1}
              </Badge>
            )}
          </div>
        </div>

        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleHide}>
                <Lock className="mr-2 h-4 w-4" />
                Hide
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  if (layout === "large") {
    return (
      <div
        className="group relative overflow-hidden rounded-lg bg-card cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/50 w-full"
        onClick={onClick}
      >
        <div className="bg-muted">
          {item.format === "image" && thumbnailUrl ? (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt={item.name}
              className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.src = "/media-placeholder.jpg";
              }}
            />
          ) : item.format === "website" ? (
            <iframe
              src={item.url}
              className="w-full h-96 pointer-events-none"
              sandbox="allow-same-origin"
              onError={() => {
                console.error("Failed to load iframe");
              }}
            />
          ) : (
            <div className="flex h-96 w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <div className="text-8xl">
                {item.format === "video" ? "▶" : "📎"}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Masonry layout
  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/50"
      onClick={onClick}
    >
      {item.format === "image" && thumbnailUrl ? (
        <img
          src={thumbnailUrl || "/placeholder.svg"}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          crossOrigin="anonymous"
          onError={(e) => {
            e.currentTarget.src = "/media-placeholder.jpg";
          }}
        />
      ) : item.format === "website" ? (
        <iframe
          src={item.url}
          className="h-full w-full pointer-events-none"
          sandbox="allow-same-origin"
          onError={() => {
            console.error("Failed to load iframe");
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
          <div className="text-6xl">{item.format === "video" ? "▶" : "📎"}</div>
        </div>
      )}

      {/* Hover overlay with just icons */}
      <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
        <Button
          size="sm"
          variant="secondary"
          onClick={onClick}
          className="h-10 w-10 p-0 bg-white/95 hover:bg-white text-black"
        >
          <Eye className="h-5 w-5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCopyUrl}
          className="h-10 w-10 p-0 bg-white/95 hover:bg-white text-black"
        >
          <Copy className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="secondary"
              className="h-10 w-10 p-0 bg-white/95 hover:bg-white text-black"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyUrl}>
              <Copy className="mr-2 h-4 w-4" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleHide}>
              <Lock className="mr-2 h-4 w-4" />
              Hide
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
