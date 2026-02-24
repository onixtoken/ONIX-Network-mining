import { useAuth } from "./contexts/AuthContext";
import { useSocket } from "./contexts/SocketContext";
import { 
  Pickaxe, 
  Zap, 
  Users, 
  User as UserIcon, 
  LayoutDashboard, 
  TrendingUp, 
  ShieldCheck, 
  LogOut,
  Battery,
  ChevronRight
} from "lucide-react";
import { useState, useEffect, cloneElement, ReactNode, ReactElement, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { user, login, logout, loading, token } = useAuth();
  const [activeTab, setActiveTab] = useState("mining");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Pickaxe className="w-12 h-12 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password, isRegister ? username : undefined, isRegister);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="relative inline-block">
            <div className="absolute -inset-6 bg-emerald-500/20 blur-3xl rounded-full" />
            <div className="w-32 h-32 rounded-full relative mx-auto border-4 border-emerald-500/20 shadow-2xl bg-zinc-900 flex items-center justify-center">
              <Pickaxe className="w-16 h-16 text-emerald-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tighter">ONIX</h1>
            <p className="text-zinc-400 text-lg">The next generation virtual mining ecosystem.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  required
                />
              </div>

              {isRegister && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest ml-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}
            
            <button
              type="submit"
              className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10"
            >
              {isRegister ? "CREATE ACCOUNT" : "SIGN IN"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-zinc-500 text-sm hover:text-emerald-500 transition-colors w-full"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
            </button>
          </form>

          <p className="text-xs text-zinc-500">
            Secure your account with email and password to preserve your mining progress.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-2 bg-emerald-500/40 blur-lg rounded-full animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-white/30 relative z-10 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center">
              <Pickaxe className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <span className="font-extrabold text-2xl tracking-tighter bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-transparent">ONIX</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-zinc-400">Live</span>
          </div>
          <button onClick={logout} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <LogOut className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === "mining" && <MiningDashboard key="mining" />}
          {activeTab === "referrals" && <ReferralSystem key="referrals" />}
          {activeTab === "boosts" && <BoostSystem key="boosts" />}
          {activeTab === "profile" && <Profile key="profile" />}
          {activeTab === "stats" && <GlobalStats key="stats" />}
          {activeTab === "admin" && user.is_admin && <AdminPanel key="admin" />}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-2xl border-t border-white/5 p-4 z-50">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <NavButton active={activeTab === "mining"} onClick={() => setActiveTab("mining")} icon={<LayoutDashboard />} label="Mine" />
          <NavButton active={activeTab === "referrals"} onClick={() => setActiveTab("referrals")} icon={<Users />} label="Invites" />
          <NavButton active={activeTab === "boosts"} onClick={() => setActiveTab("boosts")} icon={<Zap />} label="Boost" />
          <NavButton active={activeTab === "stats"} onClick={() => setActiveTab("stats")} icon={<TrendingUp />} label="Stats" />
          <NavButton active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={<UserIcon />} label="Profile" />
          {user.is_admin && (
            <NavButton active={activeTab === "admin"} onClick={() => setActiveTab("admin")} icon={<ShieldCheck />} label="Admin" />
          )}
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-200",
        active ? "text-emerald-500 scale-110" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      <div className={cn("p-1 rounded-lg", active && "bg-emerald-500/10")}>
        {cloneElement(icon as ReactElement, { className: "w-6 h-6" })}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}

