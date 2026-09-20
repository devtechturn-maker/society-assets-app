import { useEffect, useState } from 'react';
import { subscribeGlobalLoading, isGlobalLoadingVisible } from '../services/globalApiLoading';

/** Subscribe to the single global API/blocking loader visibility. */
export function useGlobalLoadingVisible(): boolean {
  const [visible, setVisible] = useState(isGlobalLoadingVisible);

  useEffect(
    () =>
      subscribeGlobalLoading((nextVisible) => {
        setVisible(nextVisible);
      }),
    []
  );

  return visible;
}
