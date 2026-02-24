import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  username: string;
  balance: number;
  energy: number;
  level: number;
  hashrate_multiplier: number;
  referral_code: string;
  is_mining: boolean;
  total_mined: number;
  is_admin: boolean;
  wallet_address?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, username?: string, isRegister?: boolean) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("onix_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Small delay to prevent rapid requests on mount/token change
      const timer = setTimeout(() => {
        fetchUser();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async (retries = 3) => {
    try {
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const contentType = res.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (res.ok && isJson) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        logout();
      } else {
        const text = await res.text();
        if (text.includes("Rate exceeded") && retries > 0) {
          console.warn(`Rate limit hit. Retrying fetchUser... (${retries} left)`);
          setTimeout(() => fetchUser(retries - 1), 3000);
          return;
        }
        if (!isJson) {
          console.error("Server returned non-JSON response:", text);
        }
      }
    } catch (err: any) {
      console.error("Fetch user error:", err);
      if (err.message === "Failed to fetch" && retries > 0) {
        console.log(`Retrying fetchUser... (${retries} left)`);
        setTimeout(() => fetchUser(retries - 1), 2000);
        return;
      }
      
      if (err.message !== "Failed to fetch") {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, username?: string, isRegister?: boolean, retries = 2) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, isRegister }),
      });
      
      const contentType = res.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!isJson) {
        const text = await res.text();
        if (text.includes("Rate exceeded") && retries > 0) {
          console.warn(`Rate limit hit during login. Retrying... (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return login(email, password, username, isRegister, retries - 1);
        }
        console.error("Server returned non-JSON response:", text);
        throw new Error("Server error: Received invalid response format");
      }

      const data = await res.json();
      
      if (res.ok) {
        const { token: newToken, user: newUser } = data;
        localStorage.setItem("onix_token", newToken);
        setToken(newToken);
        setUser(newUser);
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (err: any) {
      if (err.message === "Failed to fetch" && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return login(email, password, username, isRegister, retries - 1);
      }
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("onix_token");
    setToken(null);
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
