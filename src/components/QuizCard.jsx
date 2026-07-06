export default function QuizCard({ option, selected, onSelect, half, third, compact }) {
  const widthClass = third
    ? 'w-[calc(33%-6px)]'
    : half
      ? compact
        ? 'w-[calc(50%-4px)]'
        : 'w-[calc(50%-6px)]'
      : 'w-full'

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`${widthClass} flex min-h-[52px] cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-2.5 py-2 text-left transition-all hover:scale-[1.01] ${
          selected ? 'border-[#1B2A4A] bg-[#1B2A4A]/5' : ''
        }`}
      >
        <span className="shrink-0 text-xl leading-none">{option.emoji}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight text-gray-800">{option.label}</p>
          {option.desc && (
            <p className="mt-0.5 text-[10px] leading-tight text-gray-400">{option.desc}</p>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${widthClass} min-h-[44px] cursor-pointer rounded-2xl border border-gray-200 p-4 text-left transition-all hover:scale-[1.02] ${
        selected ? 'border-[#1B2A4A] bg-[#1B2A4A]/5' : ''
      }`}
    >
      <span className="text-3xl">{option.emoji}</span>
      <p className="text-sm font-semibold text-gray-800">{option.label}</p>
      {option.desc && (
        <p className="mt-1 text-xs text-gray-400">{option.desc}</p>
      )}
    </button>
  )
}
