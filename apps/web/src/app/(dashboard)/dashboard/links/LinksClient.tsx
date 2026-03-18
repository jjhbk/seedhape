'use client';

import { useState } from 'react';
import { Plus, Copy, Check, Share2 } from 'lucide-react';
import { CreateLinkModal } from '@/components/dashboard/CreateLinkModal';

export function LinksClient() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <Plus className="h-4 w-4" />
        Create Link
      </button>

      {showModal && <CreateLinkModal onClose={() => setShowModal(false)} />}
    </>
  );
}

export function LinkRowActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    if (navigator.share) {
      void navigator.share({ title, url });
    } else {
      handleCopy();
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleCopy}
        title="Copy link"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        {copied ? (
          <><Check className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">Copied</span></>
        ) : (
          <><Copy className="h-3.5 w-3.5" />Copy</>
        )}
      </button>
      <button
        onClick={handleShare}
        title="Share link"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
    </div>
  );
}
