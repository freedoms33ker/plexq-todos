import type { ComponentProps, ReactElement } from "react"
import { cn } from "../../lib/cn.ts"

export const textInputClasses =
  "w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"

export const TextInput = ({ className, ...props }: ComponentProps<"input">): ReactElement => (
  <input className={cn(textInputClasses, "h-10", className)} {...props} />
)

export const TextArea = ({ className, ...props }: ComponentProps<"textarea">): ReactElement => (
  <textarea className={cn(textInputClasses, "min-h-16 resize-y py-2", className)} {...props} />
)
