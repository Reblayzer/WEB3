import { Outlet } from 'react-router-dom'

/**
 * Root application component
 * Provides layout and header for all routes
 * Child routes render via <Outlet />
 */
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>UNO Online</h1>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer" />
    </div>
  )
}

