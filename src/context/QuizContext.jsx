import { createContext, useCallback, useContext, useState } from 'react'

function getInitialAnswers() {
  return {
    situation: null,
    mood: null,
    food: null,
    time: null,
    budget: null,
  }
}

const QuizContext = createContext(null)

export function QuizProvider({ children }) {
  const [answers, setAnswers] = useState(getInitialAnswers)

  const setAnswer = useCallback((key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetAnswers = useCallback(() => {
    setAnswers(getInitialAnswers())
  }, [])

  return (
    <QuizContext.Provider value={{ answers, setAnswer, resetAnswers }}>
      {children}
    </QuizContext.Provider>
  )
}

export function useQuiz() {
  const context = useContext(QuizContext)
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider')
  }
  return context
}
