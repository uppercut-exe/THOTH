import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface CommandBarContextType {
  open: boolean;
  openBar: () => void;
  closeBar: () => void;
  toggleBar: () => void;
}

const CommandBarContext = createContext<CommandBarContextType | undefined>(undefined);

export function CommandBarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openBar = useCallback(() => setOpen(true), []);
  const closeBar = useCallback(() => setOpen(false), []);
  const toggleBar = useCallback(() => setOpen((v) => !v), []);

  return (
    <CommandBarContext.Provider value={{ open, openBar, closeBar, toggleBar }}>
      {children}
    </CommandBarContext.Provider>
  );
}

export function useCommandBar() {
  const ctx = useContext(CommandBarContext);
  if (!ctx) throw new Error("useCommandBar must be used within CommandBarProvider");
  return ctx;
}
