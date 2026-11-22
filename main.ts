// tiny-vm: exact interpreter for make.fun's tiny stack ISA v1. Stdlib
// only, deterministic. MAKEFUN_VM_STATS=1 prints stats.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const STATS = process.env.MAKEFUN_VM_STATS === '1';
const VALID = new Set([0, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 34, 52, 64, 65, 80, 81, 82, 83]);

function runVM(prog: Uint8Array, input: Uint8Array) {
  const n = prog.length;
  const st = new Int32Array(256);
  let sp = 0;
  const cs = new Int32Array(64);
  let cp = 0;
  const mem = new Int32Array(256);
  const out = new Uint8Array(65536);
  let ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (e: number) => ({ out: out.slice(0, ol), exit: e, steps });
  for (;;) {
    if (steps >= 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const b = prog[pc];
    let il = 0;
    if (b === 1) il = 1;
    else if (b === 2) il = 4;
    else if (b >= 48 && b <= 51) il = 2;
    else if (!VALID.has(b)) return done(5);
    if (pc + il >= n) return done(9);
    steps++;
    const nx = pc + 1 + il;
    pc = nx;
    switch (b) {
      case 0x00: return done(0);
      case 0x01:
        if (sp === 256) return done(3);
        { const v = prog[nx - 1]; st[sp++] = v < 128 ? v : v - 256; }
        break;
      case 0x02:
        if (sp === 256) return done(3);
        st[sp++] = prog[nx - 4] | (prog[nx - 3] << 8) | (prog[nx - 2] << 16) | (prog[nx - 1] << 24);
        break;
      case 0x03:
        if (sp < 1) return done(2);
        sp--;
        break;
      case 0x04:
        if (sp < 1) return done(2);
        if (sp === 256) return done(3);
        st[sp] = st[sp - 1]; sp++;
        break;
      case 0x05:
        if (sp < 2) return done(2);
        { const t = st[sp - 1]; st[sp - 1] = st[sp - 2]; st[sp - 2] = t; }
        break;
      case 0x06:
        if (sp < 2) return done(2);
        if (sp === 256) return done(3);
        st[sp] = st[sp - 2]; sp++;
        break;
      case 0x07:
        if (sp < 3) return done(2);
        { const a = st[sp - 3]; st[sp - 3] = st[sp - 2]; st[sp - 2] = st[sp - 1]; st[sp - 1] = a; }
        break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        if (sp < 2) return done(2);
        const y = st[sp - 1], x = st[sp - 2];
        let r = 0;
        if (b === 0x10) r = (x + y) | 0;
        else if (b === 0x11) r = (x - y) | 0;
        else if (b === 0x12) r = Math.imul(x, y);
        else if (b === 0x13) { if (y === 0) return done(4); r = (x === -2147483648 && y === -1) ? x : (x / y) | 0; }
        else if (b === 0x14) { if (y === 0) return done(4); r = y === -1 ? 0 : (x % y) | 0; }
        else if (b === 0x15) { if (y === 0) return done(4); r = Math.floor((x >>> 0) / (y >>> 0)) | 0; }
        else if (b === 0x16) { if (y === 0) return done(4); r = ((x >>> 0) % (y >>> 0)) | 0; }
        else if (b === 0x18) r = x & y;
        else if (b === 0x19) r = x | y;
        else if (b === 0x1a) r = x ^ y;
        else if (b === 0x1c) r = x << (y & 31);
        else if (b === 0x1d) r = x >> (y & 31);
        else if (b === 0x1e) r = (x >>> (y & 31)) | 0;
        else if (b === 0x20) r = x === y ? 1 : 0;
        else if (b === 0x21) r = x < y ? 1 : 0;
        else r = (x >>> 0) < (y >>> 0) ? 1 : 0;
        sp -= 2; st[sp++] = r;
        break;
      }
      case 0x17:
        if (sp < 1) return done(2);
        st[sp - 1] = (-st[sp - 1]) | 0;
        break;
      case 0x1b:
        if (sp < 1) return done(2);
        st[sp - 1] = ~st[sp - 1];
        break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((prog[nx - 2] | (prog[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (b !== 0x30) {
          if (sp < 1) return done(2);
          const v = st[--sp];
          take = b === 0x31 ? v === 0 : v !== 0;
        }
        if (take) pc = nx + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return done(7);
        cs[cp++] = nx;
        pc = prog[nx - 2] | (prog[nx - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return done(8);
        pc = cs[--cp];
        break;
      case 0x40: {
        if (sp < 1) return done(2);
        const a = st[sp - 1];
        if (a < 0 || a > 255) return done(6);
        st[sp - 1] = mem[a];
        break;
      }
      case 0x41: {
        if (sp < 2) return done(2);
        const a = st[sp - 1], v = st[sp - 2];
        if (a < 0 || a > 255) return done(6);
        sp -= 2;
        mem[a] = v;
        break;
      }
      case 0x50: {
        if (sp < 1) return done(2);
        const s = String(st[sp - 1]);
        if (ol + s.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 0x51:
        if (sp < 1) return done(2);
        if (ol + 1 > 65536) return done(11);
        out[ol++] = st[--sp] & 255;
        break;
      case 0x52:
        if (sp === 256) return done(3);
        st[sp++] = ip < input.length ? input[ip++] : -1;
        break;
      case 0x53:
        if (sp < 1) return done(2);
        return done(st[--sp] & 255);
    }
  }
}

for (const id of readdirSync(IN_DIR).sort()) {
  const dir = join(IN_DIR, id);
  const progPath = join(dir, 'program.bin');
  if (!existsSync(progPath)) continue;
  const prog = readFileSync(progPath);
  const input = readFileSync(join(dir, 'input.bin'));
  const r = runVM(prog, input);
  const od = join(OUT_DIR, id);
  mkdirSync(od, { recursive: true });
  writeFileSync(join(od, 'stdout.bin'), r.out);
  writeFileSync(join(od, 'exit.txt'), String(r.exit) + '\n');
  if (STATS) process.stderr.write(JSON.stringify({ id, steps: r.steps, exit: r.exit, bytes: r.out.length }) + '\n');
}
