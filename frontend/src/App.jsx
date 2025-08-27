import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Settings, Users, MessageSquare, Play } from 'lucide-react';
import AudienceBuilder from './components/AudienceBuilder';
import QuestionBuilder from './components/QuestionBuilder';
import RunStatus from './components/RunStatus';

export default function App() {
  // Tabs
  const [activeTab, setActiveTab] = useState('audience');

  // Core inputs
  const [apiUrl, setApiUrl] = useState('');
  const [researchType, setResearchType] = useState('qual');
  const [nRespondents, setNRespondents] = useState(25);

  // Audience: freeform + builder
  const [audMode, setAudMode] = useState('freeform');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [income, setIncome] = useState('');
  const [behavior, setBehavior] = useState('');
  const [attitudes, setAttitudes] = useState('');

  // Questions - now structured
  const [questions, setQuestions] = useState([
    {
      id: uuidv4(),
      q: 'What motivates you to choose one coffee brand over another?',
      type: 'open',
      options: [],
      prompt: ''
    },
    {
      id: uuidv4(),
      q: 'How often do you purchase coffee?',
      type: 'single',
      options: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
      prompt: ''
    }
  ]);

  // Run state
  const [runId, setRunId] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [lastError, setLastError] = useState('');

  // Helpers
  const baseUrl = () => apiUrl.replace(/\/$/, '');

  // Backend Calls
  async function createRun() {
    setLastError('');
    const base = baseUrl();
    if (!base) {
      alert('Please paste your backend API URL (no trailing slash).');
      return;
    }
    if (!audienceDescription.trim()) {
      alert('Please provide an audience description.');
      return;
    }
    if (questions.length === 0) {
      alert('Please provide at least one question.');
      return;
    }
    const n = Number(nRespondents || 1);
    if (isNaN(n) || n < 1) {
      alert('Respondents must be a positive number.');
      return;
    }

    // Validate questions
    for (const q of questions) {
      if (!q.q.trim()) {
        alert('All questions must have text.');
        return;
      }
      if ((q.type === 'single' || q.type === 'multi') && (!q.options || q.options.length === 0)) {
        alert(`Question "${q.q}" needs at least one option.`);
        return;
      }
    }

    setRunId(null);
    setRunStatus('queued');
    setDownloadUrl(null);

    try {
      const res = await fetch(`${base}/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment_text: audienceDescription,
          research_type: researchType,
          questions: questions,
          n_respondents: n
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        setRunStatus(`error (${res.status})`);
        setLastError(t || 'Create run failed.');
        alert(`Create run failed: ${res.status}\n${t || 'See backend logs for details.'}`);
        return;
      }

      const j = await res.json();
      setRunId(j.run_id);
      setRunStatus('running');
      setActiveTab('run');
      pollStatus(j.run_id);
    } catch (e) {
      setRunStatus('error (network)');
      setLastError(String(e));
      alert('Network error creating run. Check API URL / Port 8000 visibility.');
    }
  }

  function pollStatus(id) {
    const base = baseUrl();
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`${base}/api/runs/${id}`);
        if (!r.ok) {
          if (r.status === 404) {
            setRunStatus('error (not found)');
            clearInterval(timer);
          }
          return;
        }
        const j = await r.json();
        setRunStatus(j.status);
        if (j.status === 'succeeded' && j.download_url) {
          setDownloadUrl(`${base}${j.download_url}`);
          clearInterval(timer);
        } else if (j.status === 'failed') {
          setLastError(j.error_message || 'Background job failed.');
          clearInterval(timer);
        }
      } catch {
        setRunStatus('error (poll)');
        clearInterval(timer);
      }
    }, 2000);
  }

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handlePreview = async () => {
    if (!runId) return;
    
    try {
      const base = baseUrl();
      const res = await fetch(`${base}/api/runs/${runId}/preview`);
      if (res.ok) {
        const data = await res.json();
        console.log('Preview data:', data);
        // Could open a modal or navigate to a preview page
        alert('Preview feature coming soon! Check console for data.');
      }
    } catch (e) {
      console.error('Preview error:', e);
    }
  };

  const tabs = [
    { id: 'audience', label: 'Define Audience', icon: Users },
    { id: 'questions', label: 'Research Questions', icon: MessageSquare },
    { id: 'run', label: 'Run & Export', icon: Play }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Synthetic Research Tool
          </h1>
          <p className="text-gray-600">
            Generate realistic survey responses from AI-powered synthetic respondents
          </p>
        </div>

        {/* API Configuration */}
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">API Configuration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backend API URL
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://your-backend-url.com (no trailing slash)"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Research Type
              </label>
              <select
                value={researchType}
                onChange={(e) => setResearchType(e.target.value)}
                className="input-field"
              >
                <option value="qual">Qualitative</option>
                <option value="quant">Quantitative</option>
                <option value="creative">Creative</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Respondents
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={nRespondents}
              onChange={(e) => setNRespondents(Math.max(1, Number(e.target.value || 1)))}
              className="input-field w-32"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'audience' && (
            <AudienceBuilder
              audMode={audMode}
              setAudMode={setAudMode}
              audienceDescription={audienceDescription}
              setAudienceDescription={setAudienceDescription}
              age={age}
              setAge={setAge}
              gender={gender}
              setGender={setGender}
              location={location}
              setLocation={setLocation}
              income={income}
              setIncome={setIncome}
              behavior={behavior}
              setBehavior={setBehavior}
              attitudes={attitudes}
              setAttitudes={setAttitudes}
            />
          )}

          {activeTab === 'questions' && (
            <QuestionBuilder
              questions={questions}
              setQuestions={setQuestions}
            />
          )}

          {activeTab === 'run' && (
            <RunStatus
              runId={runId}
              runStatus={runStatus}
              downloadUrl={downloadUrl}
              lastError={lastError}
              audienceDescription={audienceDescription}
              questions={questions}
              researchType={researchType}
              nRespondents={nRespondents}
              onDownload={handleDownload}
              onPreview={handlePreview}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="card">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {activeTab === 'audience' && 'Define your target audience to get started'}
              {activeTab === 'questions' && `${questions.length} questions configured`}
              {activeTab === 'run' && (runStatus ? `Status: ${runStatus}` : 'Ready to generate synthetic responses')}
            </div>
            <div className="flex gap-3">
              {activeTab !== 'run' && (
                <button
                  onClick={() => {
                    const nextTab = activeTab === 'audience' ? 'questions' : 'run';
                    setActiveTab(nextTab);
                  }}
                  className="btn-secondary"
                >
                  Next Step
                </button>
              )}
              <button
                onClick={createRun}
                disabled={runStatus === 'running' || runStatus === 'queued'}
                className="btn-primary flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {runStatus === 'running' || runStatus === 'queued' 
                  ? 'Generating...' 
                  : 'Generate Responses'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}