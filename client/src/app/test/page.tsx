'use client';

import { useEffect, useState } from 'react';

export default function TestPage() {
  const [status, setStatus] = useState('Checking...');
  
  useEffect(() => {
    // Simple test to see if the page loads
    setStatus('Page loaded successfully!');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Test Page</h1>
          <p className="text-slate-600">{status}</p>
        </div>
      </main>
    </div>
  );
}