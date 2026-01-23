'use client';

/**
 * Execution Import Page
 * Upload, paste, or fetch n8n execution JSON for analysis
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';

type ImportMethod = 'file' | 'paste' | 'fetch';

interface ImportResult {
  execution_id: string;
  n8n_execution_id: string;
  status: string;
  event_count: number;
  duration_ms: number;
}

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<ImportMethod>('file');
  const [jsonText, setJsonText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Fetch from n8n state
  const [n8nUrl, setN8nUrl] = useState('');
  const [n8nExecutionId, setN8nExecutionId] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Load saved values from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('n8n_instance_url');
      const savedApiKey = localStorage.getItem('n8n_api_key');
      if (savedUrl) setN8nUrl(savedUrl);
      if (savedApiKey) setN8nApiKey(savedApiKey);
    }
  }, []);

  // Save n8n URL to localStorage when changed
  const handleN8nUrlChange = (value: string) => {
    setN8nUrl(value);
    setError(null);
    if (typeof window !== 'undefined' && value) {
      localStorage.setItem('n8n_instance_url', value);
    }
  };

  // Save API key to localStorage when changed
  const handleApiKeyChange = (value: string) => {
    setN8nApiKey(value);
    setError(null);
    if (typeof window !== 'undefined' && value) {
      localStorage.setItem('n8n_api_key', value);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Validate JSON
  const validateJson = (text: string): boolean => {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  };

  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Send execution data to backend
  const sendToBackend = async (executionData: object): Promise<ImportResult> => {
    const jsonString = JSON.stringify(executionData);
    const file = new File([jsonString], 'execution.json', { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:8000/api/normalize-execution', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Backend import failed: ${response.statusText}`);
    }

    return response.json();
  };

  // Fetch execution from n8n API via backend proxy
  const handleFetchFromN8n = async () => {
    setError(null);
    setResult(null);

    // Validate inputs
    if (!n8nUrl.trim()) {
      setError('Please enter your n8n instance URL');
      return;
    }

    if (!isValidUrl(n8nUrl.trim())) {
      setError('Invalid URL format. Example: https://n8n-jobbot.onrender.com');
      return;
    }

    if (!n8nExecutionId.trim()) {
      setError('Please enter the execution ID');
      return;
    }

    if (!n8nApiKey.trim()) {
      setError('Please enter your n8n API key');
      return;
    }

    setIsLoading(true);

    try {
      // Use backend proxy to avoid CORS issues
      const response = await fetch('http://localhost:8000/api/n8n/fetch-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          n8n_url: n8nUrl.trim(),
          execution_id: n8nExecutionId.trim(),
          api_key: n8nApiKey.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Import failed: ${response.statusText}`);
      }

      const data = await response.json();

      setResult({
        execution_id: data.execution_id,
        n8n_execution_id: data.n8n_execution_id,
        status: data.status,
        event_count: data.event_count,
        duration_ms: data.duration_ms,
      });

      // Redirect to unified execution page after short delay
      setTimeout(() => {
        router.push(`/execution/${data.execution_id}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle import (for file/paste methods)
  const handleImport = async () => {
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      let fileToUpload: File;

      if (method === 'file') {
        if (!selectedFile) {
          setError('Please select a file to import');
          setIsLoading(false);
          return;
        }
        fileToUpload = selectedFile;
      } else {
        // Create file from pasted JSON
        if (!jsonText.trim()) {
          setError('Please paste execution JSON');
          setIsLoading(false);
          return;
        }

        if (!validateJson(jsonText)) {
          setError('Invalid JSON format. Please check your input.');
          setIsLoading(false);
          return;
        }

        fileToUpload = new File([jsonText], 'execution.json', {
          type: 'application/json',
        });
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // POST to backend
      const response = await fetch('http://localhost:8000/api/normalize-execution', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Import failed: ${response.statusText}`);
      }

      const data: ImportResult = await response.json();
      setResult(data);

      // Redirect to unified execution page after short delay
      setTimeout(() => {
        router.push(`/execution/${data.execution_id}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedFile(null);
    setJsonText('');
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle method change
  const handleMethodChange = (newMethod: ImportMethod) => {
    setMethod(newMethod);
    setError(null);
    setResult(null);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Import Execution</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload, paste, or fetch n8n execution data to analyze workflow performance
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Method Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleMethodChange('file')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                method === 'file'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => handleMethodChange('paste')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                method === 'paste'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paste JSON
            </button>
            <button
              onClick={() => handleMethodChange('fetch')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                method === 'fetch'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Fetch from n8n
            </button>
          </div>

          {/* File Upload */}
          {method === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : selectedFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {selectedFile ? (
                <div>
                  <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="mt-2 text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">JSON files only</p>
                </div>
              )}
            </div>
          )}

          {/* Paste JSON */}
          {method === 'paste' && (
            <div>
              <textarea
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setError(null); }}
                placeholder='{"data":{"resultData":{"runData":...}}}'
                className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Paste the full n8n execution JSON export
              </p>
            </div>
          )}

          {/* Fetch from n8n */}
          {method === 'fetch' && (
            <div className="space-y-4">
              {/* n8n Instance URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  n8n Instance URL
                </label>
                <input
                  type="url"
                  value={n8nUrl}
                  onChange={(e) => handleN8nUrlChange(e.target.value)}
                  placeholder="https://n8n-jobbot.onrender.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Execution ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Execution ID
                </label>
                <input
                  type="text"
                  value={n8nExecutionId}
                  onChange={(e) => { setN8nExecutionId(e.target.value); setError(null); }}
                  placeholder="4350"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Find this in the execution URL: /executions/<strong>4350</strong>
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={n8nApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="n8n_api_..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Get your API key from n8n Settings → API
                </p>
              </div>

              {/* Saved indicator */}
              {(n8nUrl || n8nApiKey) && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Credentials saved to browser
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Import Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Import Successful!</p>
                  <p className="text-sm text-green-600">
                    Execution ID: {result.execution_id.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-green-600">
                    {result.event_count} events • {result.status} • {(result.duration_ms / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    Redirecting to execution view...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="mt-6 flex gap-3">
            {method === 'fetch' ? (
              <button
                onClick={handleFetchFromN8n}
                disabled={isLoading || !!result}
                className={`
                  flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                  ${isLoading || result
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Fetching...
                  </>
                ) : result ? (
                  'Import Complete'
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Fetch & Import
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleImport}
                disabled={isLoading || !!result}
                className={`
                  flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                  ${isLoading || result
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Importing...
                  </>
                ) : result ? (
                  'Import Complete'
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Execution
                  </>
                )}
              </button>
            )}

            {((method !== 'fetch' && (selectedFile || jsonText)) || (method === 'fetch' && n8nExecutionId)) && !result && (
              <button
                onClick={() => {
                  handleReset();
                  if (method === 'fetch') {
                    setN8nExecutionId('');
                  }
                }}
                className="py-3 px-4 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Help Text */}
        {method === 'fetch' ? (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How to get your n8n API key:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Open your n8n instance</li>
              <li>Go to Settings (gear icon)</li>
              <li>Click on "API" in the sidebar</li>
              <li>Create a new API key or copy an existing one</li>
              <li>Paste it above - it will be saved for future use</li>
            </ol>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How to export from n8n:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Open your workflow in n8n</li>
              <li>Go to Executions tab</li>
              <li>Click on the execution you want to analyze</li>
              <li>Click the download/export button to get the JSON</li>
              <li>Upload or paste the JSON here</li>
            </ol>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
