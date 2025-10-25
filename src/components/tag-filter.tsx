import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onTagChange: (tags: string[]) => void;
}

export function TagFilter({ tags, selectedTags, onTagChange }: TagFilterProps) {
  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Filter by tags
        </h3>
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTagChange([])}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 max-h-16 overflow-y-auto pb-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant={selectedTags.includes(tag) ? "default" : "outline"}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTags.includes(tag)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => handleTagClick(tag)}
          >
            {tag}
            {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
          </Badge>
        ))}
      </div>
    </div>
  );
}
