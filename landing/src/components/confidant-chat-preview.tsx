'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChatLayout, ChatSidebarShell, ChatMessages, ChatInputBar, type ChatMessage } from 'confidant-chat-ui'
import { LogOut, Settings, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { scrollToHash } from '@/lib/scroll-to-hash'
import 'confidant-chat-ui/styles.css'

const WELCOME_TITLE = 'Welcome to Confidant'
const WELCOME_SUBTITLE = 'Ask a question or share what\'s on your mind. This preview is not private—download the app for real conversations.'
const INPUT_PLACEHOLDER = 'Share what\'s on your mind…'
const FOOTER_DISCLAIMER = "I'm not a substitute for therapy or professional mental health care. For support, please reach out to a qualified professional."
const OVERLAY_MESSAGE = 'This is a website—not a safe place for private conversations. Download the app to get your answer in full privacy.'
const DOWNLOAD_CTA = 'Download Confidant'
const HINT_AFTER_DISMISS = 'Download for private answers'

/** Sidebar items: same look as desktop, non-functional (no onClick). */
const SIDEBAR_ITEMS = [
  { label: 'Log out', icon: <LogOut size={20} /> },
  { label: 'Settings', icon: <Settings size={20} /> },
  { label: 'Delete chat history', icon: <Trash2 size={20} /> },
]

export function ConfidantChatPreview() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [overlayDismissed, setOverlayDismissed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text } as ChatMessage])
    setOverlayVisible(true)
  }

  const closeOverlay = () => {
    setOverlayVisible(false)
    setOverlayDismissed(true)
  }

  const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }))

  return (
    <section id="try-it-yourself" className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-balance font-serif text-3xl font-medium sm:text-4xl text-center">
          Try It Yourself
        </h2>
        <p className="text-muted-foreground mt-4 text-center text-balance">
          See the interface below—then download the app for private conversations.
        </p>

        <div className="confidant-chat-preview-theme relative mt-10 rounded-xl overflow-hidden border border-border shadow-lg" style={{ height: '480px' }}>
          <ChatLayout
            sidebar={
              <ChatSidebarShell
                items={SIDEBAR_ITEMS}
                aria-label="Chat and account (preview)"
              />
            }
          >
            <ChatMessages
              messages={chatMessages as unknown as ChatMessage[]}
              welcomeTitle={WELCOME_TITLE}
              welcomeSubtitle={WELCOME_SUBTITLE}
            />
            <ChatInputBar
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder={INPUT_PLACEHOLDER}
              sendButtonLabel="Send"
            />
            {overlayDismissed && (
              <p className="text-center text-sm text-muted-foreground py-2">
                {HINT_AFTER_DISMISS}
              </p>
            )}
            <p className="chat-footer">{FOOTER_DISCLAIMER}</p>
          </ChatLayout>

          {overlayVisible && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
              <div className="relative bg-card border border-border rounded-lg shadow-xl p-6 max-w-md mx-4 text-center">
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
                <p className="text-foreground mt-2 pr-8">{OVERLAY_MESSAGE}</p>
                <Button asChild className="mt-6" size="lg">
                  <Link href="#download" onClick={(e) => { scrollToHash(e, '#download'); closeOverlay(); }}>
                    {DOWNLOAD_CTA}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
