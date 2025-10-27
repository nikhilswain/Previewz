import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Returns true if the element is an input-like editable target
export function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  const contentEditable = (el as HTMLElement).isContentEditable;
  if (contentEditable) return true;
  const role = (el as HTMLElement).getAttribute?.("role");
  return role === "textbox" || role === "combobox" || role === "searchbox";
}

// Extracts the first http(s) URL from text
export function extractFirstHttpUrl(text: string): string | null {
  if (!text) return null;
  // Simple URL finder for http/https
  const regex = /https?:\/\/[^\s)\]}"']+/gi;
  const match = text.match(regex);
  if (!match || match.length === 0) return null;
  // Trim trailing punctuation
  const cleaned = match[0].replace(/[),.;!?:\]]+$/g, "");
  try {
    const u = new URL(cleaned);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {}
  return null;
}

// Reads clipboard text from a paste event and returns a URL if present
export function getUrlFromPasteEvent(e: ClipboardEvent): string | null {
  const text = e.clipboardData?.getData("text/plain") ?? "";
  return extractFirstHttpUrl(text);
}
