// Empty State Component
import { motion } from 'framer-motion';
import { Inbox, Calendar, Users, Clock } from 'lucide-react';

interface EmptyStateProps {
  type: 'users' | 'schedule' | 'availability' | 'history' | 'leave-requests';
  title?: string;
  description?: string;
}

const emptyStateConfig = {
  users: {
    icon: Users,
    title: '暂无用户',
    description: '请在管理后台添加用户',
  },
  schedule: {
    icon: Calendar,
    title: '暂无排班',
    description: '请先设置可用时间，然后生成排班',
  },
  availability: {
    icon: Clock,
    title: '未设置可用时间',
    description: '请在下方选择你的可用时间段',
  },
  history: {
    icon: Inbox,
    title: '暂无历史记录',
    description: '生成的排班将自动保存到这里',
  },
  'leave-requests': {
    icon: Inbox,
    title: '暂无请假申请',
    description: '学生的请假申请将显示在这里',
  },
};

export function EmptyState({ type, title, description }: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
        {title || config.title}
      </h3>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        {description || config.description}
      </p>
    </motion.div>
  );
}
