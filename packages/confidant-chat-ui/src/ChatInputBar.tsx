import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { ArrowUp } from 'lucide-react'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  placeholder?: string
  disabled?: boolean
  sendButtonLabel?: string
  /** Ref for the textarea (e.g. for auto-resize). */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  /** Custom send icon; default is ArrowUp. */
  sendIcon?: React.ReactNode
}

export function ChatInputBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask a question…',
  disabled = false,
  sendButtonLabel = 'Send',
  inputRef,
  sendIcon,
}: ChatInputBarProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <form onSubmit={onSubmit} className="chat-input-form">
      <div className="chat-input-wrap">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={disabled}
          rows={1}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="chat-send-button"
          aria-label={sendButtonLabel}
        >
          {(sendIcon ?? <ArrowUp size={18} aria-hidden />) as ReactNode}
        </button>
      </div>
    </form>
  )
}
