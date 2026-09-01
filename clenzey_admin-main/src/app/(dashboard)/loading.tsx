import { PageStack } from "@/components/layout/PageStack";

export default function DashboardLoading() {
  return (
    <PageStack>
      <div className="flex flex-col gap-4">
        <div className="skeleton h-28 rounded-box" />
        <div className="flex flex-wrap gap-3">
          <div className="skeleton h-10 w-48 rounded-lg" />
          <div className="skeleton h-10 w-40 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-28 rounded-box" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="skeleton h-72 rounded-box" />
        <div className="skeleton h-72 rounded-box" />
      </div>
    </PageStack>
  );
}
