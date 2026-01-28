'use client';

interface DashboardGreetingProps {
  name: string;
}

export function DashboardGreeting({ name }: DashboardGreetingProps) { // code_id:183
  return (
    <h1 className="dashboard-greeting">
      Welcome back, {name}
    </h1>
  );
}
