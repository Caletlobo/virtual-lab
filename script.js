'use strict';
const $ = id => document.getElementById(id);
const state = { mode: 'normal', step: 0, playing: false, timer: null, params: null, scenes: [], answered: false, quizIndex: 0, quizScore: 0, quizSelection: null };

function navigate(id) {
    document.querySelectorAll('.section').forEach(el => el.classList.toggle('active-section', el.id === id));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.toggle('active', el.dataset.section === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-section]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.section)));
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.go)));

function powmod(base, exp, mod) {
    let r = 1n;
    for (base %= mod; exp > 0n; exp >>= 1n, base = base * base % mod) {
        if (exp & 1n) r = r * base % mod;
    }
    return r;
}

function prime(n) {
    if (n < 2n) return false;
    for (let k = 2n; k * k <= n; k++) if (n % k === 0n) return false;
    return true;
}

// Simple deterministic hash simulation for KDF
async function simulatedKDF(secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret.toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

async function calc() {
    const values = ['prime', 'generator', 'alicePrivate', 'bobPrivate', 'evePrivate'].map(id => $(id).value.trim());
    if (values.some(v => !/^\d+$/.test(v))) throw Error('Enter a positive whole number in every field.');
    const [p, g, a, b, e] = values.map(BigInt);
    if (p > 100000n) throw Error('For this educational simulation, use a prime modulus no greater than 100000.');
    if (!prime(p)) throw Error('The modulus p must be a prime number.');
    if (g < 2n || g >= p) throw Error('The generator g must be between 2 and p − 1.');
    if ([a, b, e].some(x => x < 1n || x >= p || x > 30n)) throw Error('For this guided example, private exponents must be between 1 and min(p − 1, 30).');
    
    const A = powmod(g, a, p), B = powmod(g, b, p), E = powmod(g, e, p);
    const K = powmod(B, a, p), Kb = powmod(A, b, p);
    const K1 = powmod(E, a, p), K1e = powmod(A, e, p);
    const K2 = powmod(E, b, p), K2e = powmod(B, e, p);
    
    if (K !== Kb || K1 !== K1e || K2 !== K2e) throw Error('Internal key agreement check failed.');

    // Derive KDF session keys
    const KDF_K = await simulatedKDF(K);
    const KDF_K1 = await simulatedKDF(K1);
    const KDF_K2 = await simulatedKDF(K2);

    return { p, g, a, b, e, A, B, E, K, K1, K2, KDF_K, KDF_K1, KDF_K2 };
}

function buildScenes(v, mode) {
    const { p, g, a, b, e, A, B, E, K, K1, K2, KDF_K, KDF_K1, KDF_K2 } = v;
    const common = [
        { tag: 'PUBLIC PARAMETERS', title: 'Establishing public parameters', lines: [`Prime modulus (p) = ${p}`, `Generator (g) = ${g}`, `Alice's private exponent (a) = ${a}`, `Bob's private exponent (b) = ${b}`, `Eve's private exponent (e) = ${e}`], desc: 'Only p and g are public. Private exponents remain with their owners.', packet: '' },
        { tag: 'PUBLIC VALUE', title: "Alice's public-value calculation", lines: ['A = g^a mod p', `A = ${g}^${a} mod ${p}`, `A = ${g ** a} mod ${p}`, `A = ${A}`], desc: "Alice calculates her public value without revealing Alice's private exponent.", packet: `A = ${A}`, direction: 'right', mathStyle: 'normal' },
        { tag: 'PUBLIC VALUE', title: "Bob's public-value calculation", lines: ['B = g^b mod p', `B = ${g}^${b} mod ${p}`, `B = ${g ** b} mod ${p}`, `B = ${B}`], desc: "Bob independently calculates his public value using the same public parameters.", packet: `B = ${B}`, direction: 'left', mathStyle: 'normal' }
    ];

    if (mode === 'normal') return [
        ...common,
        { tag: 'NORMAL EXCHANGE', title: "Alice's shared-secret calculation", lines: ['K = B^a mod p', `K = ${B}^${a} mod ${p}`, `K = ${K}`], desc: "Alice receives Bob's public value directly and computes the shared secret.", packet: `B = ${B}`, direction: 'left', mathStyle: 'normal' },
        { tag: 'NORMAL EXCHANGE', title: "Bob's shared-secret calculation", lines: ['K = A^b mod p', `K = ${A}^${b} mod ${p}`, `K = ${K}`], desc: "Bob receives Alice's public value and independently obtains the same shared secret.", packet: `A = ${A}`, direction: 'right', mathStyle: 'normal' },
        { tag: 'KEY AGREEMENT', title: 'Matching shared secrets verified', lines: [`Alice's shared secret = ${K}`, `Bob's shared secret = ${K}`, `Both values match: K = ${K}`], desc: 'Both participants agree on one shared secret. Authentication is still required to verify peer identity.', packet: '', mathStyle: 'final' },
        { tag: 'SESSION KEY', title: 'Deriving session-key material', lines: [`Shared secret K = ${K}`, 'Session key = HKDF(SHA-256, shared_secret)', `Derived Key = ${KDF_K}...`], desc: 'A real protocol applies a specified KDF (like HKDF) to convert the shared secret into symmetric key material.', packet: '', mathStyle: 'violet' },
        { tag: 'RESULT', title: 'Normal communication established', lines: ['No public-value substitution occurred', `Shared secret = ${K}`, 'Messages can be protected using derived session keys'], desc: 'Now try sending a message, then switch to MITM mode to compare.', packet: '', mathStyle: 'final' }
    ];

    return [
        ...common,
        { tag: 'INTERCEPTION', title: "Eve's public-value substitution", lines: ['E = g^e mod p', `E = ${g}^${e} mod ${p}`, `E = ${g ** e} mod ${p}`, `E = ${E}`], desc: `Eve intercepts A = ${A} and B = ${B}, then sends E = ${E} to both participants.`, packet: `E = ${E}`, direction: 'intercept', mathStyle: 'attack' },
        { tag: 'ALICE ↔ EVE', title: "Alice's compromised shared secret", lines: ['K1 = E^a mod p', `K1 = ${E}^${a} mod ${p} = ${K1}`, `Eve: K1 = A^e mod p = ${A}^${e} mod ${p}`, `Both calculate K1 = ${K1}`], desc: "Alice believes the public value belongs to Bob, but establishes a shared secret with Eve.", packet: `K1 = ${K1}`, direction: 'left', mathStyle: 'attack' },
        { tag: 'EVE ↔ BOB', title: "Bob's compromised shared secret", lines: ['K2 = E^b mod p', `K2 = ${E}^${b} mod ${p} = ${K2}`, `Eve: K2 = B^e mod p = ${B}^${e} mod ${p}`, `Both calculate K2 = ${K2}`], desc: "Bob believes the substituted value belongs to Alice. Eve has the matching secret on Bob's side.", packet: `K2 = ${K2}`, direction: 'right', mathStyle: 'attack' },
        { tag: 'SESSION KEYS', title: 'Two separately keyed connections', lines: [`Alice ↔ Eve shared secret K1 = ${K1}`, `Eve ↔ Bob shared secret K2 = ${K2}`, `Session key 1 (HKDF) = ${KDF_K1}...`, `Session key 2 (HKDF) = ${KDF_K2}...`], desc: 'The attacker derives the appropriate session-key material for each connection. Different shared secrets produce different session keys.', packet: '', mathStyle: 'violet' },
        { tag: 'SECURITY RESULT', title: 'MITM key substitution demonstrated', lines: ['Alice and Bob have not authenticated each other', `Alice ↔ Eve: ${K1}`, `Eve ↔ Bob: ${K2}`, 'Confidentiality and integrity are at risk'], desc: 'Transmit a message below to visualize interception and modification.', packet: '', mathStyle: 'attack' }
    ];
}

function theory(mode) {
    document.querySelectorAll('[data-theory]').forEach(b => b.classList.toggle('active', b.dataset.theory === mode));
    const attack = mode === 'attack';
    $('theoryVisual').innerHTML = `<svg viewBox="0 0 650 200" role="img" aria-label="${attack ? 'Man-in-the-middle' : 'Normal'} key exchange diagram">
        <rect x="10" y="53" width="135" height="92" rx="14" fill="#eff6ff" stroke="#3b82f6"/>
        <rect x="505" y="53" width="135" height="92" rx="14" fill="#ecfdf5" stroke="#10b981"/>
        ${attack ? '<rect x="260" y="53" width="130" height="92" rx="14" fill="#fef2f2" stroke="#ef4444"/>' : ''}
        <g font-family="Arial" text-anchor="middle" fill="#0F2537">
            <text x="77" y="90" font-weight="bold" font-size="20">Alice</text>
            <text x="77" y="116" font-size="13">Public A = 8</text>
            <text x="572" y="90" font-weight="bold" font-size="20">Bob</text>
            <text x="572" y="116" font-size="13">Public B = 19</text>
            ${attack ? '<text x="325" y="90" font-weight="bold" font-size="20">Eve</text><text x="325" y="116" font-size="13">Substitutes E = 17</text>' : ''}
        </g>
        <g stroke="${attack ? '#ef4444' : '#3b82f6'}" stroke-width="3" fill="none">
            ${attack ? '<path d="M150 83 H254 M396 83 H499 M499 120 H396 M254 120 H150"/>' : '<path d="M151 83 H499 M499 120 H151"/>'}
        </g>
        <text x="325" y="175" text-anchor="middle" fill="#765647" font-size="15" font-weight="bold">${attack ? 'Separate shared secrets: 12 and 15' : 'Same shared secret: 2'}</text>
    </svg>
    <p>${attack ? 'Eve replaces both exchanged public values. Alice and Bob unknowingly establish separate shared secrets with Eve.' : 'Alice and Bob exchange their public values directly and independently compute the same shared secret. Private exponents are never transmitted.'}</p>`;
}

document.querySelectorAll('[data-theory]').forEach(b => b.addEventListener('click', () => theory(b.dataset.theory)));
theory('normal');

function stop() { state.playing = false; clearTimeout(state.timer); $('playPause').textContent = '▶ Play'; }

function packet(scene) {
    const packetWrapper = $('packetWrapper'), dot = $('packet'), label = $('packetLabel');
    label.textContent = scene.packet || '';
    if (!scene.packet) { packetWrapper.setAttribute('opacity', '0'); return; }
    packetWrapper.setAttribute('opacity', '1');
    dot.setAttribute('fill', scene.direction === 'intercept' ? '#EF4444' : '#3B82F6');
    const attack = state.mode === 'attack';
    const start = scene.direction === 'left' ? 548 : 112, end = scene.direction === 'left' ? 112 : 548;
    const mid = attack ? 330 : end;
    
    // Instead of moving 'cx', we move the entire group with CSS transform or SVG transform
    // Actually, Web Animations API on SVG elements works best with transforms.
    packetWrapper.animate([ 
        { transform: `translateX(${start}px)`, opacity: 0 }, 
        { transform: `translateX(${mid}px)`, opacity: 1 }, 
        { transform: `translateX(${end}px)`, opacity: 0 } 
    ], { duration: 1600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' })
    .onfinish = () => packetWrapper.setAttribute('opacity', '0');
}

function render() {
    const scene = state.scenes[state.step], total = state.scenes.length;
    if (!scene) return;
    
    const attack = state.mode === 'attack';
    $('statusPill').textContent = attack ? 'MITM ACTIVE' : 'DIRECT EXCHANGE';
    $('statusPill').className = 'status-pill' + (attack ? ' attack' : '');
    $('networkStage').className = 'network-stage ' + state.mode;
    $('networkCaption').textContent = attack ? 'Intercepted / substituted' : 'Direct public-value exchange';
    
    $('stepCount').textContent = String(state.step + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    $('mathTag').textContent = scene.tag;
    $('mathTitle').textContent = scene.title;
    
    $('mathLines').replaceChildren();
    scene.lines.forEach((line, i) => {
        const d = document.createElement('div');
        d.className = 'math-line';
        if (i === scene.lines.length - 1) {
            if (scene.mathStyle === 'final') d.classList.add('final');
            if (scene.mathStyle === 'attack') d.classList.add('attack');
            if (scene.mathStyle === 'violet') d.style.borderLeftColor = 'var(--violet)';
        }
        d.textContent = line;
        d.style.animationDelay = `${i * 125}ms`;
        $('mathLines').appendChild(d);
    });
    
    $('mathExplain').textContent = scene.desc;
    $('sceneNarration').textContent = scene.desc;
    $('progressFill').style.width = `${(state.step + 1) / total * 100}%`;
    $('timelineCount').textContent = `${state.step + 1} / ${total} events`;
    
    $('timelineEvents').replaceChildren();
    state.scenes.forEach((v, i) => {
        const d = document.createElement('div');
        d.className = 'timeline-item';
        if (i === state.step) d.classList.add('active');
        else if (i < state.step) d.classList.add('completed');
        const b = document.createElement('b');
        b.textContent = `${String(i + 1).padStart(2, '0')} · ${v.tag}`;
        d.append(b, document.createTextNode(v.title));
        $('timelineEvents').appendChild(d);
        if (i === state.step) {
            // Scroll to center active step
            setTimeout(() => {
                const container = $('timelineEvents');
                container.scrollLeft = d.offsetLeft - container.offsetWidth / 2 + d.offsetWidth / 2;
            }, 50);
        }
    });
    
    $('prevStep').disabled = state.step === 0;
    $('nextStep').disabled = state.step === total - 1;
    
    const v = state.params;
    const results = attack ? 
        [["Alice ↔ Eve shared secret", v.K1, `Session key: ${v.KDF_K1}`], ["Eve ↔ Bob shared secret", v.K2, `Session key: ${v.KDF_K2}`]] : 
        [["Alice's shared secret", v.K, `Session key: ${v.KDF_K}`], ["Bob's shared secret", v.K, "Matching session key derived"]];
        
    $('keyResults').innerHTML = results.map(r => `<div class="result-card ${attack ? 'danger' : 'success'}"><b>${r[0]}</b><strong>${r[1]}</strong><small>${r[2]}</small></div>`).join('');
    
    $('eveMessageWrap').classList.toggle('hidden', !attack);
    $('messageResult').textContent = 'Complete the key exchange and transmit a message to see the result.';
    packet(scene);
}

function move(delta) { stop(); state.step = Math.max(0, Math.min(state.scenes.length - 1, state.step + delta)); render(); }

function tick() {
    if (!state.playing) return;
    if (state.step >= state.scenes.length - 1) { stop(); return; }
    state.step++; render();
    state.timer = setTimeout(tick, Number($('speed').value));
}

function play() {
    if (state.playing) { stop(); return; }
    if (state.step === state.scenes.length - 1) state.step = 0;
    state.playing = true;
    $('playPause').textContent = 'Ⅱ Pause';
    render();
    state.timer = setTimeout(tick, Number($('speed').value));
}

async function start() {
    stop();
    try {
        state.params = await calc();
        state.scenes = buildScenes(state.params, state.mode);
        state.step = 0;
        $('errorMessage').textContent = '';
        $('dashboard').classList.remove('hidden');
        render();
        $('dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        $('errorMessage').textContent = err.message;
    }
}

async function modeChange(mode) {
    stop();
    state.mode = mode;
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (state.params) {
        state.scenes = buildScenes(state.params, mode);
        state.step = 0;
        render();
    }
}

$('startSimulation').addEventListener('click', start);
$('loadExample').addEventListener('click', () => {
    [['prime', 23], ['generator', 5], ['alicePrivate', 6], ['bobPrivate', 15], ['evePrivate', 7]].forEach(([id, v]) => $(id).value = v);
    $('errorMessage').textContent = '';
});
$('resetSimulation').addEventListener('click', () => { stop(); $('loadExample').click(); $('dashboard').classList.add('hidden'); state.params = null; state.step = 0; });
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => modeChange(b.dataset.mode)));
$('prevStep').addEventListener('click', () => move(-1));
$('nextStep').addEventListener('click', () => move(1));
$('playPause').addEventListener('click', play);
$('replay').addEventListener('click', () => { stop(); state.step = 0; render(); });

$('sendMessage').addEventListener('click', () => {
    const original = $('aliceMessage').value.trim(), modified = $('eveMessage').value.trim();
    if (!original || (state.mode === 'attack' && !modified)) { $('messageResult').textContent = 'Please enter both required messages.'; return; }
    const attack = state.mode === 'attack';
    $('messageResult').replaceChildren();
    
    const lines = attack ? [
        `Alice's original message: "${original}"`,
        `Eve intercepts and decrypts the message using Session Key 1.`,
        `Eve's forwarded message: "${modified}"`,
        `Bob's received message: "${modified}" (Decrypted with Session Key 2)`,
        `Integrity ${original === modified ? 'remains unchanged in this example, although interception occurred.' : 'is compromised because the delivered message differs.'}`
    ] : [
        `Alice's original message: "${original}"`,
        `The message is delivered directly and securely to Bob.`,
        `Bob's received message: "${original}" (Decrypted with Session Key)`
    ];
    
    lines.forEach((l) => {
        const p = document.createElement('div');
        p.textContent = l;
        p.style.marginBottom = '7px';
        $('messageResult').appendChild(p);
    });
});

const quiz = [
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

function renderQuiz() {
    const i = state.quizIndex, q = quiz[i];
    $('quizFeedback').replaceChildren();
    $('submitAnswer').classList.remove('hidden');
    $('nextQuestion').classList.add('hidden');
    $('retryQuiz').classList.add('hidden');
    $('quizProgressText').textContent = `Question ${i + 1} of ${quiz.length}`;
    $('quizScore').textContent = `Score: ${state.quizScore}`;
    $('quizProgress').style.width = `${i / quiz.length * 100}%`;
    state.quizSelection = null;
    state.answered = false;
    $('quizQuestion').replaceChildren();
    
    const h = document.createElement('h3');
    h.textContent = `Q${i + 1}. ${q.q}`;
    $('quizQuestion').appendChild(h);
    
    q.o.forEach((opt, j) => {
        const label = document.createElement('label');
        label.className = 'answer-option';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'quiz-answer'; input.value = j;
        input.addEventListener('change', () => {
            if (state.answered) return;
            state.quizSelection = j;
            document.querySelectorAll('.answer-option').forEach(x => x.classList.remove('selected'));
            label.classList.add('selected');
        });
        const letter = document.createElement('span');
        letter.className = 'answer-letter';
        letter.textContent = 'ABCD'[j];
        const desc = document.createElement('span');
        desc.textContent = opt;
        label.append(input, letter, desc);
        $('quizQuestion').appendChild(label);
    });
}

function submitQuiz() {
    if (state.answered) return;
    if (state.quizSelection === null) { $('quizFeedback').textContent = 'Please select an option before submitting.'; return; }
    
    state.answered = true;
    const q = quiz[state.quizIndex], correct = state.quizSelection === q.a;
    if (correct) state.quizScore++;
    
    document.querySelectorAll('.answer-option').forEach((el, j) => {
        el.querySelector('input').disabled = true;
        if (j === q.a) el.classList.add('correct');
        else if (j === state.quizSelection) el.classList.add('incorrect');
    });
    
    const box = document.createElement('div');
    box.className = 'feedback ' + (correct ? 'correct-feedback' : 'wrong-feedback');
    
    const h = document.createElement('h4');
    h.textContent = correct ? '✓ Correct Answer' : '✕ Incorrect Answer';
    
    const chosen = document.createElement('p');
    chosen.textContent = `Your answer: ${'ABCD'[state.quizSelection]} — ${q.o[state.quizSelection]}`;
    
    const right = document.createElement('p');
    right.textContent = `Correct option: ${'ABCD'[q.a]} — ${q.o[q.a]}`;
    
    const explanation = document.createElement('p');
    explanation.textContent = `Explanation: ${q.e}`;
    
    box.append(h, chosen, right, explanation);
    $('quizFeedback').replaceChildren(box);
    $('quizScore').textContent = `Score: ${state.quizScore}`;
    $('quizProgress').style.width = `${(state.quizIndex + 1) / quiz.length * 100}%`;
    $('submitAnswer').classList.add('hidden');
    $('nextQuestion').classList.remove('hidden');
    $('nextQuestion').textContent = state.quizIndex === quiz.length - 1 ? 'View Results →' : 'Next Question →';
}

function nextQuiz() {
    if (state.quizIndex < quiz.length - 1) { state.quizIndex++; renderQuiz(); return; }
    $('quizQuestion').innerHTML = `<h3>Assessment Complete</h3><p>You scored <strong>${state.quizScore} out of ${quiz.length}</strong> (${Math.round(state.quizScore / quiz.length * 100)}%).</p><p>Review the theory and try again to improve your understanding.</p>`;
    $('quizFeedback').replaceChildren();
    $('nextQuestion').classList.add('hidden');
    $('retryQuiz').classList.remove('hidden');
    $('quizProgressText').textContent = 'Completed';
}

$('submitAnswer').addEventListener('click', submitQuiz);
$('nextQuestion').addEventListener('click', nextQuiz);
$('retryQuiz').addEventListener('click', () => { state.quizIndex = 0; state.quizScore = 0; renderQuiz(); });
renderQuiz();
