'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#f3f4f6' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#f3f4f6' },
        },
      }}
    />
  );
}
