[![tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/bagusmcad/tiny-stack-vm/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/bagusmcad/tiny-stack-vm/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

# tiny-vm: exact stack VM

`main.ts` (Node 22, stdlib only) runs ISA v1 programs, writing `stdout.bin` + `exit.txt`: wrapping arithmetic, 10 traps, step/output limits. `MAKEFUN_VM_STATS=1` prints stats.

## Validation and limitations

- Practice (40): 1,000,000/1,000,000; baseline plain-vm 1.0.0: 670,000; two runs byte-identical.
- 400 random programs match the reference VM byte-for-byte; 19 edge cases pass (DIV INT_MIN/-1, DIVU, SHRU, traps 2-11).
- Scored set drawn after deadline; practice no guarantee.
