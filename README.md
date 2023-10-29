<h1 align="center">
  <img src="/assets/Slaanesh.png" width="auto" height="48"/>
  <br>
  Slaanesh</h1>
<p align="center">The self-hosted video game tracker</p>

---

## What is Slaanesh about?
Slaanesh is a game tracker, allowing for keeping track of games played as well as maintaining a wishlist and backlog.

## It's a beta release, is it safe to use?
Yes, absolutely! This is why Slaanesh has a simple csv export functionality. Even if Slaanesh somehow corrupts its database, as long as you at least occasionally press the csv export button, all your data will be safe in a very easy to read and easily accessible text format. Just make sure that both the database and export directory are part of the 3-2-1 backup system you are using for your server already anyway. If you don't run a 3-2-1 backup system on your server, then you have bigger things to worry about than Slaanesh ;)

## Screenshots
<img src="/images/playing.png" width="45%" height="auto"/><img src="/images/backlog.png" width="45%" height="auto"/>
<img src="/images/game_editor.png" width="45%" height="auto"/><img src="/images/add_game.png" width="45%" height="auto"/>

## Setup and installation
### Docker compose
```yaml
---
version: "3.9"

services:
  slaanesh:
    image: [todo]:latest
    container_name: slaanesh
    user: 1000:1000
    restart: unless-stopped
    volumes:
      - your_config_dir:/files/config
      - your_import_dir:/files/import
      - your_export_dir:/files/export
      - your_covers_dir:/files/covers
      - your_database_dir:/files/database
    ports:
      - 8428:8080
```
Of course, change the left side of the volumes and port as needed. Same goes for UID/GID or simply remove to run as root. You can also of course remove the port part completely if using a reverse proxy and accessing the container via its name.

### Directories and the config file
Make sure to place the sample config file in the config directory. Slaanesh will not work without a config file and at least the mandatory IGDB info.

Folders used and to mount are:
* config - place for the config file (and potentially the encrypted IGDB access information once encrypted is implemented)
* import - place csv files for import here, must be names gamelist.csv and playthroughs.csv
* export - receive exported files from here, both database exports (gamelist.csv and playthroughs.csv) as well as the name to IGDB ID matching tool output
* covers - game covers are saved here, you can manually edit them if necessary
* database - location of the Slaanesh database, do not touch but if you value your data, make sure it is part of your 3-2-1 backup system, and also make sure to check backup integrety and practise restores regularly

### IGDB API token
Slaanesh uses the IGDB API for all game data. For Slaanesh to work, you need to be able to acces the IGDB API. This is how you can register: https://api-docs.igdb.com/#account-creation.
You then need to save your client id and client secret in the Slaanesh config file. Be aware: Client id and secret are (for now) stored in plain text. Doing so for your regular Twitch account (in case you already have one) is obviously a bad idea. In that case, best create an additional one, for dedicated use only as Slaanesh API slave.

## Scope and roadmap
### Roadmap
Features I am currently slowly but actively working on (pull requests still very welcome for support on these!):
* Proper dark mode support (currently works for everything but the tables)
* Overview page UI improvements - table alignment, graphs, additional stats, configurability in config file
* Cover cleanup - setting button to delete downloaded covers of games that are no longer in the game list
* Option to add a custom icon and name (the big central part of the UI header)
* Expand settings dialog to enable modifying the config file from within the UI
* Once Twitch client ID and secret can be added via the UI, save them not in plain text in the config file but encrypted somewhere else
* File picker and file downloads for csv import/export
* General UI improvements, especially considering responsiveness - there is probably a lot that can be done with asyncio which I have barely used so far

### Not in scope
Slaanesh does not and will not include:
* Anything other than video games
* Social media features
* The ability to download or start games from within Slaanesh - it's a tracker, not a launcher
* Translations: At least not unless this really picks up and a proper use case for translating it arises
* Authentication: There are amazing tools for that, for example caddy or authentik, that allow for user authentication and redirecting to their own instance of Slaanesh - anything I can build wouldn't be safe enough to expose it to the web, better not offer the option in the first place and thus ensure that users rely on professional tools for this critical feature

### Feature wishlist
Pull requests to implement these are extremely welcome. I'm not currently working on these, but might after the completing the roadmap:
* A proper fuzzy search with a list of games matching the game name when adding games by name, complete with a selection dialog including covers to pick the correct one easily
* Adding time played or time to complete to games, ideally linking to the howlongtobeat.com API to pull the completion times - although I don't think there is a good way to match IGDB IDs to HLTB IDs and search by name is quite error-prone
* Ratings for games (including config option to enable/disable)
* More store IDs than just Steam (including config options to enable/disable)
* General code cleanup, making things neat and doing some proper coding paradigm stuff instead of randomly mashing functions

## How to contribute
Bug reports are always useful (if you run into bugs, which of course I hope won't happen ...).
Even better, it'd be absolutely awesome if you could submit a pull request for anything that might need fixing or improving :)

