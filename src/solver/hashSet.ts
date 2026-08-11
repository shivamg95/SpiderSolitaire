/**
 * Open-addressed set of 53-bit integer keys backed by a `Float64Array`.
 *
 * A `Set<number>` costs somewhere around 50 bytes per entry once V8's hash map
 * overhead is counted, which puts a few million visited positions well into the
 * hundreds of megabytes. Eight bytes per slot at a 0.7 load factor keeps the
 * same table under 50MB.
 */
export class HashSet53 {
  private keys: Float64Array
  private mask: number
  private limit: number
  private size = 0

  constructor(capacityHint: number) {
    let slots = 1024
    while (slots * 0.7 < capacityHint) slots *= 2
    this.keys = new Float64Array(slots)
    this.mask = slots - 1
    this.limit = Math.floor(slots * 0.7)
  }

  get count(): number {
    return this.size
  }

  /** Adds `key`, returning false when it was already present. */
  add(key: number): boolean {
    const k = key === 0 ? 1 : key
    let i = (k >>> 0) & this.mask
    for (;;) {
      const slot = this.keys[i]!
      if (slot === 0) {
        if (this.size >= this.limit) {
          this.grow()
          return this.add(k)
        }
        this.keys[i] = k
        this.size += 1
        return true
      }
      if (slot === k) return false
      i = (i + 1) & this.mask
    }
  }

  has(key: number): boolean {
    const k = key === 0 ? 1 : key
    let i = (k >>> 0) & this.mask
    for (;;) {
      const slot = this.keys[i]!
      if (slot === 0) return false
      if (slot === k) return true
      i = (i + 1) & this.mask
    }
  }

  clear(): void {
    this.keys.fill(0)
    this.size = 0
  }

  private grow(): void {
    const old = this.keys
    const slots = old.length * 2
    this.keys = new Float64Array(slots)
    this.mask = slots - 1
    this.limit = Math.floor(slots * 0.7)
    this.size = 0
    for (const key of old) {
      if (key !== 0) this.add(key)
    }
  }
}
