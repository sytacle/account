export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center">
        <img src="http://cdn.sytacle.com/assets/logos/sytacle.png" alt="Sytacle logo" />
      </div>
      {!compact && <span className="text-[19px] font-bold tracking-tight text-blue-600">Sytacle</span>}
    </div>
  )
}
