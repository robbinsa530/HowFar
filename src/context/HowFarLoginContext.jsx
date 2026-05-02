import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import HowFarLoginDialog from '../components/dialogs/HowFarLoginDialog';

const HowFarLoginContext = createContext({
  openLogin: () => {},
});

export function HowFarLoginProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openLogin = useCallback(() => setOpen(true), []);

  const value = useMemo(() => ({ openLogin }), [openLogin]);

  return (
    <HowFarLoginContext.Provider value={value}>
      {children}
      <HowFarLoginDialog open={open} onClose={() => setOpen(false)} />
    </HowFarLoginContext.Provider>
  );
}

export function useHowFarLogin() {
  return useContext(HowFarLoginContext);
}
