import React, { useState } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { DiagnosisPage } from './pages/DiagnosisPage';
import { LiveStatusPage } from './pages/LiveStatusPage';
import { HistoryPage } from './pages/HistoryPage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { useRahgozar } from './hooks/useRahgozar';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const {
    connection,
    profiles,
    settings,
    events,
    latestDiagnosis,
    isDiagnosing,
    connect,
    disconnect,
    runDiagnosis,
    addProfile,
    deleteProfile,
    parseConfig,
    saveSetting,
    windowControls,
  } = useRahgozar();

  return (
    <div className="h-screen w-screen flex flex-col bg-rahgozar-bg text-slate-100 overflow-hidden font-sans select-none" dir="rtl">
      {/* Frameless Top Window Bar */}
      <TitleBar
        connection={connection}
        onMinimize={windowControls.minimize}
        onMaximize={windowControls.maximize}
        onClose={windowControls.close}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* RTL Sidebar on Right */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          connection={connection}
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto bg-rahgozar-bg/95 relative">
          {/* Subtle background glow orbs */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {activeTab === 'dashboard' && (
            <DashboardPage
              connection={connection}
              profiles={profiles}
              latestDiagnosis={latestDiagnosis}
              onConnect={() => connect()}
              onDisconnect={() => disconnect()}
              onNavigateToDiagnosis={() => setActiveTab('diagnosis')}
              onNavigateToProfiles={() => setActiveTab('profiles')}
            />
          )}

          {activeTab === 'profiles' && (
            <ProfilesPage
              profiles={profiles}
              connection={connection}
              onConnect={(id) => connect(id)}
              onAddProfile={addProfile}
              onDeleteProfile={deleteProfile}
              onParseConfig={parseConfig}
            />
          )}

          {activeTab === 'diagnosis' && (
            <DiagnosisPage
              diagnosis={latestDiagnosis}
              isDiagnosing={isDiagnosing}
              onRunDiagnosis={runDiagnosis}
            />
          )}

          {activeTab === 'live' && <LiveStatusPage events={events} />}

          {activeTab === 'history' && <HistoryPage />}

          {activeTab === 'logs' && <LogsPage events={events} />}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              onSaveSetting={saveSetting}
            />
          )}

          {activeTab === 'about' && <AboutPage />}
        </main>
      </div>
    </div>
  );
};
export default App;
