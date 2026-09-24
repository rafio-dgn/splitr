# `REQ-D.2`: one piece of hot state in KV, each group's recent descriptions

**Date:** 2026-09-24 · **Namespace:** `splitr-hot` (`24a62358…`), bound as `KV` · **Deployed version:** `4aa6e8ec`
**Decision:** [ADR-0019](../decisions/0019-kv-holds-recent-descriptions-not-balances.md). The planned balance snapshot was dropped

---

## The criteria

| Criterion | Met by |
|---|---|
| Exactly one such value lives in KV | One key per group, `recent-descriptions:v1:<groupId>`. Nothing else in Splitr touches KV |
| Genuinely rebuildable if lost | Shown below: the key was deleted by hand and rebuilt identically on the next view |
| Not primary data | Derived from `expense.description` in D1, and never written anywhere else |
| Justified: why KV rather than D1 | Read on every add-expense view, worthless if it's slow, and **harmless if stale**. A stale list is a missing suggestion, never a wrong number. That's why it's this and not the balance: a stale *balance* is the correctness bug the requirement's own note rules out |

## Proof, on local D1 and KV

```
1) first view:  Round 5 · Round 4 · Round 3 · Round 2 · Round 1 · Dinner · Tesco big shop
   KV now holds: ["Round 5","Round 4","Round 3","Round 2","Round 1","Dinner","Tesco big shop"]
2) second view: (the same list)
3) delete the key by hand (simulating loss)
   KV holds: Value not found
   view again:  (the same list, rebuilt from D1)
4) Bob adds 'Pizza night' → 201
   KV holds: Value not found          ← the write dropped the key
   view again:  Pizza night · Round 5 · … · Tesco big shop
```

The server's own log for those four views:

```
[cache] recent-descriptions miss grp_… rebuilt=7
[cache] recent-descriptions hit grp_…
[cache] recent-descriptions miss grp_… rebuilt=7
[cache] recent-descriptions miss grp_… rebuilt=8
```

## Proof, on production

The two-browser E2E ran against the live site (12/12 steps). After Bob opened
the add-expense page, the **production** KV key held:

```
["Tesco big shop"]
```

That matters because the KV `put` runs in `ctx.waitUntil`, **after the
response has been sent**. Seeing the value in production shows the runtime
really does finish that work once the page is gone. That's `REQ-C.5` Q3 in
practice: without `waitUntil`, the put could be cut off and the cache would
never be warm. The test group's rows and its KV key were deleted afterwards.
Production has 0 rows and 0 KV keys.

## Failure behaviour, by design

- **A KV read error** is logged (`kv-error`), and the page is served from D1.
- **A KV write or delete error** is logged (`put-failed` / `delete-failed`),
  after the response. The expense has already been saved.
- **A value that doesn't match the stored shape** (a zod check) counts as a
  miss, not as data.
