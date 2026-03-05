// Loading Skeleton Component

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        <Skeleton className="h-10" />
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      
      {/* Rows */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map(row => (
        <div key={row} className="grid grid-cols-6 gap-2 mb-2">
          <Skeleton className="h-16" />
          {[1, 2, 3, 4, 5].map(col => (
            <Skeleton key={col} className="h-16" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function UserListSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}
