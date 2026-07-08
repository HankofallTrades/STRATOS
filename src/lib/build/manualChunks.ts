export const getManualChunkName = (id: string): string | undefined => {
  if (!id.includes("node_modules")) return undefined;
  if (
    /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(
      id
    )
  ) {
    return "react-vendor";
  }
  if (id.includes("@supabase")) return "supabase";
  if (id.includes("@radix-ui")) return "radix";
  if (id.includes("@tanstack")) return "query";
  if (
    /node_modules\/(@reduxjs|react-redux|redux-persist|redux)\//.test(id)
  ) {
    return "state";
  }
  return undefined;
};
