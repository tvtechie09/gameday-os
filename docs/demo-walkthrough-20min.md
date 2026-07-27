# The 20-Minute Walkthrough

The founding-venue demo. Beat-by-beat, timed. The arc is one idea:
**a chaotic Saturday, run from one screen — and we don't tax your parents.**

Audience: a complex GM or ownership. Not a product tour. Don't walk them through
features; show them the day they already live.

---

## Before they arrive (5 min, you alone)

1. Sign in as Platform Admin, open **/admin/command-center**.
2. Click **↻ Refresh demo day**. This re-times the demo games onto today —
   finals behind you, games live now, games still to come — and it also makes the
   day *demoable*: it seeds two open work orders (the 6:00 hand-off) and windows
   the sponsor campaign onto today (the 12:00 report). Only touches sessions
   flagged `is_demo`; the venue is derived from those, never named.
   - **Refresh mid-morning to late afternoon, not at dawn.** The day is centered
     on "now", so refreshing at 6am puts games at midnight. Refreshing an hour
     before they arrive gives you a plausible game day.
3. Confirm the header reads **Live operations** and the summary shows games
   **behind**. If it says a quiet mode, refresh again — you want the day hot.
4. Have `/admin/impact`, `/admin/sponsors/campaigns`, and
   `/admin/command-center/end-of-day` open in tabs. Don't navigate to them cold in
   front of the room.
5. Glance at **Schedule Pulse** on the Command Center. If the knock-on list is
   empty the day isn't hot enough — refresh again. That list is the 10:00 beat.

If the refresh button isn't there, you're not signed in as platform staff.

### Demoing on production to a prospect (read once)

Dev-login is off in production by design, so:

- **Sign in with your real super_admin account** (kmcgraw@nurve.us), not the
  "Platform Admin" demo user. Your account is platform staff, so you still get
  the ↻ Refresh demo day button and land on the Command Center.
- **Refresh demo day the morning of** — the demo games are dated rows; without a
  refresh the day shows "pre-game / no games today." Verified: one click flips it
  to Live operations (games live + behind).
- **Two security must-dos before you show the live app to anyone:** confirm
  `NEXT_PUBLIC_ENABLE_DEV_LOGIN` is unset in Vercel prod, and rotate the exposed
  Supabase/OpenWeather keys (`docs/secrets-rotation-runbook.md`). Don't demo on an
  unrotated key.
- **The family experience needs no login** — pull the public field page, wall
  display (`/display/venue/...`), and a scoreboard up on your phone. For a
  family-heavy audience that's the strongest 30 seconds you have: "this is what a
  parent sees, no app to download, no account."
- Weather panel: live on prod (OpenWeather key is set), shows "missing key" only
  on local dev — so it demos correctly on production.

---

## 0:00 — The Saturday they already know (2 min)

Don't open the laptop yet. Ask:

> "Walk me through last Saturday. Sixteen games, four fields. Who knew the
> 2 o'clock on Field 3 was running late — and how did they find out?"

Let them answer. It's always the same answer: somebody walked out there, or a
parent complained. **That's the whole pitch.** You are selling the thing they
just described as broken.

## 2:00 — One screen (4 min)

Now open the laptop, signed out. Sign in and click the first thing in the
sidebar — **Today's Operations**. That single click is the argument: signing in
lands you on the day, not on a menu.

Say nothing for a beat. Let them read it.

> "This is your complex, right now."

Point at three things, in this order — never more:

- **Behind: 2** — "Two games are slipping. Nobody had to walk out there."
- **Fields flagged: 5** — "These need a set of eyes before the next turnover."
- **Weather: clear** — "When that turns, it turns here first."

Then the mode banner: **Live operations**. "The screen knows what part of the
day you're in. Pregame gives you a different checklist than this."

## 6:00 — The attention queue (4 min)

Scroll to the queue. This is where the product earns its money.

> "Top-down. Most urgent first. Your GM doesn't decide what matters — the
> venue tells them."

Click into one **behind** game. Show it's a real game record with a real
lifecycle, not a status someone typed into a whiteboard.

The line to land:

> "This is the difference between finding out at 2:40 and finding out at 2:05."

Then hand one off. Open **Fields → Work orders** (`/admin/fields/work-orders`) — the
refresh seeded two open ones, so there's always something to assign. Put a name in
**Assign to**, set a **Due**, and show the **I'm on it** button.

> "A dashboard tells you something's wrong. This tells you who has it, and whether
> they've actually picked it up. Nobody has to remember to ask."

Say the quiet part: an unassigned item shows **Nobody assigned**, and one past its
due time goes **Overdue** — so the thing that normally gets forgotten is the thing
that rises to the top.

## 10:00 — What "behind" actually costs (2 min)

