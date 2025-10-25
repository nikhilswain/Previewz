import { useEffect, useState } from "react";
import type { MediaItem } from "@/hooks/use-media-store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface CommandPaletteProps {
  items: MediaItem[];
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function CommandPalette({
  items,
  onSearch,
  searchQuery,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search media by name or tags... (Ctrl+K or /)"
          value={searchQuery}
          onValueChange={onSearch}
        />
        <CommandList>
          <CommandEmpty>No media found.</CommandEmpty>
          <CommandGroup heading="Media">
            {filteredItems.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <div className="flex w-full items-center gap-3">
                  {item.thumbnail && item.type === "image" ? (
                    <img
                      src={item.thumbnail || "/placeholder.svg"}
                      alt={item.name}
                      className="h-8 w-8 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "/placeholder.svg?height=32&width=32";
                      }}
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs">
                      {item.type === "video" ? "▶" : "📎"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-sm">{item.name}</p>
                    <div className="flex gap-1 flex-wrap">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
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
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
