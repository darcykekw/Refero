'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { ensureDefaultCollection } from '@/lib/bookmarks'
import type { Collection } from '@/types/database'

export interface BookmarkActionResult {
  success: boolean
  error?: string
  collection?: Collection
  collectionIds?: string[]
  isBookmarked?: boolean
}

export interface ModalBookmarkData {
  collections: Collection[]
  selectedCollectionIds: string[]
  isSignedIn: boolean
}

// ── Get bookmark status and user collections for modal ───────────────────────

export async function getThesisBookmarkStatusAction(thesisId: string): Promise<ModalBookmarkData> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { collections: [], selectedCollectionIds: [], isSignedIn: false }
    }

    const supabase = await createClient()

    // Make sure default collection exists
    await ensureDefaultCollection(user.id).catch(() => null)

    const [collectionsRes, bookmarksRes] = await Promise.all([
      supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase
        .from('bookmarks')
        .select('collection_id')
        .eq('user_id', user.id)
        .eq('thesis_id', thesisId),
    ])

    const collections = collectionsRes.data ?? []
    const selectedCollectionIds = (bookmarksRes.data ?? []).map(b => b.collection_id)

    return {
      collections,
      selectedCollectionIds,
      isSignedIn: true,
    }
  } catch (err) {
    console.warn('getThesisBookmarkStatusAction error:', err)
    return { collections: [], selectedCollectionIds: [], isSignedIn: false }
  }
}

function formatBookmarkError(err: unknown, fallback: string): string {
  const msg = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message)
    : String(err ?? '')
  if (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    (err as { code?: string })?.code === 'PGRST205' ||
    (err as { code?: string })?.code === '42P01'
  ) {
    return "Database setup required: Table 'public.collections' does not exist yet. Please run migration 006 in your Supabase SQL Editor."
  }
  return msg || fallback
}

// ── Create a collection ──────────────────────────────────────────────────────

export async function createCollectionAction(data: {
  name: string
  description?: string
  color?: string
}): Promise<BookmarkActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'You must be signed in to create a collection.' }
    }

    const name = data.name.trim()
    if (!name || name.length < 1) {
      return { success: false, error: 'Collection name is required.' }
    }
    if (name.length > 80) {
      return { success: false, error: 'Collection name must be under 80 characters.' }
    }

    const description = (data.description ?? '').trim().slice(0, 300)
    const color = (data.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(data.color.trim()))
      ? data.color.trim()
      : '#2E6A47'

    const supabase = await createClient()
    const { data: created, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name,
        description,
        color,
        is_default: false,
      })
      .select('*')
      .single()

    if (error || !created) {
      console.error('createCollectionAction error:', error?.message)
      return { success: false, error: formatBookmarkError(error, 'Failed to create collection.') }
    }

    try {
      revalidatePath('/bookmarks')
    } catch {}

    return { success: true, collection: created }
  } catch (err) {
    console.error('createCollectionAction caught exception:', err)
    return { success: false, error: formatBookmarkError(err, 'Failed to create collection.') }
  }
}

// ── Update a collection ──────────────────────────────────────────────────────

export async function updateCollectionAction(data: {
  collectionId: string
  name: string
  description?: string
  color?: string
}): Promise<BookmarkActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'You must be signed in.' }
    }

    const name = data.name.trim()
    if (!name || name.length < 1) {
      return { success: false, error: 'Collection name is required.' }
    }

    const description = (data.description ?? '').trim().slice(0, 300)
    const color = (data.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(data.color.trim()))
      ? data.color.trim()
      : '#2E6A47'

    const supabase = await createClient()

    const { data: updated, error } = await supabase
      .from('collections')
      .update({
        name,
        description,
        color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.collectionId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error || !updated) {
      console.error('updateCollectionAction error:', error?.message)
      return { success: false, error: formatBookmarkError(error, 'Failed to update collection.') }
    }

    try {
      revalidatePath('/bookmarks')
    } catch {}

    return { success: true, collection: updated }
  } catch (err) {
    console.error('updateCollectionAction caught exception:', err)
    return { success: false, error: formatBookmarkError(err, 'Failed to update collection.') }
  }
}

// ── Delete a collection ──────────────────────────────────────────────────────

export async function deleteCollectionAction(collectionId: string): Promise<BookmarkActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'You must be signed in.' }
    }

    const supabase = await createClient()

    // Prevent deleting default collection
    const { data: col } = await supabase
      .from('collections')
      .select('is_default')
      .eq('id', collectionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (col?.is_default) {
      return { success: false, error: 'Default collection cannot be deleted.' }
    }

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('deleteCollectionAction error:', error.message)
      return { success: false, error: formatBookmarkError(error, 'Failed to delete collection.') }
    }

    try {
      revalidatePath('/bookmarks')
    } catch {}

    return { success: true }
  } catch (err) {
    console.error('deleteCollectionAction caught exception:', err)
    return { success: false, error: formatBookmarkError(err, 'Failed to delete collection.') }
  }
}

