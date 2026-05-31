import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-high outline outline-1 outline-outline", className)}
      {...props}
    />
  )
}

export { Skeleton }
