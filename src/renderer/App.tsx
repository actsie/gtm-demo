import { useEffect } from 'react';
import { useAppStore } from './store';
import SettingsModal from './components/SettingsModal';
import LeadsTab from './components/LeadsTab';
import DraftsTab from './components/DraftsTab';
import EmailTab from './components/EmailTab';
import ProspectsTab from './components/ProspectsTab';
import RecentRuns from './components/RecentRuns';

export default function App() {
  const {
    activeTab,
    settingsModalOpen,
    recentRunsPanelOpen,
    theme,
    setActiveTab,
    setSettingsModalOpen,
    setRecentRunsPanelOpen,
    setSettings,
    setSecret,
    setKeytarAvailable,
    setRecentRuns,
    setTheme,
  } = useAppStore();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      // Load settings
      const settings = await window.electronAPI.getSettings();
      setSettings(settings);

      // Load secret
      const { secret, keytarAvailable } = await window.electronAPI.getSecret();
      if (secret) {
        setSecret(secret);
      }
      setKeytarAvailable(keytarAvailable);

      // Load recent runs
      const runs = await window.electronAPI.getRecentRuns();
      setRecentRuns(runs);

      // Set theme based on settings or system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const themeMode = settings.ui.theme === 'auto' ? (prefersDark ? 'dark' : 'light') : settings.ui.theme;
      setTheme(themeMode);

      // Apply theme to document
      if (themeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    initializeApp();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Update document theme when theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top App Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">GTM Ops Console</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRecentRunsPanelOpen(!recentRunsPanelOpen)}
            className="btn-secondary"
            aria-label="Toggle recent runs"
          >
            📋 Recent Runs
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="btn-secondary"
            aria-label="Open settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex gap-1">
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'leads'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          🔍 Leads
        </button>

        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'drafts'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          ✍️ Reply Drafts
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'email'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          📧 Prospect Email
        </button>

        <button
          onClick={() => setActiveTab('prospects')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'prospects'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          📋 Prospects
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'leads' && <LeadsTab />}
        {activeTab === 'drafts' && <DraftsTab />}
        {activeTab === 'email' && <EmailTab />}
        {activeTab === 'prospects' && <ProspectsTab />}
      </div>

      {/* Modals and Panels */}
      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
      <RecentRuns isOpen={recentRunsPanelOpen} onClose={() => setRecentRunsPanelOpen(false)} />

      {/* Overlay when recent runs is open */}
      {recentRunsPanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setRecentRunsPanelOpen(false)}
        />
      )}
    </div>
  );
}
