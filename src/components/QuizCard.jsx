export default function QuizCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-[54px] w-full cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-2.5 text-left transition-all active:scale-[0.99] ${
        selected ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <span className="shrink-0 text-lg leading-none">{option.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold leading-tight text-gray-800">{option.label}</p>
        {option.desc && (
          <p className="mt-0.5 truncate text-[10px] leading-tight text-gray-400">{option.desc}</p>
        )}
      </div>
    </button>
  )
}
