export type BenchmarkType = "Strength" | "Calisthenics";
export type AnalysisType = "E1RM" | "Volume" | "Benchmarks";

export const ANALYTICS_ACCENT = "#1e5c52";
export const ANALYTICS_ACCENT_HIGHLIGHT = "#7cad9d";

const ANALYTICS_VIEW_STORAGE_KEY = "selectedAnalyticsView_v2";

export const isAnalysisType = (value: string): value is AnalysisType => {
  return value === "E1RM" || value === "Volume" || value === "Benchmarks";
};

export const readSelectedAnalysisType = (): AnalysisType => {
  try {
    const storedView = localStorage.getItem(ANALYTICS_VIEW_STORAGE_KEY);
    if (storedView && isAnalysisType(storedView)) {
      return storedView;
    }
  } catch (error) {
    console.error("Error reading analysis view from localStorage:", error);
  }

  return "E1RM";
};

export const persistSelectedAnalysisType = (
  analysisType: AnalysisType
): void => {
  try {
    localStorage.setItem(ANALYTICS_VIEW_STORAGE_KEY, analysisType);
  } catch (error) {
    console.error("Error saving analysis view to localStorage:", error);
  }
};

export const getTodayDateKey = (): string => {
  return new Date().toISOString().split("T")[0];
};

export const getProteinGoal = (
  weightKg: number | null | undefined
): number => {
  if (!weightKg) {
    return 0;
  }

  return Math.round(weightKg * 2);
};
