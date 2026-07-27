# 🎮 Gameplay Mechanics

## 1. Match Initialization & Setup

### HQ Placement Phase
* **Duration:** At the start of a match, players have **15 seconds** to place their Headquarters (HQ).
* **Placement Restrictions:**
  * Cannot be placed on **Water** or **Bedrock** tiles.
  * Must be placed at least **2 tiles away** from any other player's HQ.

---

## 2. Resource Economy & Generation

### The Bell Curve System
Both **Army** and **Gold** generation rates follow a bell curve based on your current Army capacity:
* **Optimal Generation:** Occurs around **50% of Maximum Army capacity**.
* **Penalty:** Operating at either extremely low or maximum Army capacity slows resource generation down by **more than 2x**.

### Gains
All players generate **Army** and **Gold** passivly by a fixed amount + additional gain per second for each owned *connected* tile.

---

## 3. Tile System & Territory Control

### Base Defense
* Every tile has a terrain type determining its **Base Defense** (minimum defense threshold).

### Defense Buffs & Adjacency
* A tile's defense can be boosted by constructing **Forts** or **HQs**.
* **Adjacency Effect:** Forts and HQs increase the defense of their own tile **and all adjacent tiles**.

### Attacking & Capturing
* **Army Cost to Attack:** `attack_cost = tile_defense * 5`
* **Capture Duration:** Capturing is not instantaneous. Capture time is calculated based on:
  * Target tile's defense value.
  * Attacking player's Attack Speed modifiers.
  * Size of defender's total territory (if capturing from an active player).
  * *Base Formula:* `attack_time = tile_defense * 1s`
* **Neutral Tile Reward:** Successfully capturing a neutral tile grants instant Gold equal to the tile's **Base Defense**.

---

## 4. Structures & Construction

Players can construct buildings to expand their capabilities. Each building has a specific **Cost**, **Build Limit**, **Build Time**, and **Demolish Time**.

| Building | Primary Effect | Capture Behavior |
| :--- | :--- | :--- |
| **Fort** | Increases defense of its tile and all adjacent tiles. | **Destroyed** upon capture. |
| **House** | Increases maximum Army capacity. | **Preserved** if capturer is under building limit; otherwise destroyed. |
| **Barracks** | Provides flat Army generation bonus *(subject to Bell Curve)*. | **Preserved** if capturer is under building limit; otherwise destroyed. |
| **Laboratory** | Unlocks the ability to purchase Buffs and Debuffs. | **Destroyed** upon capture. |

---

## 5. Laboratory Items (Buffs & Debuffs)

### Buffs
* **Attack Speed Buff:** Temporarily increases the player's tile capture speed.
* **Army Boost Buff:** 
  * Instantly triggers a **2x Army Gain Multiplier** for 15 seconds.
  * Followed by a **0.5x Army Gain Multiplier** cooldown penalty for 15 seconds.

### Debuffs
* *None currently implemented.*

---

## 6. Win & Elimination Conditions

* **Player Elimination:** A player is immediately eliminated from the match when an opponent captures the tile containing their **HQ**.
* **Victory:** The last surviving player remaining in the match is declared the winner.