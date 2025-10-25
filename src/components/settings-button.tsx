import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsButton() {
  return (
    <a href="/settings">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full bg-transparent"
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </Button>
    </a>
  );
}
