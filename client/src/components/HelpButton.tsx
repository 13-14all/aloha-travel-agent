/**
 * HelpButton.tsx
 *
 * A persistent "How This Works" button that appears in the top navigation
 * of every page. Opens /help in a new popup window so the user never
 * loses their place in the app.
 */

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpButtonProps {
  /** If true, shows only the icon (for compact headers). Default: false */
  compact?: boolean;
}

export function HelpButton({ compact = false }: HelpButtonProps) {
  const openHelp = () => {
    window.open(
      "/help",
      "aloha_help",
      "width=920,height=780,scrollbars=yes,resizable=yes,toolbar=no,menubar=no"
    );
  };

  if (compact) {
    return (
      <button
        onClick={openHelp}
        title="How This Works — Help Guide"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        aria-label="Open help guide"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openHelp}
      className="gap-2 h-10 text-base border-primary/30 text-primary hover:bg-primary/5"
      title="Open the How This Works guide in a new window"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline">How This Works</span>
      <span className="sm:hidden">Help</span>
    </Button>
  );
}
