import { Dashboard } from './components/Dashboard'
import { ThemeProvider } from './hooks/ThemeProvider.jsx'
import './index.css'

function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  )
}

export default App
