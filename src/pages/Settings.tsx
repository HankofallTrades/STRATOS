import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import SettingsScreen from "@/domains/account/ui/SettingsScreen";

const Settings = () => {
  return (
    <div>
      <div className="app-page pb-0">
        <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Profile
        </Link>
      </div>
      <SettingsScreen />
    </div>
  );
};

export default Settings;
