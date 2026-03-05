import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DAYS, PERIODS } from '../types';
import { 
  getLeaveRequests, 
  updateLeaveRequestStatus,
  clearSchedule,
  assignSchedule,
  getAvailability,
  getUsers,
  saveScheduleToHistory,
} from '../lib/storage';
import type { LeaveRequest } from '../lib/storage';

export function LeaveRequestsPage() {
  const { isAdmin } = useApp();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const data = await getLeaveRequests();
    setRequests(data);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    await updateLeaveRequestStatus(id, 'approved');
    await loadRequests();
  };

  const handleReject = async (id: string) => {
    await updateLeaveRequestStatus(id, 'rejected');
    await loadRequests();
  };

  const handleRegenerate = async () => {
    // Get approved leaves and regenerate schedule
    const approvedLeaves = requests.filter(r => r.status === 'approved');
    const unavailableSlots = new Set(
      approvedLeaves.map(l => `${l.day_of_week}-${l.period}`)
    );

    await clearSchedule();

    const users = await getUsers();
    const availability = await getAvailability();
    const schedule: { userId: string; dayOfWeek: number; period: number }[] = [];

    for (let day = 0; day < 5; day++) {
      for (let period = 1; period <= 8; period++) {
        const slotKey = `${day}-${period}`;
        if (unavailableSlots.has(slotKey)) continue;

        const availableUsers = users.filter(user =>
          availability.some(a => 
            a.userId === user.id && 
            a.dayOfWeek === day && 
            a.period === period
          )
        );

        if (availableUsers.length > 0) {
          const userScheduleCount = schedule.filter(s => s.dayOfWeek === day).length;
          const selectedUser = availableUsers[userScheduleCount % availableUsers.length];
          
          await assignSchedule(selectedUser.id, day, period);
          schedule.push({ userId: selectedUser.id, dayOfWeek: day, period });
        }
      }
    }

    await saveScheduleToHistory('Regenerated after leave approval');
    alert('排班已重新生成');
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-gray-500">
        只有管理員可以訪問此頁面
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">載入中...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
          請假審批
        </h1>
        {pendingRequests.length > 0 && (
          <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full">
            {pendingRequests.length} 待處理
          </span>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-4">
            待審批
          </h2>
          <div className="space-y-3">
            {pendingRequests.map(request => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">
                      {request.user_id.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {DAYS[request.day_of_week]} · {PERIODS[request.period - 1]?.label}
                    </div>
                    {request.reason && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        {request.reason}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                    >
                      批准
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                    >
                      拒絕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingRequests.length === 0 && (
        <div className="mb-6">
          <button
            onClick={handleRegenerate}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg"
          >
            重新生成排班
          </button>
        </div>
      )}

      {processedRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-4">
            歷史記錄
          </h2>
          <div className="space-y-2">
            {processedRequests.map(request => (
              <div
                key={request.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${
                  request.status === 'approved' 
                    ? 'border-green-200 dark:border-green-800' 
                    : 'border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {request.user_id.substring(0, 8)}...
                    </span>
                    <span className="text-gray-500 mx-2">·</span>
                    <span className="text-sm text-gray-500">
                      {DAYS[request.day_of_week]} · {PERIODS[request.period - 1]?.label}
                    </span>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded ${
                    request.status === 'approved' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {request.status === 'approved' ? '已批准' : '已拒絕'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          暫無請假申請
        </div>
      )}
    </div>
  );
}
