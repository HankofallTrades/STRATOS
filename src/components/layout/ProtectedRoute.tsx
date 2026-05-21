import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/state/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import AppScreenSkeleton from '@/components/loading/AppScreenSkeleton';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login', { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return <AppScreenSkeleton />;
  }

  if (session) {
    return <>{children}</>;
  }

  return null;
};

export default ProtectedRoute;
