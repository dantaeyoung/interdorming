import { deriveAuth, deriveEncKey, encryptJSON, decryptJSON, fromHex, toHex, randomBytes } from './crypto'
import { gatherSnapshot, applySnapshot, type Snapshot } from './snapshot'
import type { StoredRecord, PushBody, PushResult } from './client'

interface Transport {
  pull(authProofHex: string): Promise<StoredRecord | null>
  push(authProofHex: string, body: PushBody): Promise<PushResult>
}

/**
 * Ties crypto + snapshot + transport together.
 *
 * Identity (authProof / workspaceId) is deterministic from the password, so any
 * device can pull without first knowing the per-workspace salt. The encryption
 * key depends on the random per-workspace salt, which is minted on the first
 * push and adopted from the record on every pull.
 */
export class SyncEngine {
  private constructor(
    private password: string,
    private authProofHex: string,
    private transport: Transport,
    private saltHex: string | null = null,
    public lastRevision = 0,
  ) {}

  static async create(
    password: string,
    transport: Transport,
    saltHex: string | null = null,
  ): Promise<SyncEngine> {
    const { authProofHex } = await deriveAuth(password)
    return new SyncEngine(password, authProofHex, transport, saltHex)
  }

  /** The workspace salt currently in use (null until first push/pull). */
  get currentSaltHex(): string | null {
    return this.saltHex
  }

  async pushLocal(): Promise<PushResult> {
    // First-ever push for this workspace mints the random per-workspace salt.
    if (!this.saltHex) this.saltHex = toHex(randomBytes(16))
    const encKey = await deriveEncKey(this.password, fromHex(this.saltHex))
    const snap = gatherSnapshot()
    const { ivHex, ciphertextHex } = await encryptJSON(encKey, snap)
    const result = await this.transport.push(this.authProofHex, {
      baseRevision: this.lastRevision,
      salt: this.saltHex,
      iv: ivHex,
      ciphertext: ciphertextHex,
    })
    if (result.ok) this.lastRevision = result.revision
    return result
  }

  async pullRemote(): Promise<{ applied: boolean; revision: number }> {
    const rec = await this.transport.pull(this.authProofHex)
    if (!rec) return { applied: false, revision: this.lastRevision }
    // Adopt the workspace salt that travels with the record and derive the key.
    this.saltHex = rec.salt
    const encKey = await deriveEncKey(this.password, fromHex(rec.salt))
    const snap = (await decryptJSON(encKey, rec.iv, rec.ciphertext)) as Snapshot
    applySnapshot(snap)
    this.lastRevision = rec.revision
    return { applied: true, revision: rec.revision }
  }
}
