import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps, ReactElement } from "react"
import { cn } from "../../lib/cn.ts"

// One primitive with variants (react.md → Component Decomposition), adapted from plexq code-examples table-example.tsx.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white shadow-sm hover:bg-accent-strong",
        outline: "border border-line bg-surface text-ink hover:bg-canvas",
        ghost: "text-ink-muted hover:bg-canvas hover:text-ink",
        destructive: "text-ink-muted hover:bg-danger/10 hover:text-danger",
        segment: "text-ink-muted hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-sm"
      },
      size: { sm: "h-9 px-3", xs: "h-7 px-2.5 text-xs", icon: "h-8 w-8 p-0" }
    },
    defaultVariants: { variant: "outline", size: "sm" }
  }
)

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {}

export const Button = ({ className, variant, size, type = "button", ...props }: ButtonProps): ReactElement => (
  <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
)
