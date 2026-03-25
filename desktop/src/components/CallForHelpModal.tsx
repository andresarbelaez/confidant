import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import OptionGrid from './OptionGrid';
import './CallForHelpModal.css';

const PHONEBOOK_COLLECTION = 'dant_phonebook';
const MIN_RESULTS_FOR_FALLBACK = 3;

/** Build ChromaDB-compatible where filter (explicit $eq so national hotlines query returns results). */
function phonebookWhere(country: string, postalCode: string) {
  return { $and: [{ country: { $eq: country } }, { postal_code: { $eq: postalCode } }] };
}

const COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States', flag: '🇺🇸' },
  { value: 'CA', label: 'Canada', flag: '🇨🇦' },
  { value: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
  { value: 'OTHER', label: 'Other', flag: '🌐' },
];

interface PhoneBookEntry {
  id: string;
  text: string;
  metadata: Record<string, string>;
}

interface CallForHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function CallForHelpModal({ isOpen, onClose, userId }: CallForHelpModalProps) {
  const { t } = useTranslation(userId);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [postalCode, setPostalCode] = useState('');
  const [view, setView] = useState<'form' | 'table'>('form');
  const [national, setNational] = useState<PhoneBookEntry[]>([]);
  const [local, setLocal] = useState<PhoneBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalFocusTrap(isOpen, onClose, dialogRef);

  const fetchEntries = async () => {
    if (!country?.trim() || country === 'OTHER') return;
    setLoading(true);
    setError(null);
    try {
      const countryCode = country.trim();
      const nationalWhere = JSON.stringify(phonebookWhere(countryCode, 'NATIONAL'));
      const nationalList = await invoke<PhoneBookEntry[]>(`get_documents_by_filter`, {
        collectionName: PHONEBOOK_COLLECTION,
        whereJson: nationalWhere,
      }).catch(() => []);
      setNational(Array.isArray(nationalList) ? nationalList : []);

      let localList: PhoneBookEntry[] = [];
      if (postalCode.trim()) {
        const localWhere = JSON.stringify(phonebookWhere(countryCode, postalCode.trim()));
        localList = await invoke<PhoneBookEntry[]>(`get_documents_by_filter`, {
          collectionName: PHONEBOOK_COLLECTION,
          whereJson: localWhere,
        }).catch(() => []);
        localList = Array.isArray(localList) ? localList : [];

        if (localList.length <= MIN_RESULTS_FOR_FALLBACK && postalCode.trim().length >= 3) {
          const prefix = postalCode.trim().slice(0, 5);
          const prefixWhere = JSON.stringify(phonebookWhere(countryCode, prefix));
          const byPrefix = await invoke<PhoneBookEntry[]>(`get_documents_by_filter`, {
            collectionName: PHONEBOOK_COLLECTION,
            whereJson: prefixWhere,
          }).catch(() => []);
          if (Array.isArray(byPrefix) && byPrefix.length > localList.length) localList = byPrefix;
        }
        if (localList.length <= MIN_RESULTS_FOR_FALLBACK) {
          const countryOnlyWhere = JSON.stringify({
            $and: [{ country: { $eq: countryCode } }, { postal_code: { $ne: 'NATIONAL' } }],
          });
          const byCountry = await invoke<PhoneBookEntry[]>(`get_documents_by_filter`, {
            collectionName: PHONEBOOK_COLLECTION,
            whereJson: countryOnlyWhere,
          }).catch(() => []);
          if (Array.isArray(byCountry) && byCountry.length > localList.length) localList = byCountry;
        }
      }
      setLocal(localList);
      setView('table');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView('form');
    setError(null);
  };

  const hasResults = national.length > 0 || local.length > 0;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-dialog call-for-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-for-help-modal-title"
        aria-describedby="call-for-help-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="call-for-help-modal-title">{t('ui.callForHelp')}</h2>
        </div>
        <div className="modal-content">
          {view === 'form' && (
            <>
              <p id="call-for-help-modal-desc" className="call-for-help-intro">
                {t('ui.callForHelpPrivacy')} {t('ui.callForHelpUsageContext')}
              </p>
              <div className="call-for-help-form">
                <OptionGrid
                  label={t('ui.country')}
                  options={COUNTRY_OPTIONS}
                  value={country}
                  onChange={(v) => setCountry(v)}
                  className="call-for-help-form-field"
                  clickOutsideBoundaryRef={dialogRef}
                />
                <div className="call-for-help-form-field">
                  <label htmlFor="call-for-help-postal">
                    {t('ui.postalCode')}
                  </label>
                  <input
                    id="call-for-help-postal"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={t('ui.postalCodePlaceholder')}
                    className="call-for-help-input"
                    aria-required="true"
                  />
                </div>
                {country === 'OTHER' && (
                  <p className="call-for-help-unsupported" role="status">
                    {t('ui.callForHelpUnsupportedCountry')}
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  {t('ui.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={fetchEntries}
                  disabled={!country?.trim() || country === 'OTHER' || loading}
                >
                  {loading ? t('ui.loading') : t('ui.showPhoneBook')}
                </button>
              </div>
            </>
          )}
          {view === 'table' && (
            <>
              {error && (
                <div className="call-for-help-error" role="alert">
                  {t('ui.errorLabel')}: {error}
                </div>
              )}
              {!error && !hasResults && (
                <p className="call-for-help-empty">{t('ui.noEntriesForLocation')}</p>
              )}
              {!error && hasResults && (
                <div className="call-for-help-results">
                  {national.length > 0 && (
                    <section className="call-for-help-section" aria-labelledby="national-heading">
                      <h3 id="national-heading" className="call-for-help-section-title">
                        {t('ui.nationalHotlines')}
                      </h3>
                      <table className="call-for-help-table" role="table">
                        <thead>
                          <tr>
                            <th scope="col">{t('ui.phoneBookName')}</th>
                            <th scope="col">{t('ui.phoneBookProfession')}</th>
                            <th scope="col">{t('ui.phoneBookPhone')}</th>
                            <th scope="col">{t('ui.phoneBookAddress')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {national.map((e) => (
                            <tr key={e.id}>
                              <td>{(e.metadata?.name as string) ?? e.text}</td>
                              <td>{(e.metadata?.profession as string) ?? ''}</td>
                              <td>{(e.metadata?.phone as string) ?? ''}</td>
                              <td>
                                {[e.metadata?.address, e.metadata?.city, e.metadata?.state]
                                  .filter(Boolean)
                                  .join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}
                  {local.length > 0 && (
                    <section className="call-for-help-section" aria-labelledby="local-heading">
                      <h3 id="local-heading" className="call-for-help-section-title">
                        {t('ui.localResources')}
                      </h3>
                      <table className="call-for-help-table" role="table">
                        <thead>
                          <tr>
                            <th scope="col">{t('ui.phoneBookName')}</th>
                            <th scope="col">{t('ui.phoneBookProfession')}</th>
                            <th scope="col">{t('ui.phoneBookPhone')}</th>
                            <th scope="col">{t('ui.phoneBookAddress')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {local.map((e) => (
                            <tr key={e.id}>
                              <td>{(e.metadata?.name as string) ?? e.text}</td>
                              <td>{(e.metadata?.profession as string) ?? ''}</td>
                              <td>{(e.metadata?.phone as string) ?? ''}</td>
                              <td>
                                {[e.metadata?.address, e.metadata?.city, e.metadata?.state]
                                  .filter(Boolean)
                                  .join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}
                </div>
              )}
              <div className="modal-actions call-for-help-actions-bottom">
                <button type="button" className="btn btn-secondary" onClick={handleBack}>
                  {t('ui.back')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
