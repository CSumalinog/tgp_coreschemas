// src/components/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ProtectedRoute({ children, allowedRoles }) {
  const [status, setStatus] = useState("loading"); // "loading" | "allowed" | "denied"

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("denied");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

      if (!profile || !profile.is_active) {
        setStatus("denied");
        return;
      }
      if (allowedRoles.includes(profile.role)) setStatus("allowed");
      else setStatus("denied");
    };
    check();
  }, [allowedRoles]);

  if (status === "loading")
    return <div style={{ minHeight: "100vh", background: "#0d0d0d" }} />;
  if (status === "denied") return <Navigate to="/login" replace />;
  return children;
}
