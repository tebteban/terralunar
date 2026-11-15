import type {ReactNode} from 'react'

/** Shared instrument sheet for Earth, Moon and Mars. */
export default function SurfacePanel({children,label}:{children:ReactNode;label:string}){
 return <aside aria-label={label} className="surface-panel rise-in absolute inset-x-2 bottom-2 z-10 flex max-h-[56%] min-w-0 flex-col gap-5 overflow-y-auto rounded-2xl border border-pressed bg-canvas p-4 text-ink shadow-card sm:p-6 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:top-[7.5rem] lg:max-h-none lg:w-[400px] xl:top-[7.5rem] xl:w-[420px] [&>*]:shrink-0">{children}</aside>
}
