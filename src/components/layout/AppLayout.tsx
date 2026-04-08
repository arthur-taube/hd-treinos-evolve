
import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import ProtectedRoute from "../auth/ProtectedRoute";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-[1100px]">
          {children}
        </div>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
};

export default AppLayout;
