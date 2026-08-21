'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'

interface DeleteThesisButtonProps {
  /** `deleteThesis` already bound to this thesis's id by the server. */
  action: (formData: FormData) => void | Promise<void>
  /** Open on the confirmation step straight away (used by `?delete=1`). */
  defaultOpen?: boolean
}

/**
 * Two-step delete control.
 *
 * This lives in a Client Component because it needs an event handler and local
 * state. Both used to sit inline in the edit page's Server Component, which
 * made every render of that route throw "Event handlers cannot be passed to
 * Client Component props" and return a 500.
 *
 * An inline confirmation step replaces the old `window.confirm()`: it is
 * keyboard accessible, screen-reader visible, and does not depend on a browser
 * dialog that some environments suppress.
 */
export default function DeleteThesisButton({
  action,
  defaultOpen = false,
}: DeleteThesisButtonProps) {
  const [confirming, setConfirming] = useState(defaultOpen)

  if (!confirming) {
    return (
      <button
        id="thesis-delete-btn"
        type="button"
        onClick={() => setConfirming(true)}
        className="btn text-white bg-red-600 hover:bg-red-700 border-red-700 btn-sm"
      >
        Delete thesis permanently
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-red-700" role="alert">
        Delete this thesis and its PDF for good?
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={action}>
          <ConfirmButton />
        </form>
        <CancelButton onCancel={() => setConfirming(false)} />
      </div>
    </div>
  )
}

/** Inside the form so `useFormStatus` can read the submission state. */
function ConfirmButton() {
  const { pending } = useFormStatus()

  return (
    <button
      id="thesis-delete-confirm-btn"
      type="submit"
      disabled={pending}
      className="btn text-white bg-red-600 hover:bg-red-700 border-red-700 btn-sm gap-2"
    >
      {pending && <span className="spinner" />}
      {pending ? 'Deleting…' : 'Yes, delete it'}
    </button>
  )
}

function CancelButton({ onCancel }: { onCancel: () => void }) {
  return (
    <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
      Cancel
    </button>
  )
}
