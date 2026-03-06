import toast from 'react-hot-toast';

/**
 * 用 react-hot-toast 實作確認對話框，取代 window.confirm
 */
export function confirmToast(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{message}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { toast.dismiss(t.id); resolve(false); }}
              className="rounded-lg bg-gray-600 px-4 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-500 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
              className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
            >
              確定
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          borderRadius: '0.75rem',
          padding: '16px',
          maxWidth: '360px',
        },
      }
    );
  });
}
