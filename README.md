# MITM on Diffie–Hellman — Virtual Lab

Interactive virtual lab (HTML/CSS/JS, no build step). Open `index.html` in a browser.
Needs internet only for the Hanken Grotesk web font.

Sections: Aim & Objectives · Theory · Experimental Steps · Interactive Simulation · Quiz · References.

Simulation: edit p, g, a, b, e live; step/play through the normal exchange or the MITM attack;
the Message lab shows ciphertext at each hop (toy SHA-256 stream cipher, demo only).

Default case: p=23, g=5, a=6, b=15, e=7 → A=8, B=19, E=17; K=2 (normal); K1=12, K2=15 (MITM).
