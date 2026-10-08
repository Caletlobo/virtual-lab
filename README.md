# Man-in-the-Middle Attack on Diffie–Hellman — Virtual Lab

## Experiment
Demonstrates how an attacker establishes separate shared keys with Alice and Bob,
intercepts a message, modifies it, and forwards it.

## Files
- index.html
- style.css
- script.js
- README.md

## Run
Open `index.html` in a modern browser.

## Default test case
p = 23
g = 5
Alice private key = 6
Bob private key = 15
Eve private key (Alice side) = 7
Eve private key (Bob side) = 9

Expected:
Alice public value = 8
Bob public value = 19
Eve public value to Alice = 17
Eve public value to Bob = 11
Alice–Eve shared key = 12
Eve–Bob shared key = 14

Message demonstration:
Alice sends: Meet me at 10 AM
Eve may change it to: Meet me at 12 PM
Bob receives the modified message.

Note: This is an educational virtual-lab simulation illustrating the
unauthenticated Diffie–Hellman MITM concept.
