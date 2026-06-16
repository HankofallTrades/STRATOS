import { Provider } from "react-redux";

import MainAppLayout from "@/components/layout/MainAppLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { AuthProvider } from "@/state/auth/AuthProvider";
import { store } from "@/state/store";

const ProtectedAppShell = () => {
  return (
    <AuthProvider>
      <Provider store={store}>
        <ProtectedRoute>
          <MainAppLayout />
        </ProtectedRoute>
      </Provider>
    </AuthProvider>
  );
};

export default ProtectedAppShell;
