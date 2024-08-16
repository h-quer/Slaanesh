import configparser

version = "0.61-beta"

#values not in config.ini
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
# serving files,
server_file_icon = r'/assets/Slaanesh.png'
server_path_covers =  r'/covers'
server_path_downloads = r'/downloads'
server_path_export = r'/export'
#display types
display_types = ['cards', 'table']

configDictionary = {
    #values in config.ini
    'ui': {
        'name': 'Slaanesh1',
        'color_coding': True,
        'dark_mode': None,
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
    'export': {
        'scheduled_export': False,
        'scheduled_period': 86400
    }
}

config = configparser.ConfigParser(allow_no_value=True)
config.optionxform = str

class configUpdate:
    def __init__(self, section, key, value):
        self.section = section
        self.key = key
        self.value = value


def load_config():
    global configDictionary
    config.read(file_config)

    for section in config:
        #skip default
        if(section == 'default'):
            continue
        if(section == 'DEFAULT'):
            continue

        #list
        if(type(configDictionary[section]) is list):
            configDictionary[section].clear()
            for key in config[section]:
                configDictionary[section].append(key)
            continue

        for key in config[section]:

            #int
            int_check = False

            try:
                int_check = bool(int(config[section][key]))
            except:
                pass
            
            if(int_check):
                configDictionary[section][key] = config.getint(section, key, fallback=configDictionary[section][key])
                continue

            #boolean
            if(config[section][key] == 'True' or config[section][key] == 'False'):
                configDictionary[section][key] = config.getboolean(section, key, fallback=configDictionary[section][key])
                continue

            #other
            configDictionary[section][key] = config[section][key]

    configDictionary['played'] = configDictionary['played positive'] + configDictionary['played negative']
    configDictionary['unplayed'] = configDictionary['backlog'] + configDictionary['wishlist'] + configDictionary['playing']


def update_config(updates):
    global configDictionary, file_config
    for update in updates:
        if (update.section is not None):

            if(update.section not in config):
                config.add_section(update.section)
            
            #lists
            if(update.key is None):
                list = update.value.split(sep=',')
                configDictionary[update.section] = list
                config[update.section].clear()
                for item in list:
                    config.set(update.section, item)
                continue

            # #others
            if (update.key in config[update.section]):
                if(type(update.value) is bool):
                    configDictionary[update.section][update.key] = update.value
                    config[update.section][update.key] = str(update.value)
                    continue
                config[update.section][update.key] = configDictionary[update.section][update.key] = str(update.value)

    with open(file_config, 'w') as configfile:
        config.write(configfile)