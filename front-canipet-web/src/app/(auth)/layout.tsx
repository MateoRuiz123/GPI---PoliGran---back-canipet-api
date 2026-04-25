import { PawPrint } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-white to-teal-50 p-6">
      <div className="mb-8 flex items-center gap-2 text-slate-900">
        <PawPrint className="h-7 w-7 text-teal-600" />
        <span className="text-xl font-semibold tracking-tight">Canipet</span>
      </div>
      {children}
    </div>
  );
}
