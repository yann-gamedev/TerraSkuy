import React from 'react';

interface StatusCardProps {
  type: 'error' | 'success';
  title?: string;
  message?: string;
  children?: React.ReactNode;
}

export default function StatusCard({ type, title, message, children }: StatusCardProps) {
  const isError = type === 'error';
  
  return (
    <div className={`w-full p-6 rounded-3xl border ${isError ? 'bg-rose-950/20 border-rose-900/50' : 'bg-slate-900/40 border-slate-800'} backdrop-blur-md transition-all duration-500`}>
      {title && (
        <h3 className={`text-lg font-semibold mb-2 ${isError ? 'text-rose-400' : 'text-slate-100'}`}>
          {title}
        </h3>
      )}
      {message && (
        <p className={`text-base ${isError ? 'text-rose-200/70' : 'text-slate-400'} mb-4 break-words`}>
          {message}
        </p>
      )}
      {children}
    </div>
  );
}
