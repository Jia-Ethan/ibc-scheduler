import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './context/AppContext';
import { AuroraBackground } from './components/AuroraBackground';
import { HomePage } from './pages/HomePage';
import { SchedulePage } from './pages/SchedulePage';
import { AdminPage } from './pages/AdminPage';
import { SUPABASE_PUBLIC_CONFIG_ERROR } from './lib/storage';

function App() {
  const { viewMode } = useApp();

  if (SUPABASE_PUBLIC_CONFIG_ERROR) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
        <AuroraBackground />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
          <div className="w-full rounded-lg border border-rose-500/30 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-wide text-rose-300">Configuration Error</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">IBC 排班系统未完成公开环境配置</h1>
            <p className="mt-4 text-base leading-7 text-slate-200">{SUPABASE_PUBLIC_CONFIG_ERROR}</p>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              请在当前构建环境中补齐 `.env` / `.env.local` 里的 `VITE_SUPABASE_URL` 与
              `VITE_SUPABASE_ANON_KEY`，然后重新执行构建与部署。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Aurora Background */}
      <AuroraBackground />
      
      {/* Main Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HomePage />
          </motion.div>
        )}
        {viewMode === 'schedule' && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SchedulePage />
          </motion.div>
        )}
        {viewMode === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdminPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
