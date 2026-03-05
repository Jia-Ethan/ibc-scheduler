import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DAYS, PERIODS } from '../types';
import type { Schedule } from '../types';
import { getScheduleHistory, deleteScheduleHistory, getUsers } from '../lib/storage';
import type { ScheduleHistory } from '../lib/storage';
import { exportScheduleToCSV } from '../lib/utils';
import { Download } from 'lucide-react';

export function ScheduleHistoryPage() {
  const { isAdmin } = useApp();
  const [history, setHistory] = useState<ScheduleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getScheduleHistory();
    setHistory(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除這條歷史記錄嗎？')) {
      await deleteScheduleHistory(id);
      await loadHistory();
    }
  };

  const handleExport = async (item: ScheduleHistory) => {
    const users = await getUsers();
    exportScheduleToCSV(
      item.schedule_data,
      users,
      `排班歷史_${new Date(item.generated_at).toISOString().slice(0,10)}.csv`
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserName = (userId: string, users: any[]) => {
    const user = users.find(u => u.id === userId);
    return user?.name || userId.substring(0, 8) + '...';
  };

  const renderScheduleTable = (data: any[], users: any[]) => {
    const scheduleData = data as Schedule[];
    
    return (
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="px-3 py-2 text-left">時段</th>
              {DAYS.slice(0, 5).map((day, i) => (
                <th key={i} className="px-3 py-2 text-center">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((_, periodIndex) => {
              const period = periodIndex + 1;
              return (
                <tr key={period} className="border-t dark:border-gray-600">
                  <td className="px-3 py-2 font-medium">第 {period} 節</td>
                  {[0, 1, 2, 3, 4].map(day => {
                    const assignment = scheduleData.find(
                      s => s.dayOfWeek === day && s.period === period
                    );
                    return (
                      <td key={day} className="px-3 py-2 text-center">
                        {assignment ? (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            {getUserName(assignment.userId, users)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-gray-500">只有管理員可以訪問</div>;
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">載入中...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
        排班歷史
      </h1>

      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          暫無歷史記錄
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((item, index) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div 
                className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-800 dark:text-white">
                    {formatDate(item.generated_at)}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      最新
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">
                    {expandedId === item.id ? '▲' : '▼'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(item);
                    }}
                    className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    導出
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="text-red-500 hover:text-red-600 text-sm ml-2"
                  >
                    刪除
                  </button>
                </div>
              </div>
              {expandedId === item.id && item.schedule_data && (
                renderScheduleTable(item.schedule_data, [])
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
