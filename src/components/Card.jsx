export function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</section>
}

export function Row({ icon: Icon, title, description, value, action, onClick, danger = false }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`group flex w-full items-center gap-4 px-5 py-4 text-left transition ${onClick ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60' : ''} ${danger ? 'text-red-600 dark:text-red-400' : ''}`}>
      {Icon && <span className={`grid size-9 shrink-0 place-items-center rounded-full ${danger ? 'bg-red-50 dark:bg-red-500/10' : 'bg-slate-100 dark:bg-slate-800'} ${danger ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}><Icon size={18} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      {value && <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{value}</span>}
      {action || (onClick && <span className="text-lg text-slate-400 transition group-hover:translate-x-0.5 dark:text-slate-500">›</span>)}
    </Tag>
  )
}
