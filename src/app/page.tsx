"use client";

import React, { useReducer } from 'react';
import { toast } from 'sonner';
import UrlInputForm from '@/components/UrlInputForm';
import StatusCard from '@/components/StatusCard';
import DownloadButton from '@/components/DownloadButton';

type State = {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  data: { filename: string; filesize: string; downloadUrl: string } | null;
};

type Action =
  | { type: 'SUBMIT' }
  | { type: 'SUCCESS'; payload: { filename: string; filesize: string; downloadUrl: string } }
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
    const validDomains = [
      'terabox.com', 
      '1024terabox.com', 
      'teraboxapp.com', 
      '1024tera.com',
      '4funbox.com',
      'mirrobox.com',
      'nephobox.com',
      'freeterabox.com',
      'terabox.app'
    ];
    return validDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const sanitizeFilename = (name: string) => {
  return name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'downloaded_file';
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
      const msg = 'Format URL tidak valid. Pastikan link dari Terabox.';
      dispatch({ type: 'ERROR', payload: msg });
      toast.error(msg);
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
        const errorMsg = result.error || 'Terjadi kesalahan saat memproses link.';
        dispatch({ type: 'ERROR', payload: errorMsg });
        toast.error(errorMsg);
        return;
      }

      const safeFilename = sanitizeFilename(result.filename);
      const proxyUrl = result.directUrl 
        ? `/api/download?url=${encodeURIComponent(result.directUrl)}&filename=${encodeURIComponent(safeFilename)}`
        : url;

      dispatch({ 
        type: 'SUCCESS', 
        payload: { 
          filename: safeFilename, 
          filesize: result.filesize || 'Unknown Size',
          downloadUrl: proxyUrl 
        } 
      });
      toast.success('Berhasil mendapatkan link download!');
    } catch (err: any) {
      const msg = 'Gagal menghubungi server. Silakan coba lagi.';
      dispatch({ type: 'ERROR', payload: msg });
      toast.error(msg);
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
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
          <UrlInputForm key={state.status === 'idle' ? 'idle' : 'active'} onSubmit={handleSubmit} isLoading={state.status === 'loading'} />

          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${state.status === 'idle' || state.status === 'loading' ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
            {state.status === 'error' && (
              <StatusCard type="error" title="Ekstraksi Gagal" message={state.error!}>
                <button 
                  onClick={handleReset}
                  className="mt-4 px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-medium text-sm w-full"
                >
                  Coba URL Lain
                </button>
              </StatusCard>
            )}

            {state.status === 'success' && state.data && (
              <StatusCard type="success" title="File Ready!" message={`${state.data.filename} (${state.data.filesize})`}>
                <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
                  <DownloadButton url={state.data.downloadUrl} />
                  <button 
                    onClick={handleReset}
                    className="w-full py-3 rounded-2xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all font-medium"
                  >
                    Ekstrak URL Baru
                  </button>
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
