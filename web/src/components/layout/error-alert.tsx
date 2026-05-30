import { Alert, AlertDescription } from '@/components/ui/alert'

export function ErrorAlert({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <Alert variant="destructive">
      <AlertDescription>{error instanceof Error ? error.message : '请求失败'}</AlertDescription>
    </Alert>
  )
}
