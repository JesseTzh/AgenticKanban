import { Alert, AlertDescription } from '@/components/ui/alert'

export function ErrorAlert({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <Alert data-testid="page-error-alert" variant="destructive">
      <AlertDescription data-testid="page-error-description">{error instanceof Error ? error.message : '请求失败'}</AlertDescription>
    </Alert>
  )
}
