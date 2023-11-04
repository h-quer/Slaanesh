import configparser

version = "0.2-beta"

# local files
game_list = r'/files/database/gamelist.feather'
playthrough_list = r'/files/database/playthroughs.feather'
file_icon = r'/files/assets/Slaanesh.png'
file_config = r'/files/config/config.ini'
path_covers = r'/files/covers/'
path_import = r'/files/import/'
path_export = r'/files/export/'

# serving files
server_file_icon = r'/assets/Slaanesh.png'
server_path_covers = r'/covers/'

status_list_playing = ["playing", "on hold"]
status_list_played = ["completed", "discarded", "mastered"]
status_list_backlog = ["backlog", "waiting"]
status_list_wishlist = ["wishlist",]
status_list_unplayed = status_list_backlog + status_list_wishlist + status_list_playing
platform_list = ["PC", "PlayStation", "Xbox", "Nintendo", "VR"]

client_id = ""
client_secret = ""
auth_token = ""
token_timestamp = ""
data_refresh_period = 90
data_refresh_limit = 1

show_filters = False
row_height = 96
dark_mode = None
cards_width = 22

config = configparser.ConfigParser(allow_no_value=True)
config.optionxform = str


def load_config():
	global file_config
	config.read(file_config)
	if 'igdb' in config:
		global client_id, client_secret, auth_token, token_timestamp, data_refresh_period, data_refresh_limit
		client_id = config['igdb']['client_id']
		client_secret = config['igdb']['client_secret']
		auth_token = config['igdb']['auth_token']
		token_timestamp = config['igdb']['token_timestamp']
		data_refresh_period = config.getint('igdb', 'data_refresh_period', fallback=data_refresh_period)
		data_refresh_limit = config.getint('igdb', 'data_refresh_limit', fallback=data_refresh_limit)
	else:
		print('IGDB parameters not set')
		return
	if 'ui' in config:
		global show_filters, row_height, dark_mode, cards_width
		show_filters = config.getboolean('ui', 'show_filters', fallback=show_filters)
		row_height = config.getint('ui', 'row_height', fallback=row_height)
		dark_mode = config.getboolean('ui', 'dark_mode', fallback=dark_mode)
		cards_width = config.getint('ui', 'cards_width', fallback=cards_width)
	if 'platforms' in config:
		global platform_list
		platform_list.clear()
		for key in config['platforms']:
			platform_list.append(key)
	if 'playing' in config:
		global status_list_playing
		status_list_playing.clear()
		for key in config['playing']:
			status_list_playing.append(key)
	if 'played' in config:
		global status_list_played
		status_list_played.clear()
		for key in config['played']:
			status_list_played.append(key)
	if 'backlog' in config:
		global status_list_backlog
		status_list_backlog.clear()
		for key in config['backlog']:
			status_list_backlog.append(key)
	if 'wishlist' in config:
		global status_list_wishlist
		status_list_wishlist.clear()
		for key in config['wishlist']:
			status_list_wishlist.append(key)


def update_config(access_token, expiry_timestamp):
	config['igdb']['auth_token'] = access_token
	config['igdb']['token_timestamp'] = expiry_timestamp
	with open(file_config, 'w') as configfile:
		config.write(configfile)
