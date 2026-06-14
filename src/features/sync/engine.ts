import { deriveKeys, encryptJSON, decryptJSON, fromHex, type DerivedKeys } from './crypto'
import { gatherSnapshot, applySnapshot, type Snapshot } from './snapshot'
import type { StoredRecord, PushBody, PushResult } from './client'

interface Transport {
  pull(authProofHex: string): Promise<StoredRecord | null>
  push(authProofHex: string, body: PushBody): Promise<PushResult>
}

export class SyncEngine {
  private constructor(
    private keys: DerivedKeys,
    private saltHex: string,
    private transport: Transport,
    public lastRevision = 0,
  ) {}

  static async create(
    password: string,
    saltHex: string,
    transport: Transport,
  ): Promise<SyncEngine> {
    const keys = await deriveKeys(password, fromHex(saltHex))
    return new SyncEngine(keys, saltHex, transport)
  }

  async pushLocal(): Promise<PushResult> {
    const snap = gatherSnapshot()
    const { ivHex, ciphertextHex } = await encryptJSON(this.keys.encKey, snap)
    const result = await this.transport.push(this.keys.authProofHex, {
      baseRevision: this.lastRevision,
      salt: this.saltHex,
      iv: ivHex,
      ciphertext: ciphertextHex,
    })
    if (result.ok) this.lastRevision = result.revision
    return result
  }

  async pullRemote(): Promise<{ applied: boolean; revision: number }> {
    const rec = await this.transport.pull(this.keys.authProofHex)
    if (!rec) return { applied: false, revision: this.lastRevision }
    const snap = (await decryptJSON(this.keys.encKey, rec.iv, rec.ciphertext)) as Snapshot
    applySnapshot(snap)
    this.lastRevision = rec.revision
    return { applied: true, revision: rec.revision }
  }
}
