// src/utils/usePageTitle.js
import { useEffect } from "react";
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Nexa Control` : "Nexa Control";
  }, [title]);
}
