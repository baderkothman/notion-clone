export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-text text-sm font-semibold text-bg">
            N
          </div>
          <span className="text-sm font-semibold text-text">Notion Clone</span>
        </div>
        {children}
      </div>
    </div>
  );
}
