'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* =====================================================================
   Maths + hashing
   ===================================================================== */
function powmod(base, exp, mod) {
  let r = 1n;
  for (base %= mod; exp > 0n; exp >>= 1n, base = base * base % mod) if (exp & 1n) r = r * base % mod;
  return r;
}
function isPrime(n) {
  if (n < 2n) return false;
  for (let k = 2n; k * k <= n; k++) if (n % k === 0n) return false;
  return true;
}

// Synchronous SHA-256 (hex digest of an ASCII string).
function sha256(ascii) {
  const rr = (v, a) => (v >>> a) | (v << (32 - a));
  const maxWord = 2 ** 32, words = [], bitLen = ascii.length * 8, k = [];
  let hash = [], pc = 0;
  const comp = {};
  for (let c = 2; pc < 64; c++) {
    if (!comp[c]) {
      for (let i = 0; i < 313; i += c) comp[i] = c;
      hash[pc] = (Math.pow(c, .5) * maxWord) | 0;
      k[pc++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
  words[words.length] = (bitLen / maxWord) | 0;
  words[words.length] = bitLen;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16), old = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
        (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  let out = '';
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
  return out;
}
const deriveKey = secret => sha256('dh-session:' + secret).slice(0, 32);

// Toy stream cipher: message XOR keystream from SHA-256(key:counter). Demonstration only.
function keystream(key, n) {
  const out = [];
  for (let c = 0; out.length < n; c++) {
    const h = sha256(key + ':' + c);
    for (let i = 0; i < h.length && out.length < n; i += 2) out.push(parseInt(h.substr(i, 2), 16));
  }
  return out;
}
function encrypt(msg, key) {
  const bytes = new TextEncoder().encode(msg), ks = keystream(key, bytes.length);
  return [...bytes].map((b, i) => (b ^ ks[i]).toString(16).padStart(2, '0')).join('');
}
function decrypt(hex, key) {
  const bytes = hex.match(/../g).map(h => parseInt(h, 16)), ks = keystream(key, bytes.length);
  return new TextDecoder().decode(new Uint8Array(bytes.map((b, i) => b ^ ks[i])));
}

/* =====================================================================
   Navigation
   ===================================================================== */
const VIEWS = ['aim', 'theory', 'steps', 'sim', 'quiz', 'refs'];
function navigate(id, push = true) {
  if (!VIEWS.includes(id)) id = 'aim';
  $$('.view').forEach(v => v.classList.toggle('is-on', v.id === id));
  $$('.rail-btn').forEach(b => b.classList.toggle('is-on', b.dataset.nav === id));
  if (id !== 'sim') pause();
  $('#main').scrollTop = 0;
  if (push) history.replaceState(null, '', '#' + id);
  if (id === 'sim') render();
}
const TITLES = { aim: 'Aim & Objectives', theory: 'Theory', steps: 'Experimental Steps', sim: 'Interactive Simulation', quiz: 'Assessment / Quiz', refs: 'References' };
VIEWS.forEach((id, i) => {
  const view = $('#' + id);
  if (id === 'sim') return;
  const prev = VIEWS[i - 1], next = VIEWS[i + 1];
  const nav = document.createElement('nav');
  nav.className = 'pager';
  nav.setAttribute('aria-label', 'Previous and next section');
  nav.innerHTML = (prev ? `<button class="pager-btn" data-nav="${prev}"><small>Previous</small><span>← ${TITLES[prev]}</span></button>` : '<span></span>') +
    (next ? `<button class="pager-btn is-next" data-nav="${next}"><small>Next</small><span>${TITLES[next]} →</span></button>` : '<span></span>');
  view.appendChild(nav);
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-nav]');
  if (b) navigate(b.dataset.nav);
});

/* =====================================================================
   Theory diagram
   ===================================================================== */
const demo = (() => {
  const p = 23n, g = 5n, a = 6n, b = 15n, e = 7n;
  return { A: powmod(g, a, p), B: powmod(g, b, p), E: powmod(g, e, p), K: powmod(powmod(g, b, p), a, p), K1: powmod(powmod(g, e, p), a, p), K2: powmod(powmod(g, e, p), b, p) };
})();

function drawTheory(mode) {
  $$('[data-theory]').forEach(b => b.classList.toggle('is-on', b.dataset.theory === mode));
  const atk = mode === 'attack', line = atk ? '#dc2626' : '#2563eb';
  const box = (x, w, fill, stroke, title, sub) =>
    `<rect x="${x}" y="22" width="${w}" height="74" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
     <text x="${x + w / 2}" y="54" text-anchor="middle" font-size="17" font-weight="700" fill="#2a1a12">${title}</text>
     <text x="${x + w / 2}" y="76" text-anchor="middle" font-size="12.5" fill="#6d5a4e">${sub}</text>`;
  const dot = (path, dur, color, begin = '0s') =>
    `<circle r="5" fill="${color}"><animateMotion dur="${dur}" begin="${begin}" repeatCount="indefinite" path="${path}"/></circle>`;
  const paths = atk
    ? [['M150 48 H255', '#2563eb'], ['M395 48 H500', '#dc2626'], ['M500 72 H395', '#059669'], ['M255 72 H150', '#dc2626']]
    : [['M150 48 H500', '#2563eb'], ['M500 72 H150', '#059669']];
  $('#theoryVisual').innerHTML = `
    <svg viewBox="0 0 650 150" role="img" aria-label="${atk ? 'Man-in-the-middle' : 'Normal'} key exchange">
      ${box(10, 140, '#eff5ff', '#2563eb', 'Alice', `Public A = ${demo.A}`)}
      ${box(500, 140, '#ecfaf4', '#059669', 'Bob', `Public B = ${demo.B}`)}
      ${atk ? box(255, 140, '#fef1f1', '#dc2626', 'Eve', `Substitutes E = ${demo.E}`) : ''}
      <g stroke="${line}" stroke-width="2" stroke-dasharray="5 5" fill="none" opacity=".55">${paths.map(p => `<path d="${p[0]}"/>`).join('')}</g>
      ${paths.map((p, i) => dot(p[0], atk ? '1.6s' : '2.4s', p[1], (i * 0.4) + 's')).join('')}
      <text x="325" y="128" text-anchor="middle" font-size="13.5" font-weight="700" fill="${atk ? '#9b1c1c' : '#5c3c2b'}">${atk ? `Separate shared secrets: ${demo.K1} (Alice–Eve) and ${demo.K2} (Eve–Bob)` : `Same shared secret: ${demo.K}`}</text>
    </svg>
    <p class="cap">${atk ? 'Eve replaces both public values. Alice and Bob unknowingly establish separate shared secrets with Eve.' : 'Alice and Bob exchange public values directly and independently compute the same shared secret.'}</p>`;
}
$$('[data-theory]').forEach(b => b.addEventListener('click', () => drawTheory(b.dataset.theory)));
$$('.phase ol').forEach(ol => { ol.style.counterReset = 'st ' + (Number(ol.getAttribute('start') || 1) - 1); });

/* =====================================================================
   Simulation state
   ===================================================================== */
const S = { mode: 'normal', step: 0, playing: false, timer: null, v: null, scenes: [], rev: new Set(), fresh: new Set(), tab: 'steps', practice: false, solved: new Set(), reached: new Set() };

function compute() {
  const raw = ['p', 'g', 'a', 'b', 'e'].map(k => $('#in-' + k).value.trim());
  if (raw.some(x => !/^\d+$/.test(x))) throw Error('Enter a positive whole number in every field.');
  const [p, g, a, b, e] = raw.map(BigInt);
  if (p < 3n || p > 100000n) throw Error('Use a prime p between 3 and 100000.');
  if (!isPrime(p)) throw Error('p must be a prime number.');
  if (g < 2n || g >= p) throw Error('g must be between 2 and p − 1.');
  if ([a, b, e].some(x => x < 1n || x >= p)) throw Error('Private exponents must be between 1 and p − 1.');
  const A = powmod(g, a, p), B = powmod(g, b, p), E = powmod(g, e, p);
  const K = powmod(B, a, p), K1 = powmod(E, a, p), K2 = powmod(E, b, p);
  if (K !== powmod(A, b, p) || K1 !== powmod(A, e, p) || K2 !== powmod(B, e, p)) throw Error('Internal key-agreement check failed.');
  return { p, g, a, b, e, A, B, E, K, K1, K2, key: deriveKey(K), key1: deriveKey(K1), key2: deriveKey(K2) };
}

function modexp(sym, base, exp, res, bs, es, p) {
  const out = [[`${sym} = ${bs}^${es} mod p`], [`${sym} = ${base}^${exp} mod ${p}`]];
  const full = base ** exp;
  if (full < 10n ** 12n) out.push([`${sym} = ${full} mod ${p}`]);
  out.push([`${sym} = ${res}`, 'f-key']);
  return out;
}
const askFor = (sym, base, exp, res, p) => ({ label: `Compute ${sym} = ${base}^${exp} mod ${p}`, ans: res, hint: `Multiply ${base} by itself ${exp} times, reducing mod ${p} as you go.` });
// Toy signature (demonstration only — real systems use RSA/ECDSA with certificates).
const sigOf = (who, val) => sha256(`sig:${who}:${val}`).slice(0, 8);

function buildScenes(v, mode) {
  const { p, g, a, b, e, A, B, E, K, K1, K2, key, key1, key2 } = v;
  const short = k => k.slice(0, 12) + '…';
  const head = [
    { tag: 'Parameters', title: 'Public parameters & private exponents', reveal: [],
      lines: [[`p = ${p}   (prime modulus, public)`], [`g = ${g}   (generator, public)`], [`a = ${a}   (Alice, private)`], [`b = ${b}   (Bob, private)`], ...(mode !== 'normal' ? [[`e = ${e}   (Eve, private)`]] : [])],
      note: 'Only p and g are public. Each private exponent stays with its owner and is never transmitted.' },
    { tag: 'Public value', title: 'Alice computes her public value', reveal: ['aPub'], lines: modexp('A', g, a, A, 'g', 'a', p), ask: askFor('A', g, a, A, p),
      note: 'Alice raises g to her private exponent. The result A is safe to send openly.' },
    { tag: 'Public value', title: 'Bob computes his public value', reveal: ['bPub'], lines: modexp('B', g, b, B, 'g', 'b', p), ask: askFor('B', g, b, B, p),
      note: 'Bob does the same independently with his own private exponent.' }
  ];

  if (mode === 'normal') return [...head,
    { tag: 'Exchange', title: 'Public values cross the network', reveal: ['aRecv', 'bRecv'],
      lines: [[`Alice → Bob :  A = ${A}`], [`Bob → Alice :  B = ${B}`], ['Only public values are transmitted', 'f-key']],
      packets: [{ from: 'a', to: 'b', lane: 'top', label: `A = ${A}`, k: 'a' }, { from: 'b', to: 'a', lane: 'bot', label: `B = ${B}`, k: 'b' }],
      note: 'An eavesdropper sees A and B, but recovering a private exponent from them is the discrete-logarithm problem.' },
    { tag: 'Shared secret', title: 'Alice computes the shared secret', reveal: ['aSec'], lines: modexp('K', B, a, K, 'B', 'a', p), ask: askFor('K', B, a, K, p),
      note: "Alice raises Bob's public value to her private exponent." },
    { tag: 'Shared secret', title: 'Bob computes the shared secret', reveal: ['bSec'],
      lines: [...modexp('K', A, b, K, 'A', 'b', p), [`Alice's K = Bob's K = ${K}`, 'f-ok']], ask: askFor('K', A, b, K, p),
      note: "Bob raises Alice's public value to his private exponent and lands on the same number: g^(ab) mod p." },
    { tag: 'Session key', title: 'Deriving the session key', reveal: ['keys'], kind: 't-ok',
      lines: [[`K = ${K}`], ['session key = SHA-256(K)'], [`key = ${short(key)}`, 'f-viol']],
      note: 'A real protocol feeds the shared secret into a KDF such as HKDF. Both sides now hold the same key. Try the Message lab, then switch to MITM.' }
  ];

  if (mode === 'signed') {
    const sA = sigOf('Alice', A), sB = sigOf('Bob', B), forged = sigOf('Eve', E), wantA = sigOf('Alice', E), wantB = sigOf('Bob', E);
    return [...head,
      { tag: 'Authentication', title: 'Each side signs its public value', kind: 't-key', reveal: ['eGot'],
        lines: [[`Alice: σA = Sign(skAlice, ${A}) = ${sA}`, 'f-viol'], [`Bob:   σB = Sign(skBob, ${B}) = ${sB}`, 'f-viol'], ['Eve can read A, B and the signatures…', 'f-bad']],
        packets: [{ from: 'a', to: 'e', lane: 'top', label: 'A + σ', k: 'a' }, { from: 'b', to: 'e', lane: 'bot', label: 'B + σ', k: 'b' }],
        note: 'The signature binds each public value to its sender’s long-term key. (Toy signature — real systems use RSA/ECDSA and certificates.)' },
      { tag: 'Forgery attempt', title: 'Eve substitutes her own value', kind: 't-attack', reveal: ['ePub', 'aRecv', 'bRecv'],
        lines: [...modexp('E', g, e, E, 'g', 'e', p), [`Eve → Bob   :  E, σ = ${forged}`, 'f-bad'], [`Eve → Alice :  E, σ = ${forged}`, 'f-bad']],
        packets: [{ from: 'e', to: 'b', lane: 'top', label: 'E + σ?', k: 'e' }, { from: 'e', to: 'a', lane: 'bot', label: 'E + σ?', k: 'e' }],
        note: 'Eve does not have Alice’s or Bob’s signing key, so the best she can attach is a signature made with her own.' },
      { tag: 'Verification', title: 'Signature check fails on both sides', kind: 't-ok', reveal: ['aVer', 'bVer'],
        lines: [[`Bob checks σ on E against Alice's key`], [`expected ${wantA}  got ${forged}  ✕ INVALID`, 'f-ok'], [`Alice checks σ on E against Bob's key`], [`expected ${wantB}  got ${forged}  ✕ INVALID`, 'f-ok']],
        note: 'Both victims reject E because it was not signed by the peer they meant to talk to.' },
      { tag: 'Result', title: 'Handshake aborted — attack prevented', kind: 't-ok', reveal: ['final'],
        lines: [['No shared secret is computed from E', 'f-ok'], ['Eve holds no key with Alice or Bob', 'f-ok'], ['Authenticated DH stops the substitution', 'f-ok']],
        note: 'This is why TLS, SSH and IPsec authenticate the key exchange with certificates, signatures or pre-shared secrets.' }
    ];
  }

  return [...head,
    { tag: 'Interception', title: 'Eve intercepts both public values', kind: 't-attack', reveal: ['eGot'],
      lines: [[`Alice sends  A = ${A}  →  Eve receives it`, 'f-bad'], [`Bob sends  B = ${B}  →  Eve receives it`, 'f-bad']],
      packets: [{ from: 'a', to: 'e', lane: 'top', label: `A = ${A}`, k: 'a' }, { from: 'b', to: 'e', lane: 'bot', label: `B = ${B}`, k: 'b' }],
      note: 'Eve sits on the link and holds back the real values. Neither Alice nor Bob can tell.' },
    { tag: 'Substitution', title: 'Eve forwards her own public value', kind: 't-attack', reveal: ['ePub', 'aRecv', 'bRecv'],
      lines: [...modexp('E', g, e, E, 'g', 'e', p), [`Eve → Bob   :  E = ${E}`, 'f-bad'], [`Eve → Alice :  E = ${E}`, 'f-bad']], ask: askFor('E', g, e, E, p),
      packets: [{ from: 'e', to: 'b', lane: 'top', label: `E = ${E}`, k: 'e' }, { from: 'e', to: 'a', lane: 'bot', label: `E = ${E}`, k: 'e' }],
      note: 'Each victim receives E believing it came from the other. Nothing in plain Diffie–Hellman proves otherwise.' },
    { tag: 'Alice ↔ Eve', title: "Alice's shared secret is with Eve", kind: 't-attack', reveal: ['aSec', 'eSec1'],
      lines: [...modexp('K1', E, a, K1, 'E', 'a', p), [`Eve: A^e mod p = ${A}^${e} mod ${p} = ${K1}`, 'f-bad']], ask: askFor('K1', E, a, K1, p),
      note: 'Alice and Eve compute the same K1. Alice thinks it is a secret shared with Bob.' },
    { tag: 'Eve ↔ Bob', title: "Bob's shared secret is with Eve", kind: 't-attack', reveal: ['bSec', 'eSec2'],
      lines: [...modexp('K2', E, b, K2, 'E', 'b', p), [`Eve: B^e mod p = ${B}^${e} mod ${p} = ${K2}`, 'f-bad']], ask: askFor('K2', E, b, K2, p),
      note: 'Bob and Eve compute K2. Eve now holds a working secret with each victim.' },
    { tag: 'Result', title: 'Two separately keyed connections', kind: 't-attack', reveal: ['keys'],
      lines: [[`key1 (Alice↔Eve) = ${short(key1)}`, 'f-viol'], [`key2 (Eve↔Bob)   = ${short(key2)}`, 'f-viol'], [K1 === K2 ? 'key1 = key2 (coincidence for these small numbers)' : 'key1 ≠ key2: Alice and Bob never shared a key', 'f-bad']],
      note: 'Eve can decrypt, read and re-encrypt everything in both directions. Open the Message lab to watch it happen.' }
  ];
}

/* ---------- Rendering ---------- */
const row = (k, flag, val, o = {}) => {
  const shown = !flag || S.rev.has(flag);
  const fresh = flag && S.fresh.has(flag);
  const cls = ['row', !shown && 'is-empty', o.secret && 'is-secret', fresh && 'is-new', o.evil && shown && 'is-evil'].filter(Boolean).join(' ');
  return `<div class="${cls}"><span class="row-k">${k}${shown && o.sub ? `<small>${o.sub}</small>` : ''}</span><span class="row-v">${shown ? esc(val) : '—'}</span></div>`;
};
const shortKey = k => k.slice(0, 8);

function nodeCard(cls, letter, name, role, rows) {
  return `<div class="node node-${cls}">
    <div class="node-head"><span class="avatar" style="--c:var(--${cls === 'a' ? 'alice' : cls === 'b' ? 'bob' : 'eve'})">${letter}</span><div><div class="node-name">${name}</div><div class="node-role">${role}</div></div></div>
    <div class="rows">${rows.join('')}</div></div>`;
}

const isSolved = i => S.solved.has(S.mode + ':' + i);
const STATUS = { normal: 'Direct exchange', attack: 'MITM active', signed: 'Authenticated' };

function render() {
  if (!S.v) return;
  const scene = S.scenes[S.step], total = S.scenes.length, mode = S.mode, atk = mode === 'attack', sgn = mode === 'signed', v = S.v;
  const locked = S.practice && scene.ask && !isSolved(S.step);

  S.rev = new Set();
  S.scenes.slice(0, S.step + 1).forEach((sc, i) => { if (S.practice && sc.ask && !isSolved(i)) return; sc.reveal.forEach(f => S.rev.add(f)); });
  S.fresh = locked ? new Set() : new Set(scene.reveal);

  $('#status').textContent = STATUS[mode];
  $('#status').classList.toggle('is-attack', atk);
  $('#status').classList.toggle('is-signed', sgn);
  $('#stage').classList.toggle('is-attack', mode !== 'normal');
  $$('[data-mode]').forEach(b => b.classList.toggle('is-on', b.dataset.mode === mode));

  const aRows = sgn ? [
    row('Private a', null, v.a, { secret: true }), row('Public A', 'aPub', v.A),
    row('Received', 'aRecv', v.E, { evil: true, sub: 'unsigned by Bob — forged' }),
    row('Signature check', 'aVer', '✕ invalid', { evil: true }), row('Outcome', 'final', 'Aborted')
  ] : [
    row('Private a', null, v.a, { secret: true }), row('Public A', 'aPub', v.A),
    row('Received', 'aRecv', atk ? v.E : v.B, { evil: atk, sub: atk ? 'thinks: from Bob — actually Eve' : '' }),
    row('Shared secret', 'aSec', atk ? v.K1 : v.K, { evil: atk }), row('Session key', 'keys', shortKey(atk ? v.key1 : v.key), { evil: atk })
  ];
  const bRows = sgn ? [
    row('Private b', null, v.b, { secret: true }), row('Public B', 'bPub', v.B),
    row('Received', 'bRecv', v.E, { evil: true, sub: 'unsigned by Alice — forged' }),
    row('Signature check', 'bVer', '✕ invalid', { evil: true }), row('Outcome', 'final', 'Aborted')
  ] : [
    row('Private b', null, v.b, { secret: true }), row('Public B', 'bPub', v.B),
    row('Received', 'bRecv', atk ? v.E : v.A, { evil: atk, sub: atk ? 'thinks: from Alice — actually Eve' : '' }),
    row('Shared secret', 'bSec', atk ? v.K2 : v.K, { evil: atk }), row('Session key', 'keys', shortKey(atk ? v.key2 : v.key), { evil: atk })
  ];
  $('#node-a').outerHTML = nodeCard('a', 'A', 'Alice', 'Initiator', aRows).replace('class="node node-a"', 'class="node node-a" id="node-a"');
  $('#node-b').outerHTML = nodeCard('b', 'B', 'Bob', 'Responder', bRows).replace('class="node node-b"', 'class="node node-b" id="node-b"');
  $('#node-e').innerHTML = atk ? nodeCard('e', 'E', 'Eve', 'Active attacker', [
      row('Private e', null, v.e, { secret: true }), row('Intercepted', 'eGot', `A=${v.A} · B=${v.B}`), row('Public E', 'ePub', v.E),
      row('Secret w/ Alice', 'eSec1', v.K1), row('Secret w/ Bob', 'eSec2', v.K2), row('Session keys', 'keys', `${shortKey(v.key1)} · ${shortKey(v.key2)}`)])
    : sgn ? nodeCard('e', 'E', 'Eve', 'Attacker — no signing keys', [
      row('Private e', null, v.e, { secret: true }), row('Intercepted', 'eGot', `A=${v.A} · B=${v.B}`), row('Public E', 'ePub', v.E),
      row('Her signature', 'ePub', 'forged ✕', { evil: true }), row('Keys obtained', 'final', 'none')])
    : `<div class="eve-off"><div><b>No attacker on this link</b>Switch to “With MITM” to place Eve between Alice and Bob.</div></div>`;

  // verdict + key fingerprints
  const last = S.step === total - 1, vd = $('#verdict');
  vd.className = 'verdict' + (last ? (atk ? ' is-bad' : ' is-ok') : '');
  if (!last) vd.textContent = atk ? 'Step through to see how Eve ends up holding both keys.' : sgn ? 'Step through to see authentication defeat the substitution.' : 'Step through to see both sides derive the same key.';
  else if (atk) vd.innerHTML = `<span>✕ Alice and Bob hold different keys. Eve holds both.</span>`;
  else if (sgn) vd.innerHTML = '<span>✓ Attack prevented: Eve could not forge a valid signature, so no key was established with her.</span>';
  else vd.innerHTML = `<span>✓ Same key on both sides — but neither verified the other's identity.</span>`;

  // inspector
  const tagEl = $('#s-tag');
  tagEl.textContent = scene.tag; tagEl.className = 'tag ' + (scene.kind || '');
  $('#s-count').textContent = `${S.step + 1} / ${total}`;
  $('#s-title').textContent = scene.title;
  const shown = locked ? scene.lines.slice(0, 1) : scene.lines;
  $('#s-lines').innerHTML = shown.map(([t, c], i) => `<div class="fl ${c || ''}" style="animation-delay:${i * 70}ms">${esc(t)}</div>`).join('');
  $('#s-note').textContent = scene.note;
  renderAsk(scene, locked);

  // transport
  $('#dots').innerHTML = S.scenes.map((sc, i) => `<button class="dot ${i === S.step ? 'is-now' : i < S.step ? 'is-done' : ''}" data-go="${i}" title="${i + 1}. ${esc(sc.title)}" aria-label="Step ${i + 1}: ${esc(sc.title)}"></button>`).join('');
  $('#t-prev').disabled = $('#t-first').disabled = S.step === 0;
  $('#t-next').disabled = last;
  $('#t-play').textContent = S.playing ? 'Ⅱ Pause' : (last ? '↺ Replay' : '▶ Play');

  if (last && mode !== 'signed') S.reached.add(mode);
  launch(locked ? [] : scene.packets || []);
  renderMsgLab();
}

function renderAsk(scene, locked) {
  const box = $('#s-ask');
  box.hidden = !locked;
  if (!locked) return;
  box.innerHTML = `<div class="ask-q"><b>Your turn</b>${esc(scene.ask.label)}</div>
    <div class="ask-row"><input id="ask-in" type="number" inputmode="numeric" placeholder="answer" autocomplete="off"><button class="btn btn-primary" id="ask-ok">Check</button><button class="btn" id="ask-show">Show</button></div>
    <div class="ask-fb" id="ask-fb">Hint: ${esc(scene.ask.hint)}</div>`;
  const solve = () => { S.solved.add(S.mode + ':' + S.step); render(); };
  const check = () => {
    const raw = $('#ask-in').value.trim();
    if (/^\d+$/.test(raw) && BigInt(raw) === scene.ask.ans) return solve();
    const fb = $('#ask-fb');
    fb.textContent = raw === '' ? 'Type a number first.' : 'Not quite — try again or press Show.';
    fb.className = 'ask-fb is-bad';
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
  };
  $('#ask-ok').addEventListener('click', check);
  $('#ask-show').addEventListener('click', solve);
  $('#ask-in').addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
}

/* ---------- Packet animation engine ---------- */
const POS = { a: 7, e: 50, b: 93 }, LANE = { top: 38, bot: 66 };
const EVE_TOP = 'calc(100% + 64px)', NAME = { a: 'Alice', b: 'Bob', e: 'Eve' };
let seqId = 0;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const speedK = () => Math.max(.55, Math.min(1.6, Number($('#speed').value) / 2300));
const wait = ms => new Promise(r => setTimeout(r, ms));

function clearPackets() { $$('#channel .packet').forEach(p => p.remove()); }
function setCap(text, tone) { const c = $('#flowcap'); c.textContent = text || ''; c.className = 'flow-cap' + (text ? ' is-on' : '') + (tone ? ' t-' + tone : ''); }
function cancelAnim() {
  seqId++; clearPackets(); setCap('');
  if (S.msgCancel) { const f = S.msgCancel; S.msgCancel = null; f(); }
}
function pulse(who) {
  const el = who === 'e' ? $('#node-e .node') : $('#node-' + who);
  if (!el) return;
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}
function tapHit() { const t = $('#tap'); t.classList.remove('is-hit'); void t.offsetWidth; t.classList.add('is-hit'); }
function makeChip(label, k, left, top) {
  const el = document.createElement('div');
  el.className = 'packet k-' + k;
  el.textContent = label;
  el.style.left = left; el.style.top = top; el.style.opacity = 0;
  $('#channel').appendChild(el);
  void el.offsetWidth; el.style.opacity = 1;
  return el;
}
function move(chip, to, dur) {
  const from = { left: chip.style.left, top: chip.style.top };
  const an = chip.animate([from, to], { duration: dur, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
  return an.finished.then(() => { Object.assign(chip.style, to); an.cancel(); }).catch(() => {});
}
function restyle(chip, label, k) { chip.textContent = label; chip.className = 'packet k-' + k; }
const fade = chip => { chip.style.opacity = 0; return wait(260).then(() => chip.remove()); };

async function flight(p, id, dur) {
  const lane = LANE[p.lane] + '%', px = k => POS[k] + '%';
  const chip = makeChip(p.label, p.k, px(p.from), p.from === 'e' ? EVE_TOP : lane);
  pulse(p.from);
  if (p.from === 'e') { await move(chip, { left: px('e'), top: lane }, 420 * speedK()); if (id !== seqId) return; }
  await move(chip, { left: px(p.to), top: lane }, dur);
  if (id !== seqId) return;
  if (p.to === 'e') { await move(chip, { left: px('e'), top: EVE_TOP }, 420 * speedK()); if (id !== seqId) return; tapHit(); }
  pulse(p.to);
  await fade(chip);
}
const phaseCap = list => list.every(p => p.to === 'e') ? 'Intercepted by Eve' : list.every(p => p.from === 'e') ? 'Eve forwards her own value' : 'Public values cross the network';

function launch(list) {
  cancelAnim();
  if (!list.length || reduced()) return;
  const id = seqId, dur = 1500 * speedK();
  (async () => {
    const first = list.filter(p => p.from !== 'e'), second = list.filter(p => p.from === 'e');
    if (first.length) { setCap(phaseCap(first), first.every(p => p.to === 'e') ? 'bad' : ''); await Promise.all(first.map(p => flight(p, id, dur))); if (id !== seqId) return; }
    if (second.length) { setCap(phaseCap(second), 'bad'); await Promise.all(second.map(p => flight(p, id, dur))); if (id !== seqId) return; }
    setCap('');
  })();
}

/* ---------- Controls ---------- */
function stopTimer() { clearTimeout(S.timer); S.timer = null; }
function pause() { S.playing = false; stopTimer(); if ($('#t-play')) $('#t-play').textContent = S.step === S.scenes.length - 1 ? '↺ Replay' : '▶ Play'; }
function goto(i) { pause(); S.step = Math.max(0, Math.min(S.scenes.length - 1, i)); render(); }
function tick() {
  if (!S.playing) return;
  if (S.step >= S.scenes.length - 1) { pause(); render(); return; }
  S.step++;
  const sc = S.scenes[S.step];
  if (S.step >= S.scenes.length - 1 || (S.practice && sc.ask && !isSolved(S.step))) { S.playing = false; stopTimer(); }
  render();
  if (!S.playing) return;
  S.timer = setTimeout(tick, Number($('#speed').value));
}
function play() {
  if (S.playing) { pause(); render(); return; }
  if (S.step >= S.scenes.length - 1) S.step = 0;
  S.playing = true; render();
  S.timer = setTimeout(tick, Number($('#speed').value));
}
function setMode(mode) {
  pause(); S.mode = mode; S.step = 0;
  S.scenes = buildScenes(S.v, mode);
  clearMsg(); render();
}
function refresh() {
  const bar = $('.params');
  try {
    S.v = compute();
    bar.classList.remove('is-bad'); $('#param-error').textContent = '';
    pause(); S.solved.clear(); S.reached.clear(); S.scenes = buildScenes(S.v, S.mode);
    S.step = Math.min(S.step, S.scenes.length - 1);
    clearMsg(); render();
  } catch (err) {
    bar.classList.add('is-bad'); $('#param-error').textContent = err.message;
  }
}

$('#dots').addEventListener('click', e => { const d = e.target.closest('[data-go]'); if (d) goto(Number(d.dataset.go)); });
$('#t-first').addEventListener('click', () => goto(0));
$('#t-prev').addEventListener('click', () => goto(S.step - 1));
$('#t-next').addEventListener('click', () => goto(S.step + 1));
$('#t-play').addEventListener('click', play);
$('#speed').addEventListener('change', () => { if (S.playing) { stopTimer(); S.timer = setTimeout(tick, Number($('#speed').value)); } });
$$('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('#practice').addEventListener('change', e => { S.practice = e.target.checked; pause(); render(); });
['p', 'g', 'a', 'b', 'e'].forEach(k => $('#in-' + k).addEventListener('input', refresh));
$('#btn-example').addEventListener('click', () => { [['p', 23], ['g', 5], ['a', 6], ['b', 15], ['e', 7]].forEach(([k, val]) => $('#in-' + k).value = val); refresh(); });
$$('[data-tab]').forEach(b => b.addEventListener('click', () => {
  S.tab = b.dataset.tab;
  $$('[data-tab]').forEach(x => x.classList.toggle('is-on', x === b));
  $('#pane-steps').hidden = S.tab !== 'steps';
  $('#pane-msg').hidden = S.tab !== 'msg';
}));
document.addEventListener('keydown', e => {
  if (!$('#sim').classList.contains('is-on') || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); goto(S.step + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); goto(S.step - 1); }
});

/* ---------- Message lab (player-controlled) ---------- */
const MSG = { text: 'Meet me at 10 AM', edit: 'Meet me at 12 PM' };
let M = null, busy = false, autoRun = false;
const clean = t => t.replace(/[\u0000-\u001f\ufffd]/g, '▒');
const trunc = (t, n = 16) => t.length > n ? t.slice(0, n - 1) + '…' : t;
const hex = c => `<code>${c.length > 30 ? c.slice(0, 30) + '…' : c}</code>`;
const ct = c => '🔒 ' + c.slice(0, 8);
const keysFor = () => S.mode === 'attack' ? { a: S.v.key1, b: S.v.key2, e1: S.v.key1, e2: S.v.key2 } : { a: S.v.key, b: S.v.key };

function clearMsg() { M = null; busy = false; autoRun = false; S.msgCancel = null; renderMsgLab(); }
function startSession(text) { M = { phase: 'encrypted', m: text, c1: null, cb: null, seen: null, wrong: null, sent: null, kind: null, got: null, dropped: false, chip: null }; }

function renderMsgLab() {
  const box = $('#pane-msg');
  if (!box || !S.v) return;
  const mode = S.mode, atk = mode === 'attack', last = S.scenes.length - 1;
  if (mode === 'signed') {
    box.innerHTML = `<h2>Message lab</h2><div class="result-line is-ok">No session key exists in this mode: Alice and Bob rejected Eve's forged value, so the handshake aborted. Eve has nothing to read or alter.</div><p class="note">Switch to <b>Without MITM</b> or <b>With MITM</b>, finish the exchange, and send a message.</p>`;
    return;
  }
  if (!S.reached.has(mode)) {
    box.innerHTML = `<h2>Message lab</h2><div class="lockbox"><div class="lock-ico">🔒</div><b>Finish the key exchange first</b><p>The message lab uses the keys from your run. You're on step ${S.step + 1} of ${last + 1}.</p><button class="btn btn-primary" id="msg-skip">Skip to the final step</button></div>`;
    $('#msg-skip').addEventListener('click', () => goto(last));
    return;
  }

  const k = keysFor(), ph = M ? M.phase : 'compose', dis = busy ? 'disabled' : '';
  const turn = !M || ph === 'compose' || ph === 'encrypted' ? 'a' : ph === 'ateve' ? 'e' : ph === 'atbob' ? 'b' : 'x';
  const order = atk ? ['a', 'e', 'b'] : ['a', 'b'];
  const st = who => turn === 'x' ? 'is-done' : who === turn ? 'is-active' : order.indexOf(who) < order.indexOf(turn) ? 'is-done' : 'is-wait';
  const actor = (who, name, keyTxt, body) => `<section class="actor a-${who} ${st(who)}"><header><span class="avatar" style="--c:var(--${{ a: 'alice', b: 'bob', e: 'eve' }[who]})">${name[0]}</span><b>${name}</b><span class="akey">${keyTxt}</span></header>${body}</section>`;

  // Alice
  let aBody;
  if (!M) aBody = `<label class="fld"><span>Message</span><input id="mi-text" type="text" maxlength="60" value="${esc(MSG.text)}" ${dis}></label>
      <button class="btn btn-primary btn-block" data-act="encrypt" ${dis}>Encrypt with my key</button>`;
  else aBody = `<div class="kv"><span>Plaintext</span><b>“${esc(M.m)}”</b></div><div class="kv"><span>Ciphertext</span>${hex(M.c1)}</div>` +
    (ph === 'encrypted' ? `<button class="btn btn-primary btn-block" data-act="send" ${dis}>Send →</button>` : '');
  // Eve
  let eBody = '';
  if (atk) {
    if (!M || ph === 'encrypted') eBody = '<p class="idle">Waiting for traffic…</p>';
    else {
      eBody = `<div class="kv"><span>Holds</span>${hex(M.c1)}</div>`;
      if (M.seen !== null) eBody += `<div class="kv"><span>Key1 reads</span><b class="bad">“${esc(M.seen)}”</b></div>`;
      if (M.wrong !== null) eBody += `<div class="kv"><span>Key2 gives</span><b class="mute">${esc(M.wrong)}</b></div>`;
      if (ph === 'ateve') eBody += `<div class="btns"><button class="btn btn-sm" data-act="read" ${dis}>Read (key1)</button><button class="btn btn-sm" data-act="wrong" ${dis}>Try key2</button></div>
        <label class="fld"><span>Replacement text</span><input id="mi-edit" type="text" maxlength="60" value="${esc(MSG.edit)}" ${dis}></label>
        <div class="btns"><button class="btn btn-sm btn-primary" data-act="fwd-edit" ${dis}>Forward edited</button><button class="btn btn-sm" data-act="fwd-raw" ${dis}>Forward raw</button><button class="btn btn-sm btn-danger" data-act="drop" ${dis}>Drop</button></div>`;
      else if (M.dropped) eBody += '<div class="kv"><span>Action</span><b class="bad">Dropped the message</b></div>';
      else eBody += `<div class="kv"><span>Action</span><b class="bad">${M.kind === 'raw' ? 'Forwarded unchanged ciphertext' : `Re-encrypted “${esc(M.sent)}” with key2`}</b></div>`;
    }
  }
  // Bob
  let bBody;
  if (!M || ph === 'compose' || ph === 'encrypted' || ph === 'ateve') bBody = '<p class="idle">Waiting for a message…</p>';
  else if (ph === 'atbob') bBody = `<div class="kv"><span>Received</span>${hex(M.cb)}</div><button class="btn btn-primary btn-block" data-act="decrypt" ${dis}>Decrypt with my key</button>`;
  else bBody = M.dropped ? '<p class="idle">Nothing ever arrived.</p>' : `<div class="kv"><span>Received</span>${hex(M.cb)}</div><div class="kv"><span>Decrypts to</span><b class="${M.got === M.m ? 'ok' : 'bad'}">“${esc(M.got)}”</b></div>`;

  const result = M && ph === 'done' ? resultHTML() : '';
  box.innerHTML = `<div class="lab-head"><h2>Message lab</h2><div class="lab-tools"><button class="btn btn-sm" data-act="auto" ${busy ? 'disabled' : ''}>▶ Auto-play</button><button class="btn btn-sm" data-act="reset" ${busy ? 'disabled' : ''}>New message</button></div></div>
    <p class="note">${M ? 'Play each side in turn.' : 'Type a message and play each side in turn — or press Auto-play.'}</p>
    <div class="actors">${actor('a', 'Alice', 'key ' + k.a.slice(0, 6), aBody)}${atk ? actor('e', 'Eve', `keys ${k.e1.slice(0, 4)} · ${k.e2.slice(0, 4)}`, eBody) : ''}${actor('b', 'Bob', 'key ' + k.b.slice(0, 6), bBody)}</div>${result}`;
}

function resultHTML() {
  const atk = S.mode === 'attack', ok = !atk && M.got === M.m;
  if (M.dropped) return `<div class="result-line is-bad">Bob never received the message. By dropping traffic Eve attacks <b>availability</b>.</div>`;
  const cmp = `<div class="compare ${M.got === M.m ? 'is-ok' : 'is-bad'}"><div><b>Alice sent</b><strong>${esc(M.m)}</strong></div><div><b>Bob received</b><strong>${esc(M.got)}</strong></div></div>`;
  let msg;
  if (!atk) msg = 'Delivered intact. An eavesdropper would only have seen ciphertext.';
  else if (M.kind === 'raw') msg = 'Bob used key2 on ciphertext made with key1, so he gets garbage. Alice and Bob never shared a key — Eve had to decrypt and re-encrypt to stay hidden.';
  else if (M.got !== M.m) msg = 'Message altered in transit. Confidentiality (Eve read it) and integrity (Eve changed it) are both broken.';
  else msg = 'Unchanged, but Eve could read it. Confidentiality is broken.';
  return cmp + `<div class="result-line ${ok ? 'is-ok' : 'is-bad'}">${msg}</div>`;
}

async function act(name) {
  if (busy && name !== 'reset') return;
  const atk = S.mode === 'attack', k = keysFor(), sc = speedK(), lane = LANE.top + '%', px = key => POS[key] + '%';
  const id = seqId, alive = () => id === seqId;
  const hook = () => { S.msgCancel = () => { M = null; busy = false; autoRun = false; renderMsgLab(); }; };
  const done = () => { busy = false; renderMsgLab(); };

  if (name === 'reset') { cancelAnim(); M = null; busy = false; renderMsgLab(); return; }

  if (name === 'encrypt') {
    const el = $('#mi-text'), t = (el ? el.value : MSG.text).trim();
    if (!t) { el && el.focus(); return; }
    MSG.text = t; cancelAnim(); const id2 = seqId;
    startSession(t); M.c1 = encrypt(t, k.a); hook(); busy = true;
    M.chip = makeChip('“' + trunc(t) + '”', 'a', px('a'), lane);
    pulse('a'); setCap('Alice encrypts with her key'); renderMsgLab();
    await wait(650 * sc); if (id2 !== seqId) return;
    restyle(M.chip, ct(M.c1), 'c'); await wait(350 * sc); if (id2 !== seqId) return;
    setCap(''); return done();
  }
  if (!M) return;

  if (name === 'send') {
    busy = true; renderMsgLab();
    if (!atk) {
      setCap('In transit — an eavesdropper sees only ciphertext');
      await move(M.chip, { left: px('b'), top: lane }, 1600 * sc); if (!alive()) return;
      pulse('b'); M.cb = M.c1; M.phase = 'atbob';
    } else {
      setCap('In transit — ciphertext only…', 'bad');
      await move(M.chip, { left: px('e'), top: lane }, 1200 * sc); if (!alive()) return;
      await move(M.chip, { left: px('e'), top: EVE_TOP }, 420 * sc); if (!alive()) return;
      tapHit(); pulse('e'); M.phase = 'ateve';
    }
    setCap(''); return done();
  }
  if (name === 'read') {
    M.seen = decrypt(M.c1, k.e1); restyle(M.chip, '“' + trunc(M.seen) + '”', 'e'); pulse('e');
    setCap('Eve decrypts with key1 and reads it', 'bad'); setTimeout(() => alive() && setCap(''), 1800); return done();
  }
  if (name === 'wrong') { M.wrong = clean(decrypt(M.c1, k.e2)); return done(); }
  if (name === 'drop') {
    busy = true; M.dropped = true; M.phase = 'done'; renderMsgLab();
    setCap('Eve drops the message', 'bad'); pulse('e'); await fade(M.chip); M.chip = null;
    await wait(300); if (!alive()) return; setCap(''); S.msgCancel = null; return done();
  }
  if (name === 'fwd-edit' || name === 'fwd-raw') {
    const raw = name === 'fwd-raw';
    const el = $('#mi-edit'), t = (el ? el.value : MSG.edit).trim();
    if (!raw && !t) { el && el.focus(); return; }
    if (!raw) MSG.edit = t;
    busy = true; M.kind = raw ? 'raw' : 'edit'; M.sent = raw ? null : t; M.cb = raw ? M.c1 : encrypt(t, k.e2); renderMsgLab();
    if (!raw) { setCap('Eve rewrites and re-encrypts with key2', 'bad'); M.chip.textContent = '“' + trunc(t) + '”'; await wait(700 * sc); if (!alive()) return; }
    restyle(M.chip, ct(M.cb), raw ? 'c' : 'e'); await wait(400 * sc); if (!alive()) return;
    await move(M.chip, { left: px('e'), top: lane }, 420 * sc); if (!alive()) return;
    setCap(raw ? 'Forwarded unchanged' : 'Forwarded to Bob — looks perfectly valid', 'bad');
    await move(M.chip, { left: px('b'), top: lane }, 1200 * sc); if (!alive()) return;
    pulse('b'); M.phase = 'atbob'; setCap(''); return done();
  }
  if (name === 'decrypt') {
    busy = true; renderMsgLab();
    M.got = clean(decrypt(M.cb, k.b)); setCap('Bob decrypts with his key');
    restyle(M.chip, '“' + trunc(M.got) + '”', M.got === M.m ? 'b' : 'e'); pulse('b');
    await wait(1000 * sc); if (!alive()) return;
    M.phase = 'done'; setCap(''); S.msgCancel = null; await fade(M.chip); M.chip = null; return done();
  }
}

async function autoPlay() {
  if (busy || autoRun) return;
  autoRun = true; const atk = S.mode === 'attack';
  if (M) await act('reset');
  const step = async (n) => { if (!autoRun) return false; await act(n); await wait(450); return autoRun; };
  try {
    if (!(await step('encrypt'))) return;
    if (!(await step('send'))) return;
    if (atk) { if (!(await step('read'))) return; if (!(await step('fwd-edit'))) return; }
    await step('decrypt');
  } finally { autoRun = false; }
}

$('#pane-msg').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  b.dataset.act === 'auto' ? autoPlay() : act(b.dataset.act);
});
$('#pane-msg').addEventListener('input', e => {
  if (e.target.id === 'mi-text') MSG.text = e.target.value;
  if (e.target.id === 'mi-edit') MSG.edit = e.target.value;
});
$('#pane-msg').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'mi-text') act('encrypt');
});

