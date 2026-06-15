"use client";

import { useEffect } from "react";

export default function SecurityWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        return false;
      }
      if (e.key === "F5") {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        return false;
      }
    };

    const disableSelection = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }
      e.preventDefault();
    };

    const disableDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("selectstart", disableSelection);
    document.addEventListener("dragstart", disableDrag);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("selectstart", disableSelection);
      document.removeEventListener("dragstart", disableDrag);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
    };
  }, []);

  return <>{children}</>;
}
