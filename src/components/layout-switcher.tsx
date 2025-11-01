import type React from "react";

import { useLayoutStore, type LayoutType } from "@/hooks/use-layout-store";
import { Button } from "@/components/ui/button";
import { LayoutGrid, ImageIcon, Grid3x3, Maximize2 } from "lucide-react";

const layouts: { type: LayoutType; label: string; icon: React.ReactNode }[] = [
  { type: "grid", label: "Grid", icon: <LayoutGrid className="h-4 w-4" /> },
  {
    type: "overlay",
    label: "Overlay",
    icon: <ImageIcon className="h-4 w-4" />,
  },
  { type: "large", label: "Large", icon: <Maximize2 className="h-4 w-4" /> },
  { type: "masonry", label: "Masonry", icon: <Grid3x3 className="h-4 w-4" /> },
];

export function LayoutSwitcher() {
  const { layout, setLayout } = useLayoutStore();

  return (
    <div className="flex gap-2 rounded-lg bg-muted p-1 justify-evenly w-full sm:w-auto">
      {layouts.map(({ type, label, icon }) => (
        <Button
          key={type}
          size="sm"
          variant={layout === type ? "default" : "ghost"}
          onClick={() => setLayout(type)}
          title={label}
          className="gap-2"
        >
          {icon}
          <span className="hidden sm:inline text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}
