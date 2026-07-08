import { Skeleton } from "@/components/core/skeleton";
import { getRouteSkeletonKind } from "@/components/loading/routeSkeletonKinds";
import { cn } from "@/lib/utils/cn";

const SkeletonLine = ({ className }: { className: string }) => (
  <Skeleton className={cn("rounded-full", className)} />
);

const LoginSkeleton = () => (
  <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10 sm:px-6">
    <div className="w-full space-y-8">
      <div className="space-y-4">
        <SkeletonLine className="h-4 w-52" />
        <Skeleton className="h-12 w-48 rounded-[16px]" />
      </div>
      <div className="space-y-5">
        <div className="space-y-3">
          <SkeletonLine className="h-4 w-36" />
          <Skeleton className="h-[5rem] w-full rounded-[28px]" />
        </div>
        <div className="space-y-3">
          <SkeletonLine className="h-4 w-36" />
          <Skeleton className="h-[5rem] w-full rounded-[28px]" />
        </div>
        <Skeleton className="h-[5rem] w-full rounded-[28px]" />
        <div className="flex justify-center">
          <SkeletonLine className="h-5 w-48" />
        </div>
        <Skeleton className="h-[5rem] w-full rounded-[28px]" />
      </div>
    </div>
  </div>
);

const HomeSkeleton = () => (
  <div className="app-page">
    <header className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        <SkeletonLine className="h-3 w-44" />
        <Skeleton className="h-10 w-64 rounded-[16px]" />
      </div>
      <SkeletonLine className="h-4 w-28" />
    </header>
    <main className="space-y-4">
      <section className="stone-panel stone-panel-hero rounded-[28px] p-6 md:p-8">
        <SkeletonLine className="h-3 w-36" />
        <Skeleton className="mt-4 h-10 w-64 rounded-[16px]" />
        <SkeletonLine className="mt-3 h-4 w-56" />
        <Skeleton className="mt-6 h-11 w-full rounded-[18px] md:ml-auto md:w-56" />
      </section>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[0, 1].map(index => (
          <section key={index} className="home-data-card p-5">
            <SkeletonLine className="h-3 w-28" />
            <Skeleton className="mt-5 h-6 w-40 rounded-[12px]" />
            <SkeletonLine className="mt-3 h-4 w-56" />
          </section>
        ))}
      </div>
      <section className="home-habit-grid" aria-hidden="true">
        {[0, 1, 2].map(index => (
          <Skeleton key={index} className="h-11 rounded-[18px]" />
        ))}
      </section>
    </main>
  </div>
);

const WorkoutSkeleton = () => (
  <div className="stone-workout-page min-h-svh w-full">
    <div className="mx-auto flex min-h-svh w-full max-w-[72rem] flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.92fr)]">
        <section className="stone-panel stone-panel-hero rounded-[28px] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-[18px] w-[18px] rounded" />
            <SkeletonLine className="h-3 w-32" />
          </div>
          <Skeleton className="mt-5 h-10 w-72 max-w-full rounded-[16px]" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map(index => (
              <Skeleton key={index} className="h-14 rounded-[16px]" />
            ))}
          </div>
          <Skeleton className="mt-6 h-11 w-full rounded-[18px] sm:ml-auto sm:w-44" />
        </section>
        <section className="stone-surface rounded-[26px] p-5 md:p-6">
          <SkeletonLine className="h-3 w-20" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-10 rounded-[16px]" />
            <Skeleton className="h-11 rounded-[18px]" />
          </div>
        </section>
      </div>
    </div>
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="app-page">
    <main className="space-y-6">
      <section className="stone-panel stone-panel-hero rounded-[28px] p-5 md:p-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <SkeletonLine className="h-4 w-16" />
              </div>
              <Skeleton className="h-9 w-3/4 rounded-[14px]" />
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.85fr)]">
        <div className="stone-surface rounded-[26px] p-5 md:p-6">
          <div className="mb-5 grid grid-cols-3 gap-1">
            {[0, 1, 2].map(index => (
              <Skeleton key={index} className="h-12 rounded-[14px]" />
            ))}
          </div>
          <SkeletonLine className="h-8 w-48" />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(index => (
              <Skeleton key={index} className="h-8 w-10 rounded-[12px]" />
            ))}
          </div>
          <Skeleton className="mt-4 h-[400px] w-full rounded-[16px]" />
        </div>
        <div className="stone-surface rounded-[26px] p-5 md:p-6">
          <SkeletonLine className="h-7 w-28" />
          <div className="mt-5 divide-y divide-white/6">
            {[0, 1, 2].map(index => (
              <div key={index} className="flex items-center justify-between py-4">
                <div className="space-y-2">
                  <SkeletonLine className="h-5 w-24" />
                  <SkeletonLine className="h-4 w-28" />
                </div>
                <Skeleton className="h-[112px] w-[112px] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  </div>
);

const ProfileSkeleton = ({ settings = false }: { settings?: boolean }) => (
  <div className="app-page space-y-6">
    <header className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-9 w-48 rounded-[14px]" />
        <SkeletonLine className="h-4 w-52" />
      </div>
      <Skeleton className="h-10 w-10 rounded-[14px]" />
    </header>
    {settings ? (
      <section className="stone-surface rounded-[24px] p-5 md:p-6">
        <SkeletonLine className="h-3 w-28" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <SkeletonLine className="h-4 w-40" />
                <SkeletonLine className="h-3 w-52" />
              </div>
              <Skeleton className="h-8 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    ) : (
      <>
        {[0, 1, 2].map(index => (
          <section key={index} className="stone-surface rounded-[24px] p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="h-4 w-12" />
            </div>
            <SkeletonLine className="h-4 w-44" />
          </section>
        ))}
        <section className="stone-surface rounded-[24px] p-5 md:p-6">
          <SkeletonLine className="h-3 w-20" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[0, 1, 2].map(index => (
              <Skeleton key={index} className="h-16 rounded-[16px]" />
            ))}
          </div>
        </section>
      </>
    )}
  </div>
);

const GenericSkeleton = () => (
  <div className="app-page space-y-4">
    <Skeleton className="h-10 w-56 rounded-[16px]" />
    <section className="stone-surface rounded-[26px] p-5 md:p-6">
      <SkeletonLine className="h-4 w-48" />
      <SkeletonLine className="mt-4 h-4 w-64 max-w-full" />
      <Skeleton className="mt-6 h-11 rounded-[18px]" />
    </section>
  </div>
);

export const RouteSkeleton = ({
  pathname,
  className,
}: {
  pathname: string;
  className?: string;
}) => {
  const kind = getRouteSkeletonKind(pathname);

  return (
    <div className={cn("min-h-screen bg-background", className)} aria-busy="true">
      {kind === "login" ? <LoginSkeleton /> : null}
      {kind === "home" ? <HomeSkeleton /> : null}
      {kind === "workout" ? <WorkoutSkeleton /> : null}
      {kind === "analytics" ? <AnalyticsSkeleton /> : null}
      {kind === "profile" ? <ProfileSkeleton /> : null}
      {kind === "settings" ? <ProfileSkeleton settings /> : null}
      {kind === "generic" ? <GenericSkeleton /> : null}
    </div>
  );
};
