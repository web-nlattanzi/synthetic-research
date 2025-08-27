import React from 'react';
import { CheckCircle, Clock, AlertCircle, Download, Eye } from 'lucide-react';

const RunStatus = ({ 
  runId, 
  runStatus, 
  downloadUrl, 
  lastError, 
  audienceDescription, 
  questions, 
  researchType, 
  nRespondents,
  onDownload,
  onPreview 
}) => {
  const getStatusIcon = () => {
    switch (runStatus) {
      case 'succeeded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (runStatus) {
      case 'queued':
        return 'Queued - Waiting to start';
      case 'running':
        return 'Running - Generating synthetic responses';
      case 'succeeded':
        return 'Completed successfully';
      case 'failed':
        return 'Failed to complete';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (runStatus) {
      case 'succeeded':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'running':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Run Status</h3>
        
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${getStatusColor()}`}>
          {getStatusIcon()}
          <div className="flex-1">
            <p className="font-medium">{getStatusText()}</p>
            {runId && (
              <p className="text-sm opacity-75">Run ID: {runId}</p>
            )}
          </div>
        </div>

        {lastError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Error Details:</p>
            <p className="text-red-600 text-sm mt-1">{lastError}</p>
          </div>
        )}

        {runStatus === 'succeeded' && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={onDownload}
              disabled={!downloadUrl}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Excel Report
            </button>
            <button
              onClick={onPreview}
              className="btn-secondary flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview Results
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Run Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Research Settings</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-2 font-medium capitalize">{researchType}</span>
              </div>
              <div>
                <span className="text-gray-500">Respondents:</span>
                <span className="ml-2 font-medium">{nRespondents}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Target Audience</h4>
            <div className="bg-gray-50 p-3 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {audienceDescription || '(No audience description provided)'}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Questions ({questions.length})</h4>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-gray-600">
                      Q{index + 1}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">
                      {question.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{question.q}</p>
                  {question.options && question.options.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Options:</p>
                      <div className="flex flex-wrap gap-1">
                        {question.options.map((option, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-white rounded border">
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunStatus;