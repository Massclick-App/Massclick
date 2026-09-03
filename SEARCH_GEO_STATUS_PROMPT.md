# Status-check prompt

Paste everything below the line into a fresh session. It produces a finished/remaining
report and nothing else — it makes no writes.

---

I want a status report on the MassClick search geo work. **Read-only. Do not write to the
database, do not edit files, do not commit.** If something needs a write, list it, don't do it.

Repo: `D:\dev_abishek\massclick`
Dev DB: `massClick_dev` via the `massclick-mongodb` SSH tunnel on `127.0.0.1:27019`.
Start it if it's down (it drops often, that's normal):

```bash
ssh -f -N -o ServerAliveInterval=30 massclick-mongodb
```

Connection string is `DEV_URI` in `D:\dev_abishek\db-backups\backup.js`. Port 27019, never 27018.
Never touch prod `massClick`.

## Do these five things, in order

**1. Read the tracker.** `SEARCH_GEO_PROGRESS.md` — status block, problem register, changelog.
`SEARCH_GEO_HANDOFF_PROMPT.md` has the open items and the known traps. Don't re-derive what
these already record; the point of this pass is to confirm they're still true, not to redo them.

**2. Run the audit.** Read-only, has no `--apply`:

```bash
node server/scripts/auditMasterLocationCoordinates.js --top=15
```

**3. Check the register against reality.** For every row in the register marked **done**, spot-check
that it still holds — the field exists, the script is there, the count matches. Flag anything that
says done but isn't. For every row marked **open**, say whether it is blocked on my decision, blocked
on data, or just not started.

**4. Check coverage per district**, active docs only. Use the real test, not the naive one:

```
coordinates.coordinates.0 exists AND coordinates.coordinates != [0,0]
```

The naive check counts Null Island as covered and lies for anything built before 2026-08-29.
Also report, per district, **how many of the location slugs that actually carry businesses still
lack a coordinate** — that number matters far more than the bulk locality percentage.

**5. Check git.** `git log --oneline -10` and `git status --short`. Say what is committed, what is
uncommitted, and whether anything uncommitted looks like it isn't mine. Note that `server/scripts/`
and `outputs/` are gitignored, so scripts and reports won't appear in `git status`.

## Give me back

**A. Done** — grouped as: data fills (which districts, what coverage), code changes (schema,
ranker, scripts), and tooling built. One line each, with the number that proves it.

**B. Remaining** — split into three, because they need different things from me:
- *needs my decision* (I have to answer before anything can happen)
- *needs work, no decision* (someone can just do it)
- *explicitly deferred* (I already said leave it — list these so they stop resurfacing)

**C. Anything that has rotted** since the tracker was last updated, or that the audit flags and the
tracker doesn't mention.

**D. The one thing you'd do next**, and why.

Keep it tight — a table or short bullets, not prose. If the tracker and the database disagree,
say so explicitly and trust the database.
