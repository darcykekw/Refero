'use client'

import { useActionState } from 'react'
import type { AuthState } from '@/app/actions/auth'
import { updateDisplayName } from '@/app/actions/auth'

interface UpdateNameFormProps {
  currentName: string
}

export default function UpdateNameForm({ currentName }: UpdateNameFormProps) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(updateDisplayName, {})

  return (
    <form action={formAction} className="flex flex-col sm:flex-row gap-3">
      {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      {state.message && <p className="text-sm text-green-600 sm:col-span-2">{state.message}</p>}
      <input
        id="profile-name-input"
        name="full_name"
        type="text"
        defaultValue={currentName}
        required
        minLength={2}
        placeholder="Your display name"
        className="input flex-1"
      />
      <button
        id="profile-name-btn"
        type="submit"
        disabled={pending}
        className="btn btn-primary gap-2 whitespace-nowrap"
      >
        {pending && <span className="spinner" />}
        {pending ? 'Saving…' : 'Update name'}
      </button>
    </form>
  )
}
