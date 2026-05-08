"use client";

import React, { useReducer } from 'react';
import UrlInputForm from '@/components/UrlInputForm';
import StatusCard from '@/components/StatusCard';
import DownloadButton from '@/components/DownloadButton';

type State = {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  data: { filename: string; downloadUrl: string } | null;
};

type Action =
  | { type: 'SUBMIT' }
  | { type: 'SUCCESS'; payload: { filename: string; downloadUrl: string } }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SUBMIT':
      return { ...state, status: 'loading', error: null, data: null };
    case 'SUCCESS':
      return { ...state, status: 'success', data: action.payload };
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload, data: null };
    case 'RESET':
      return { status: 'idle', error: null, data: null };
    default:
      return state;
  }
};

const isValidTeraboxUrl = (urlString: string) => {
  try {
    let urlToParse = urlString;
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlToParse = 'https://' + urlString;
    }
    const parsed = new URL(urlToParse);
    const validDomains = ['terabox.com', '1024terabox.com', 'teraboxapp.com'];
    return validDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

export default function Home() {
  const [state, dispatch] = useReducer(reducer, {
    status: 'idle',
    error: null,
    data: null,
  });

  const handleSubmit = async (url: string) => {
    dispatch({ type: 'SUBMIT' });

    if (!isValidTeraboxUrl(url)) {
      dispatch({ type: 'ERROR', payload: 'Invalid URL format. Please enter a valid terabox.com, 1024terabox.com, or teraboxapp.com link.' });
      return;
    }

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        dispatch({ type: 'ERROR', payload: result.error || 'Terjadi kesalahan saat memproses link.' });
        return;
      }

      dispatch({ 
        type: 'SUCCESS', 
        payload: { 
          filename: result.filename, 
          downloadUrl: result.directUrl || url 
        } 
      });
    } catch (err: any) {
      dispatch({ type: 'ERROR', payload: 'Gagal menghubungi server. Silakan coba lagi.' });
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-slate-950">
      <div className="w-full max-w-lg flex flex-col items-center space-y-10 relative z-10">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-indigo-500/10 mb-2 ring-1 ring-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            TerraSkuy
          </h1>
          <p className="text-slate-400 text-lg">
            Fast and seamless Terabox file downloader
          </p>
        </div>

        <div className="w-full glass rounded-3xl p-6 sm:p-8 space-y-6">
          <UrlInputForm onSubmit={handleSubmit} isLoading={state.status === 'loading'} />

          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${state.status === 'idle' || state.status === 'loading' ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
            {state.status === 'error' && (
              <StatusCard type="error" title="Validation Error" message={state.error!} />
            )}

            {state.status === 'success' && state.data && (
              <StatusCard type="success" title="File Ready" message={state.data.filename}>
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <DownloadButton url={state.data.downloadUrl} />
                </div>
              </StatusCard>
            )}
          </div>
        </div>

      </div>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]"></div>
      </div>
    </main>
  );
}
