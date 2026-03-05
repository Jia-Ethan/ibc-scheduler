import { useState } from 'react';
import { submitLeaveRequest } from '../lib/storage';
import { DAYS, PERIODS } from '../types';
import { useApp } from '../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaveRequestModal({ isOpen, onClose }: Props) {
  const { currentUser } = useApp();
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitLeaveRequest(currentUser.id, selectedDay, selectedPeriod, reason);
      onClose();
      setReason('');
      alert('請假申請已提交');
    } catch (error) {
      console.error('Error submitting leave request:', error);
      alert('提交失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          提交請假申請
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              選擇日期
            </label>
            <select
              value={selectedDay}
              onChange={e => setSelectedDay(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            >
              {DAYS.slice(0, 5).map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              選擇時段
            </label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            >
              {PERIODS.map((p, i) => (
                <option key={i} value={p.num}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              請假原因
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="請輸入請假原因..."
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white h-24 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 
                       text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 
                       disabled:opacity-50 transition-colors"
          >
            {submitting ? '提交中...' : '提交申請'}
          </button>
        </div>
      </div>
    </div>
  );
}
