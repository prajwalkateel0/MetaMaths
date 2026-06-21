import React from 'react'
import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-400 text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