// ── Toggle thesis in/out of a single collection ──────────────────────────────

export async function toggleThesisCollectionAction(
  thesisId: string,
  collectionId: string
): Promise<BookmarkActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'You must be signed in to bookmark theses.' }
    }

    const supabase = await createClient()

    // Check if bookmark exists
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('thesis_id', thesisId)
      .eq('collection_id', collectionId)
      .maybeSingle()

    if (existing) {
      // Remove
      const { error: delError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', existing.id)

      if (delError) {
        return { success: false, error: delError.message }
      }

      try {
        revalidatePath('/bookmarks')
        revalidatePath(`/theses/${thesisId}`)
      } catch {}

      return { success: true, isBookmarked: false }
    } else {
      // Add
      const { error: insError } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          thesis_id: thesisId,
          collection_id: collectionId,
        })

      if (insError) {
        return { success: false, error: insError.message }
      }

      try {
        revalidatePath('/bookmarks')
        revalidatePath(`/theses/${thesisId}`)
      } catch {}

      return { success: true, isBookmarked: true }
    }
  } catch (err) {
    console.error('toggleThesisCollectionAction caught exception:', err)
    return { success: false, error: formatBookmarkError(err, 'Failed to toggle bookmark.') }
  }
}

// ── Update thesis collections (multi-select + optional new collection) ────────

export async function updateThesisCollectionsAction(
  thesisId: string,
  targetCollectionIds: string[],
  newCollectionName?: string,
  newCollectionColor?: string
): Promise<BookmarkActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'You must be signed in to bookmark theses.' }
    }

    const supabase = await createClient()
    let finalCollectionIds = [...targetCollectionIds]
    let newlyCreatedCollection: Collection | undefined

    // If user typed a new collection name inline, create it first
    if (newCollectionName && newCollectionName.trim().length > 0) {
      const cleanName = newCollectionName.trim().slice(0, 80)
      const color = (newCollectionColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(newCollectionColor.trim()))
        ? newCollectionColor.trim()
        : '#2E6A47'

      const { data: newCol, error: createError } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: cleanName,
          color,
          is_default: false,
        })
        .select('*')
        .single()

      if (createError || !newCol) {
        return { success: false, error: formatBookmarkError(createError, 'Failed to create collection.') }
      }

      newlyCreatedCollection = newCol
      finalCollectionIds.push(newCol.id)
    }

    // Get current collections for this thesis
    const { data: existingBookmarks, error: fetchBookmarksError } = await supabase
      .from('bookmarks')
      .select('id, collection_id')
      .eq('user_id', user.id)
      .eq('thesis_id', thesisId)

    if (fetchBookmarksError) {
      return { success: false, error: formatBookmarkError(fetchBookmarksError, 'Failed to access bookmarks.') }
    }

    const currentCollectionIds = (existingBookmarks ?? []).map(b => b.collection_id)

    // Determine what to remove and what to add
    const toRemove = (existingBookmarks ?? []).filter(
      b => !finalCollectionIds.includes(b.collection_id)
    )
    const toAdd = finalCollectionIds.filter(
      cid => !currentCollectionIds.includes(cid)
    )

    // Remove unselected
    if (toRemove.length > 0) {
      const removeIds = toRemove.map(b => b.id)
      await supabase.from('bookmarks').delete().in('id', removeIds)
    }

    // Insert newly selected
    if (toAdd.length > 0) {
      const rowsToInsert = toAdd.map(collection_id => ({
        user_id: user.id,
        thesis_id: thesisId,
        collection_id,
      }))
      const { error: insertError } = await supabase.from('bookmarks').insert(rowsToInsert)
      if (insertError) {
        return { success: false, error: formatBookmarkError(insertError, 'Failed to save to collection.') }
      }
    }

    try {
      revalidatePath('/bookmarks')
      revalidatePath('/theses')
      revalidatePath(`/theses/${thesisId}`)
    } catch {}

    return {
      success: true,
      collectionIds: finalCollectionIds,
      collection: newlyCreatedCollection,
      isBookmarked: finalCollectionIds.length > 0,
    }
  } catch (err) {
    console.error('updateThesisCollectionsAction caught exception:', err)
    return { success: false, error: formatBookmarkError(err, 'Failed to save to collection.') }
  }
}

// ── Remove thesis from specific collection or all collections ────────────────

export async function removeBookmarkAction(
  thesisId: string,
  collectionId?: string
): Promise<BookmarkActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'You must be signed in.' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('thesis_id', thesisId)

    if (collectionId) {
      query = query.eq('collection_id', collectionId)
    }

    const { error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    try {
      revalidatePath('/bookmarks')
      revalidatePath('/theses')
      revalidatePath(`/theses/${thesisId}`)
    } catch {}

    return { success: true }
  } catch (err) {
    console.error('removeBookmarkAction caught exception:', err)
    return { success: false, error: formatBookmarkError(err, 'Failed to remove bookmark.') }
  }
}
