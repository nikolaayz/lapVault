export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-red">LAP</span>
            <span className="text-off-white">VAULT</span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
