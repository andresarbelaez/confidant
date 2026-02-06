import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import './UserKnowledgeBaseManager.css';

interface KBEntry {
  id: string;
  text: string;
  metadata: {
    category: 'diagnosis' | 'condition' | 'history' | 'general' | 'legal';
    created_at: string;
    updated_at: string;
  };
}

interface UserKnowledgeBaseManagerProps {
  userId: string;
}

export default function UserKnowledgeBaseManager({ userId }: UserKnowledgeBaseManagerProps) {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KBEntry | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  
  // Form state
  const [category, setCategory] = useState<'diagnosis' | 'condition' | 'history' | 'general' | 'legal'>('general');
  const [text, setText] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [generalInfo, setGeneralInfo] = useState('');
  const [legalHistory, setLegalHistory] = useState('');

  useEffect(() => {
    loadEntries();
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      const collectionName = `dant_knowledge_user_${userId}`;
      const stats = await invoke<{ document_count: number }>('get_collection_stats_by_name', {
        collectionName
      });
      setDocumentCount(stats.document_count || 0);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      // For now, we'll store entries in a simple format
      // In a real implementation, you'd query the vector store or maintain a separate index
      // For simplicity, we'll use localStorage as a temporary solution
      const stored = localStorage.getItem(`kb_entries_${userId}`);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveEntries = (newEntries: KBEntry[]) => {
    localStorage.setItem(`kb_entries_${userId}`, JSON.stringify(newEntries));
    setEntries(newEntries);
  };

  const handleAddCondition = () => {
    if (conditionInput.trim()) {
      setConditions([...conditions, conditionInput.trim()]);
      setConditionInput('');
    }
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!text.trim() && !diagnosis.trim() && !medicalHistory.trim() && !generalInfo.trim() && !legalHistory.trim()) {
      return;
    }

    try {
      // Build text content based on category
      let entryText = '';
      let entryCategory = category;

      if (category === 'diagnosis') {
        entryText = diagnosis.trim();
        if (!entryText) return;
      } else if (category === 'condition') {
        entryText = conditions.join(', ');
        if (!entryText) return;
      } else if (category === 'history') {
        entryText = medicalHistory.trim();
        if (!entryText) return;
      } else if (category === 'general') {
        entryText = generalInfo.trim();
        if (!entryText) return;
      } else if (category === 'legal') {
        entryText = legalHistory.trim();
        if (!entryText) return;
      }

      const now = new Date().toISOString();
      const entryId = editingEntry?.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const entry: KBEntry = {
        id: entryId,
        text: entryText,
        metadata: {
          category: entryCategory,
          created_at: editingEntry?.metadata.created_at || now,
          updated_at: now
        }
      };

      // Add to vector store
      const collectionName = `dant_knowledge_user_${userId}`;
      
      // Generate embedding
      const embedding = await invoke<number[]>('generate_embedding', { text: entryText });
      
      // Add to collection
      await invoke('add_documents_to_collection', {
        collectionName,
        documents: [{
          id: entryId,
          text: entryText,
          embedding,
          metadata: entry.metadata
        }]
      });

      // Update local entries
      if (editingEntry) {
        const updated = entries.map(e => e.id === entryId ? entry : e);
        saveEntries(updated);
      } else {
        saveEntries([...entries, entry]);
      }

      // Reset form
      resetForm();
      await loadStats();
    } catch (err) {
      console.error('Failed to save entry:', err);
      alert('Failed to save entry. Please try again.');
    }
  };

  const handleEdit = (entry: KBEntry) => {
    setEditingEntry(entry);
    setCategory(entry.metadata.category);
    
    if (entry.metadata.category === 'diagnosis') {
      setDiagnosis(entry.text);
    } else if (entry.metadata.category === 'condition') {
      setConditions(entry.text.split(', ').filter(c => c.trim()));
    } else if (entry.metadata.category === 'history') {
      setMedicalHistory(entry.text);
    } else if (entry.metadata.category === 'general') {
      setGeneralInfo(entry.text);
    } else if (entry.metadata.category === 'legal') {
      setLegalHistory(entry.text);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      // Note: ChromaDB doesn't have a direct delete by ID in our current setup
      // For now, we'll just remove from local storage
      // In production, you'd want to implement proper deletion
      const updated = entries.filter(e => e.id !== entryId);
      saveEntries(updated);
      await loadStats();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const resetForm = () => {
    setCategory('general');
    setText('');
    setDiagnosis('');
    setConditions([]);
    setConditionInput('');
    setMedicalHistory('');
    setGeneralInfo('');
    setLegalHistory('');
    setEditingEntry(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="user-kb-manager">Loading...</div>;
  }

  return (
    <div className="user-kb-manager">
      <div className="kb-header">
        <h3>Personal Knowledge Base</h3>
        <div className="kb-stats">
          <span>{documentCount} document{documentCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="kb-actions">
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} />
          Add Entry
        </button>
      </div>

      {showForm && (
        <div className="kb-form-modal">
          <div className="kb-form-content">
            <div className="kb-form-header">
              <h4>{editingEntry ? 'Edit Entry' : 'Add Entry'}</h4>
              <button className="close-button" onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <div className="kb-form-body">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                >
                  <option value="diagnosis">Health Diagnosis</option>
                  <option value="condition">Pre-existing Condition</option>
                  <option value="history">Medical History</option>
                  <option value="general">General Information</option>
                  <option value="legal">Legal History</option>
                </select>
              </div>

              {category === 'diagnosis' && (
                <div className="form-group">
                  <label>Health Diagnosis</label>
                  <textarea
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Enter health diagnosis..."
                    rows={4}
                  />
                </div>
              )}

              {category === 'condition' && (
                <div className="form-group">
                  <label>Pre-existing Conditions</label>
                  <div className="condition-input-group">
                    <input
                      type="text"
                      value={conditionInput}
                      onChange={(e) => setConditionInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCondition();
                        }
                      }}
                      placeholder="Enter condition and press Enter"
                    />
                    <button type="button" onClick={handleAddCondition}>Add</button>
                  </div>
                  {conditions.length > 0 && (
                    <div className="condition-tags">
                      {conditions.map((cond, idx) => (
                        <span key={idx} className="condition-tag">
                          {cond}
                          <button
                            type="button"
                            onClick={() => handleRemoveCondition(idx)}
                            className="tag-remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {category === 'history' && (
                <div className="form-group">
                  <label>Medical History</label>
                  <textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    placeholder="Enter medical history..."
                    rows={6}
                  />
                </div>
              )}

              {category === 'general' && (
                <div className="form-group">
                  <label>General Information</label>
                  <textarea
                    value={generalInfo}
                    onChange={(e) => setGeneralInfo(e.target.value)}
                    placeholder="Enter general information..."
                    rows={6}
                  />
                </div>
              )}

              {category === 'legal' && (
                <div className="form-group">
                  <label>Legal History</label>
                  <textarea
                    value={legalHistory}
                    onChange={(e) => setLegalHistory(e.target.value)}
                    placeholder="Enter legal history..."
                    rows={6}
                  />
                </div>
              )}

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSubmit}>
                  {editingEntry ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="kb-entries">
        {entries.length === 0 ? (
          <div className="empty-state">
            <p>No entries yet. Add your first entry to get started.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="kb-entry">
              <div className="entry-header">
                <span className="entry-category">{entry.metadata.category}</span>
                <span className="entry-date">
                  {new Date(entry.metadata.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="entry-content">{entry.text}</div>
              <div className="entry-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleEdit(entry)}
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleDelete(entry.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
