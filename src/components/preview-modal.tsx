import { type MediaItem, useMediaStore } from "@/hooks/use-media-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, X, FileText, Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Video } from "@/components/video-preview";

interface PreviewModalProps {
  item: MediaItem;
  onClose: () => void;
  isHidden?: boolean;
}

export function PreviewModal({
  item,
  onClose,
  isHidden = false,
}: PreviewModalProps) {
  const { deleteItem, hideItem, unhideItem } = useMediaStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(item.url);
    toast.success("Copied!", {
      description: "Media URL copied to clipboard",
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      toast.success("Deleted", {
        description: "Media removed from your collection",
      });
      onClose();
    } catch (error) {
      toast.success("Error", {
        description: "Failed to delete media",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleHide = async () => {
    try {
      if (isHidden) {
        await unhideItem(item.id);
        toast("Restored", {
          description: "Media restored to your library",
        });
      } else {
        await hideItem(item.id);
        toast("Hidden", {
          description: "Media moved to hidden vault",
        });
      }
      onClose();
    } catch (error) {
      toast.error("Error", {
        description: `Failed to ${isHidden ? "restore" : "hide"} media`,
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose} key={item.id}>
      <DialogContent className="max-w-4xl w-3xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle>{item.name}</DialogTitle>
              <p className="mt-2 break-all text-xs text-muted-foreground">
                {item.url}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center justify-center rounded-lg bg-muted p-4">
            {item.type === "image" ? (
              <img
                src={item.url || "/placeholder.svg"}
                alt={item.name}
                className="max-h-96 max-w-full rounded"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=400&width=400";
                }}
              />
            ) : item.type === "video" ? (
              <Video
                src={item.url}
                title={item.name}
                className="max-h-96 max-w-full rounded w-full h-96"
              />
            ) : item.format === "website" ? (
              <div className="w-full space-y-2">
                <div className="text-sm text-muted-foreground font-medium">
                  (iframe)
                </div>
                <iframe
                  src={item.url}
                  title={item.name}
                  className="w-full h-96 rounded border border-border"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            ) : item.format === "document" ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <FileText className="h-12 w-12" />
                <p>Document preview</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open in new tab
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="text-4xl">📎</div>
                <p>Media preview not available</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open in new tab
                </a>
              </div>
            )}
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Tags</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 flex-wrap">
            <Button
              onClick={handleCopyUrl}
              variant="outline"
              className="flex-1 gap-2 bg-transparent"
            >
              <Copy className="h-4 w-4" />
              Copy URL
            </Button>
            <Button
              onClick={handleToggleHide}
              variant="outline"
              className="flex-1 gap-2 bg-transparent"
            >
              {isHidden ? (
                <>
                  <LockOpen className="h-4 w-4" />
                  Restore
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Hide
                </>
              )}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive"
              className="flex-1 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
