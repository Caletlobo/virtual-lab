# Man-in-the-Middle Attack on Diffie–Hellman — Virtual Lab

An interactive virtual lab that shows how an attacker can break an unauthenticated
Diffie–Hellman key exchange, and how authentication stops it. Plain HTML, CSS and
JavaScript — no build step, no dependencies.

## Run it

Open `index.html` in any modern browser.
The page loads the *Hanken Grotesk* font from Google Fonts, so it needs an internet
connection for the font only; everything else works offline.

**Hosting:** the site works on GitHub Pages as-is
(Settings → Pages → *Deploy from a branch* → this branch, `/ (root)`).

## What's inside

| Section | What you get |
| --- | --- |
| **Aim & Objectives** | The aim of the experiment and its five objectives |
| **Theory** | Diffie–Hellman basics, an animated Normal vs MITM diagram, and why the attack works |
| **Experimental Steps** | The 12-step procedure, grouped into Setup, Key exchange, Message & analysis |
| **Interactive Simulation** | Live, step-by-step simulation (see below) |
| **Assessment / Quiz** | 10 questions with instant feedback and a final score |
| **References** | Textbook and online resources |

## The simulation

- **Editable parameters** — change `p`, `g` and the private exponents `a`, `b`, `e`; everything recalculates live and invalid input is explained.
- **Three modes**
  - *Without MITM* — Alice and Bob derive the same shared secret.
  - *With MITM* — Eve intercepts both public values, substitutes her own, and ends up holding a separate key with each side.
  - *Protected (signed)* — the public values are signed, Eve's forgery fails verification, and the handshake aborts.
- **Step-by-step control** — play/pause, previous/next, clickable step dots, speed setting, and ← / → keyboard shortcuts.
- **Animated packets** — values travel along the link; when Eve intercepts, they drop into her card and her own values come back out.
- **Practice mode** — turn it on and compute each value yourself (e.g. `A = 5^6 mod 23`) before it is revealed.
- **Message lab** — unlocks after the key exchange and uses the keys from your run. You play each side:
  Alice encrypts and sends; under MITM, Eve can *read*, *try the wrong key*, *forward an edited message*, *forward the raw ciphertext*, or *drop it*; Bob decrypts. An **Auto-play** button runs the whole sequence.

## Default test case

```
p = 23   g = 5
Alice private a = 6    Bob private b = 15    Eve private e = 7
```

| Value | Result |
| --- | --- |
| Alice public `A = g^a mod p` | 8 |
| Bob public `B = g^b mod p` | 19 |
| Eve public `E = g^e mod p` | 17 |
| Normal shared secret `K` | 2 |
| MITM Alice ↔ Eve `K1` | 12 |
| MITM Eve ↔ Bob `K2` | 15 |

Message demo: Alice sends `Meet me at 10 AM`; Eve may replace it with
`Meet me at 12 PM`, and Bob receives the modified message.

## Files

```
index.html   page structure
style.css    layout and theme
script.js    simulation, message lab, animations, quiz
README.md    this file
```

## Notes

- Educational demo only. The numbers are small on purpose; real protocols use very large parameters.
- Session keys are derived with SHA-256 of the shared secret.
- The message cipher (a SHA-256 keystream XOR) and the signatures in *Protected* mode are **toy implementations** for illustration. They are not secure; real systems use authenticated encryption (e.g. AES-GCM) and RSA/ECDSA certificates.
- Quiz questions are aligned with William Stallings, *Cryptography and Network Security: Principles and Practice*.
