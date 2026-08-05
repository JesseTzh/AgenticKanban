import { useEffect, useRef } from 'react'
import type Vditor from 'vditor'
import 'vditor/dist/index.css'

export function MarkdownEditor({ taskID, value, onChange }: { taskID: string; value: string; onChange: (value: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Vditor | null>(null)

  useEffect(() => {
    if (!rootRef.current || typeof ResizeObserver === 'undefined') return
    let cancelled = false
    void import('vditor').then(({ default: VditorEditor }) => {
      if (cancelled || !rootRef.current) return
      editorRef.current = new VditorEditor(rootRef.current, {
        cache: { enable: false },
        height: 360,
        mode: 'ir',
        placeholder: '使用 Markdown 编写任务详情，可粘贴或上传图片。',
        value,
        input: onChange,
        upload: {
          accept: 'image/*',
          fieldName: 'file[]',
          max: 10 * 1024 * 1024,
          multiple: true,
          url: `/api/tasks/${taskID}/images`,
          withCredentials: true,
        },
      })
    })
    return () => {
      cancelled = true
      editorRef.current?.destroy()
      editorRef.current = null
    }
  }, [taskID])

  return <div className="task-markdown-editor" data-testid={`task-detail-markdown-editor-${taskID}`} ref={rootRef} />
}
