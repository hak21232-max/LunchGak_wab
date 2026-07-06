import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { LocationProvider } from './context/LocationContext'
import { QuizProvider } from './context/QuizContext'
import SiteLayout from './components/SiteLayout'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Result from './pages/Result'
import About from './pages/About'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Contact from './pages/Contact'
import GuideIndex from './pages/GuideIndex'
import GuideArticle from './pages/GuideArticle'

function AppShell() {
  return (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  )
}

export default function App() {
  return (
    <QuizProvider>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/result" element={<Result />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/guide" element={<GuideIndex />} />
              <Route path="/guide/:slug" element={<GuideArticle />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </QuizProvider>
  )
}
