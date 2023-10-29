import pandas as pd
import Slaanesh_data as data
import Slaanesh_config as config

separator = ';'
escapechar = '\\'
quotechar = '"'


def import_csv():
    # todo: add failsafe and notification if trying to import games already in db (currently results in inconsistent db)
    global separator
    gl_dtypes = {'IGDB_image': str,
                 'IGDB_ID': 'int64',
                 'Name': str,
                 'Platform': str,
                 'Status': str,
                 'IGDB_queried': str,
                 'Steam_ID': 'int64',
                 'Release_date': 'int64',
                 'IGDB_status': 'int64',
                 'IGDB_url': str,
                 'Game_comment': str}
    pt_dtypes = {'IGDB_ID': 'int64',
                 'Date': str,
                 'Playthrough_comment': str}
    gl_parser = ['IGDB_queried']
    pt_parser = ['Date']
    new_gl = pd.read_csv(config.path_import + 'gamelist.csv',
                         sep=separator, escapechar=escapechar, quotechar=quotechar, dtype=gl_dtypes, parse_dates=gl_parser)
    new_pt = pd.read_csv(config.path_import + 'playthroughs.csv',
                         sep=separator, escapechar=escapechar, quotechar=quotechar, dtype=pt_dtypes, parse_dates=pt_parser)
    # data.gl = new_gl.reset_index(drop=True)
    # data.pt = new_pt.reset_index(drop=True)
    data.gl = pd.concat([data.gl, new_gl], ignore_index=True)
    data.pt = pd.concat([data.pt, new_pt], ignore_index=True)
    data.write_dataframes()


def export_csv():
    global separator
    data.gl.to_csv(config.path_export + 'gamelist.csv', sep=separator, escapechar=escapechar, quotechar=quotechar, index=False)
    data.pt.to_csv(config.path_export + 'playthroughs.csv', sep=separator, escapechar=escapechar, quotechar=quotechar, index=False)


def export_id_name_list(id_name_list: pd.DataFrame) -> bool:
    global separator
    id_name_list.to_csv(config.path_export + 'ids_to_names.csv', sep=separator, escapechar=escapechar, quotechar=quotechar, index=False)
    return True
