import type React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ImageIcon,
  Video,
  FileText,
  Globe,
  ChevronDown,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface FormatFilterProps {
  formats: string[];
  selectedFormats: string[];
  onFormatChange: (formats: string[]) => void;
}

const formatIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  other: <Badge className="h-4 w-4" />,
};

export function FormatFilter({
  formats,
  selectedFormats,
  onFormatChange,
}: FormatFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleFormat = (format: string) => {
    if (selectedFormats.includes(format)) {
      onFormatChange(selectedFormats.filter((f) => f !== format));
    } else {
      onFormatChange([...selectedFormats, format]);
    }
  };

  const clearAll = () => {
    onFormatChange([]);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <span className="text-sm font-medium">Format</span>
          {selectedFormats.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedFormats.length}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
          {formats.map((format) => (
            <div
              key={format}
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
              onClick={() => toggleFormat(format)}
            >
              <input
                type="checkbox"
                checked={selectedFormats.includes(format)}
                onChange={() => {}}
                className="rounded border-muted-foreground"
              />
              <span className="text-muted-foreground">
                {formatIcons[format]}
              </span>
              <span className="text-sm capitalize flex-1">{format}</span>
            </div>
          ))}
        </div>

        {selectedFormats.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
