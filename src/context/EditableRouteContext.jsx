import { createContext, useContext } from 'react';

/** When false (e.g. /route/:uuid view-only), route editing UI and map interactions are disabled. */
export const EditableRouteContext = createContext(true);

export function useEditableRoute() {
  return useContext(EditableRouteContext);
}
