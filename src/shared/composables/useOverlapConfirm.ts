/**
 * Shared overlap-confirmation flow.
 *
 * When a drop or pick-place would displace assignments whose stays overlap
 * the dropped guest, the operator gets a confirm dialog. Components call
 * `requestOverlapConfirm` and await a boolean.
 *
 * The dialog state lives at module scope (singleton) so a single
 * `OverlapConfirmDialog` mounted in App.vue can serve every callsite.
 */

import { ref } from 'vue'

export interface OverlapConfirmRequest {
  /** The guest being placed (display name + bed) */
  guestName: string
  guestArrival?: string
  guestDeparture?: string
  bedId: string
  /** Guests on the bed whose stays overlap the new guest */
  overlapping: Array<{
    guestName: string
    arrival?: string
    departure?: string
  }>
}

const isOpen = ref(false)
const currentRequest = ref<OverlapConfirmRequest | null>(null)
let resolveFn: ((ok: boolean) => void) | null = null

export function useOverlapConfirm() {
  /**
   * Request operator confirmation for displacing overlapping assignments.
   * Returns a Promise that resolves true (replace) or false (cancel).
   */
  function requestOverlapConfirm(req: OverlapConfirmRequest): Promise<boolean> {
    // If a previous request is somehow still open, cancel it.
    if (resolveFn) {
      resolveFn(false)
      resolveFn = null
    }
    currentRequest.value = req
    isOpen.value = true
    return new Promise<boolean>(resolve => {
      resolveFn = resolve
    })
  }

  function confirmOverlap() {
    isOpen.value = false
    if (resolveFn) {
      resolveFn(true)
      resolveFn = null
    }
    currentRequest.value = null
  }

  function cancelOverlap() {
    isOpen.value = false
    if (resolveFn) {
      resolveFn(false)
      resolveFn = null
    }
    currentRequest.value = null
  }

  return {
    isOpen,
    currentRequest,
    requestOverlapConfirm,
    confirmOverlap,
    cancelOverlap,
  }
}
