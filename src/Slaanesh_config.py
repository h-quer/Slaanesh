import configparser

version = "0.61-beta"

# local files
game_list = r'/files/database/gamelist.feather'
playthrough_list = r'/files/database/playthroughs.feather'
slaanesh_backup = r'/files/downloads/slaanesh_backup'
file_icon = r'/files/assets/Slaanesh.png'
file_config = r'/files/config/config.ini'
path_covers = r'/files/covers/'
path_import = r'/files/import/'
path_export = r'/files/export/'
path_downloads = r'/files/downloads'

# serving files
server_file_icon = r'/assets/Slaanesh.png'
server_path_covers = r'/covers'
server_path_downloads = r'/downloads'
server_path_export = r'/export'

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
data_refresh_limit = 1

gt_name = "Slaanesh"
dark_mode = None
color_coding = True
row_height = 96
card_width = 310

display_types = ['cards', 'table']
type_playing = 'cards'
type_played = 'table'
type_backlog = 'cards'
type_wishlist = 'table'
filter_playing = True
filter_played = True
filter_backlog = False
filter_wishlist = False

scheduled_export = False
scheduled_period = 15

config = configparser.ConfigParser(allow_no_value=True)
config.optionxform = str


def load_config():
    global file_config
    global status_list_played, status_list_played_pos, status_list_played_neg
    global status_list_unplayed, status_list_backlog, status_list_wishlist, status_list_playing
    config.read(file_config)
    if 'igdb' in config:
        global client_id, client_secret, auth_token, token_timestamp, data_refresh_limit
        client_id = config['igdb']['client_id']
        client_secret = config['igdb']['client_secret']
        auth_token = config['igdb']['auth_token']
        token_timestamp = config['igdb']['token_timestamp']
        data_refresh_limit = config.getint('igdb', 'data_refresh_limit', fallback=data_refresh_limit)
    else:
        print('IGDB parameters not set')
        return
    if 'ui' in config:
        global row_height, dark_mode, card_width, color_coding, gt_name
        gt_name = config.get('ui', 'name', fallback=gt_name)
        row_height = config.getint('ui', 'row_height', fallback=row_height)
        dark_mode = config.getboolean('ui', 'dark_mode', fallback=dark_mode)
        card_width = config.getint('ui', 'card_width', fallback=card_width)
        color_coding = config.getboolean('ui', 'color_coding', fallback=color_coding)
    if 'tabs' in config:
        global type_playing, type_played, type_backlog, type_wishlist, filter_playing, filter_played, filter_backlog, filter_wishlist
        type_playing = config.get('tabs', 'type_playing', fallback=type_playing)
        type_played = config.get('tabs', 'type_played', fallback=type_played)
        type_backlog = config.get('tabs', 'type_backlog', fallback=type_backlog)
        type_wishlist = config.get('tabs', 'type_wishlist', fallback=type_wishlist)
        filter_playing = config.getboolean('tabs', 'filter_playing', fallback=filter_playing)
        filter_played = config.getboolean('tabs', 'filter_played', fallback=filter_played)
        filter_backlog = config.getboolean('tabs', 'filter_backlog', fallback=filter_backlog)
        filter_wishlist = config.getboolean('tabs', 'filter_wishlist', fallback=filter_wishlist)
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
    if 'export' in config:
        global scheduled_export, scheduled_period
        scheduled_export = config.getboolean('export', 'scheduled_export', fallback=scheduled_export)
        scheduled_period = config.getint('export', 'scheduled_period', fallback=scheduled_period)

    status_list_played = status_list_played_pos + status_list_played_neg
    status_list_unplayed = status_list_backlog + status_list_wishlist + status_list_playing


