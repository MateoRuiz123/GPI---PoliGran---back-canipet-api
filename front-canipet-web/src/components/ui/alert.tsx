import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info";

const toneStyles: Record<Tone, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

const icons: Record<Tone, React.ElementType> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

interface AlertProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ tone = "info", children, className }: AlertProps) {
  const Icon = icons[tone];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border p-3 text-sm",
        toneStyles[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
