import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ChevronLeft, Check, Clock, Info, Loader2, Mail, Send, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DAYS, PERIODS, type AvailabilitySlot } from '../types';
import {
  confirmAvailabilitySubmission,
  getUserAvailability,
} from '../lib/storage';
import {
  availabilitySetToSlots,
  availabilitySetsEqual,
  availabilitySlotsToKeySet,
  availabilityToSlots,
  diffAvailabilitySlots,
  formatAvailabilitySlotLabel,
} from '../lib/availability';
import { cn } from '../lib/utils';

const ADMIN_EMAIL_HINT = import.meta.env.VITE_ADMIN_NOTIFICATION_EMAIL_HINT || '';

export function SchedulePage() {
  const { currentUser, setViewMode, refreshTrigger } = useApp();
  const { t } = useLanguage();
  const [confirmedAvailability, setConfirmedAvailability] = useState<Set<string>>(new Set());
  const [draftAvailability, setDraftAvailability] = useState<Set<string>>(new Set());
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dayLabels = useMemo(
    () => [t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday')],
    [t],
  );
  const adminEmailHint = ADMIN_EMAIL_HINT || t('availabilityDefaultRecipient');
  const periodLabels = useMemo(
    () => PERIODS.map((period) => period.label),
    [],
  );

  const changeSummary = useMemo(
    () =>
      diffAvailabilitySlots(
        availabilitySetToSlots(confirmedAvailability),
        availabilitySetToSlots(draftAvailability),
      ),
    [confirmedAvailability, draftAvailability],
  );
  const hasChanges = !availabilitySetsEqual(confirmedAvailability, draftAvailability);

  const loadAvailability = async () => {
    if (!currentUser) {
      return;
    }

    const userAvailability = await getUserAvailability(currentUser.id);
    const slotSet = availabilitySlotsToKeySet(availabilityToSlots(userAvailability));
    setConfirmedAvailability(slotSet);
    setDraftAvailability(new Set(slotSet));
  };

  useEffect(() => {
    loadAvailability().catch((error) => {
      console.error('Error loading availability:', error);
      setNotice({ type: 'error', message: t('availabilityLoadFailed') });
    });
  }, [currentUser, refreshTrigger]);

  const handleToggle = (day: number, period: number) => {
    const key = `${day}-${period}`;
    setNotice(null);
    setDraftAvailability((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleResetDraft = () => {
    setDraftAvailability(new Set(confirmedAvailability));
    setNotice(null);
  };

  const handleOpenConfirm = () => {
    if (!hasChanges) {
      setNotice({ type: 'error', message: t('availabilityNoChanges') });
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!currentUser || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const result = await confirmAvailabilitySubmission(
        currentUser.id,
        availabilitySetToSlots(draftAvailability),
      );
      const savedSet = availabilitySlotsToKeySet(result.savedSlots);
      setConfirmedAvailability(savedSet);
      setDraftAvailability(new Set(savedSet));
      setIsConfirmOpen(false);
      setNotice({ type: 'success', message: t('availabilitySubmitSuccess') });
    } catch (error) {
      console.error('Error confirming availability submission:', error);
      await loadAvailability();
      setIsConfirmOpen(false);
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : t('availabilitySubmitFailed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSlotList = (slots: AvailabilitySlot[]) => {
    if (slots.length === 0) {
      return t('availabilityNoSlots');
    }

    return slots
      .map((slot) => formatAvailabilitySlotLabel(slot, dayLabels, periodLabels))
      .join('、');
  };

  if (!currentUser) {
    setViewMode('home');
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('home')}
              className="p-2 rounded-xl glass-card hover:bg-white/80 transition-colors"
              aria-label={t('backToHome')}
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </motion.button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                {t('scheduleTitle')}
              </h1>
              <p className="text-slate-500 text-sm">
                {currentUser.name}，{t('scheduleSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="pill-tag">
              <Check className="w-3 h-3 mr-1" />
              {t('selectedSlots')}: {draftAvailability.size}
            </div>
            <button
              type="button"
              onClick={handleResetDraft}
              disabled={!hasChanges || isSubmitting}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                hasChanges && !isSubmitting
                  ? 'bg-white/70 text-slate-600 hover:bg-white'
                  : 'bg-white/40 text-slate-400 cursor-not-allowed',
              )}
            >
              {t('availabilityResetDraft')}
            </button>
            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={!hasChanges || isSubmitting}
              className={cn(
                'btn-gradient flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                (!hasChanges || isSubmitting) && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Send className="w-4 h-4" />
              {t('availabilityConfirmButton')}
            </button>
          </div>
        </motion.div>

        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mb-4 rounded-2xl border px-4 py-3 text-sm',
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
                : 'border-rose-200 bg-rose-50/80 text-rose-700',
            )}
          >
            {notice.message}
          </motion.div>
        )}

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 mb-6 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-600">
            {t('info')}
          </p>
        </motion.div>

        {/* Schedule Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6 overflow-x-auto"
        >
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-2 mb-4">
              <div className="text-sm font-medium text-slate-400 flex items-end pb-2">
                <Clock className="w-4 h-4 mr-1" />
                时间
              </div>
              {DAYS.map((day, index) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="text-center py-3 rounded-xl bg-white/30"
                >
                  <span className="font-medium text-slate-700">{day}</span>
                </motion.div>
              ))}
            </div>

            {/* Period Rows */}
            <div className="space-y-2">
              {PERIODS.map((period, periodIndex) => (
                <div key={period.num}>
                  {/* Period separator */}
                  {period.num === 5 && (
                    <div className="my-4 border-t border-dashed border-slate-300/50" />
                  )}
                  <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-2">
                    {/* Period Label */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + periodIndex * 0.03 }}
                      className="flex flex-col justify-center pr-2"
                    >
                      <span className="text-sm font-medium text-slate-600">
                        {period.label}
                      </span>
                      <span className="text-xs text-slate-400">{period.time}</span>
                    </motion.div>

                    {/* Day Cells */}
                    {DAYS.map((_, dayIndex) => {
                      const key = `${dayIndex}-${period.num}`;
                      const isSelected = draftAvailability.has(key);
                      const wasConfirmed = confirmedAvailability.has(key);
                      const isHovered = hoveredSlot === key;

                      return (
                        <motion.button
                          key={key}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: 0.3 + periodIndex * 0.02 + dayIndex * 0.01,
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                          }}
                          whileHover={{ scale: 1.08, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggle(dayIndex, period.num)}
                          onMouseEnter={() => setHoveredSlot(key)}
                          onMouseLeave={() => setHoveredSlot(null)}
                          className={cn(
                            'relative h-16 rounded-xl transition-all duration-200',
                            isSelected
                              ? 'bg-blue-500/20 border-2 border-blue-400/50 shadow-md shadow-blue-500/20'
                              : 'bg-white/40 border border-white/30 hover:bg-white/60',
                            isHovered && !isSelected && 'bg-white/50 shadow-md',
                            isSelected && !wasConfirmed && 'ring-2 ring-emerald-300/60',
                            !isSelected && wasConfirmed && 'ring-2 ring-rose-300/60',
                          )}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                              </div>
                            </motion.div>
                          )}

                          {/* Hover indicator */}
                          {isHovered && !isSelected && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <div className="w-6 h-6 rounded-full border-2 border-blue-300/50" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white/40 border border-white/30" />
            <span>{t('unavailable')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/20 border-2 border-blue-400/50" />
            <span>{t('available')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/20 border-2 border-blue-400/50 ring-2 ring-emerald-300/60" />
            <span>{t('availabilityAddedLegend')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white/40 border border-white/30 ring-2 ring-rose-300/60" />
            <span>{t('availabilityRemovedLegend')}</span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsConfirmOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="glass-card w-full max-w-lg rounded-3xl p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">
                    {t('availabilityConfirmTitle')}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {t('availabilityConfirmDescription')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/50 hover:text-slate-600 disabled:cursor-not-allowed"
                  aria-label={t('cancel')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{t('availabilityRecipient')}: {adminEmailHint}</span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-2xl bg-white/55 p-4">
                  <p className="mb-2 font-medium text-slate-700">{t('availabilityAddedSlots')}</p>
                  <p className="leading-6 text-slate-500">{formatSlotList(changeSummary.addedSlots)}</p>
                </div>
                <div className="rounded-2xl bg-white/55 p-4">
                  <p className="mb-2 font-medium text-slate-700">{t('availabilityRemovedSlots')}</p>
                  <p className="leading-6 text-slate-500">{formatSlotList(changeSummary.removedSlots)}</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-900/85 px-4 py-3 text-white">
                  <span>{t('availabilityFinalTotal')}</span>
                  <span className="text-lg font-semibold">{changeSummary.totalSelected}</span>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{t('availabilitySubmitWarning')}</span>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-white/70 py-3 text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="btn-gradient flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t('availabilityConfirmAction')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
