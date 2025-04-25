import React, { useState } from 'react';
import { useAuth } from '@/state/auth/AuthProvider';
import { Button } from '@/components/core/button';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const { signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      // No need to navigate here, ProtectedRoute will handle redirect on session change
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Sign out failed:", error);
      // Optionally show an error message to the user
      setLoading(false); // Stop loading only if there was an error
    }
    // setLoading(false) // No need to set loading false on success, page will redirect
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      {user && (
        <p className="text-muted-foreground">Logged in as: {user.email}</p>
      )}
      <p>Other settings content will go here.</p>

      <Button onClick={handleSignOut} disabled={loading} variant="destructive">
        {loading ? "Logging out..." : "Log Out"}
      </Button>
    </div>
  );
};

export default Settings; 