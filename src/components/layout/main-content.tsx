"use client";

export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex-1 overflow-y-auto p-3 sm:p-6"
    >
      {children}
    </main>
  );
}
