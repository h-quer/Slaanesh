import Slaanesh_ui as ui
import Slaanesh_data as data
import Slaanesh_config as config
import Slaanesh_IGDB as igdb
from nicegui import app
import sys

def init():
    config.load_config()
    igdb.init_api()
    data.load_dataframes()
    app.add_static_files(url_path=config.server_path_covers, local_directory=config.path_covers)
    app.add_static_files(url_path=config.server_path_downloads, local_directory=config.path_downloads)
    app.add_static_file(url_path=config.server_file_icon, local_file=config.file_icon)
    

if __name__ in {"__main__", "__mp_main__"}:
    native = False
    if(len(sys.argv) >= 2 and sys.argv[1]=='1'):
        native = True
    init()
    ui.display_ui(Native=native)
    igdb.update_id_queue.join()