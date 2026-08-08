import { cn } from "@/lib/utils"

/**
 * Loading placeholder. The fade-in stops a skeleton from appearing as a hard
 * flash on a fast connection, and pairs with content that fades in behind it.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-skeleton-in rounded-md bg-muted", className)} {...props} />
}

export { Skeleton }