function ParticleRain({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number; duration: number; size: number }[]>([]);

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 3,
        size: 1 + Math.random() * 3,
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [active]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence>
        {active && (
          <>
            {/* The Rain */}
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ y: -20, opacity: 0 }}
                animate={{ 
                  y: ["0%", "100%"], 
                  opacity: [0, 1, 1, 0],
                  rotate: [0, 360]
                }}
                transition={{ 
                  duration: p.duration, 
                  repeat: Infinity, 
                  delay: p.delay,
                  ease: "linear"
                }}
                style={{ left: `${p.x}%` }}
                className="absolute"
              >
                <div 
                  style={{ width: p.size, height: p.size }}
                  className="bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" 
                />
              </motion.div>
            ))}
            {/* The "Full" Effect - a glowing pool at the bottom */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-emerald-500/10 to-transparent blur-3xl"
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiningDashboard() {
  const { user, token, updateUser } = useAuth();
  const { stats } = useSocket();

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    try {
      const res = await fetch(url, options);
      const text = await res.clone().text();
      if (text.includes("Rate exceeded") && retries > 0) {
        console.warn(`Rate limit hit for ${url}. Retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return fetchWithRetry(url, options, retries - 1);
      }
      return res;
    } catch (err: any) {
      if (err.message === "Failed to fetch" && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  };

  const toggleMining = async () => {
    try {
      const endpoint = user?.is_mining ? "/api/mining/stop" : "/api/mining/start";
      const res = await fetchWithRetry(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        updateUser({ is_mining: !user?.is_mining });
      } else {
        const errorData = contentType?.includes("application/json") ? await res.json() : null;
        console.error("Mining toggle error:", errorData?.error || "Unknown error");
      }
    } catch (err) {
      console.error("Mining toggle network error:", err);
    }
  };

  const energyPercent = (user?.energy || 0) / 21600 * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 relative"
    >
      <ParticleRain active={!!user?.is_mining} />
      
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl group min-h-[160px]">
        <div className="absolute -right-8 -top-8 opacity-10 pointer-events-none transition-all duration-1000 group-hover:scale-110 group-hover:-rotate-12">
          <Pickaxe className="w-56 h-56 text-white" />
        </div>
        <div className="relative z-10 space-y-1">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Available Balance</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-tighter">
                  Block #{stats.currentBlock.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
                Net: {stats.totalMined.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-5xl font-bold tracking-tighter">{(user?.balance || 0).toFixed(4)}</h2>
            <span className="text-emerald-500 font-bold">ONIX</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 relative">
        {user?.is_mining && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -inset-4 bg-emerald-500/5 blur-2xl rounded-[2rem] -z-10"
          />
        )}
        <StatCard 
          icon={<Zap className="text-yellow-500" />} 
          label={user?.is_mining ? "Mining Hashes" : "Hashrate"} 
          value={user?.is_mining ? `${(Math.random() * 100 + 400).toFixed(2)} H/s` : `${(user?.hashrate_multiplier || 1).toFixed(1)}x`} 
        />
        <StatCard 
          icon={<TrendingUp className="text-blue-500" />} 
          label="Level" 
          value={user?.level || 1} 
        />
      </div>

      {/* Energy Bar */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4 relative overflow-hidden">
        {user?.is_mining && (
          <motion.div 
            animate={{ 
              opacity: [0.05, 0.1, 0.05],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-emerald-500/10 -z-10"
          />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className={cn("w-5 h-5", energyPercent < 20 ? "text-red-500" : "text-emerald-500")} />
            <span className="font-medium">Energy</span>
          </div>
          <span className="text-zinc-400 text-sm">{Math.floor((user?.energy || 0) / 3600)}h {Math.floor(((user?.energy || 0) % 3600) / 60)}m left</span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            className={cn("h-full", energyPercent < 20 ? "bg-red-500" : "bg-emerald-500")}
            initial={{ width: 0 }}
            animate={{ width: `${energyPercent}%` }}
          />
        </div>
      </div>

      {/* Floating Coin */}
      <div className="flex justify-center py-4">
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotateY: [0, 360],
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="relative"
        >
          <div className="absolute -inset-8 bg-emerald-500/20 blur-3xl rounded-full" />
          <div className="w-40 h-40 rounded-full border-4 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.3)] relative z-10 bg-zinc-900 flex items-center justify-center">
            <Pickaxe className="w-20 h-20 text-emerald-500" />
          </div>
        </motion.div>
      </div>

      {/* Action Button */}
      <button
        onClick={toggleMining}
        disabled={user?.energy === 0 && !user?.is_mining}
        className={cn(
          "w-full py-6 rounded-3xl font-bold text-xl transition-all active:scale-95 shadow-2xl",
          user?.is_mining 
            ? "bg-red-500/10 text-red-500 border border-red-500/20" 
            : "bg-emerald-500 text-black hover:bg-emerald-400"
        )}
      >
        {user?.is_mining ? "STOP MINING" : "START MINING"}
      </button>

      <div className="text-center">
        <p className="text-zinc-500 text-sm">
          {stats.online} miners currently active on the network
        </p>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-2">
      <div className="flex items-center gap-2 opacity-60">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ReferralSystem() {
  const { user } = useAuth();
  const inviteLink = `${window.location.origin}?ref=${user?.referral_code}`;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 relative"
    >
      <div className="absolute -right-20 -top-20 opacity-5 pointer-events-none">
        <Users className="w-64 h-64 text-white" />
      </div>
      <div className="space-y-2 relative z-10">
        <h2 className="text-3xl font-bold tracking-tight">Referrals</h2>
        <p className="text-zinc-400">Invite friends and earn 7% of their mining rewards.</p>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Your Referral Code</p>
        <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
          <code className="text-xl font-mono text-emerald-500">{user?.referral_code}</code>
          <button 
            onClick={() => navigator.clipboard.writeText(user?.referral_code || "")}
            className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
          <p className="text-zinc-500 text-xs uppercase mb-1">Total Invited</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
          <p className="text-zinc-500 text-xs uppercase mb-1">Earnings</p>
          <p className="text-2xl font-bold text-emerald-500">0.00</p>
        </div>
      </div>
    </motion.div>
  );
}

function BoostSystem() {
  const { user, token, updateUser } = useAuth();
  const [usdtTxId, setUsdtTxId] = useState("");
  const [usdtAmount, setUsdtAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const upgradeOnix = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/upgrade/onix", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ multiplier: (user?.hashrate_multiplier || 1) + 0.1 })
      });
      const data = await res.json();
      if (res.ok) {
        updateUser({ balance: data.newBalance, hashrate_multiplier: data.newMultiplier });
        setMessage("Hashrate upgraded successfully!");
      } else {
        setMessage(data.error);
      }
    } catch (err) {
      setMessage("Failed to upgrade");
    } finally {
      setLoading(false);
    }
  };

  const submitUsdt = async (e: FormEvent) => {
    e.preventDefault();
    if (!usdtTxId || !usdtAmount) return setMessage("Please fill all fields");
    setLoading(true);
    try {
      const res = await fetch("/api/upgrade/usdt", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ txId: usdtTxId, amount: parseFloat(usdtAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Request submitted! Admin will verify soon.");
        setUsdtTxId("");
        setUsdtAmount("");
      } else {
        setMessage(data.error);
      }
    } catch (err) {
      setMessage("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const nextMultiplier = (user?.hashrate_multiplier || 1) + 0.1;
  const upgradeCost = Math.floor(nextMultiplier * 50);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Boosts</h2>
        <p className="text-zinc-400">Supercharge your mining performance.</p>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Pickaxe className="w-6 h-6 text-emerald-500" />
          <h3 className="text-xl font-bold">Permanent Upgrades</h3>
        </div>
        <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-white/5 group hover:border-emerald-500/30 transition-colors">
           <div className="space-y-1">
             <p className="font-bold text-lg">Hashrate Level Up</p>
             <p className="text-xs text-zinc-500">Increase multiplier to <span className="text-emerald-400 font-bold">{nextMultiplier.toFixed(1)}x</span></p>
           </div>
           <button 
             onClick={upgradeOnix}
             disabled={loading || (user?.balance || 0) < upgradeCost}
             className={cn(
               "px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
               (user?.balance || 0) >= upgradeCost 
                 ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                 : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
             )}
           >
             {upgradeCost} ONIX
           </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Zap className="w-24 h-24 text-blue-500" />
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-blue-500" />
          <h3 className="text-xl font-bold">USDT Premium Upgrade</h3>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Send USDT (TRC20) to the official ONIX deposit address and submit your Transaction ID. 
          Verified deposits grant a permanent <span className="text-blue-400 font-bold">+0.5x</span> boost.
        </p>
        
        <div className="bg-black/60 p-5 rounded-2xl border border-blue-500/20 space-y-2">
          <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">USDT Deposit Address (TRC20)</p>
          <div className="flex items-center justify-between gap-4">
            <code className="text-xs text-blue-400 break-all font-mono">T9yD6S3P7V9yD6S3P7V9yD6S3P7V9yD6S3P7</code>
            <button 
              onClick={() => navigator.clipboard.writeText("T9yD6S3P7V9yD6S3P7V9yD6S3P7V9yD6S3P7")}
              className="p-2 bg-white/5 rounded-lg hover:bg-white/10"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={submitUsdt} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-zinc-500 ml-1">Transaction ID (TXID)</label>
            <input 
              placeholder="Paste your TXID here" 
              value={usdtTxId}
              onChange={e => setUsdtTxId(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm focus:border-blue-500/50 outline-none transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase text-zinc-500 ml-1">Amount (USDT)</label>
            <input 
              type="number"
              placeholder="e.g. 10" 
              value={usdtAmount}
              onChange={e => setUsdtAmount(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm focus:border-blue-500/50 outline-none transition-colors"
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            {loading ? "SUBMITTING..." : "SUBMIT FOR VERIFICATION"}
          </button>
        </form>
      </div>

      {message && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm font-medium text-emerald-400 bg-emerald-400/10 py-3 rounded-xl border border-emerald-400/20"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}

function BoostItem({ title, description, price, icon }: { title: string; description: string; price: string; icon: ReactNode }) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-between hover:bg-zinc-900 transition-colors cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-zinc-500 text-sm">{description}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-emerald-500 font-bold">{price}</p>
        <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto mt-1" />
      </div>
    </div>
  );
}

function GlobalStats() {
  const { stats } = useSocket();
  const totalSupply = 1000000000;
  const minedPercent = (stats.totalMined / (totalSupply * 0.5)) * 100; // 50% for mining

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 relative"
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <TrendingUp className="w-96 h-96 animate-pulse text-white" />
      </div>
      <div className="space-y-2 relative z-10">
        <h2 className="text-3xl font-bold tracking-tight">Network Stats</h2>
        <p className="text-zinc-400">Real-time overview of the ONIX ecosystem.</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-6 relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-zinc-500 text-sm uppercase tracking-widest font-medium">Total ONIX Mined</p>
            <p className="text-6xl font-bold tracking-tighter text-emerald-500">
              {stats.totalMined.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-zinc-500">
              <span>Mining Pool Progress</span>
              <span>{minedPercent.toFixed(6)}%</span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${minedPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
              <span>0 ONIX</span>
              <span>500,000,000 ONIX (MINING CAP)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <p className="text-zinc-500 text-xs uppercase mb-1">Miners Online</p>
            <p className="text-3xl font-bold">{stats.online}</p>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <p className="text-zinc-500 text-xs uppercase mb-1">Current Block</p>
            <p className="text-3xl font-bold text-blue-400">#{stats.currentBlock.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <p className="text-zinc-500 text-xs uppercase mb-1">Daily Emission</p>
            <p className="text-3xl font-bold text-emerald-400">10,000</p>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <p className="text-zinc-500 text-xs uppercase mb-1">Total Burned</p>
            <p className="text-3xl font-bold text-red-500">
              {stats.totalBurned.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Tokenomics Allocation
          </h3>
          <div className="space-y-4">
            <AllocationBar label="Mining Pool" percentage={50} color="bg-emerald-500" amount="500M" />
            <AllocationBar label="Marketing" percentage={30} color="bg-blue-500" amount="300M" />
            <AllocationBar label="Burn" percentage={20} color="bg-red-500" amount="200M" />
          </div>
          <p className="text-[10px] text-zinc-500 italic text-center">
            Calculated for 1,000,000 active miners. 2% of all mining rewards are permanently burned.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function AllocationBar({ label, percentage, color, amount }: { label: string; percentage: number; color: string; amount: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-bold">{percentage}% ({amount})</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={cn("h-full", color)}
        />
      </div>
    </div>
  );
}

function Profile() {
  const { user, token, updateUser } = useAuth();
  const [wallet, setWallet] = useState(user?.wallet_address || "");
  const [isEditing, setIsEditing] = useState(!user?.wallet_address);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const saveWallet = async () => {
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setMessage("Invalid BNB wallet address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress: wallet })
      });

      if (res.ok) {
        updateUser({ wallet_address: wallet });
        setIsEditing(false);
        setMessage("Wallet saved successfully!");
      } else {
        const data = await res.json();
        setMessage(data.error);
      }
    } catch (err) {
      setMessage("Failed to save wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="absolute -inset-2 bg-emerald-500/20 blur-xl rounded-full" />
          <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center text-black text-4xl font-bold relative z-10">
            {user?.username[0]}
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold">{user?.username}</h2>
          <p className="text-zinc-500">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-bold">BNB Wallet (BEP-20)</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-tighter font-mono">Binance Smart Chain</p>
              </div>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-xs text-emerald-500 font-bold hover:underline"
              >
                EDIT
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-zinc-500 ml-1 font-bold tracking-widest">Wallet Address</label>
                <input 
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm font-mono focus:border-emerald-500/50 outline-none transition-colors"
                />
              </div>
              <button 
                onClick={saveWallet}
                disabled={loading}
                className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                {loading ? "SAVING..." : "CONFIRM WALLET"}
              </button>
            </div>
          ) : (
            <div className="bg-black/40 p-5 rounded-2xl border border-emerald-500/20 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-1">Confirmed Address</p>
                <p className="text-sm font-mono text-emerald-400 truncate">{user?.wallet_address}</p>
              </div>
              <div className="bg-emerald-500/10 p-2 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          )}

          {message && (
            <p className={cn(
              "text-center text-xs font-bold py-2 rounded-lg",
              message.includes("success") ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
            )}>
              {message}
            </p>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" />
            <span className="font-medium">Verification Status</span>
          </div>
          <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold">VERIFIED</span>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Mining History</h3>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Total Mined</span>
            <span className="font-bold">{(user?.total_mined || 0).toFixed(4)} ONIX</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Account Created</span>
            <span className="font-bold">{new Date(user?.created_at || 0).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminPanel() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [view, setView] = useState<"users" | "upgrades">("users");

  const fetchData = async () => {
    try {
      const usersRes = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) setUsers(await usersRes.json());

      const upgradesRes = await fetch("/api/admin/usdt-upgrades", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (upgradesRes.ok) setUpgrades(await upgradesRes.json());
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const approveUpgrade = async (id: number) => {
    try {
      const res = await fetch("/api/admin/usdt-upgrades/approve", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ upgradeId: id, multiplierBoost: 0.5 })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Approve error:", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Admin Panel</h2>
        <div className="flex bg-zinc-900 rounded-xl p-1 border border-white/5">
          <button 
            onClick={() => setView("users")}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", view === "users" ? "bg-emerald-500 text-black" : "text-zinc-500")}
          >
            USERS
          </button>
          <button 
            onClick={() => setView("upgrades")}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", view === "upgrades" ? "bg-blue-500 text-white" : "text-zinc-500")}
          >
            USDT REQS
          </button>
        </div>
      </div>

      {view === "users" ? (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-zinc-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Mining Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="p-4">
                    <p className="font-medium">{u.username}</p>
                    <p className="text-xs text-zinc-500">
                      {u.email ? `${u.email.substring(0, 5)}...` : "N/A"}
                    </p>
                  </td>
                  <td className="p-4 font-mono">{u.balance.toFixed(4)}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-emerald-500">{u.hashrate_multiplier.toFixed(1)}x</span>
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold w-fit",
                        u.is_mining ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500"
                      )}>
                        {u.is_mining ? "MINING" : "IDLE"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-zinc-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">TXID / Amount</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {upgrades.map(u => (
                <tr key={u.id}>
                  <td className="p-4">
                    <p className="font-medium">{u.username}</p>
                    <p className="text-xs text-zinc-500">{u.status.toUpperCase()}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-[10px] font-mono text-zinc-500 truncate max-w-[100px]">{u.tx_id}</p>
                    <p className="font-bold text-blue-400">{u.amount} USDT</p>
                  </td>
                  <td className="p-4">
                    {u.status === 'pending' ? (
                      <button 
                        onClick={() => approveUpgrade(u.id)}
                        className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold"
                      >
                        APPROVE
                      </button>
                    ) : (
                      <span className="text-emerald-500 text-[10px] font-bold">VERIFIED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
