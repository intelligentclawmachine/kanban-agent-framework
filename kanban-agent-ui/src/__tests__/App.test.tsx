import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('Kanban dashboard shell', () => {
  it('renders Kanban view switcher', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /kanban/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agent manager/i })).toBeInTheDocument()
  })

  it('renders backlog column and focus lane label', () => {
    render(<App />)
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText(/Focus lane/i)).toBeInTheDocument()
  })
})
