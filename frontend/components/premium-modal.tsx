'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Bell, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle?: string;
}

export function PremiumModal({ isOpen, onClose, movieTitle = 'This Movie' }: PremiumModalProps) {
  const t = useTranslations('PremiumModal');
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleNotifyClick = () => {
    setNotified(true);
    setTimeout(() => setNotified(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4!"
            onClick={onClose}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-md shadow-2xl overflow-hidden"
            >
              {/* Premium glow background */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 via-transparent to-transparent pointer-events-none" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2! hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-slate-300 hover:text-white" />
              </button>

              {/* Content */}
              <div className="relative z-10 p-8! sm:p-10!">
                {/* Premium icon with glow */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 20 }}
                  className="flex justify-center mb-6!"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-600/40 blur-xl rounded-full" />
                    <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-600 p-4! rounded-full shadow-lg">
                      <Crown className="w-8 h-8 text-slate-900" />
                    </div>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl sm:text-3xl font-title text-center text-white mb-3!"
                >
                  {t('title')}
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-slate-400 text-sm mb-6!"
                >
                  {t('subtitle', { movieTitle })}
                </motion.p>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-slate-300 text-center text-sm leading-relaxed mb-8!"
                >
                  {t('description')}
                </motion.p>

                {/* Coming soon features */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-slate-700/30 border border-slate-600/30 rounded-md p-4! mb-8!"
                >
                  <h3 className="text-sm font-semibold text-white mb-3! flex items-center gap-2">
                    <span className="text-yellow-400">✨</span> {t('comingSoon')}
                  </h3>
                  <ul className="space-y-2! text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                      {t('featureCatalog')}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                      {t('featureEarlyAccess')}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                      {t('featureRecommendations')}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                      {t('featureAdFree')}
                    </li>
                  </ul>
                </motion.div>

                {/* Success message */}
                <AnimatePresence>
                  {notified && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4! p-3! bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm text-center"
                    >
                      ✓ {t('notified')}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-3! flex flex-col"
                >
                  {/* Primary button */}
                  <button
                    onClick={handleNotifyClick}
                    className="group relative w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 font-semibold py-3! px-4! rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/25 flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    {t('notifyBtn')}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-colors duration-200" />
                  </button>

                  {/* Tertiary button */}
                  <button
                    onClick={onClose}
                    className="w-full text-slate-400 hover:text-slate-300 font-medium py-2! px-4! rounded-lg transition-colors duration-200 hover:bg-slate-700/20"
                  >
                    {t('maybeLaterBtn')}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
