# Research: Session Code Generation

**Ticket**: [#3](https://github.com/kippeves/table-answer/issues/3)
**Branch**: `research/session-code-generation`

## Library Comparison

| Library | Size | URL-Safe | Memorable | Customizable | Maturity |
|---|---|---|---|---|---|
| **nanoid** (customAlphabet) | 130 bytes gzip | Yes | Yes (custom alphabet) | Fully (alphabet + length) | 26.9K stars, 56M weekly downloads |
| **short-unique-id** | 6.7kB gzip | Yes | Yes (custom dictionary) | Fully (dictionary + length) | 440 stars, 624K weekly downloads |
| **friendly-words** (Glitch) | ~41KB in memory | N/A (word lists) | Very (real English words) | Partially (curated lists) | 333 stars, 7K weekly downloads |
| **Custom CV-pattern** | 0 bytes | Configurable | Very (pronounceable) | Full | N/A (write your own) |

## Recommendation: nanoid with custom no-lookalike alphabet

**Why:**
- **Tiny**: 130 bytes gzipped, zero dependencies
- **Secure**: Uses `crypto.getRandomValues` (Web Crypto API / Node crypto)
- **URL-safe by default**: `A-Za-z0-9_-` alphabet
- **Fully customizable**: `customAlphabet('bcdfghjkmnpqrstvwxz23456789', 6)` gives a 6-char code from a 26-char consonant+confusing-free alphabet
- **Battle-tested**: 56M weekly downloads, used by Vercel, Next.js ecosystem

### Code Example

```typescript
import { customAlphabet } from 'nanoid';

// 26 chars: consonants + non-confusing digits (excludes 0, 1, I, O, l)
const SESSION_ALPHABET = 'bcdfghjkmnpqrstvwxz23456789';
const generateSessionCode = customAlphabet(SESSION_ALPHABET, 6);

// Usage in your PartyKit room creation:
const sessionCode = generateSessionCode(); // e.g. "k7mz2x"
```

## Collision Probability (Classroom Scale)

Using the birthday problem formula: `P(collision) approx 1 - e^(-n^2/(2*N))`

| Config | Alphabet | Length | Space (N) | 50 concurrent sessions | 200 concurrent sessions |
|---|---|---|---|---|---|
| 4-char alphanumeric (A-Za-z0-9) | 62 | 4 | 14.8M | ~0.00008% | ~0.001% |
| **6-char no-lookalike** (26 chars) | 26 | 6 | 309M | ~0.0004% | ~0.006% |
| 6-char alphanumeric | 62 | 6 | 56.8B | ~0.000002% | ~0.00003% |
| 4-digit numeric | 10 | 4 | 10K | ~12.5% (BAD) | ~66% (TERRIBLE) |

**Key insight**: 6 characters from a 26-character alphabet = 309M possible codes. At 50 concurrent sessions, collision probability is ~0.0004% — essentially zero.

## Implementation Notes for PartyKit

- PartyKit room IDs are used in URLs: `/parties/:party/:room-id`
- Room IDs should be URL-safe — nanoid's default alphabet is perfect
- No database needed: the code IS the room ID, PartyKit handles routing
- The session code doubles as the room ID — no mapping table needed
