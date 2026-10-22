# Setting up the teacher's Google Sheet

This connects the game's optional **Share results with my teacher** button to a Google Sheet that only you can open.
It takes about 15 minutes, once.

## 1. Create the Sheet and add the script
1. Go to [sheets.google.com](https://sheets.google.com) and create a blank spreadsheet. Name it, for example, "Revision game results".
2. In the spreadsheet, open **Extensions → Apps Script**.
3. Delete everything in the editor, then paste in the whole of `Code.gs` from this folder. Click **Save** (the disk icon).

## 2. Run setup once
1. In the toolbar's function menu, choose **setup**, then click **Run**.
2. Google will ask for permission. Choose your account. You may see "Google hasn't verified this app": click **Advanced → Go to (project name)**. This is normal for a script you wrote yourself. Then click **Allow**.
3. Back in the spreadsheet you should now see three tabs: **Rounds**, **Mistakes** and **Summary**.
   `setup` also installs the nightly job that deletes rows older than 180 days.

## 3. Publish it as a web app
1. In the Apps Script editor click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
   ("Anyone" only means anyone can *send* results to it. Nobody but you can open the Sheet.)
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

## 4. Put the address in the game
In `index.html`, find this line:

```js
const SHARE_URL = '';
```

Paste the address between the quotes, save, commit and push. (Or send me the address and I'll do it.)
Until this is filled in, the sharing button is hidden in the game.

## Things to keep true
The in-game notice tells students these things. Please keep them true:
- **Only you can open the Sheet.** Don't share the spreadsheet with others (or update the notice if you do).
- **Results are deleted after about 6 months.** If you change `KEEP_DAYS` in `Code.gs`, also change `SHARE_KEEP` in `index.html`.
- **You will delete a student's results if they ask.** Delete their rows (filter the Rounds and Mistakes tabs by name).

## If you change Code.gs later
Paste the new version, save, then **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**.
The web app URL stays the same.
