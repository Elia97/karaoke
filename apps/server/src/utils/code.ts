import { randomInt } from "node:crypto"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 6

export function generateSessionCode(): string {
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(0, ALPHABET.length)]
  }
  return code
}
