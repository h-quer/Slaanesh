import Slaanesh_ui as ui
import Slaanesh_data as data
import Slaanesh_config as config
import Slaanesh_IGDB as igdb
from nicegui import app


def init():
    config.load_config()
    igdb.init_api()
    data.load_dataframes()
    app.add_static_files(url_path=config.server_path_covers, local_directory=config.path_covers)
    app.add_static_file(url_path=config.server_file_icon, local_file=config.file_icon)


if __name__ in {"__main__", "__mp_main__"}:
    init()
    ui.display_ui()
    igdb.update_id_queue.join()
