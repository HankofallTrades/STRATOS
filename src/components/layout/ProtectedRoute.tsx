import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '@/state/auth/AuthProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import { RouteSkeleton } from '@/components/loading/RouteSkeletons';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login', { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return <RouteSkeleton pathname={location.pathname} />;
  }

  if (session) {
    return <>{children}</>;
  }

  return null;
};

export default ProtectedRoute;
