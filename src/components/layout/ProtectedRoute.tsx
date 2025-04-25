import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/state/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If loading is finished and there's no session, redirect to login.
    if (!loading && !session) {
      navigate('/login', { replace: true }); // Use replace to avoid login page in history
    }
  }, [session, loading, navigate]);

  // While loading, show nothing or a loading indicator
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>; // Or a spinner
  }

  // If there's a session, render the children (the protected content)
  if (session) {
    return <>{children}</>;
  }

  // If no session and not loading (should have been redirected), return null
  return null;
};

export default ProtectedRoute; 