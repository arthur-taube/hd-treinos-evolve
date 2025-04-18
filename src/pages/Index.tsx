
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

const Index = () => {
  useEffect(() => {
    document.title = "HD Treinos | Evolua Seus Treinos";
  }, []);

  // Redirect to Auth page
  return <Navigate to="/auth" replace />;
};

export default Index;
