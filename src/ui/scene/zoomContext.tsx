import { createContext, useContext } from 'react';

export const ZoomContext = createContext<number>(1);

export const useSceneZoom = (): number => useContext(ZoomContext);

export const isSemanticZoom = (zoom: number): boolean => zoom >= 2;
