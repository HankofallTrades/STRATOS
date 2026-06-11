import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <div className="space-y-3 text-center motion-safe:animate-fade-rise">
        <p className="app-kicker">404</p>
        <h1 className="app-page-title">Nothing here.</h1>
        <p className="pt-1">
          <a
            href="/"
            className="app-accent-text text-sm font-medium transition-colors hover:text-[#dff3ec]"
          >
            Back to training
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