/* =====================================================================
   Quiz
   ===================================================================== */
const QUIZ = [
  { q: 'What is the primary purpose of Diffie–Hellman key agreement?', o: ['Encrypt every packet directly', 'Establish a common shared secret', 'Generate digital certificates', 'Block network traffic'], a: 1, e: 'Diffie–Hellman enables two parties to independently establish a shared secret. A session key can then be derived using a KDF.' },
  { q: 'Which information must remain confidential during a normal exchange?', o: ['Prime modulus p', 'Generator g', 'Private exponent', 'Public value'], a: 2, e: 'Private exponents must not be transmitted. The public parameters and public values may be exchanged openly.' },
  { q: 'What does Eve exploit in an unauthenticated Diffie–Hellman exchange?', o: ['The absence of peer authentication', 'The fact that p is prime', 'The use of modular exponentiation', 'The presence of a generator'], a: 0, e: 'Without authentication, the receiver cannot reliably establish that a received public value came from the intended peer.' },
  { q: 'During a MITM attack, what does Eve substitute?', o: ['The private exponents stored on both devices', 'The exchanged public values', 'The mathematical modulus after calculation', 'The entire operating system'], a: 1, e: 'Eve intercepts public values in transit and replaces them with Eve’s own public value.' },
  { q: 'How many private exponents does Eve use in this virtual-lab demonstration?', o: ['Zero', 'One', 'Two', 'Four'], a: 1, e: 'This demonstration uses one Eve private exponent e to generate one substituted public value E. Other MITM implementations may use different exponents for each side.' },
  { q: 'For p = 23, g = 5 and Alice’s private exponent a = 6, what is Alice’s public value?', o: ['6', '12', '8', '19'], a: 2, e: 'A = g^a mod p = 5^6 mod 23 = 15625 mod 23 = 8.' },
  { q: 'For p = 23, g = 5 and Eve’s private exponent e = 7, what is Eve’s public value?', o: ['17', '7', '15', '2'], a: 0, e: 'E = g^e mod p = 5^7 mod 23 = 78125 mod 23 = 17.' },
  { q: 'With p = 23, Eve’s E = 17 and Alice’s a = 6, what shared secret does Alice compute?', o: ['2', '19', '15', '12'], a: 3, e: 'K1 = E^a mod p = 17^6 mod 23 = 12. Eve computes the same result using A^e mod p.' },
  { q: 'Which CIA properties are primarily compromised when Eve reads and alters messages?', o: ['Availability only', 'Confidentiality and integrity', 'Availability and scalability', 'Integrity and performance'], a: 1, e: 'Reading intercepted content threatens confidentiality; modifying it threatens integrity. Availability is affected if Eve blocks or disrupts communication.' },
  { q: 'Which measure best prevents public-value substitution in Diffie–Hellman?', o: ['Using smaller prime numbers', 'Sending private exponents openly', 'Disabling all key derivation', 'Authenticating the key exchange with verified signatures or equivalent mechanisms'], a: 3, e: 'Authenticated key exchange verifies the identity or authenticity of the peer and binds that identity to the exchanged values.' }
];
const Q = { i: 0, score: 0, sel: null, done: false, res: [] };

