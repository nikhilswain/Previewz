import type React from "react";

import { useState, useEffect } from "react";
import { useMediaStore } from "@/hooks/use-media-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMediaModal({ isOpen, onClose }: AddMediaModalProps) {
  const { addItem, allTags } = useMediaStore();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"image" | "video" | "other">("image");
  const [tagsInput, setTagsInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const prefilledUrl = sessionStorage.getItem("prefilledUrl");
      if (prefilledUrl) {
        setUrl(prefilledUrl);
        sessionStorage.removeItem("prefilledUrl");
      }
    }
  }, [isOpen]);

  const handleTagsInputChange = (value: string) => {
    setTagsInput(value);

    // Get the last tag being typed
    const tags = value.split(",");
    const lastTag = tags[tags.length - 1].trim().toLowerCase();

    if (lastTag.length > 0) {
      // Filter existing tags that match the current input
      const matches = allTags.filter(
        (tag) =>
          tag.toLowerCase().startsWith(lastTag) &&
          !tags
            .slice(0, -1)
            .map((t) => t.trim().toLowerCase())
            .includes(tag.toLowerCase())
      );
      setSuggestedTags(matches);
    } else {
      setSuggestedTags([]);
    }
  };

  const insertSuggestedTag = (tag: string) => {
    const tags = tagsInput.split(",");
    tags[tags.length - 1] = tag;
    setTagsInput(tags.join(", ") + ", ");
    setSuggestedTags([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    if (!tagsInput.trim()) {
      setError("At least one tag is required");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (tags.length === 0) {
      setError("At least one tag is required");
      return;
    }

    setIsLoading(true);

    try {
      // Try to fetch thumbnail for images
      let thumbnail: string | undefined;

      if (type === "image") {
        try {
          const response = await fetch(url, { method: "HEAD" });
          if (response.ok) {
            thumbnail = url;
          }
        } catch {
          // If fetch fails, use the URL as is
          thumbnail = url;
        }
      }

      await addItem({
        url,
        name: name || new URL(url).hostname,
        type,
        tags,
        thumbnail,
      });

      // Reset form
      setUrl("");
      setName("");
      setType("image");
      setTagsInput("");
      setSuggestedTags([]);
      onClose();
    } catch (err) {
      setError("Failed to add media. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Media</DialogTitle>
          <DialogDescription>
            Add a new image, video, or media URL to your collection
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Media URL *</Label>
            <Input
              id="url"
              placeholder="https://example.com/image.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Title (optional)</Label>
            <Input
              id="name"
              placeholder="My awesome image"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Media Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags * (comma-separated)</Label>
            <div className="relative">
              <Textarea
                id="tags"
                placeholder="design, inspiration, ui"
                value={tagsInput}
                onChange={(e) => handleTagsInputChange(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
              {suggestedTags.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertSuggestedTag(tag)}
                      className="w-full text-left px-3 py-2 hover:bg-primary/10 transition-colors text-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              At least one tag is required
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Adding..." : "Add Media"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
