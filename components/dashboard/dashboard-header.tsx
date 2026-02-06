// components/dashboard/dashboard-header.tsx
export function DashboardHeader() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Your projects</h1>
      <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
        Track delivery progress, project status, and upcoming work across your HubSpot CRM projects.
      </p>
    </div>
  );
}
