import { cn } from "@/lib/utils"

// DECISION: Skeleton now uses the shared `.shimmer` class so loading states carry the brand's
// gold sweep animation instead of shadcn's grey pulse. Falls back to bg-muted so dark mode
// still reads as a placeholder.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer rounded-md bg-muted/70", className)}
      {...props}
    />
  )
}

export { Skeleton }
