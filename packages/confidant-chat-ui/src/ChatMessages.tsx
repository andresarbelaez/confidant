import type { ReactNode } from 'react'
import { Copy } from 'lucide-react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: ReactNode
}

interface ChatMessagesProps {
  messages: ChatMessage[]
  welcomeTitle: string
  welcomeSubtitle: string
  showWelcome?: boolean
  /** When true, last assistant message with empty content shows thinkingLabel */
  showThinking?: boolean
  thinkingLabel?: string
  /** When set, assistant messages with string content show a copy button. */
  onCopy?: (content: string, index: number) => void
  copiedIndex?: number | null
  copyLabel?: string
  copiedLabel?: string
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
            isLast &&
            msg.role === 'assistant' &&
            (msg.content === '' || msg.content == null) &&
            showThinking
          const canCopy = msg.role === 'assistant' && !isPlaceholderThinking && typeof msg.content === 'string' && onCopy
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
                      onClick={() => onCopy(String(msg.content), idx)}
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
    </div>
  )
}