def update_config(new_access_token=None, new_expiry_timestamp=None,
                  new_platform_list=None, new_backlog=None, new_wishlist=None, new_playing=None, new_played_pos=None, new_played_neg=None,
                  new_row_height=None, new_dark_mode=None, new_card_width=None, new_color_coding=None,
                  new_type_playing=None, new_type_played=None, new_type_backlog=None, new_type_wishlist=None,
                  new_filter_playing=None, new_filter_played=None, new_filter_backlog=None, new_filter_wishlist=None, new_scheduled_export=None, new_scheduled_period=None):
    if new_access_token is not None:
        global auth_token
        config['igdb']['auth_token'] = auth_token = new_access_token
    if new_expiry_timestamp is not None:
        global token_timestamp
        config['igdb']['token_timestamp'] = token_timestamp = new_expiry_timestamp

    if new_platform_list is not None:
        if 'platforms' not in config:
            config.add_section('platforms')
        global platform_list
        platform_list = new_platform_list.split(sep=',')
        config['platforms'].clear()
        for item in platform_list:
            config.set('platforms', item)
    if new_playing is not None:
        if 'playing' not in config:
            config.add_section('playing')
        global status_list_playing
        status_list_playing = new_playing.split(sep=',')
        config['playing'].clear()
        for item in status_list_playing:
            config.set('playing', item)
    if new_backlog is not None:
        if 'backlog' not in config:
            config.add_section('backlog')
        global status_list_backlog
        status_list_backlog = new_backlog.split(sep=',')
        config['backlog'].clear()
        for item in status_list_backlog:
            config.set('backlog', item)
    if new_wishlist is not None:
        if 'wishlist' not in config:
            config.add_section('wishlist')
        global status_list_wishlist
        status_list_wishlist = new_wishlist.split(sep=',')
        config['wishlist'].clear()
        for item in status_list_wishlist:
            config.set('wishlist', item)
    if new_played_pos is not None:
        if 'played positive' not in config:
            config.add_section('played positive')
        global status_list_played_pos
        status_list_played_pos = new_played_pos.split(sep=',')
        config['played positive'].clear()
        for item in status_list_played_pos:
            config.set('played positive', item)
    if new_played_neg is not None:
        if 'played negative' not in config:
            config.add_section('played negative')
        global status_list_played_neg
        status_list_played_neg = new_played_neg.split(sep=',')
        config['played negative'].clear()
        for item in status_list_played_neg:
            config.set('played negative', item)

    if 'ui' not in config:
        config.add_section('ui')
    if new_row_height is not None:
        global row_height
        row_height = int(new_row_height)
        config['ui']['row_height'] = str(row_height)
    if new_dark_mode is not None:
        global dark_mode
        if type(new_dark_mode) is bool:
            dark_mode = new_dark_mode
            config['ui']['dark_mode'] = str(dark_mode)
        else:
            dark_mode = None
            config.remove_option('ui', 'dark_mode')
    if new_card_width is not None:
        global card_width
        card_width = int(new_card_width)
        config['ui']['card_width'] = str(card_width)
    if new_color_coding is not None:
        global color_coding
        color_coding = bool(new_color_coding)
        config['ui']['color_coding'] = str(color_coding)

    if 'tabs' not in config:
        config.add_section('tabs')
    if new_type_playing is not None:
        global type_playing
        config['tabs']['type_playing'] = type_playing = new_type_playing
    if new_type_played is not None:
        global type_played
        config['tabs']['type_played'] = type_played = new_type_played
    if new_type_backlog is not None:
        global type_backlog
        config['tabs']['type_backlog'] = type_backlog = new_type_backlog
    if new_type_wishlist is not None:
        global type_wishlist
        config['tabs']['type_wishlist'] = type_wishlist = new_type_wishlist
    if new_filter_playing is not None:
        global filter_playing
        filter_playing = new_filter_playing
        config['tabs']['filter_playing'] = str(filter_playing)
    if new_filter_played is not None:
        global filter_played
        filter_played = new_filter_played
        config['tabs']['filter_played'] = str(filter_played)
    if new_filter_backlog is not None:
        global filter_backlog
        filter_backlog = new_filter_backlog
        config['tabs']['filter_backlog'] = str(filter_backlog)
    if new_filter_wishlist is not None:
        global filter_wishlist
        filter_wishlist = new_filter_wishlist
        config['tabs']['filter_wishlist'] = str(filter_wishlist)

    if 'export' not in config:
        config.add_section('export')    
    if new_scheduled_export is not None:
        global scheduled_export
        scheduled_export = new_scheduled_export
        config['export']['scheduled_export'] = str(scheduled_export)
    if new_scheduled_period is not None:
        global scheduled_period
        scheduled_period = new_scheduled_period
        config['export']['scheduled_period'] = str(scheduled_period)

    with open(file_config, 'w') as configfile:
        config.write(configfile)
