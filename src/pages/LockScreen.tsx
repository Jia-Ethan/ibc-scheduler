import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LockScreenProps {
  onUnlock: () => void;
}

const CORRECT_PIN = '2013';
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 300000; // 5 minutes

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [isFocused, setIsFocused] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedLockout = localStorage.getItem('ibc_lockout_until');
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('ibc_lockout_until');
      }
    }
  }, []);

  useEffect(() => {
    if (lockoutUntil) {
      const timer = setInterval(() => {
        if (Date.now() >= lockoutUntil) {
          setLockoutUntil(null);
          setAttempts(0);
          localStorage.removeItem('ibc_lockout_until');
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutUntil]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
      setIsFocused(index + 1);
    }

    if (newPin.every(d => d !== '') && index === 3) {
      verifyPin(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setIsFocused(index - 1);
    }
  };

  const handleFocus = (index: number) => {
    setIsFocused(index);
  };

  const verifyPin = (enteredPin: string) => {
    if (lockoutUntil) return;

    if (enteredPin === CORRECT_PIN) {
      localStorage.setItem('ibc_unlocked', 'true');
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
      setIsFocused(0);

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockout = Date.now() + LOCKOUT_TIME;
        setLockoutUntil(lockout);
        localStorage.setItem('ibc_lockout_until', lockout.toString());
        setError('錯誤次數過多，系統已鎖定，請 5 分鐘後再試');
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setError(`密碼錯誤，剩餘嘗試次數：${MAX_ATTEMPTS - newAttempts}`);
      }
    }
  };

  const formatLockoutTime = () => {
    if (!lockoutUntil) return '';
    const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-sky-200 via-blue-100 to-white">
      {/* Dynamic Blur Layers - Apple Style */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-300/40 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-sky-300/40 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-[80px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-white/60 rounded-full blur-[60px]"
        />
      </div>

      {/* Glass Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4 p-10 rounded-[32px] bg-white/30 backdrop-blur-3xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      >
        {/* Floating animation for card */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Lock Icon with glow */}
          <div className="flex justify-center mb-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-18 h-18 rounded-full bg-white/60 backdrop-blur-xl flex items-center justify-center shadow-lg"
            >
              <svg className="w-9 h-9 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                />
              </svg>
            </motion.div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-gray-800 text-center mb-1">IBC Scheduler</h2>
          <p className="text-gray-500/80 text-center mb-8 text-[15px]">輸入 4 位密碼解鎖系統</p>

          {/* PIN Input */}
          <div className={`flex justify-center gap-3 mb-4 ${shake ? 'animate-shake' : ''}`}>
            {pin.map((digit, index) => (
              <motion.div
                key={index}
                animate={{
                  borderColor: isFocused === index ? '#3b82f6' : (digit ? '#6b7280' : '#d1d5db'),
                  backgroundColor: digit ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                }}
                className="w-14 h-16 rounded-2xl border-2 transition-all flex items-center justify-center shadow-sm"
              >
                <input
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={() => handleFocus(index)}
                  disabled={!!lockoutUntil}
                  className="w-full h-full text-center text-2xl font-semibold bg-transparent outline-none text-gray-800"
                  placeholder="·"
                />
              </motion.div>
            ))}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-500 text-center text-sm mb-4 font-medium"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Lockout Timer */}
          {lockoutUntil && (
            <div className="text-center">
              <p className="text-gray-500 text-sm">系統已鎖定</p>
              <p className="text-gray-700 text-xl font-mono mt-1">{formatLockoutTime()}</p>
            </div>
          )}

          {/* Decorative dots */}
          <div className="flex justify-center gap-1.5 mt-8">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: isFocused === i ? 1.3 : 1,
                  backgroundColor: isFocused === i ? '#3b82f6' : '#94a3b8',
                }}
                className="w-2 h-2 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