Scroll to **Schedule Pulse**. The tiles already said two games are behind; this beat
is about what that does to the rest of the day. For a tournament director it *is*
the job.

Point at the bands first — most on time, a couple 20+ — then the knock-on:

> "Field 2 is 35 minutes behind. Your 6:21 on that field is really a 6:56. Nobody
> has done that arithmetic yet, and by 8 o'clock it's somebody's kid standing
> around in the parking lot."

Then the honesty line, and don't skip it:

> "It says *estimate*, because it is one. We're not going to dress a projection up
> as a promise."

If they run tournaments, add: worst-hit fields are ranked, so "which field do I
move a game off" answers itself.

## 12:00 — Sponsor proof (4 min)

Go to **/admin/sponsors/campaigns**. Show the fulfillment report.

> "You sold this sponsor 400 impressions. Here's what actually ran. Not a
> guess — a count."

The point isn't the feature. It's the renewal conversation:

> "Next February, when they ask what they got for their money, you send this
> instead of arguing."

Note the delivery rate only counts what was **contracted** — bonus plays don't
inflate it. Say that out loud. Anyone who has sold sponsorship knows why that
matters, and it buys you credibility for the next four minutes.

Two more lines, both about trust rather than features.

**Make-good.** If the campaign came up short, the report says so at the top, in
placements:

> "When you under-deliver, this tells *you* before the sponsor finds it. You walk
> into the renewal saying 'we owe you forty placements, here's how we're making it
> right.' That's the conversation that renews. The other one doesn't."

**Verified vs modeled.** Point at the label:

> "It separates what we counted from what we modeled. The game is proven — that's
> the actual record. The rotation count is derived from the rate you configured.
> Anyone who's ever been handed an inflated sponsorship report will trust that line
> more, not less."

## 16:00 — We don't tax your parents (2 min)

This is the moment that separates us from everyone else in their inbox.

> "Every other system in this space takes a cut of registration, or charges the
> families a convenience fee. We don't touch money at all. Ever. Not as a
> policy we might revisit — we don't have the code to do it."

Then the model, in one breath:

> "Free to record. Paid to operate. The team app is free forever — that's the
> network. The families never pay us anything. **You** pay us, because you're
> the one running a business here."

Expect a pause. Let it sit. This is where they lean in.

## 18:00 — Monday morning, then the ask (2 min)

Open **/admin/command-center/end-of-day**. This is the close, and it's the piece a
GM keeps.

> "Sunday night, this is already written."

Point at three things and stop: what got played, what **never got a final**, and
what **carries into tomorrow** — open issues with a name on them, fields still
flagged, boards that never reported.

> "That's what you forward to your board Monday morning. You didn't write it. It
> wrote itself out of the games you already played."

If they ask about the start-time numbers, that's a gift — it's the honesty beat
again: games with no recorded first pitch are excluded and *say so*, rather than
padding the report with an on-time day that never happened.

Then (optionally open **/admin/impact** for hours recovered) ask for the thing:

> "I want three founding venues for the fall season. You'd be one of them.
> That means a real season, real games, and you tell us what's wrong while
> we can still fix it fast.
>
> What would you need to see to say yes?"

**Stop talking.** Whoever speaks first loses. Their answer is your roadmap.

---

## Things that will come up

**"Do you do scoring?"**
> "No — on purpose. GameChanger owns that and your teams already use it. We
> pull the game state in. We're the venue layer, not another scorebook."

**"Can we use our own X?"**
> "Yes. Built-in if you want it, or we integrate with what you have. That's a
> real choice on every module, not a sales answer."

**"What does it cost?"**
> `docs/pricing-and-packaging.md`. Founding venues get founding pricing, and
> you'll bill by PO — no card, no portal.

**"How do I know these numbers are real?"**
> The best question they can ask. "Three of them are counted, one is modeled, and
> the report tells you which is which. Game times come from the game record.
> Impressions are counted page events. Placement counts are the games times the
> rate you set — so we call that modeled, not verified. And anything we couldn't
> measure gets excluded and flagged, not filled in." Nobody else in their inbox
> talks like that.

**"Is our data safe? These are kids."**
> Do not wing this. Kids' and guardians' records are locked down —
> `docs/security-audit-2026-07.md` has the audit. Offer to send it. Sending a
> real audit to a GM who asked is worth more than any slide.

---

## What not to do

- **Do** open with the nav. "Today's Operations" is the first item and it *is*
  the Command Center — one click from signing in to running the day. That's the
  pitch, so show it rather than typing a URL.
- Don't wander into Venue Mode & Status, Live Field Grid, or Reports. They're
  real screens, but a tour of them reads as an unfinished product. Stay on the
  Command Center.
- Don't open anything you haven't loaded before they walked in.
- Don't fill the silence after the ask.
