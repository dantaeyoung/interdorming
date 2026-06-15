# Cloud Sync — Plain-Language Security Explainer

*For anyone, no technical background needed. This explains how the optional
online sync keeps the monastery's guest data safe.*

---

## The one big idea: a locked box only you can open

Think of your data as papers you put inside a **locked metal box**. Before
anything ever leaves your computer, it gets **locked inside that box using your
password as the only key.** The box — not the papers — is what travels to the
server.

The server is just **a shelf that holds the locked box.** It never has the key.
It cannot open the box. It cannot read the papers. It only knows "here's a locked
box, hand it back when asked."

This is called **end-to-end encryption**: the data is locked on *your* device and
only unlocked on *your* device. Everywhere in between, it's an unreadable box.

---

## Who owns our data?

**You do — completely.**

- The data lives **on your own computer first** (that never changes).
- The online copy lives on **your own server** (the one on your VPS), not a
  company like Google or Dropbox. No outside company holds it, mines it, or can
  change its terms on you.
- Even on your own server, it's stored as the **locked box** — so even someone
  who breaks into the server, or steals a backup, gets only gibberish.

There is no third party in the middle. It's your data, on your device and your
server, locked with your password.

---

## What kind of data can the server read?

**None of the actual content. Truly zero.**

The server only ever sees:
- The **locked box** (scrambled gibberish — guest names, ages, notes, all
  unreadable).
- A **version number** (like "this is the 14th save") so it can tell which copy
  is newest.
- A **timestamp** (when the last save happened).

It does **not** see guest names, ages, genders, notes, bed assignments, or your
password. If a hacker copied the entire server tonight, they'd get a pile of
locked boxes and no key — useless without your password.

> Small honest footnote: the server can see *how big* the box is and *how often*
> you save. That's it — never what's inside.

---

## What happens if the server goes down?

**Nothing bad. You keep working like normal.**

The complete, real copy of your data always lives **on your own computer** (in
the browser, exactly like today). The online sync is a *convenience layer on
top*, not the foundation.

If the server is down, unreachable, or you turn sync off:
- The app keeps working **exactly as it does now.**
- You can still add guests, assign beds, print — everything.
- A little indicator just shows "offline / not synced."
- When the server comes back, it picks up syncing again automatically.

**The server is never a single point of failure.** Losing it loses a
convenience, never your data.

---

## How long will this work for?

**Years, with very little upkeep — that was a deliberate design goal.**

We chose the boring, durable options on purpose:
- The data file on the server is a **single SQLite file** — the same simple,
  decades-proven format used in nearly every phone and browser on Earth. Easy to
  copy, easy to back up.
- The server program is a **single self-contained file** with almost nothing
  that can break or needs updating.
- The locking uses **standard, built-in browser encryption** — no exotic
  libraries that might be abandoned.

If you ever stopped running the server entirely, **your data still lives in the
app on your computer** and you'd lose nothing. So even the worst case ("we
abandon the server in 5 years") is safe.

---

## What happens if I lose my password?

**Be careful here — this is the one real trade-off.**

Because the box can *only* be opened with your password, and the server genuinely
never has a copy of it:

- **The online (locked-box) copy cannot be recovered** if the password is lost.
  Not by us, not by a "forgot password" email, not by anyone. That impossibility
  is *exactly* what makes it secure — there's no backdoor for an attacker either.
- **But your data is not gone.** The full copy still lives on your computer. You
  would simply pick a new password and re-upload a fresh locked box.

So a lost password means "the cloud copy is locked forever, start a new one" —
**not** "the data is gone."

**Two practical tips:**
1. Store the sync password somewhere safe (a password manager, or written down in
   a secure spot the trusted operators can reach).
2. The two operators **share one password** for the shared workspace — treat it
   like the key to a shared filing cabinet.

---

## The quick summary

| Question | Short answer |
|----------|--------------|
| Who owns the data? | You — on your own device and your own server. No outside company. |
| What can the server read? | Nothing readable — only a locked box, a version number, and a timestamp. |
| Server goes down? | App keeps working normally; data is safe on your computer. |
| How long will it last? | Years; boring/durable tech chosen on purpose; survives even if the server is abandoned. |
| Lose the password? | The *cloud copy* can't be recovered, but your *real data on the computer* is fine — just re-key. |

**The golden rule:** your computer always holds the real data. The cloud is a
locked-box convenience on top. Security comes from the password never leaving
your device — which is also why guarding that password matters.
