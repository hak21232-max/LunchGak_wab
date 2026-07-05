import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'

export default function Home() {
  const navigate = useNavigate()
  const { resetAnswers } = useQuiz()

  function handleStart() {
    resetAnswers()
    navigate('/quiz')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center bg-bg px-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-primary">런치각</h1>
        <p className="text-sm tracking-widest text-accent">LunchGAK</p>
        <p className="mt-2 text-base text-gray-500">지금 내 기분에 딱 맞는 근처 맛집</p>
      </div>

      <button
        type="button"
        onClick={handleStart}
        className="mt-12 min-h-[44px] rounded-2xl bg-primary px-10 py-4 text-xl text-white transition-colors duration-200 hover:bg-accent"
      >
        🍽️ 지금 추천받기
      </button>

      <div className="mt-8 flex gap-4 text-xs text-gray-500">
        <span>📍 현재 위치 자동감지</span>
        <span>🌤️ 날씨 자동반영</span>
        <span>⚡ 7초 추천</span>
      </div>
    </div>
  )
}
