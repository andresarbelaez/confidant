import type { ReactNode } from 'react'
import type { RefObject } from 'react'
import { Copy } from 'lucide-react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: ReactNode
  /** When set, copy button uses this string instead of content (for assistant messages where content is ReactNode). */
  copyableText?: string
}

interface ChatMessagesProps {
  messages: ChatMessage[]
  welcomeTitle: string
  welcomeSubtitle: string
  showWelcome?: boolean
  /** When true, last assistant message shows thinkingLabel (until cleared after first chunk is rendered) */
  showThinking?: boolean
  thinkingLabel?: string
  /** When set, assistant messages with string content show a copy button. */
  onCopy?: (content: string, index: number) => void
  copiedIndex?: number | null
  copyLabel?: string
  copiedLabel?: string
  /** Ref for a sentinel div rendered at the end of the list (inside the scroll area) for scroll-into-view. */
  scrollAnchorRef?: RefObject<HTMLDivElement>
}

export function ChatMessages({
  messages,
  welcomeTitle,
  welcomeSubtitle,
  showWelcome = true,
  showThinking = false,
  thinkingLabel = 'Thinking…',
  onCopy,
  copiedIndex = null,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  scrollAnchorRef,
}: ChatMessagesProps) {
  return (
    <div className="chat-messages">
      {messages.length === 0 && showWelcome ? (
        <div className="chat-welcome">
          <h3>{welcomeTitle}</h3>
          <p>{welcomeSubtitle}</p>
        </div>
      ) : (
        messages.map((msg, idx) => {
          const isLast = idx === messages.length - 1
          const isPlaceholderThinking =
            isLast && msg.role === 'assistant' && showThinking
          const copyText = msg.copyableText ?? (typeof msg.content === 'string' ? msg.content : null)
          const canCopy = msg.role === 'assistant' && !isPlaceholderThinking && copyText !== null && onCopy
          return (
            <div key={idx} className={`message ${msg.role}`}>
              <div className={`message-content${isPlaceholderThinking ? ' thinking-text' : ''}`}>
                {isPlaceholderThinking ? thinkingLabel : msg.content}
              </div>
              {canCopy && (
                <div className="message-actions">
                  <div className="copy-action-wrap">
                    <button
                      type="button"
                      className="message-action-btn"
                      onClick={() => onCopy(copyText, idx)}
                      aria-label={copiedIndex === idx ? copiedLabel : copyLabel}
                    >
                      <Copy size={16} />
                    </button>
                    <span className="copy-tooltip" role="status">
                      {copiedIndex === idx ? copiedLabel : copyLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
      <div ref={scrollAnchorRef} aria-hidden="true" />
    </div>
  )
}
