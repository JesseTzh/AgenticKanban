import { Skeleton } from '@/components/ui/skeleton'

export function PageLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton className="h-36 rounded-xl" key={index} />
      ))}
    </div>
  )
}
