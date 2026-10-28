# Ranked Notes

**Attach your own notes to ranked war items in [Torn](https://www.torn.com).**

Ranked Notes adds a small **+** to every ranked war item, meaning any yellow, orange or red weapon or armour, when you open it. Click it to write a note on *that exact item*: who it's loaned to, what it's for, what you paid, anything you like. The note comes back wherever that item appears, from the faction armoury to the auction house to a trade.

It is **read-only and private**: it needs no API key, makes no requests and sends nothing anywhere. Your notes stay in your own browser.

**[⬇️ Install Ranked Notes](https://github.com/Eaglewing91/Ranked-Notes/raw/main/Ranked-Notes.user.js)**

---

## Features

| Feature | What it does |
|---|---|
| **+ on every ranked item** | Any yellow, orange or red weapon or armour gets a + when you open it, whatever its bonus |
| **Notes tied to one item** | Each note belongs to that one item, so two identical Kodachis keep separate notes |
| **Follows the item** | The same item is recognised across pages, so its note comes back wherever you see it |
| **At a glance** | A solid orange + means that item already has a note; a dark + means it doesn't |
| **Quick editing** | Click + to add, edit or delete a note (up to 300 characters). Save with the button or Ctrl+Enter, close with Esc |
| **Synced tabs** | Edit a note in one Torn tab and your other open tabs update too |

## Where it works

- Faction armoury
- Items
- Auction house
- Item Market
- Bazaars
- Display cases
- Trades

The + appears at the end of the item's first description line once you open the item, for example: *The SIG 552 is a Rifle Weapon.* **[+]**

## How notes stay with the right item

Every ranked item rolls its own stats. Ranked Notes links each note to the item's exact **name, damage, accuracy or armour, quality and bonus values**, so no two items realistically share a note. Because those stats appear on every page, the same item is recognised wherever it's listed.

If an item's stats can't be read, Ranked Notes uses the weapon's **unique ID (UID)** instead, when Torn shows one on the page.

## Installation

### Desktop (Tampermonkey / Violentmonkey)
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) for your browser.
2. Click **[Install Ranked Notes](https://github.com/Eaglewing91/Ranked-Notes/raw/main/Ranked-Notes.user.js)** and confirm.
3. Updates are picked up automatically from this repository.

### Mobile (Torn PDA, Android & iOS)
1. Open the [script file](https://github.com/Eaglewing91/Ranked-Notes/blob/main/Ranked-Notes.user.js) and copy its full contents.
2. In Torn PDA's userscripts settings, add a new script and paste the code in.
3. Save, then reload Torn.

## How long notes are kept

Notes are saved in your browser's local storage for torn.com and don't expire. They stay until you delete them, clear your browser's site data for Torn, or reinstall Torn PDA.

Notes are **per browser and per device**: notes made in Chrome on your PC won't appear in Torn PDA or on another computer.

## Torn scripting rules

Ranked Notes follows Torn's scripting rules. It:

- only reads the item panel you have opened on the page you're viewing;
- makes **no requests** of any kind: no Torn pages, no API calls, no external sites, no websockets;
- never clicks, submits or triggers anything on the page;
- stops clicks on its + button so they never reach Torn's own buttons (Buy, Bid, Loan and so on);
- runs with `@grant none`, so it has no extra permissions.

## Terms of Service

| | |
|---|---|
| **Data Storage** | Only locally (your notes, in your browser's localStorage) |
| **Data Sharing** | Nobody |
| **Purpose of Use** | Other: personal notes on ranked war items |
| **Key Storage & Sharing** | Not stored / Not shared (no API key is used) |
| **Key Access Level** | None required |

## Known limitations

- The + appears once you **open** an item's info panel, not on the collapsed list.
- Two items with every stat identical to two decimal places would share a note. This is extremely unlikely for ranked items.
- If Torn changes how item panels are built, the + may stop appearing on some pages. Please [open an issue](https://github.com/Eaglewing91/Ranked-Notes/issues) with the page and the item's panel HTML.

## Credits

Ranked items are found the same way the *TORN Auction Price Checker* reads Torn's item panels. Ranked Notes uses only that page-reading approach and contacts no outside service.

## Feedback

Suggestions and bug reports are welcome. Open an [issue](https://github.com/Eaglewing91/Ranked-Notes/issues) or message [Eaglewing [571041]](https://www.torn.com/profiles.php?XID=571041) in game.

Torn staff are welcome to contact me with any concerns about this script.

## License

[MIT](LICENSE) © 2026 Eaglewing [571041]

*Ranked Notes is a fan-made script and is not affiliated with or endorsed by Torn.*
