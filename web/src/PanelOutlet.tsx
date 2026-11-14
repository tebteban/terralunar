import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ResultsTarget } from './panelContext.ts'
export default function PanelOutlet({ children }: { children: ReactNode }) {
  const target = useContext(ResultsTarget)
  return target ? createPortal(children, target) : null
}
