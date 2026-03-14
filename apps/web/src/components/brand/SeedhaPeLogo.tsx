type Props = {
  compact?: boolean;
  className?: string;
};

export function SeedhaPeLogo({ compact = false, className = '' }: Props) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
        <span className="absolute inset-1 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600" />
        <span className="relative h-4 w-5 rounded-sm border-2 border-emerald-950/75 border-t-0" />
      </span>
      {!compact && (
        <span className="text-base font-extrabold tracking-tight text-slate-900">
          seedhape
        </span>
      )}
    </div>
  );
}
