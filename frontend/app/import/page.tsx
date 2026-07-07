'use client';

/**
 * Execution Import Page
 * Upload, paste, or fetch n8n execution JSON for analysis
 * With neumorphic design
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { updateStepProgress } from '@/components/StepProgress';
import { API_BASE_URL } from '@/lib/api/config';

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

    const response = await fetch(`${API_BASE_URL}/api/normalize-execution`, {
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
      const response = await fetch(`${API_BASE_URL}/api/n8n/fetch-execution`, {
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

      // Update step progress - mark Step 1 complete
      updateStepProgress({
        completed: 1,
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
      const response = await fetch(`${API_BASE_URL}/api/normalize-execution`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Import failed: ${response.statusText}`);
      }

      const data: ImportResult = await response.json();
      setResult(data);

      // Update step progress - mark Step 1 complete
      updateStepProgress({
        completed: 1,
      });

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
      <div className="max-w-4xl mx-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-neu-text">Import Execution</h1>
            <p className="mt-1 text-sm text-neu-text-muted font-body">
              Upload, paste, or fetch n8n execution data to analyze workflow performance
            </p>
          </div>

        {/* Main Card */}
        <div className="neu-raised p-6">
          {/* Method Toggle */}
          <div className="flex gap-2 mb-6 neu-inset rounded-lg p-1">
            <button
              onClick={() => handleMethodChange('file')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                method === 'file'
                  ? 'neu-raised text-neu-accent'
                  : 'text-neu-text-muted hover:text-neu-text'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => handleMethodChange('paste')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                method === 'paste'
                  ? 'neu-raised text-neu-accent'
                  : 'text-neu-text-muted hover:text-neu-text'
              }`}
            >
              Paste JSON
            </button>
            <button
              onClick={() => handleMethodChange('fetch')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                method === 'fetch'
                  ? 'neu-raised text-neu-accent'
                  : 'text-neu-text-muted hover:text-neu-text'
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
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                ${isDragging
                  ? 'border-neu-accent bg-neu-accent/10'
                  : selectedFile
                    ? 'border-neu-green bg-neu-green/10'
                    : 'border-neu-shadow-light/50 hover:border-neu-accent/50 hover:bg-neu-shadow-light/10'
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
                  <svg className="mx-auto h-12 w-12 text-neu-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-neu-text">{selectedFile.name}</p>
                  <p className="text-xs text-neu-text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="mt-2 text-xs text-neu-coral hover:text-neu-coral/80 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-neu-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-neu-text-muted">
                    <span className="font-medium text-neu-accent">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-neu-text-muted">JSON files only</p>
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
                className="w-full h-64 p-4 bg-neu-bg border border-neu-shadow-light/30 rounded-lg font-mono text-sm text-neu-text resize-none focus:ring-2 focus:ring-neu-accent focus:border-neu-accent transition-colors placeholder:text-neu-text-muted/50"
              />
              <p className="mt-2 text-xs text-neu-text-muted">
                Paste the full n8n execution JSON export
              </p>
            </div>
          )}

          {/* Fetch from n8n */}
          {method === 'fetch' && (
            <div className="space-y-4">
              {/* n8n Instance URL */}
              <div>
                <label className="block text-sm font-medium text-neu-text mb-1">
                  n8n Instance URL
                </label>
                <input
                  type="url"
                  value={n8nUrl}
                  onChange={(e) => handleN8nUrlChange(e.target.value)}
                  placeholder="https://n8n-jobbot.onrender.com"
                  className="w-full px-4 py-2 bg-neu-bg border border-neu-shadow-light/30 rounded-lg text-sm text-neu-text focus:ring-2 focus:ring-neu-accent focus:border-neu-accent transition-colors placeholder:text-neu-text-muted/50"
                />
              </div>

              {/* Execution ID */}
              <div>
                <label className="block text-sm font-medium text-neu-text mb-1">
                  Execution ID
                </label>
                <input
                  type="text"
                  value={n8nExecutionId}
                  onChange={(e) => { setN8nExecutionId(e.target.value); setError(null); }}
                  placeholder="4350"
                  className="w-full px-4 py-2 bg-neu-bg border border-neu-shadow-light/30 rounded-lg text-sm text-neu-text focus:ring-2 focus:ring-neu-accent focus:border-neu-accent transition-colors placeholder:text-neu-text-muted/50"
                />
                <p className="mt-1 text-xs text-neu-text-muted">
                  Find this in the execution URL: /executions/<strong className="text-neu-accent">4350</strong>
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-neu-text mb-1">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={n8nApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="n8n_api_..."
                    className="w-full px-4 py-2 pr-10 bg-neu-bg border border-neu-shadow-light/30 rounded-lg text-sm text-neu-text focus:ring-2 focus:ring-neu-accent focus:border-neu-accent transition-colors placeholder:text-neu-text-muted/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neu-text-muted hover:text-neu-text transition-colors"
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
                <p className="mt-1 text-xs text-neu-text-muted">
                  Get your API key from n8n Settings → API
                </p>
              </div>

              {/* Saved indicator */}
              {(n8nUrl || n8nApiKey) && (
                <p className="text-xs text-neu-green flex items-center gap-1">
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
            <div className="mt-4 p-4 neu-inset border-l-4 border-neu-coral">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-neu-coral flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-neu-coral">Import Error</p>
                  <p className="text-sm text-neu-text-muted">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {result && (
            <div className="mt-4 p-4 neu-inset border-l-4 border-neu-green">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-neu-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-neu-green">Import Successful!</p>
                  <p className="text-sm text-neu-text-muted">
                    Execution ID: {result.execution_id.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-neu-text-muted">
                    {result.event_count} events • {result.status} • {(result.duration_ms / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-neu-accent mt-1">
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
                  flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                  ${isLoading || result
                    ? 'bg-neu-shadow-light/30 text-neu-text-muted cursor-not-allowed'
                    : 'btn-primary'
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
                  flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                  ${isLoading || result
                    ? 'bg-neu-shadow-light/30 text-neu-text-muted cursor-not-allowed'
                    : 'btn-primary'
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
                className="py-3 px-4 rounded-lg font-medium text-neu-text-muted bg-neu-shadow-light/20 hover:bg-neu-shadow-light/30 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Method-Specific Instructions */}
        {method === 'file' && (
          <div className="mt-6 neu-inset p-6">
            <h3 className="font-display font-semibold text-neu-text mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              How to Upload Your Execution File
            </h3>

            <div className="space-y-4 text-sm text-neu-text-muted">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Download from n8n</p>
                  <p>In n8n, go to <span className="font-mono text-neu-accent">Executions</span> → Select execution → Click <span className="font-mono text-neu-accent">Download</span></p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Upload Here</p>
                  <p>Click the upload zone above or drag & drop your <span className="font-mono text-neu-accent">.json</span> file</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Analyze</p>
                  <p>SignalFlow will process your workflow and identify optimization opportunities</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {method === 'paste' && (
          <div className="mt-6 neu-inset p-6">
            <h3 className="font-display font-semibold text-neu-text mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              How to Paste Execution JSON
            </h3>

            <div className="space-y-4 text-sm text-neu-text-muted">
              {/* Step 1: Create API Key */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Create an API Key</p>
                  <ul className="space-y-1 list-disc list-inside ml-2">
                    <li>In n8n, go to <span className="font-mono text-neu-accent">Settings → n8n API</span></li>
                    <li>Click <span className="font-mono text-neu-accent">Create an API key</span></li>
                    <li>Copy the key</li>
                  </ul>
                  <p className="text-xs mt-2 text-neu-orange">Note: n8n&apos;s public API may not be available on some plans/trials</p>
                </div>
              </div>

              {/* Step 2: Fetch & Copy JSON */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-2">Fetch Execution to Clipboard</p>

                  {/* macOS */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-neu-accent mb-1">macOS</p>
                    <pre className="bg-neu-shadow-dark p-3 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap">
{`curl -sS \\
  -H "X-N8N-API-KEY: YOUR_KEY_HERE" \\
  "https://<your-n8n-domain>/api/v1/executions/<execution-id>?includeData=true" \\
  | pbcopy`}
                    </pre>
                  </div>

                  {/* Windows */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-neu-accent mb-1">Windows PowerShell</p>
                    <pre className="bg-neu-shadow-dark p-3 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap">
{`(Invoke-RestMethod \`
  -Headers @{"X-N8N-API-KEY"="YOUR_KEY_HERE"} \`
  -Uri "https://<your-n8n-domain>/api/v1/executions/<execution-id>?includeData=true") \`
| ConvertTo-Json -Depth 100 \`
| Set-Clipboard`}
                    </pre>
                  </div>

                  {/* Linux */}
                  <div>
                    <p className="text-xs font-semibold text-neu-accent mb-1">Linux (most desktops)</p>
                    <pre className="bg-neu-shadow-dark p-3 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap">
{`curl -sS \\
  -H "X-N8N-API-KEY: YOUR_KEY_HERE" \\
  "https://<your-n8n-domain>/api/v1/executions/<execution-id>?includeData=true" \\
  | xclip -selection clipboard`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Step 3: Paste */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Paste & Import</p>
                  <p>Paste the JSON in the text area above and click <span className="font-mono text-neu-accent">Import Execution</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {method === 'fetch' && (
          <div className="mt-6 neu-inset p-6">
            <h3 className="font-display font-semibold text-neu-text mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              How to Fetch from n8n
            </h3>

            <div className="space-y-4 text-sm text-neu-text-muted">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Get Your n8n Instance URL</p>
                  <p>Copy your n8n instance URL (e.g., <span className="font-mono text-neu-accent">https://your-instance.n8n.cloud</span>)</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Create an API Key</p>
                  <p>In n8n, go to <span className="font-mono text-neu-accent">Settings → n8n API → Create an API key</span></p>
                  <p className="text-xs mt-1 text-neu-orange">Note: API access may not be available on all plans</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Find the Execution ID</p>
                  <p>Go to your workflow&apos;s <span className="font-mono text-neu-accent">Executions</span> tab. The ID is in the URL: <span className="font-mono text-neu-accent">/executions/<strong>4350</strong></span></p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
                  4
                </div>
                <div>
                  <p className="font-semibold text-neu-text mb-1">Fetch & Analyze</p>
                  <p>Fill in the fields above and click <span className="font-mono text-neu-accent">Fetch & Import</span>. Your credentials will be saved for next time.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  );
}
