"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AISidebarState {
  open: boolean;
  selectedText: string;
  noteId: string | null;
  noteTitle: string;
  noteContent: string;
}

interface AISidebarContextType extends AISidebarState {
  openSidebar: (params: { selectedText: string; noteId: string | null; noteTitle: string; noteContent: string }) => void;
  closeSidebar: () => void;
}

const AISidebarContext = createContext<AISidebarContextType | null>(null);

export function AISidebarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AISidebarState>({
    open: false,
    selectedText: "",
    noteId: null,
    noteTitle: "",
    noteContent: "",
  });

  const openSidebar = useCallback(
    (params: { selectedText: string; noteId: string | null; noteTitle: string; noteContent: string }) => {
      setState({ open: true, ...params });
    },
    []
  );

  const closeSidebar = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return (
    <AISidebarContext.Provider value={{ ...state, openSidebar, closeSidebar }}>
      {children}
    </AISidebarContext.Provider>
  );
}

export function useAISidebar() {
  const ctx = useContext(AISidebarContext);
  if (!ctx) throw new Error("useAISidebar must be used within AISidebarProvider");
  return ctx;
}
