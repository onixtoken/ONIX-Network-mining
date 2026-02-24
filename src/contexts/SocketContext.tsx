import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface GlobalStats {
  online: number;
  totalMined: number;
  currentBlock: number;
  totalBurned: number;
}

interface SocketContextType {
  stats: GlobalStats;
  socket: WebSocket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, updateUser } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [stats, setStats] = useState<GlobalStats>({ online: 0, totalMined: 0, currentBlock: 0, totalBurned: 0 });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let retryCount = 0;

    const connect = () => {
      if (!token) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onopen = () => {
        console.log("WebSocket connected");
        retryCount = 0;
        if (token) {
          ws?.send(JSON.stringify({ type: "auth", token }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "update") {
            updateUser(data);
          } else if (data.type === "global_stats") {
            setStats({ 
              online: data.online, 
              totalMined: data.totalMined,
              currentBlock: data.currentBlock,
              totalBurned: data.totalBurned || 0
            });
          }
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      ws.onclose = (e) => {
        console.log("WebSocket closed", e.reason);
        if (token && !e.wasClean) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeout = setTimeout(() => {
            retryCount++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws?.close();
      };

      setSocket(ws);
    };

    connect();

    return () => {
      ws?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ stats, socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used within SocketProvider");
  return context;
}
