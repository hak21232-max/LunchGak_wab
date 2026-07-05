import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LocationProvider } from './context/LocationContext'
import { QuizProvider } from './context/QuizContext'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Result from './pages/Result'

export default function App() {
  return (
    <QuizProvider>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/result" element={<Result />} />
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </QuizProvider>
  )
}
