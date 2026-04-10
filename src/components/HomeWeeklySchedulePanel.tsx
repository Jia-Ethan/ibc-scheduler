import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DAYS, PERIODS } from '../types';
import type { WeeklyScheduleOverviewData } from '../lib/utils';
import { cn } from '../lib/utils';

interface HomeWeeklySchedulePanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  overview: WeeklyScheduleOverviewData;
  isLoaded: boolean;
}

export function HomeWeeklySchedulePanel({
  isExpanded,
  onToggle,
  overview,
  isLoaded,
}: HomeWeeklySchedulePanelProps) {
  const { t } = useLanguage();
  const toggleLabel = isExpanded
    ? t('homeWeeklyScheduleCollapse')
    : t('homeWeeklyScheduleExpand');

  const getCell = (dayOfWeek: number, period: number) =>
    overview.cells.find((cell) => cell.dayOfWeek === dayOfWeek && cell.period === period);

  const hasAssignments = overview.assignedSlotsCount > 0;

  return (
    <div className="glass-card rounded-2xl p-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 text-left"
        aria-expanded={isExpanded}
        aria-label={toggleLabel}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('homeWeeklyScheduleTitle')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t('homeWeeklyScheduleSubtitle')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isLoaded ? (
            hasAssignments ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="pill-tag">
                  {t('homeWeeklyScheduleAssignedCount')}: {overview.assignedSlotsCount}
                </span>
                <span className="pill-tag">
                  {t('homeWeeklyScheduleParticipants')}: {overview.participantCount}
                </span>
              </div>
            ) : (
              <span className="hidden text-sm text-slate-400 sm:inline">
                {t('homeWeeklyScheduleEmpty')}
              </span>
            )
          ) : null}
          <div className="rounded-full bg-white/50 p-2 text-slate-500 transition-colors hover:text-blue-500">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </div>
        </div>
      </button>

      {isLoaded ? (
        hasAssignments ? (
          <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
            <span className="pill-tag">
              {t('homeWeeklyScheduleAssignedCount')}: {overview.assignedSlotsCount}
            </span>
            <span className="pill-tag">
              {t('homeWeeklyScheduleParticipants')}: {overview.participantCount}
            </span>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400 sm:hidden">
            {t('homeWeeklyScheduleEmpty')}
          </p>
        )
      ) : null}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="home-weekly-schedule-content"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {!isLoaded ? (
              <div className="rounded-2xl bg-white/35 px-4 py-8 text-center text-sm text-slate-400">
                {t('loading')}
              </div>
            ) : !hasAssignments ? (
              <div className="rounded-2xl bg-white/35 px-4 py-8 text-center text-sm text-slate-400">
                {t('homeWeeklyScheduleEmpty')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[780px]">
                  <div className="grid grid-cols-[110px_repeat(5,1fr)] gap-3 mb-4">
                    <div className="flex items-end pb-2 text-sm font-medium text-slate-400">
                      {t('periodDay')}
                    </div>
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="rounded-xl bg-white/30 py-3 text-center font-medium text-slate-700"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {PERIODS.map((period) => (
                      <div key={period.num}>
                        {period.num === 5 && (
                          <div className="my-4 border-t border-dashed border-slate-300/50" />
                        )}

                        <div className="grid grid-cols-[110px_repeat(5,1fr)] gap-3">
                          <div
                            className={cn(
                              'flex flex-col justify-center rounded-xl px-3',
                              period.num <= 4 ? 'bg-blue-50/30' : 'bg-amber-50/30'
                            )}
                          >
                            <span className="text-sm font-medium text-slate-700">{period.label}</span>
                            <span className="text-xs text-slate-400">{period.time}</span>
                          </div>

                          {DAYS.map((_, dayIndex) => {
                            const cell = getCell(dayIndex, period.num);
                            const assigned = cell?.assigned;

                            return (
                              <div
                                key={`${dayIndex}-${period.num}`}
                                className={cn(
                                  'flex h-20 items-center justify-center rounded-xl border px-3 text-center',
                                  assigned
                                    ? 'border-blue-200/50 bg-white/60 shadow-sm'
                                    : 'border-white/20 bg-white/20'
                                )}
                              >
                                {assigned && cell ? (
                                  <div>
                                    <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 text-xs font-medium text-white">
                                      {cell.userInitial}
                                    </div>
                                    <span className="block truncate text-xs font-medium text-slate-600">
                                      {cell.userName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-300">{t('unassigned')}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
