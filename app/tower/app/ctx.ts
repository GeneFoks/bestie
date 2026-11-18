// @ts-nocheck
'use client'

// «Вышки в США» Mini App — the app-wide context (api, me, navigation, toast).
// Its own file so screens and the root never import each other in a circle.
import { createContext, useContext } from 'react'

export const AppCtx = createContext(null)

export function useApp() {
  return useContext(AppCtx)
}
