import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ProspectRow,
  EmailDraftResponse,
  EmailSendResponse,
  RecentRun,
} from '../../shared/types';
import { useAppStore } from '../store';
import DraftEditorModal from './DraftEditorModal';

export default function ProspectsTab() {
  const { addRecentRun } = useAppStore();

  // State
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Draft editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<{
    prospectId: string;
    email: string;
    company: string;
    subject: string;
    body: string;
    note?: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // API helper
  async function apiCall(path: string, body: any): Promise<any> {
    const response = await window.electronAPI.networkRequest('POST', path, body);

    if (!response.ok || response.status >= 300) {
      const errorMsg =
        typeof response.body === 'object' && response.body?.error?.message
          ? response.body.error.message
          : typeof response.body === 'object' && response.body?.error
          ? JSON.stringify(response.body.error)
          : `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return response.body?.data || response.body;
  }

  // Load prospects from n8n
  const loadProspects = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall('/webhook/prospects-list', {
        limit: 20,
        offset: 0,
        search: '',
      });

      setProspects(data.prospects || []);
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(errorMsg);
      showToast('error', `Failed to load prospects: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate draft for a prospect
  const generateDraft = async (prospect: ProspectRow) => {
    setLoading(true);
    setError(null);

    try {
      const data: EmailDraftResponse['data'] = await apiCall('/webhook/cold-email', {
        mode: 'draft',
        email: prospect.email,
        company: prospect.company,
        note: prospect.note || '',
      });

      setCurrentDraft({
        prospectId: prospect.id,
        email: prospect.email,
        company: prospect.company,
        subject: data.subject || '',
        body: data.body || '',
        note: prospect.note,
      });
      setEditorOpen(true);

      // Save to recent runs
      const run: RecentRun = {
        id: uuidv4(),
        tab: 'prospects',
        args: { mode: 'draft', email: prospect.email, company: prospect.company },
        ok: true,
        ts: new Date().toISOString(),
        snippet: `Draft generated for ${prospect.company}`,
        responseSummary: { subject: data.subject },
      };
      await window.electronAPI.addRecentRun(run);
      addRecentRun(run);
    } catch (e) {
      const errorMsg = (e as Error).message;
      showToast('error', `Draft failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Regenerate draft
  const regenerateDraft = async () => {
    if (!currentDraft) return;

    setRegenerating(true);

    try {
      const data: EmailDraftResponse['data'] = await apiCall('/webhook/cold-email', {
        mode: 'draft',
        email: currentDraft.email,
        company: currentDraft.company,
        note: currentDraft.note || '',
      });

      setCurrentDraft({
        ...currentDraft,
        subject: data.subject || '',
        body: data.body || '',
      });

      showToast('success', 'Draft regenerated');
    } catch (e) {
      const errorMsg = (e as Error).message;
      showToast('error', `Regenerate failed: ${errorMsg}`);
    } finally {
      setRegenerating(false);
    }
  };

  // Send draft
  const sendDraft = async () => {
    if (!currentDraft) return;

    setSending(true);

    try {
      // Use networkRequest directly to preserve full response structure (including links)
      const response = await window.electronAPI.networkRequest('POST', '/webhook/cold-email', {
        mode: 'send',
        email: currentDraft.email,
        company: currentDraft.company,
        subject: currentDraft.subject,
        body: currentDraft.body,
        note: currentDraft.note || '',
      });

      if (!response.ok || response.status >= 300) {
        const errorMsg =
          typeof response.body === 'object' && response.body?.error?.message
            ? response.body.error.message
            : typeof response.body === 'object' && response.body?.error
            ? JSON.stringify(response.body.error)
            : `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      const data: EmailSendResponse = response.body;

      // Debug: Log the full response to see what we're getting
      console.log('Send email response:', JSON.stringify(data, null, 2));

      if (data.data.sent) {
        showToast('success', `Email sent to ${currentDraft.email} ✅`);

        if (data.links?.airtable_url) {
          console.log('Airtable URL:', data.links.airtable_url);
        }

        // Save to recent runs
        const run: RecentRun = {
          id: uuidv4(),
          tab: 'prospects',
          args: {
            mode: 'send',
            email: currentDraft.email,
            company: currentDraft.company,
            subject: currentDraft.subject,
          },
          ok: true,
          ts: new Date().toISOString(),
          snippet: `Sent to ${currentDraft.company}`,
          responseSummary: { sent: true, airtable_url: data.links?.airtable_url },
        };
        await window.electronAPI.addRecentRun(run);
        addRecentRun(run);
      } else if (data.data.reason === 'already_sent_recently') {
        showToast('info', 'Skipped (duplicate guard - already contacted recently)');
      } else {
        showToast('info', 'Email processed');
      }

      setEditorOpen(false);
      loadProspects(); // Refresh list
    } catch (e) {
      const errorMsg = (e as Error).message;
      showToast('error', `Send failed: ${errorMsg}`);
    } finally {
      setSending(false);
    }
  };

  // Toast helper
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Load prospects on mount
  useEffect(() => {
    loadProspects();
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Prospects
        </h2>
        <button
          onClick={loadProspects}
          disabled={loading}
          className="btn-secondary"
        >
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            toast.type === 'success'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : toast.type === 'error'
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200 font-semibold">Error</p>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && prospects.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">📋</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            No prospects found
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Make sure your n8n webhook is returning prospect data
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && prospects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {prospects.map((prospect) => (
                <tr key={prospect.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {prospect.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {prospect.company}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {prospect.note || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        prospect.status === 'replied'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : prospect.status === 'contacted'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {prospect.status || 'new'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => generateDraft(prospect)}
                      disabled={loading}
                      className="btn-primary text-xs py-2 px-4"
                    >
                      ✍️ Generate Draft
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Draft Editor Modal */}
      {currentDraft && (
        <DraftEditorModal
          isOpen={editorOpen}
          email={currentDraft.email}
          company={currentDraft.company}
          subject={currentDraft.subject}
          body={currentDraft.body}
          onSubjectChange={(subject) => setCurrentDraft({ ...currentDraft, subject })}
          onBodyChange={(body) => setCurrentDraft({ ...currentDraft, body })}
          onSend={sendDraft}
          onRegenerate={regenerateDraft}
          onClose={() => setEditorOpen(false)}
          sending={sending}
          regenerating={regenerating}
        />
      )}
    </div>
  );
}
