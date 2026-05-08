"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Download, Play, FileIcon, FileVideo, FileImage, FileArchive, ClipboardPaste, Link2, Loader2, Info } from 'lucide-react';

const getDummyData = (url: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (url.includes('error')) reject(new Error('Format URL tidak valid'));
      
      // Determine dummy type based on URL input
      let filetype = 'document';
      let filename = 'TERABOX_Document_1024.pdf';
      if (url.includes('video')) {
        filetype = 'video';
        filename = 'Avenger_Endgame_1080p.mp4';
      } else if (url.includes('image')) {
        filetype = 'image';
        filename = 'Wallpaper_4K_Abstract.png';
      } else if (url.includes('zip')) {
        filetype = 'archive';
        filename = 'Project_Source_Code.zip';
      }

      resolve({
        filename,
        filesize: '2.5 GB',
        filetype,
        directUrl: '#',
      });
    }, 2000);
  });
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'video': return <FileVideo className="w-10 h-10 text-blue-400" />;
    case 'image': return <FileImage className="w-10 h-10 text-purple-400" />;
    case 'archive': return <FileArchive className="w-10 h-10 text-orange-400" />;
    default: return <FileIcon className="w-10 h-10 text-slate-400" />;
  }
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [data, setData] = useState<any>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast.success('URL berhasil ditempel!');
    } catch (err) {
      toast.error('Gagal mengakses clipboard. Coba gunakan Ctrl+V atau Paste manual.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setStatus('loading');
    setData(null);

    try {
      const result = await getDummyData(url);
      setData(result);
      setStatus('success');
      toast.success('File berhasil diekstrak!');
    } catch (err: any) {
      setStatus('error');
      toast.error(err.message || 'Gagal mengekstrak URL.');
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0a0a0a] text-white">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 flex flex-col space-y-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5 shadow-xl shadow-blue-500/10 mb-2">
            <Link2 className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Terra<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Skuy</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">Download file Terabox dengan mudah, tanpa ribet.</p>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://terabox.com/s/..."
                disabled={status === 'loading'}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm sm:text-base"
                required
              />
              <button
                type="button"
                onClick={handlePaste}
                disabled={status === 'loading'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                title="Paste from clipboard"
              >
                <ClipboardPaste className="w-5 h-5" />
              </button>
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || !url.trim()}
              className="w-full relative group overflow-hidden rounded-2xl py-4 font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center gap-2">
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Mengekstrak File...</span>
                  </>
                ) : (
                  <span>Ambil File</span>
                )}
              </div>
            </button>
          </form>

          {/* Result Card with AnimatePresence */}
          <AnimatePresence>
            {status === 'success' && data && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 shrink-0">
                      {getFileIcon(data.filetype)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-slate-200 truncate" title={data.filename}>
                        {data.filename}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{data.filesize}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={data.directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 hover:text-blue-300 border border-blue-500/20 transition-all font-medium text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                    
                    {data.filetype === 'video' && (
                      <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 hover:text-purple-300 border border-purple-500/20 transition-all font-medium text-sm">
                        <Play className="w-4 h-4" />
                        Preview
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Kami tidak menyimpan file di server, proses dilakukan secara direct.</span>
        </motion.div>

      </div>
    </main>
  );
}
