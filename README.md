<h1 align="center">
  <img src="/assets/Slaanesh.png" width="auto" height="48"/>
  <br>
  Slaanesh</h1>
<p align="center">The self-hosted video game tracker</p>

---

## What is Slaanesh about?
Slaanesh is a game tracker, allowing for keeping track of games played as well as maintaining a wishlist and backlog.

## Screenshots
Nice screenshots

## Setup and installation
stuff

## Scope and roadmap
### Roadmap
Features I am currently actively working on (pull requests still very welcome for support on these!):
* Overview page UI improvements - table alignment, graphs, additional stats, configurability in config file
* Cover cleanup - setting button to delete downloaded covers of games that are no longer in the game list
* Option to add a custom icon and name (the big central part of the UI header)
* File picker and file downloads for csv import/export
* General UI improvements, especially considering responsiveness - there is probably a lot that can be done with asyncio which I have barely used so far

### Not in scope
Slaanesh does not and will not include:
* Anything other than video games
* Social media features
* The ability to download or start games from within Slaanesh - it's a tracker, not a launcher
* Translations, at least not unless this really picks up and a proper use case for translating it arises

### Feature wishlist
Pull requests to implement these are extremely welcome. I'm not currently working on these, but might after the completing the roadmap:
* A proper fuzzy search with a list of games matching the game name when adding games by name, complete with a selection dialog including covers to pick the correct one easily
* Adding time played or time to complete to games, ideally linking to the howlongtobeat.com API to pull the completion times - although I don't think there is a good way to match IGDB IDs to HLTB IDs and search by name is quite error-prone
* Ratings for games (including config option to enable/disable)
* More store IDs than just Steam (including config options to enable/disable)
* Expand settings dialog to enable modifying the config file from within the UI
* General code cleanup, making things neat and doing some proper coding paradigm stuff instead of randomly mashing functions

## How to contribute
Bug reports are always useful.
Even better, it'd be absolutely awesome if you could submit a pull request for anything that might need fixing or improving :)

