export default function QuizCard({ option, selected, onSelect, half, third }) {
  const widthClass = third
    ? 'w-[calc(33%-6px)]'
    : half
      ? 'w-[calc(50%-6px)]'
      : 'w-full'

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
