import { customAlphabet } from "nanoid";

const ALPHABET = "bcdfghjkmnpqrstvwxz23456789";
const generate = customAlphabet(ALPHABET, 6);

export function generateSessionCode(): string {
  return generate();
}
