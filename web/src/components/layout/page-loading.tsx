import { Skeleton } from '@/components/ui/skeleton'

export function PageLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-3" data-testid="page-loading">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton className="h-36 rounded-xl" data-testid={`page-loading-item-${index + 1}`} key={index} />
      ))}
    </div>
  )
}
