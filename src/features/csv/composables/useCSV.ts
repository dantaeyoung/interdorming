/**
 * CSV Composable
 * Provides CSV parsing and generation functionality
 */

import { CSV_FIELD_MAPPINGS } from '@/types'
import type { Guest, GuestCSVRow } from '@/types'

/**
 * Result of CSV parsing with guests and any warnings
 */
export interface CSVParseResult {
  guests: Guest[]
  warnings: string[]
  totalRows: number
}

export function useCSV() {
  /**
   * Parses a CSV row handling quoted fields and escaped quotes
   */
  function parseCSVRow(row: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]

      if (char === '"') {
        if (!inQuotes) {
          inQuotes = true
        } else if (i + 1 < row.length && row[i + 1] === '"') {
          // Handle escaped quotes
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = false
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }

    values.push(current.trim().replace(/^"|"$/g, ''))
    return values
  }

  /**
   * Escapes a CSV field by wrapping in quotes if it contains special characters
   */
  function escapeCSVField(field: any): string {
    if (field == null || field === undefined) {
      return ''
    }

    const value = String(field)
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  /**
   * Normalizes gender values to standardized format
   */
  function normalizeGender(gender: string): 'M' | 'F' | 'Non-binary/Other' {
    if (!gender) return 'M'

    const normalized = gender.toString().trim().toUpperCase()
    if (['M', 'MALE'].includes(normalized)) return 'M'
    if (['F', 'FEMALE'].includes(normalized)) return 'F'
    if (['NON-BINARY', 'NONBINARY', 'NON-BINARY/OTHER', 'OTHER', 'N', 'NB'].includes(normalized))
      return 'Non-binary/Other'

    return normalized.charAt(0) as 'M' | 'F' | 'Non-binary/Other'
  }

  /**
   * Converts boolean-like values to actual boolean
   */
  function parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (!value) return false

    const stringValue = value.toString().toLowerCase().trim()
    return ['yes', 'true', '1', 'on'].includes(stringValue)
  }

  /**
   * Safely parses integer values
   */
  function parseInteger(value: any, defaultValue = 0): number {
    const parsed = parseInt(value)
    return isNaN(parsed) ? defaultValue : parsed
  }

  /**
   * Maps CSV column names to field names
   */
  function mapColumns(headers: string[]): Record<string, string> {
    const columnMap: Record<string, string> = {}

    Object.keys(CSV_FIELD_MAPPINGS).forEach(field => {
      const matchingHeader = CSV_FIELD_MAPPINGS[field].find(variation =>
        headers.some(h => h.toLowerCase() === variation.toLowerCase())
      )
      if (matchingHeader) {
        const actualHeader = headers.find(h => h.toLowerCase() === matchingHeader.toLowerCase())
        if (actualHeader) {
          columnMap[field] = actualHeader
        }
      }
    })

    return columnMap
  }

  /**
   * Parses CSV text into guest objects
   */
  function parseGuestCSV(csvText: string): CSVParseResult {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    // Map column names
    const columnMap = mapColumns(headers)

    // Check for required fields
    const requiredFields = ['firstName', 'lastName', 'gender', 'age']
    const missingFields = requiredFields.filter(field => !columnMap[field])
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required columns: ${missingFields.join(', ')}. Available columns: ${headers.join(', ')}`
      )
    }

    const guests: Guest[] = []
    const invalidRows: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const rawRow = lines[i]
      const values = parseCSVRow(rawRow)

      // Helper to get row preview for error messages
      const getRowPreview = () => {
        const preview = rawRow.substring(0, 40)
        return preview.length < rawRow.length ? `${preview}...` : preview
      }

      if (values.length !== headers.length) {
        invalidRows.push(`Row ${i + 1} (${getRowPreview()}): Expected ${headers.length} columns, got ${values.length}`)
        continue
      }

      const guest: any = { id: crypto.randomUUID() }

      // Map data using the column mappings
      Object.keys(columnMap).forEach(field => {
        const headerName = columnMap[field]
        const headerIndex = headers.indexOf(headerName)
        if (headerIndex !== -1) {
          guest[field] = (values[headerIndex] || '').trim()
        }
      })

      // Helper to get guest name for error messages
      const getGuestIdentifier = () => {
        const firstName = guest.firstName || ''
        const lastName = guest.lastName || ''
        if (firstName || lastName) {
          const fullName = `${firstName} ${lastName}`.trim()
          return `"${fullName}"`
        }
        return getRowPreview()
      }

      // Validate required fields
      if (!guest.firstName || !guest.lastName) {
        invalidRows.push(`Row ${i + 1} ${getGuestIdentifier()}: Missing first name or last name`)
        continue
      }

      if (
        !guest.gender ||
        ![
          'M',
          'F',
          'Male',
          'Female',
          'male',
          'female',
          'm',
          'f',
          'Non-binary',
          'non-binary',
          'Other',
          'other',
          'N',
          'n',
          'NB',
          'nb',
        ].includes(guest.gender.trim())
      ) {
        invalidRows.push(
          `Row ${i + 1} ${getGuestIdentifier()}: Invalid gender '${guest.gender}'. Use M, F, Male, Female, Non-binary, or Other`
        )
        continue
      }

      // Normalize and clean data
      guest.age = parseInteger(guest.age)
      guest.gender = normalizeGender(guest.gender)
      guest.lowerBunk = parseBoolean(guest.lowerBunk)
      guest.groupName = guest.groupName || ''
      guest.preferredName = guest.preferredName || ''

      guests.push(guest as Guest)
    }

    if (guests.length === 0) {
      let debugInfo = `No valid guest data found in CSV. `
      debugInfo += `Total rows processed: ${lines.length - 1}. `
      debugInfo += `Invalid rows: ${invalidRows.length}. `
      if (invalidRows.length > 0) {
        debugInfo += `Errors: ${invalidRows.slice(0, 3).join('; ')}`
      }
      debugInfo += ` Column mappings found: ${Object.keys(columnMap).join(', ')}`
      throw new Error(debugInfo)
    }

    return {
      guests,
      warnings: invalidRows,
      totalRows: lines.length - 1,
    }
  }

  /**
   * Generates CSV text from array of objects
   */
  function generateCSV<T extends Record<string, any>>(
    data: T[],
    columns: Array<{ key: keyof T; label: string }>
  ): string {
    if (data.length === 0) return ''

    // Generate header row
    const headers = columns.map(col => escapeCSVField(col.label))
    const csvLines = [headers.join(',')]

    // Generate data rows
    data.forEach(row => {
      const values = columns.map(col => {
        const value = row[col.key]
        return escapeCSVField(value)
      })
      csvLines.push(values.join(','))
    })

    return csvLines.join('\n')
  }

  /**
   * Triggers a CSV download in the browser
   */
  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Generates a timestamped filename
   */
  function generateTimestampedFilename(baseName: string, extension: string): string {
    const timestamp = new Date().toISOString().split('T')[0]
    const ext = extension.startsWith('.') ? extension : `.${extension}`
    return `${baseName}_${timestamp}${ext}`
  }

  return {
    parseCSVRow,
    escapeCSVField,
    normalizeGender,
    parseBoolean,
    parseInteger,
    mapColumns,
    parseGuestCSV,
    generateCSV,
    downloadCSV,
    generateTimestampedFilename,
  }
}
