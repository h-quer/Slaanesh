import pandas as pd
import shutil
import Slaanesh_data as data
import Slaanesh_config as config

separator = ';'
escapechar = '\\'
quotechar = '"'


def import_csv():
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
    new_gl = pd.read_csv(config.path_import + 'gamelist.csv',
                         sep=separator, escapechar=escapechar, quotechar=quotechar, dtype=gl_dtypes)
    new_pt = pd.read_csv(config.path_import + 'playthroughs.csv',
                         sep=separator, escapechar=escapechar, quotechar=quotechar, dtype=pt_dtypes)
    new_gl['IGDB_queried'] = pd.to_datetime(new_gl['IGDB_queried'], format="ISO8601")
    new_pt['Date'] = pd.to_datetime(new_pt['Date'], format="ISO8601")
    duplicate_check = new_gl.merge(data.gl, how='inner', on='IGDB_ID')
    if not duplicate_check.empty:
        raise Exception(f'{len(duplicate_check)} game(s) to import already in database')
    data.gl = pd.concat([data.gl, new_gl], ignore_index=True)
    data.pt = pd.concat([data.pt, new_pt], ignore_index=True)
    data.write_dataframes()


def export_csv():
    global separator
    data.gl.to_csv(config.path_export + 'gamelist.csv', sep=separator, escapechar=escapechar, quotechar=quotechar, index=False)
    data.pt.to_csv(config.path_export + 'playthroughs.csv', sep=separator, escapechar=escapechar, quotechar=quotechar, index=False)


def export_download():
    export_csv()
    shutil.make_archive(config.path_export + '/backup.zip', 'zip', root_dir=config.path_export)


def export_id_name_list(id_name_list: pd.DataFrame):
    global separator
    id_name_list.to_csv(config.path_export + 'ids_to_names.csv', sep=separator, escapechar=escapechar, quotechar=quotechar, index=False)