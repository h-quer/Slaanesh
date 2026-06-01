# Upcoming breaking change!

Slaanesh will receive a major update soon, including an upgrade to the data structure.
There will most likely be no automated transition between the old and new data structures. To keep your data with the new version, use the CSV export functionality of the old version and import these CSV files in the new one.

For the legacy version, check the legacy branch. If you do not want to update to the new version, point docker at the legacy tag instead of latest.

---

<h1 align="center">
  <img src="/assets/Slaanesh.png" width="auto" height="48"/>
  <br>
  Slaanesh</h1>
<p align="center">The self-hosted video game tracker</p>

---

## What is Slaanesh about?
Slaanesh is a game tracker, allowing for keeping track of games played as well as maintaining a wishlist and backlog.

## It's a beta release, will it keep my data safe?
Yes, absolutely!

This is why Slaanesh offers a simple export functionality. Even if Slaanesh somehow corrupts its database, as long as you at least occasionally press the csv export button, all your data will be safe in a very easy to read and easily accessible text format. Just make sure that both the database and export directory are part of the 3-2-1 backup system you are using for your server already anyway. If you don't run a 3-2-1 backup system on your server, then you have bigger things to worry about than Slaanesh ;)

With that in mind, this still absolutely is a beta release. I have used it for a few months and done lots of testing, but there is only so much I will notice and there are probably some bugs left. If you encounter any, please create a bug report.

## Screenshots
Screenshots of the legacy / old version, todo: Update with 2.0 UI
<p align="center">
  <img src="/images/light_cards.png" alt="playing" width="48%"/>
  <img src="/images/dark_cards.png" alt="playing" width="48%"/>
  <img src="/images/dark_game_editor.png" alt="game editor" width="48%"/>
  <img src="/images/light_game_editor.png" alt="game editor" width="48%"/>
  <img src="/images/light_table.png" alt="played" width="48%"/>
  <img src="/images/dark_table.png" alt="played" width="48%"/>
  <img src="/images/dark_add_game.png" alt="add game" width="48%"/>
  <img src="/images/light_settings.png" alt="settings" width="48%"/>
  <img src="/images/light_overview.png" alt="overview" width="48%"/>
  <img src="/images/dark_overview.png" alt="overview" width="48%"/>
</p>

## Setup and installation
### IGDB API token
Slaanesh uses the IGDB API for all game data. For Slaanesh to work, you need to be able to acces the IGDB API. This is how you can register: https://api-docs.igdb.com/#account-creation.
You then need to save your client id and client secret in the Slaanesh compose file.

Be aware: Client id and secret are stored in plain text. Doing so for your regular Twitch account (in case you already have one) is obviously a bad idea. In that case, best create a fresh one for dedicated use only as Slaanesh API slave.

### Docker setup
Create all necessary directories, adjust config file (IGDB token data! See sample config.ini in this repository) and copy it to the config directory.
Also adjust the docker-compose.yml to match your setup.

```yaml
---
services:
  slaanesh:
    image: ghcr.io/h-quer/slaanesh:latest
    container_name: slaanesh
    user: 1000:1000                          # or any other UID/GID that fit your setup
    restart: unless-stopped
    ports:
      - "8421:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - IGDB_CLIENT_ID=[insert]
      - IGDB_CLIENT_SECRET=[insert]
    volumes:
      - /bind/mount/slaanesh/data:/usr/src/app/data
```
Once it's set, simply pull and start the image:
```
docker compose up -d
```

Slaanesh should now be running on your specified port (8421 by default).

## Scope and roadmap
### Roadmap
- Bugfixes and usability improvements
- Optimization of the GOG import/sync
- Improvements for the mobile layout
- Enable encryption for Twitch API keys

### Not in scope
Slaanesh does not and will not include:
* Anything other than video games
* Social media features
* The ability to download or start games from within Slaanesh - it's a tracker, not a launcher
* Translations: At least not unless this really picks up and a proper use case for translating it arises
* Authentication: There are amazing tools for that, for example caddy or authentik (recommended), that allow for user authentication and redirecting to their own instance of Slaanesh - anything I can build wouldn't be safe enough to expose it to the web, better not offer the option in the first place and thus ensure that users rely on professional tools for this critical feature

### Feature wishlist
- Store integration other than GOG
  - Currently, GOG import/sync is supported
  - GOG sync includes stores linked with the GOG account, so e.g. Epic and Steam work via the GOG sync as well
  - For Steam, Slaanesh already supports data supplementation via a localconfig.vdf file, adding play dates and play times
  - All this works fully offline / based on database files
  - Integrating more stores or e.g. Steam natively is possible, but that requires abandoning the "offline-only" approach, handling account data (potentially insecure), and is a lot of effort to maintain
  - Currently I think limiting sync to GOG (and offering Steam/Epic/etc. only via GOG linked accounts) is fine, I do not plan on expanding the supported game stores, but if there is a lot of demand for it I might some time in the future

## How to contribute
Bug reports are always useful (if you run into bugs, which of course I hope won't happen ...).
