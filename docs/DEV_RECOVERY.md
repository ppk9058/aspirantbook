# Dev Server Recovery Guide (Port 3000)

## Problem Summary
Agar aapke local browser mein `http://localhost:3000/` par unstyled page ya 404 message ("404 • Page Not Found / Looking for something?") dikh raha ho, toh iska kaaran Next.js dev server cache (`.next`) aur fast refresh sync state ka stale ho jana hai jab background tests run hote hain.

Humne verify kiya hai ki production code aur isolated test build (`.next-test`) par `/` route bilkul sahi render hota hai (HTTP 200, full stylesheet, clean layout).

---

## Simple Step-by-Step Recovery (Hinglish)

1. **Dev Server Stop Karein:**
   Terminal mein jahan `npm run dev` chal raha hai, wahan:
   ```bash
   Ctrl + C
   ```
   daba kar process ko rok dein. (Agar background mein chal raha ho, toh port 3000 ko kill kar sakte hain: `kill -9 $(lsof -t -i:3000)`).

2. **Stale `.next` Folder Delete Karein:**
   Project root folder mein:
   ```bash
   rm -rf .next
   ```

3. **Dev Server Restart Karein:**
   Fresh state ke sath dev server chalu karein:
   ```bash
   npm run dev
   ```

4. **Browser Hard Refresh Karein:**
   Browser mein `http://localhost:3000/` kholein aur hard refresh karein:
   - **Mac:** `Cmd + Shift + R`
   - **Windows/Linux:** `Ctrl + Shift + R`

---

## What You Should See
Hard refresh ke baad `http://localhost:3000/` par:
- AspirantBook ka vibrant homepage / landing page load hoga.
- Pure Tailwind CSS styles aur fonts proper apply honge (koi raw serif font ya oversized icons nahi honge).
- Hero section, course bundles, batches cards, aur clean responsive navigation header bar dikhega.
