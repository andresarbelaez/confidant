import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { useTranslation } from '../i18n/hooks/useTranslation';
import './UserKnowledgeBaseManager.css';

interface KBEntry {
  id: string;
  text: string;
  metadata: {
    category: 'diagnosis' | 'condition' | 'history' | 'general' | 'legal'; // 'legal' for legacy entries only
    created_at: string;
    updated_at: string;
  };
}

const categoryToLabel: Record<string, string> = {
  diagnosis: 'healthDiagnosis',
  condition: 'preExistingCondition',
  history: 'medicalHistory',
  general: 'generalInfo',
  legal: 'generalInfo', // legacy entries: display as general
};

interface UserKnowledgeBaseManagerProps {
  userId: string;
}

export default function UserKnowledgeBaseManager({ userId }: UserKnowledgeBaseManagerProps) {
  const { t } = useTranslation(userId);
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KBEntry | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  
  // Form state
  const [category, setCategory] = useState<'diagnosis' | 'condition' | 'history' | 'general'>('general');
  const [text, setText] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [generalInfo, setGeneralInfo] = useState('');

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
    if (!text.trim() && !diagnosis.trim() && !medicalHistory.trim() && !generalInfo.trim()) {
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
      alert(t('userKb.saveEntryFailed'));
    }
  };

  const handleEdit = (entry: KBEntry) => {
    setEditingEntry(entry);
    const cat = entry.metadata.category;
    setCategory(cat === 'legal' ? 'general' : cat);
    
    if (cat === 'diagnosis') {
      setDiagnosis(entry.text);
    } else if (cat === 'condition') {
      setConditions(entry.text.split(', ').filter(c => c.trim()));
    } else if (cat === 'history') {
      setMedicalHistory(entry.text);
    } else if (cat === 'general' || cat === 'legal') {
      setGeneralInfo(entry.text);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm(t('userKb.deleteEntryConfirm'))) {
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
    setEditingEntry(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="user-kb-manager">{t('ui.loading')}</div>;
  }

  return (
    <div className="user-kb-manager">
      <div className="kb-header">
        <h3>{t('userKb.personalKnowledgeBase')}</h3>
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
          {t('userKb.addEntry')}
        </button>
      </div>

      {showForm && (
        <div className="kb-form-modal">
          <div className="kb-form-content">
            <div className="kb-form-header">
              <h4>{editingEntry ? t('userKb.editEntry') : t('userKb.addEntry')}</h4>
              <button className="close-button" onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <div className="kb-form-body">
              <div className="form-group">
                <label>{t('userKb.category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                >
                  <option value="diagnosis">{t('userKb.healthDiagnosis')}</option>
                  <option value="condition">{t('userKb.preExistingCondition')}</option>
                  <option value="history">{t('userKb.medicalHistory')}</option>
                  <option value="general">{t('userKb.generalInfo')}</option>
                </select>
              </div>

              {category === 'diagnosis' && (
                <div className="form-group">
                  <label>{t('userKb.healthDiagnosis')}</label>
                  <textarea
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder={t('userKb.enterHealthDiagnosis')}
                    rows={4}
                  />
                </div>
              )}

              {category === 'condition' && (
                <div className="form-group">
                  <label>{t('userKb.preExistingCondition')}</label>
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
                      placeholder={t('userKb.enterConditionAndPressEnter')}
                    />
                    <button type="button" onClick={handleAddCondition}>{t('userKb.addTag')}</button>
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
                  <label>{t('userKb.medicalHistory')}</label>
                  <textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    placeholder={t('userKb.enterMedicalHistory')}
                    rows={6}
                  />
                </div>
              )}

              {category === 'general' && (
                <div className="form-group">
                  <label>{t('userKb.generalInfo')}</label>
                  <textarea
                    value={generalInfo}
                    onChange={(e) => setGeneralInfo(e.target.value)}
                    placeholder={t('userKb.enterGeneralInfo')}
                    rows={6}
                  />
                </div>
              )}

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={resetForm}>
                  {t('ui.cancel')}
                </button>
                <button className="btn btn-primary" onClick={handleSubmit}>
                  {editingEntry ? t('userKb.update') : t('userKb.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="kb-entries">
        {entries.length === 0 ? (
          <div className="empty-state">
            <p>{t('userKb.noEntriesYet')}</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="kb-entry">
              <div className="entry-header">
                <span className="entry-category">{t(`userKb.${categoryToLabel[entry.metadata.category] ?? 'generalInfo'}`)}</span>
                <span className="entry-date">
                  {new Date(entry.metadata.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="entry-content">{entry.text}</div>
              <div className="entry-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleEdit(entry)}
                  title={t('userKb.edit')}
                >
                  <Edit size={16} />
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleDelete(entry.id)}
                  title={t('userKb.delete')}
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
