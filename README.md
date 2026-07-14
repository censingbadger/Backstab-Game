# 🗡️ Back Stab

A real-time arena RPG that runs right in your web browser.

**By Jing & Ash Games** · © Asher and Ren, 2026

---

## How to play

Just open **`index.html`** in any web browser (computer, tablet, or phone).
Nothing to install — the whole game is self-contained.

- **Map** — travel between regions. Beat a region's boss to unlock the next place. The mysterious **???** region hides the secret final boss!
- **Arena** — pick who to fight. A cheering crowd (Applause) gives you a boost *and* bigger prize money; a booing crowd works against you.
- **Battle** — real-time action with on-screen buttons:
  - 🗡️ **Attack** — strike the enemy (uses up your weapon's durability)
  - 🛡️ **Block** — raise your shield to reduce damage
  - 💨 **Dodge** — dodge out of the way to avoid a hit completely
  - ⚡ **Special** — charge it up by landing hits, then unleash a big attack
  - 🎒 **Items** — heal with food or power up with a Strength Potion
- **Stats** — see your money, weapon, level, and Overall score. Buy new gear and items in the **Shop**, and **repair** worn-out weapons. Browse the **Enemies** bestiary.

## Game features

- ❤️ Half-heart health for both your hero and every enemy
- 🗡️ Weapons wear out with use — **repair them at the shop** so you never lose them
- 📈 One hero who **levels up** (more health) and gets stronger with better gear
- 🎉 A crowd meter that affects both the fight and your reward
- 💾 Progress saves automatically in your browser
- 🔊 Sound effects and music (with a mute button)

## Enemies (starter roster)

The first three foes live in **Dead Cliffs**: **Zombie** (1½❤️), **Skeleton** (1❤️),
and **Angry Peasant** (2❤️). Beyond them wait 17 more creatures — from the
**Sandworm** and **Werewolf** to named bosses like **Bread Boy**, **Dragok**,
**Gorton**, and the hooded finale, **The Backstabber**.

## Project structure

```
index.html        — page shell, loads everything
css/styles.css    — all styling & animations
js/data.js        — enemies, bosses, weapons, items, map regions
js/state.js       — game state, saving/loading, levelling, economy
js/audio.js       — procedural sound effects & music (Web Audio)
js/art.js         — cartoon characters & half-heart icons (inline SVG)
js/screens.js     — Title, Map, Arena, Stats/Shop, Enemies screens
js/battle.js      — the real-time battle engine
js/main.js        — startup
```

Everything is drawn and sounded in code, so the game works completely offline.
