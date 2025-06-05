import configparser

version = "0.70-beta"

# local files
game_list = r'../files/database/gamelist.feather'
playthrough_list = r'../files/database/playthroughs.feather'
file_icon = r'../files/assets/Slaanesh.png'
file_config = r'../files/config/config.ini'
path_covers = r'../files/covers/'
path_import = r'../files/import/'
path_export = r'../files/export/'
# serving files,
server_file_icon = r'/assets/Slaanesh.png'
server_path_covers = r'/covers'
server_path_export = r'/export'
#display types
display_types = ['cards', 'table']

config_dictionary = {
    #values in config.ini
    'ui': {
        'name': 'Slaanesh',
        'native': False,
        'color_coding': True,
        'dark_mode': True,
        'row_height': 96,
        'card_width': 310,
    },
    'tabs': {
        'type_playing': 'cards',
        'type_played': 'table',
        'type_backlog': 'cards',
        'type_wishlist': 'table',
        'filter_playing': True,
        'filter_played': True,
        'filter_backlog': False,
        'filter_wishlist': False,
    },
    'igdb': {
        'client_id': '',
        'client_secret': '',
        'auth_token': '',
        'token_timestamp': '',
        'data_refresh_limit': 1
    },
    'platforms': [
        'PC', 
        'PlayStation', 
        'Xbox',
        'Nintendo', 
        'VR'
    ],
    'playing': [
        'playing', 
        'on hold'
    ],
    'played positive': [
        'completed', 
        'mastered'
    ],
    'played negative': [
        'discarded'
    ],
    'played': [],
    'backlog': [
        'backlog', 
        'waiting'
    ],
    'wishlist': [
        'wishlist'
    ],
    'unplayed': [],
}

config = configparser.ConfigParser(allow_no_value=True)
config.optionxform = str

def load_config():
    global config_dictionary
    config.read(file_config)

    for section in config:
        #skip unused sections
        if section not in config_dictionary:
            continue

        #list
        if type(config_dictionary[section]) is list:
            config_dictionary[section].clear()
            for key in config[section]:
                config_dictionary[section].append(key)
            continue

        for key in config[section]:
            # int
            if config[section][key].isnumeric():
                config_dictionary[section][key] = config.getint(section, key, fallback=config_dictionary[section][key])
            # boolean
            elif config[section][key] == 'True' or config[section][key] == 'False':
                config_dictionary[section][key] = config.getboolean(section, key, fallback=config_dictionary[section][key])
            # other, treat as string
            else:
                config_dictionary[section][key] = config[section][key]

    config_dictionary['played'] = config_dictionary['played positive'] + config_dictionary['played negative']
    config_dictionary['unplayed'] = config_dictionary['backlog'] + config_dictionary['wishlist'] + config_dictionary['playing']


def update_config(updates):
    global config_dictionary, file_config
    for update in updates:
        if update[0] is not None:
            if update[0] not in config:
                config.add_section(update[0])
            
            # lists
            if update[1] is None and update[2] is not None:
                clist = update[2].split(sep=',')
                config_dictionary[update[0]] = clist
                config[update[0]].clear()
                for item in clist:
                    config.set(update[0], item)
                continue

            # others
            if update[1] in config[update[0]] and update[2] is not None:
                if type(update[2]) is bool:
                    config_dictionary[update[0]][update[1]] = update[2]
                    config[update[0]][update[1]] = str(update[2])

                elif update[2].isnumeric():
                    config_dictionary[update[0]][update[1]] = int(update[2])
                    config[update[0]][update[1]] = str(int(update[2]))
                else:
                    config[update[0]][update[1]] = config_dictionary[update[0]][update[1]] = str(update[2])

    with open(file_config, 'w') as configfile: # noinspection PyTypeChecker
        config.write(configfile)