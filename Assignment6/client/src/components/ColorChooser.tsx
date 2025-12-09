import type React from 'react'
import type { Color } from 'domain/src/model/deck'

type Props = {
  onChooseColor: (color: Color) => void
  onCancel?: () => void
}

const COLORS: Color[] = ['RED', 'YELLOW', 'GREEN', 'BLUE']

export default function ColorChooser({ onChooseColor, onCancel }: Props) {
  return (
    <div className="color-chooser-overlay">
      <div
        className="color-chooser-modal"
        onClick={e => {
          e.stopPropagation()
        }}
      >
        <h3>Choose a Color</h3>
        <div className="color-options">
          {COLORS.map(color => (
            <button key={color} className={['color-option', color.toLowerCase()].join(' ')} onClick={e => handleChoose(e, color, onChooseColor)}>
              <span className="color-name">{color}</span>
            </button>
          ))}
        </div>
        {onCancel && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button className="back-button" onClick={e => handleCancel(e, onCancel)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function handleChoose(e: React.MouseEvent, color: Color, onChoose: (c: Color) => void) {
  e.stopPropagation()
  onChoose(color)
}

function handleCancel(e: React.MouseEvent, onCancel: () => void) {
  e.stopPropagation()
  onCancel()
}
