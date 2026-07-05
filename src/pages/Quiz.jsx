import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuizCard from '../components/QuizCard'
import { useQuiz } from '../context/QuizContext'

const QUESTIONS = [
  {
    id: 'situation',
    title: '어떤 자리예요?',
    sub: '상황에 맞는 식당을 찾아드릴게요',
    multi: false,
    options: [
      { emoji: '🍱', label: '혼밥', desc: '혼자 빠르게', val: '혼밥', half: true },
      { emoji: '👥', label: '팀 점심', desc: '2~4명', val: '팀점심', half: true },
      { emoji: '🍻', label: '회식', desc: '단체·예약 필요', val: '회식', half: true },
      { emoji: '☕', label: '가벼운 미팅', desc: '카페·브런치', val: '미팅', half: true },
    ],
  },
  {
    id: 'mood',
    title: '오늘 기분이 어때요?',
    sub: '추천 방향이 달라져요',
    multi: false,
    options: [
      { emoji: '😤', label: '스트레스 받았다', desc: '매운 것, 자극적인 것', val: '스트레스' },
      { emoji: '😴', label: '피곤하다', desc: '따뜻하고 든든한 것', val: '피곤' },
      { emoji: '🎉', label: '기분 좋다', desc: '새로운 메뉴 도전', val: '기분좋음' },
      { emoji: '😐', label: '그냥 평범하다', desc: '빠르고 익숙한 것', val: '평범' },
      { emoji: '🤒', label: '몸이 안 좋다', desc: '소화 잘 되는 것', val: '몸안좋음' },
    ],
  },
  {
    id: 'food',
    title: '뭐가 땡기세요?',
    sub: '여러 개 선택해도 돼요',
    multi: true,
    options: [
      { emoji: '🌶️', label: '얼큰·자극적', val: '얼큰', half: true },
      { emoji: '🍲', label: '따뜻한 국물', val: '국물', half: true },
      { emoji: '🥗', label: '가볍고 깔끔', val: '가벼운', half: true },
      { emoji: '🍖', label: '고기', val: '고기', half: true },
      { emoji: '🍜', label: '면류', val: '면', half: true },
      { emoji: '🤷', label: '아무거나', val: '자유', half: true },
    ],
  },
  {
    id: 'time',
    title: '시간이 얼마나 있어요?',
    sub: '',
    multi: false,
    options: [
      { emoji: '⚡', label: '30분 이내', desc: '도보 5분 이내, 빠른 곳', val: '30분이내' },
      { emoji: '🕐', label: '1시간 정도', desc: '여유 있게 제대로', val: '1시간' },
      { emoji: '🌙', label: '오늘 저녁 회식', desc: '예약·단체석 우선', val: '저녁회식' },
    ],
  },
  {
    id: 'budget',
    title: '예산은요?',
    sub: '1인 기준',
    multi: false,
    options: [
      { emoji: '💸', label: '1만원 이하', desc: '가성비 점심', val: '1만이하', third: true },
      { emoji: '💳', label: '1~2만원', desc: '적당히', val: '1~2만', third: true },
      { emoji: '🏦', label: '법카', desc: '제한 없음', val: '법카', third: true },
    ],
  },
]

export default function Quiz() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const { answers, setAnswer, resetAnswers } = useQuiz()

  useEffect(() => {
    resetAnswers()
    setStep(0)
  }, [resetAnswers])

  const question = QUESTIONS[step]
  const isLastStep = step === QUESTIONS.length - 1

  function isSelected(option) {
    if (question.multi) {
      return (answers[question.id] ?? []).includes(option.val)
    }
    return answers[question.id] === option.val
  }

  function handleSelect(option) {
    if (question.multi) {
      const current = answers[question.id] ?? []
      const next = current.includes(option.val)
        ? current.filter((v) => v !== option.val)
        : [...current, option.val]
      setAnswer(question.id, next)
    } else {
      setAnswer(question.id, option.val)
    }
  }

  function hasSelection() {
    if (question.multi) {
      return (answers[question.id] ?? []).length > 0
    }
    return answers[question.id] != null
  }

  function handleNext() {
    if (!hasSelection()) return
    if (isLastStep) {
      navigate('/result')
    } else {
      setStep((s) => s + 1)
    }
  }

  function handlePrev() {
    setStep((s) => s - 1)
  }

  return (
    <div className="mx-auto min-h-screen max-w-sm bg-bg px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${i <= step ? 'bg-primary' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs text-accent">
          Q{step + 1} / {QUESTIONS.length}
        </span>
      </div>

      <h2 className="text-xl font-bold text-gray-800">{question.title}</h2>
      {question.sub && (
        <p className="mt-1 text-sm text-gray-400">{question.sub}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {question.options.map((option) => (
          <QuizCard
            key={option.val}
            option={option}
            selected={isSelected(option)}
            onSelect={() => handleSelect(option)}
            half={option.half}
            third={option.third}
          />
        ))}
      </div>

      <div className="mt-10 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="min-h-[44px] rounded-xl border border-gray-200 px-6 py-3 text-gray-600"
          >
            ← 이전
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasSelection()}
          className="min-h-[44px] flex-1 rounded-xl bg-primary px-6 py-3 text-white disabled:opacity-40"
        >
          {isLastStep ? '추천 받기 →' : '다음 →'}
        </button>
      </div>
    </div>
  )
}
