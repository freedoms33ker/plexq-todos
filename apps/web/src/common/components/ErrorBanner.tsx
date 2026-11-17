import { CircleAlert, X } from "lucide-react"
import type { ReactElement } from "react"
import { Button } from "./ui/button.tsx"

export interface ErrorBannerProps {
  message: string
  dismissLabel: string
  onDismiss: () => void
}

export const ErrorBanner = ({ message, dismissLabel, onDismiss }: ErrorBannerProps): ReactElement => (
  <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
    <p className="flex-1">{message}</p>
    <Button variant="ghost" size="icon" className="h-6 w-6 text-danger hover:bg-danger/10" aria-label={dismissLabel} onClick={onDismiss}>
      <X className="h-3.5 w-3.5" aria-hidden />
    </Button>
  </div>
)