function renderQuiz() {
  const box = $('#quizBox');
  if (Q.i >= QUIZ.length) {
    const pct = Math.round(Q.score / QUIZ.length * 100);
    box.innerHTML = `<div class="score"><div class="score-ring" style="--p:${pct}"><span>${Q.score}/${QUIZ.length}</span></div>
      <h2>${pct >= 80 ? 'Excellent work' : pct >= 50 ? 'Good effort' : 'Keep practising'}</h2>
      <p>You scored ${pct}%. ${pct >= 80 ? 'You have a solid grasp of the MITM attack on Diffie–Hellman.' : 'Revisit the theory and run the simulation again, then retry.'}</p>
      <div class="btn-row" style="justify-content:center"><button class="btn btn-primary" id="q-retry">Retry quiz</button><button class="btn" data-nav="theory">Review theory</button></div></div>`;
    $('#q-retry').addEventListener('click', () => { Object.assign(Q, { i: 0, score: 0, sel: null, done: false, res: [] }); renderQuiz(); });
    return;
  }
  const q = QUIZ[Q.i];
  box.innerHTML = `
    <div class="q-top"><span>Question ${Q.i + 1} of ${QUIZ.length}</span><span>Score ${Q.score}</span></div>
    <div class="q-bar">${QUIZ.map((_, k) => `<i class="${Q.res[k] === true ? 'ok' : Q.res[k] === false ? 'no' : k === Q.i ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="q-text">${esc(q.q)}</div>
    <div id="q-opts">${q.o.map((o, j) => `<button class="opt" data-j="${j}"><span class="opt-l">${'ABCD'[j]}</span><span>${esc(o)}</span></button>`).join('')}</div>
    <div id="q-fb"></div><div class="q-hint" id="q-hint"></div>
    <div class="q-actions"><button class="btn btn-primary" id="q-submit">Check answer</button></div>`;
  Q.sel = null; Q.done = false;
  $$('.opt', box).forEach(b => b.addEventListener('click', () => {
    if (Q.done) return;
    Q.sel = Number(b.dataset.j);
    $$('.opt', box).forEach(x => x.classList.toggle('is-sel', x === b));
    $('#q-hint').textContent = '';
  }));
  $('#q-submit').addEventListener('click', submitQuiz);
}

function submitQuiz() {
  const q = QUIZ[Q.i];
  if (Q.done) { Q.i++; renderQuiz(); return; }
  if (Q.sel === null) { $('#q-hint').textContent = 'Pick an option first.'; return; }
  Q.done = true;
  const ok = Q.sel === q.a;
  if (ok) Q.score++;
  Q.res[Q.i] = ok;
  $$('#q-opts .opt').forEach((b, j) => { b.disabled = true; b.classList.remove('is-sel'); if (j === q.a) b.classList.add('is-right'); else if (j === Q.sel) b.classList.add('is-wrong'); });
  $('#q-fb').innerHTML = `<div class="q-fb ${ok ? 'is-ok' : 'is-bad'}"><b>${ok ? '✓ Correct' : '✕ Not quite'}</b>${ok ? '' : `Correct answer: ${'ABCD'[q.a]} — ${esc(q.o[q.a])}. `}${esc(q.e)}</div>`;
  $$('.q-bar i')[Q.i].className = ok ? 'ok' : 'no';
  $('.q-top span:last-child').textContent = 'Score ' + Q.score;
  $('#q-submit').textContent = Q.i === QUIZ.length - 1 ? 'See results →' : 'Next question →';
}

/* =====================================================================
   Init
   ===================================================================== */
drawTheory('normal');
renderQuiz();
S.v = compute();
S.scenes = buildScenes(S.v, 'normal');
navigate(location.hash.slice(1) || 'aim', false);
window.addEventListener('load', () => { $('#main').scrollTop = 0; window.scrollTo(0, 0); });
