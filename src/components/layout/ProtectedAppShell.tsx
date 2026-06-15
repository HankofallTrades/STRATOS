import { Provider } from "react-redux";

import MainAppLayout from "@/components/layout/MainAppLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { store } from "@/state/store";

const ProtectedAppShell = () => {
  return (
    <Provider store={store}>
      <ProtectedRoute>
        <MainAppLayout />
      </ProtectedRoute>
    </Provider>
  );
};

export default ProtectedAppShell;
