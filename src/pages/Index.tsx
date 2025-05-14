
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    // Redirect based on user role
    if (user.role === "admin") {
      navigate("/admin");
    } else if (user.role === "teacher") {
      navigate("/teacher");
    } else if (user.role === "student") {
      navigate("/student");
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
};

export default Index;
