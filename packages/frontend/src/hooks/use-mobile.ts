import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return !window.matchMedia("(min-width: 768px)").matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
