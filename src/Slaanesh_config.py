import configparser

version = "0.3-beta"

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
status_list_played_pos = ["completed", "mastered"]
status_list_played_neg = ["discarded", ]
status_list_played = status_list_played_pos + status_list_played_neg
status_list_backlog = ["backlog", "waiting"]
status_list_wishlist = ["wishlist", ]
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
color_coding = True

config = configparser.ConfigParser(allow_no_value=True)
config.optionxform = str


def load_config():
    global file_config
    global status_list_played, status_list_played_pos, status_list_played_neg
    global status_list_unplayed, status_list_backlog, status_list_wishlist, status_list_playing
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
        global show_filters, row_height, dark_mode, cards_width, color_coding
        show_filters = config.getboolean('ui', 'show_filters', fallback=show_filters)
        row_height = config.getint('ui', 'row_height', fallback=row_height)
        dark_mode = config.getboolean('ui', 'dark_mode', fallback=dark_mode)
        cards_width = config.getint('ui', 'cards_width', fallback=cards_width)
        color_coding = config.getboolean('ui', 'color_coding', fallback=color_coding)
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
    if 'played positive' in config:
        global status_list_played_pos
        status_list_played_pos.clear()
        for key in config['played positive']:
            status_list_played_pos.append(key)
    if 'played negative' in config:
        global status_list_played_neg
        status_list_played_neg.clear()
        for key in config['played negative']:
            status_list_played_neg.append(key)
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
    status_list_played = status_list_played_pos + status_list_played_neg
    status_list_unplayed = status_list_backlog + status_list_wishlist + status_list_playing


def update_config(access_token=None, expiry_timestamp=None,
                  new_platform_list=None, new_backlog=None, new_wishlist=None, new_playing=None, new_played_pos=None, new_played_neg=None):
    if access_token:
        config['igdb']['auth_token'] = access_token
    if expiry_timestamp:
        config['igdb']['token_timestamp'] = expiry_timestamp
    if new_platform_list:
        config['platforms'].clear()
        for item in new_platform_list.split(sep=','):
            config.set('platforms', item)
    if new_playing:
        config['playing'].clear()
        for item in new_playing.split(sep=','):
            config.set('playing', item)
    if new_backlog:
        config['backlog'].clear()
        for item in new_backlog.split(sep=','):
            config.set('backlog', item)
    if new_wishlist:
        config['wishlist'].clear()
        for item in new_wishlist.split(sep=','):
            config.set('wishlist', item)
    if new_played_pos:
        config['played positive'].clear()
        for item in new_played_pos.split(sep=','):
            config.set('played positive', item)
    if new_played_neg:
        config['played negative'].clear()
        for item in new_played_neg.split(sep=','):
            config.set('played negative', item)
    with open(file_config, 'w') as configfile:
        config.write(configfile)
