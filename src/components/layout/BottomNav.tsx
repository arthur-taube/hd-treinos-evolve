
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Clock,
  Dumbbell,
  Home,
  Settings,
} from "lucide-react";

const BottomNav = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/40 py-2 px-4 z-10">
      <div className="flex justify-between items-center">
        <Link
          to="/dashboard"
          className={`flex flex-col items-center w-16 py-1 ${
            isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Home
            size={24}
            className={isActive("/dashboard") ? "animate-pulse-glow" : ""}
          />
          <span className="text-xs mt-1">Painel</span>
        </Link>
        <Link
          to="/programs"
          className={`flex flex-col items-center w-16 py-1 ${
            isActive("/programs") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Dumbbell
            size={24}
            className={isActive("/programs") ? "animate-pulse-glow" : ""}
          />
          <span className="text-xs mt-1">Treinos</span>
        </Link>
        <Link
          to="/stats"
          className={`flex flex-col items-center w-16 py-1 ${
            isActive("/stats") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <BarChart3
            size={24}
            className={isActive("/stats") ? "animate-pulse-glow" : ""}
          />
          <span className="text-xs mt-1">Estatísticas</span>
        </Link>
        <Link
          to="/history"
          className={`flex flex-col items-center w-16 py-1 ${
            isActive("/history") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Clock
            size={24}
            className={isActive("/history") ? "animate-pulse-glow" : ""}
          />
          <span className="text-xs mt-1">Histórico</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center w-16 py-1 ${
            isActive("/profile") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Settings
            size={24}
            className={isActive("/profile") ? "animate-pulse-glow" : ""}
          />
          <span className="text-xs mt-1">Config.</span>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;
