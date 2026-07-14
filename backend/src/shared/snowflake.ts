const EPOCH = 1735689600000n
const WORKER_ID = BigInt(process.env.SNOWFLAKE_WORKER_ID || '1') & 0x3ffn

let sequence = 0n
let lastTimestamp = 0n

export function nextSnowflake(): bigint {
  let now = BigInt(Date.now()) - EPOCH

  if (now === lastTimestamp) {
    sequence = (sequence + 1n) & 0xfffn
    if (sequence === 0n) {
      while (now === lastTimestamp) {
        now = BigInt(Date.now()) - EPOCH
      }
    }
  } else {
    sequence = 0n
  }

  lastTimestamp = now
  return (now << 22n) | (WORKER_ID << 12n) | sequence
}

export function parseSnowflake(id: bigint): { timestamp: Date; workerId: number; sequence: number } {
  const timestamp = Number((id >> 22n) + EPOCH)
  const workerId = Number((id >> 12n) & 0x3ffn)
  const seq = Number(id & 0xfffn)
  return { timestamp: new Date(timestamp), workerId, sequence: seq }
}
