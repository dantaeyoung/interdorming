/**
 * Bed ID Generator Composable
 * Generates unique bed IDs based on room names
 */

export function useBedIdGenerator() {
  /**
   * Generates a unique bed ID based on room name and bed count
   */
  function generateBedId(roomName: string, bedCount: number): string {
    // Extract meaningful letters from room name
    const words = roomName.split(' ')
    let roomPrefix = ''

    if (words.length >= 2) {
      // Take first letter of each word
      roomPrefix = words
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
    } else {
      // Take first 2-3 letters of the room name
      roomPrefix = roomName.substring(0, Math.min(3, roomName.length)).toUpperCase()
    }

    const bedNumber = (bedCount + 1).toString().padStart(2, '0')
    return `${roomPrefix}${bedNumber}`
  }

  /**
   * Generates a unique bed ID that doesn't conflict with existing IDs
   */
  function generateUniqueBedId(roomName: string, existingIds: string[]): string {
    let bedCount = 0
    let bedId = generateBedId(roomName, bedCount)

    // Keep incrementing until we find a unique ID
    while (existingIds.includes(bedId)) {
      bedCount++
      bedId = generateBedId(roomName, bedCount)
    }

    return bedId
  }

  return {
    generateBedId,
    generateUniqueBedId,
  }
}
