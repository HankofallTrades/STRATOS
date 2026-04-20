import { PersistGate } from "redux-persist/integration/react";
import { Provider } from "react-redux";

import MainAppLayout from "@/components/layout/MainAppLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { persistor, store } from "@/state/store";

const ProtectedAppShell = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ProtectedRoute>
          <MainAppLayout />
        </ProtectedRoute>
      </PersistGate>
    </Provider>
  );
};

export default ProtectedAppShell;
