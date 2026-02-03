import { useState } from 'react'
import NetworkMonitor from './components/NetworkMonitor'
import ModelDownloader from './components/ModelDownloader'
import KnowledgeBaseManager from './components/KnowledgeBaseManager'
import ChatInterface from './components/ChatInterface'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'status' | 'model' | 'knowledge' | 'chat'>('status')

  return (
    <div className="App">
      <header className="App-header">
        <h1>dant</h1>
        <p className="subtitle">Offline AI Assistant</p>
        <p className="tagline">Privacy-first health consultation</p>
      </header>
      
      <main className="App-main">
        <div className="tabs">
          <button
            className={activeTab === 'status' ? 'active' : ''}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
          <button
            className={activeTab === 'model' ? 'active' : ''}
            onClick={() => setActiveTab('model')}
          >
            Model Manager
          </button>
          <button
            className={activeTab === 'knowledge' ? 'active' : ''}
            onClick={() => setActiveTab('knowledge')}
          >
            Knowledge Base
          </button>
          <button
            className={activeTab === 'chat' ? 'active' : ''}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
        </div>

        {activeTab === 'status' && (
          <>
            <NetworkMonitor />
            
            <div className="status-card">
              <h2>Status</h2>
              <p>✅ Phase 1: Core Infrastructure - Complete</p>
              <p>✅ Phase 2: LLM Integration - Complete</p>
              <p>✅ Phase 3: Vector Database - Complete</p>
              <p>✅ Phase 4: Knowledge Base System - Complete</p>
              <p>🚧 Phase 5: Polish & Testing - Next</p>
              <p>Service Worker: Active</p>
              <p>Network Monitoring: Active</p>
              <p>LLM Engine: Ready</p>
            </div>
          </>
        )}

        {activeTab === 'model' && (
          <ModelDownloader />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseManager />
        )}

        {activeTab === 'chat' && (
          <ChatInterface />
        )}
      </main>
    </div>
  )
}

export default App
