from nicegui import ui
import datetime as dt
import pandas as pd
import numpy as np
import Slaanesh_config as config
import Slaanesh_data as data
import Slaanesh_importexport as imex
import Slaanesh_IGDB as igdb


def refresh_ui():
    # dialog_game_editor.refresh()
    panel_overview.refresh()
    panel_playing.refresh()
    panel_played.refresh()
    panel_backlog.refresh()
    panel_wishlist.refresh()


def display_ui():
    with ui.column().classes('w-full h-[90vh] flex-nowrap'):
        ui_header()
        tabs_lists()
    ui.run(title='Slaanesh', favicon=config.file_icon, reload=False, dark=config.dark_mode)


def ui_header():
    with ui.grid(columns=3).classes('w-full'):
        with ui.row().classes('justify-center items-center'):
            ui.button('Add game', on_click=lambda: dialog_add_unplayed_game())
            ui.button('Add game with playthrough', on_click=lambda: dialog_add_played_game())
        with ui.row().classes('justify-center items-center'):
            ui.image(config.file_icon).classes('w-14')
            ui.label('Slaanesh').classes('text-4xl')
        with ui.row().classes('justify-center items-center'):
            ui.button(icon='refresh', on_click=lambda: refresh_ui()).props('round')
            ui.button(icon='save', on_click=lambda: action_save_db()).props('round')
            ui.button(icon='settings', on_click=lambda: dialog_settings()).props('round')
            ui.button(icon='question_mark', on_click=lambda: dialog_about()).props('round')
    ui.separator()


def dialog_settings():
    with ui.dialog() as confirmation, ui.card():
        ui.label('Are you sure?')
        with ui.row():
            ui.button('Confirm', on_click=lambda: confirmation.submit(True))
            ui.button('Cancel', on_click=lambda: confirmation.submit(False))
    with ui.dialog(value=True) as dialog, ui.card():
        with ui.row().classes('w-full justify-end'):
            ui.button(icon='close', on_click=lambda: dialog.delete()).props('round size=sm')
        with ui.card():
            with ui.row():
                ui.label('Import / Export').classes('text-lg font-bold')
            with ui.row():
                async def import_csv():
                    confirm = await confirmation
                    if confirm:
                        action_import_csv()

                ui.button('Import CSV', on_click=import_csv)
                ui.button('Export CSV', on_click=lambda: action_export_csv())
        with ui.card():
            with ui.row():
                ui.label('IGDB').classes('text-lg font-bold')
            with ui.row():
                ui.button('Update API data', on_click=lambda: action_update_api_data())
                ui.button('Update release dates', on_click=lambda: action_update_release_dates())
                ui.button('Refresh access token', on_click=lambda: action_refresh_acces_token())
        with ui.card().classes('w-full'):
            with ui.row():
                ui.label('Match IGDB IDs to names').classes('text-lg font-bold')
            with ui.row().classes('w-full'):
                namelist = ui.textarea(label='List of names',
                                       placeholder='Enter one name per line, results will be saved in export directory').classes('w-full')
                ui.button('Export ID list', on_click=lambda: action_match_ids_to_names(namelist.value))
        with ui.card():
            # todo: add cover cleanup button (check cover directory, delete covers of games not in gl)
            with ui.row():
                ui.label("Database operations").classes('text-lg font-bold')
            with ui.row():
                async def purge_data():
                    confirm = await confirmation
                    if confirm:
                        action_purge_all_data()

                ui.button('Check database consistency', on_click=lambda: action_check_database_consistency())
                ui.button('Purge all data', on_click=purge_data)


def dialog_about():
    with ui.dialog(value=True) as dialog, ui.card():
        with ui.row().classes('w-full justify-end'):
            ui.button(icon='close', on_click=lambda: dialog.delete()).props('round size=sm')
        with ui.card():
            with ui.grid(columns=2).classes('items-center'):
                ui.label('Documentation').classes('text-lg font-bold')
                ui.link('https://github.com/h-quer/Slaanesh/wiki', 'https://github.com/h-quer/Slaanesh/wiki', new_tab=True)
                ui.label('Github').classes('text-lg font-bold')
                ui.link('https://github.com/h-quer/Slaanesh', 'https://github.com/h-quer/Slaanesh', new_tab=True)
                ui.label('Icon attribution').classes('text-lg font-bold')
                ui.link('Game folder icons created by juicy_fish - Flaticon', 'https://www.flaticon.com/free-icons/game-folder', new_tab=True)
                ui.label('User Interface').classes('text-lg font-bold')
                ui.link('NiceGUI', 'https://nicegui.io/', new_tab=True)
                ui.label('Technology').classes('text-lg font-bold')
                ui.label("Using Python and pandas DataFrames")
                ui.label('Version').classes('text-lg font-bold')
                ui.label(config.version)


def tabs_lists():
    with ui.row().classes('w-full h-full justify-center'):
        with ui.tabs().classes('w-full') as tabs:
            tab_ov = ui.tab('Overview').classes('w-1/6')
            tab_pl = ui.tab('Playing').classes('w-1/6')
            tab_pt = ui.tab('Played').classes('w-1/6')
            tab_bl = ui.tab('Backlog').classes('w-1/6')
            tab_wl = ui.tab('Wishlist').classes('w-1/6')
        with ui.tab_panels(tabs, value=tab_pt).classes('w-full h-full'):
            with ui.tab_panel(tab_ov):
                panel_overview()
            with ui.tab_panel(tab_pl):
                panel_playing()
            with ui.tab_panel(tab_pt):
                panel_played()
            with ui.tab_panel(tab_bl):
                panel_backlog()
            with ui.tab_panel(tab_wl):
                panel_wishlist()


@ui.refreshable
def panel_playing():
    res = data.gl[data.gl.Status.isin(config.status_list_playing)].copy()
    res['Platform'] = pd.Categorical(res['Platform'], config.platform_list)
    res['Status'] = pd.Categorical(res['Status'], config.status_list_playing)
    res.sort_values(by=['Status', 'Platform', 'Game_comment'], inplace=True)
    display_cards(res, has_playthroughs=False, show_release_status=False)


@ui.refreshable
def panel_played():
    res = pd.merge(data.pt, data.gl, how='left', on='IGDB_ID')
    res['Platform'] = pd.Categorical(res['Platform'], config.platform_list)
    res['Status'] = pd.Categorical(res['Status'], config.status_list_played)
    res.sort_values(by='Date', ascending=False, inplace=True)
    display_aggrid(res, has_playthroughs=True, show_release_status=False)


@ui.refreshable
def panel_backlog():
    res = data.gl[data.gl.Status.isin(config.status_list_backlog)].copy()
    res['Platform'] = pd.Categorical(res['Platform'], config.platform_list)
    res['Status'] = pd.Categorical(res['Status'], config.status_list_backlog)
    res.sort_values(by=['Status', 'Platform', 'Game_comment'], inplace=True)
    display_aggrid(res, has_playthroughs=False, show_release_status=False)


@ui.refreshable
def panel_wishlist():
    res = data.gl[data.gl.Status.isin(config.status_list_wishlist)].copy()
    res['Platform'] = pd.Categorical(res['Platform'], config.platform_list)
    res['Status'] = pd.Categorical(res['Status'], config.status_list_wishlist)
    res.sort_values(by=['Status', 'Platform', 'Release_date', 'Game_comment'], key=lambda col: col.replace(0, np.nan), na_position='last', inplace=True)
    display_aggrid(res, has_playthroughs=False, show_release_status=True)


@ui.refreshable
def panel_overview():
    res = pd.merge(data.pt, data.gl, how='left', on='IGDB_ID').sort_values(by=['Date'], ascending=False)
    # Totals
    with ui.grid(columns=3).classes('w-full'):
        with ui.card().classes('w-full'):
            with ui.row().classes('justify-center w-full'):
                ui.label('Stats by category').classes('text-xl font-bold')
            with ui.row().classes('justify-center w-full'):
                ui.echart({
                    'yAxis': {'type': 'value'},
                    'xAxis': {'type': 'category', 'data': ['Games', 'Playthroughs']},
                    'tooltip': {'trigger': 'item'},
                    'series': {'type': 'bar', 'data': [len(data.gl.index.to_list()), len(data.pt.index.to_list())],
                               'label': {'normal': {'show': True, 'position': 'top'}}},
                })
            with ui.row().classes('justify-center w-full'):
                ui.echart({
                    'yAxis': {'type': 'log'},
                    'xAxis': {'type': 'category', 'data': ['Playing', 'Played', 'Backlog', 'Wishlist']},
                    'tooltip': {'trigger': 'item'},
                    'series': {'type': 'bar', 'data': [sum(data.gl['Status'].isin(config.status_list_playing)),
                                                       sum(data.gl['Status'].isin(config.status_list_played)),
                                                       sum(data.gl['Status'].isin(config.status_list_backlog)),
                                                       sum(data.gl['Status'].isin(config.status_list_wishlist))],
                               'label': {'normal': {'show': True, 'position': 'top'}}},
                })

        with ui.column().classes('w-full'):
            # Completion rate
            graph_data = []
            for status in config.status_list_played:
                graph_data.append({'value': sum(res.loc[:, 'Status'] == str(status)), 'name': status})

            with ui.card().classes('w-full'):
                with ui.row().classes('justify-center w-full'):
                    ui.label('Completion').classes('text-xl font-bold')
                with ui.row().classes('w-full'):
                    ui.echart({'tooltip': {'trigger': 'item'},
                               'series': {'type': 'pie', 'data': graph_data}})

            # Platform stats
            with ui.card().classes('w-full'):
                graph_data = []
                platform_names = []
                for x in config.platform_list:
                    platform_names.append(x)
                    graph_data.append(sum(data.gl['Platform'].isin([x, ])))

                with ui.row().classes('justify-center w-full'):
                    ui.label('Platform stats').classes('text-xl font-bold')
                with ui.row().classes('w-full'):
                    ui.echart({
                        'yAxis': {'type': 'log'},
                        'xAxis': {'type': 'category', 'data': platform_names},
                        'tooltip': {'trigger': 'item'},
                        'series': {'type': 'bar', 'data': graph_data,
                                   'label': {'normal': {'show': True, 'position': 'top'}}},
                    })

        # Yearly stats
        with ui.card().classes('w-full'):
            with ui.row().classes('justify-center w-full'):
                ui.label('Yearly stats').classes('text-xl font-bold')
            with ui.row().classes('w-full'):
                graph_data = []
                list_years = list(range(dt.datetime.now().year, dt.datetime.now().year-7, -1))
                list_years.append(str(dt.datetime.now().year-7) + "\nand\nbefore")
                for status in config.status_list_played:
                    yearly_data = []
                    for year in range(dt.datetime.now().year, dt.datetime.now().year-7, -1):
                        a = res['Date'] >= dt.datetime(year, 1, 1)
                        b = res['Date'] < dt.datetime(year + 1, 1, 1)
                        tmp = res.loc[a & b, 'Status']
                        count = sum(tmp == str(status))
                        yearly_data.append(count)
                    b = res['Date'] < dt.datetime(dt.datetime.now().year-6, 1, 1)
                    yearly_data.append(sum(res.loc[b, 'Status'] == str(status)))
                    graph_data.append({'type': 'bar', 'name': status, 'data': yearly_data, 'label': {'normal': {'show': True, 'position': 'right'}}})

                ui.echart({
                    'xAxis': {'type': 'value'},
                    'yAxis': {'type': 'category', 'data': list_years, 'inverse': True},
                    'legend': {},
                    'tooltip': {'trigger': 'item'},
                    'series': graph_data,
                }).classes('w-full h-[60vh]')


@ui.refreshable
def dialog_game_editor(igdb_id: int):
    # data to display
    game_info = data.gl.loc[data.gl['IGDB_ID'] == igdb_id]
    if game_info.empty:
        ui.notify('Game not found, refresh UI and check database consistency')
        return
    game_index = game_info.index[0]
    pt_info = data.pt.loc[data.pt['IGDB_ID'] == igdb_id].sort_values(by=['Date'], ascending=False)
    pt_index = pt_info.index
    has_pt = not pt_info.empty

    # general confirmation dialog
    with ui.dialog() as confirmation, ui.card():
        ui.label('Are you sure?')
        with ui.row():
            ui.button('Delete', on_click=lambda: confirmation.submit(True))
            ui.button('Cancel', on_click=lambda: confirmation.submit(False))

    # game info section
    # with ui.dialog(value=True).props('persistent') as game_editor, ui.card().classes('w-1/3 h-3/4 items-center'):
    with ui.dialog(value=True).props('persistent'), ui.card().classes('w-1/3 h-3/4 items-center'):
        with ui.column().classes('w-full'):
            with ui.row().classes('w-full justify-between'):
                ui.label('')
                ui.label(game_info['Name'][game_index]).classes('text-xl flex-1 flex-wrap font-bold')
                with ui.row().classes('justify-end'):
                    async def remove_game():
                        delete = await confirmation
                        if delete:
                            try:
                                data.rem_game(game_index, pt_index)
                                ui.notify('Game removed successfully')
                                # todo: a bit hacky, deletes dialog by refreshing ui
                                refresh_ui()
                                # game_editor.delete()
                            except Exception as e:
                                ui.notify('Removal of game failed: ' + str(e))

                    def edit_game():
                        def action(new_status: str, new_platform: str, new_comment: str, editor_g):
                            try:
                                data.edit_game(game_index, platform=new_platform, status=new_status, comment=new_comment)
                                ui.notify('Game edited successfully')
                                dialog_game_editor.refresh()
                            except Exception as e:
                                ui.notify('Edit game not successful' + str(e))
                                editor_g.delete()

                        with ui.dialog(value=True) as d_editor_g, ui.card():
                            d_status = ui.select(config.status_list_played if has_pt else config.status_list_unplayed,
                                                 label='Status', with_input=True, value=game_info['Status'][game_index])
                            d_platform = ui.select(config.platform_list, label='Platform', with_input=True, value=game_info['Platform'][game_index])
                            d_comment = ui.input(label='Game comment', value=game_info['Game_comment'][game_index])
                            with ui.row():
                                ui.button('Commit', on_click=lambda: action(d_status.value, d_platform.value, d_comment.value, d_editor_g))
                                ui.button('Cancel', on_click=d_editor_g.delete)

                    ui.button(icon='remove_circle', on_click=remove_game).props('round color=red-10 size=sm')
                    ui.button(icon='edit', on_click=edit_game).props('round color=yellow-10 size=sm')
                    # todo: a bit hacky, closes by refreshing ui
                    ui.button(icon='close', on_click=refresh_ui).props('round color=blue-10 size=sm')
            with ui.grid(columns=2).classes('w-full items-center'):
                ui.image(game_info['IGDB_image'][game_index]).classes('w-full h-full')
                with ui.column():
                    with ui.grid(columns=2).classes('w-full break-words'):
                        ui.label('Platform')
                        ui.label(game_info['Platform'][game_index])
                        ui.label('Status')
                        ui.label(game_info['Status'][game_index])
                        ui.label('Release Status')
                        ui.label(get_release_status(game_info['Release_date'][game_index], game_info['IGDB_status'][game_index], dt.date.today()))
                        ui.label('Comment')
                        ui.label(game_info['Game_comment'][game_index])
                        ui.label('Steam ID and link')
                        tmp = game_info['Steam_ID'][game_index]
                        if tmp == 0:
                            ui.label("not available")
                        else:
                            ui.link(str(tmp), "https://store.steampowered.com/app/" + str(tmp), new_tab=True)
                        ui.label('IGDB ID and link')
                        ui.link(str(igdb_id), game_info['IGDB_url'][game_index], new_tab=True)
                        ui.label('Last IGDB API update')
                        with ui.row().classes('w-full items-center justify-between shrink-1 flex-nowrap'):
                            ui.label(game_info['IGDB_queried'][game_index].strftime("%Y-%m-%d %H:%M:%S"))
                            ui.button(icon='refresh', on_click=lambda: action_update_igdb_data(igdb_id)).props('round color=blue-10 size=sm')

            # add playthroughs section
            ui.separator()
            # todo: formatting is a bit weird, not sure how to fix yet
            with ui.row().classes('w-full flex-1 items-center'):
                def add_pt(new_status: str, new_date: dt.datetime, comment: str):
                    try:
                        data.add_pt(igdb_id, date=new_date, comment=comment)
                        data.edit_game(index=game_index, status=new_status)
                        ui.notify('Playthrough added successfully')
                        dialog_game_editor.refresh()
                    except Exception as e:
                        ui.notify('Add playthrough not successful: ' + str(e))

                pt_status = ui.select(config.status_list_played, label='Status', with_input=True,
                                      value=game_info['Status'][game_index] if has_pt else config.status_list_played[0]).classes('w-full flex-1')
                with ui.input('Date', value=dt.date.today().strftime("%Y-%m-%d")).classes('w-full flex-1') as pt_date:
                    with pt_date.add_slot('append'):
                        ui.icon('edit_calendar').on('click', lambda: menu.open()).classes('cursor-pointer')
                    with ui.menu() as menu:
                        ui.date().bind_value(pt_date)
                playthrough_comment = ui.input(label='Playthrough comment').classes('w-full flex-1')
                ui.button(icon='add_circle',
                          on_click=lambda: add_pt(pt_status.value, dt.datetime.strptime(pt_date.value, "%Y-%m-%d"),
                                                  playthrough_comment.value)).classes('w-auto h-auto').props('round color=green-10 size=sm')

            # playthrough info section
            if has_pt:
                ui.separator()
                for pt in pt_index:
                    def edit_pt(i_pt):
                        def action(j_pt, new_date, comment, editor_pt):
                            try:
                                data.edit_pt(index=j_pt, date=new_date, comment=comment)
                                ui.notify('Playthrough edited successfully')
                                dialog_game_editor.refresh()
                            except Exception as e:
                                ui.notify('Edit playthrough not successful: ' + str(e))
                                editor_pt.delete()

                        with ui.dialog(value=True) as d_editor_pt, ui.card():
                            with ui.input('Date', value=pt_info['Date'][i_pt].strftime("%Y-%m-%d")) as d_new_date:
                                with d_new_date.add_slot('append'):
                                    ui.icon('edit_calendar').on('click', lambda: d_menu.open()).classes('cursor-pointer')
                                with ui.menu() as d_menu:
                                    ui.date().bind_value(d_new_date)
                            d_comment = ui.input(label='Comment', value=pt_info['Playthrough_comment'][i_pt])
                            with ui.row():
                                ui.button('Commit',
                                          on_click=lambda: action(i_pt, dt.datetime.strptime(d_new_date.value, "%Y-%m-%d"), d_comment.value, d_editor_pt))
                                ui.button('Cancel', on_click=d_editor_pt.delete)

                    async def remove_pt(i_pt, i_gl):
                        delete = await confirmation
                        if delete:
                            try:
                                data.rem_pt(i_pt, i_gl)
                            except Exception as e:
                                ui.notify('Removal of playthrough failed: ' + str(e))
                                return
                            ui.notify('Playthrough removed successfully')
                            dialog_game_editor.refresh()

                    with ui.row().classes('w-full justify-between items-center'):
                        ui.label(pt_info['Date'][pt].strftime("%Y-%m-%d")).classes('font-bold')
                        ui.label(pt_info['Playthrough_comment'][pt])
                        with ui.row().classes('justify-end flex-0 items-center'):
                            ui.button(icon='edit', on_click=lambda x=pt: edit_pt(x)).props('round color=yellow-10 size=sm')
                            ui.button(icon='remove_circle', on_click=lambda x=pt: remove_pt(x, game_index)).props('round color=red-10 size=sm')


def display_aggrid(aggrid_data: pd.DataFrame, has_playthroughs=False, show_release_status=False):
    # todo: header styling, doesn't align/center headers, though, fix for that still open
    #       line height, flex and align seem to be ignored?
    ui.add_head_html("""
        <style>
            .ag-header-cell {
                font-weight: 600;
                font-size: 1.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }
        </style>
        """)
    aggrid_data.update(aggrid_data['IGDB_image'].apply(
        lambda x: f"""<style>img {{align-items: center; width: auto; height: 100%; object-fit: contain;}}</style><img src="{x}"/>"""))
    if show_release_status:
        today = dt.date.today()
        aggrid_data['Release_status'] = aggrid_data.apply(lambda x: get_release_status(x['Release_date'], x['IGDB_status'], today), axis=1)
    if has_playthroughs:
        aggrid_data['Comment'] = aggrid_data['Playthrough_comment'].replace({None: " "}) + " " + aggrid_data['Game_comment'].replace({None: " "})
        aggrid_data.drop(['Game_comment', 'Playthrough_comment'], axis=1, inplace=True)
    aggrid_data.drop(['IGDB_queried', 'Release_date', 'Steam_ID', 'IGDB_status', 'IGDB_url'], axis=1, inplace=True)
    with ui.row().classes('justify-center w-full h-full'):
        table = ui.aggrid.from_pandas(aggrid_data).classes('w-11/12 h-full')
        table.options['rowHeight'] = config.row_height
        table.options['defaultColDef'] = {'floatingFilter': config.show_filters,
                                          'filter': 'agTextColumnFilter',
                                          'minWidth': 128,
                                          'sortable': True,
                                          'resizable': True,
                                          'cellStyle': {'display': 'flex'},
                                          'cellClass': 'justify-center items-center text-base font-normal'
                                          }
        columns = [
            {'headerName': '', 'field': 'IGDB_image', 'cellDataType': 'object', 'maxWidth': 128, 'cellClass': 'justify-center', 'filter': False},
            {'headerName': 'ID', 'field': 'IGDB_id', 'hide': True},
            {'headerName': 'Name', 'field': 'Name', 'cellDataType': 'text', 'cellClass': 'justify-start items-center text-base font-medium', 'flex': 6}]
        if config.color_coding:
            columns.append({'headerName': 'Status', 'field': 'Status', 'cellDataType': 'text', 'flex': 2,
                            'cellClassRules': {'bg-red-50': 'x == "discarded"', 'bg-green-50': '["completed", "mastered"].includes(x)'}})
        else:
            columns.append({'headerName': 'Status', 'field': 'Status', 'cellDataType': 'text', 'flex': 2})
        if has_playthroughs:
            columns.append({'headerName': 'Date', 'field': 'Date', 'cellDataType': 'dateString', 'flex': 2})
        if show_release_status:
            columns.append({'headerName': 'Release Status', 'field': 'Release_status', 'cellDataType': 'text', 'flex': 2})
        columns.append({'headerName': 'Platform', 'field': 'Platform', 'cellDataType': 'text', 'flex': 2})
        if has_playthroughs:
            columns.append({'headerName': 'Comment', 'field': 'Comment', 'cellDataType': 'text', 'flex': 5,
                            'cellClass': 'justify-start items-center text-base font-normal'})
        else:
            columns.append({'headerName': 'Comment', 'field': 'Game_comment', 'cellDataType': 'text', 'flex': 5,
                            'cellClass': 'justify-start items-center text-base font-normal'})
        table.options['columnDefs'] = columns
        table.props(':html_columns="[0]"')
        table.on('cellClicked', lambda e: dialog_game_editor(e.args['data']['IGDB_ID']))


def display_cards(card_data: pd.DataFrame, has_playthroughs=False, show_release_status=False):
    with ui.row().classes('w-full h-0 justify-center'):
        for index, row in card_data.iterrows():
            with ui.card().classes(f'w-[{config.cards_width}rem]').on('click', lambda x=row['IGDB_ID']: dialog_game_editor(igdb_id=x)):
                with ui.row().classes('self-center'):
                    ui.label(row['Name']).classes('text-xl font-bold')
                with ui.row().classes('w-full'):
                    with ui.column().classes('w-8/12 h-full'):
                        ui.image(row['IGDB_image'])
                    with ui.column().classes('w-3/12 h-full items-center self-center'):
                        ui.label(row['Status']).classes('text-lg')
                        if has_playthroughs:
                            ui.label(row['Date'].strftime("%Y-%m-%d")).classes('text-lg')
                        if show_release_status:
                            ui.label(get_release_status(
                                row['Release_date'], row['IGDB_status'], dt.date.today())).classes('text-lg')
                        ui.label(row['Platform']).classes('text-lg')
                        if has_playthroughs:
                            ui.label(row['Playthrough_comment'] + "\n" + row['Game_comment'])
                        else:
                            ui.label(row['Game_comment'])


def get_release_status(timestamp: int, status: int, today: dt.date) -> str:
    if status == 4:
        return "early access"
    if not timestamp > 0:
        return "unknown"
    date = dt.date.fromtimestamp(timestamp)
    if date <= today:
        return "released"
    return date.strftime("%Y-%m-%d")


def action_save_db():
    try:
        data.write_dataframes()
        ui.notify('Database successfully updated')
    except Exception as e:
        ui.notify('Database update failed: ' + str(e))


def action_import_csv():
    try:
        imex.import_csv()
        refresh_ui()
        data.check_consistency()
        ui.notify('Successfully imported CSV files')
        ui.notify('API data will not be downloaded automatically, initiate in settings menu if needed')
    except Exception as e:
        ui.notify('CSV import not successful: ' + str(e))


def action_export_csv():
    try:
        imex.export_csv()
        ui.notify('Successfully exported CSV files')
    except Exception as e:
        ui.notify('CSV export not successful: ' + str(e))


def action_update_api_data():
    tmp = data.gl['IGDB_ID'].tolist()
    for x in tmp:
        igdb.update_id_queue.put(x)
    ui.notify('API data update queued')


def action_update_release_dates():
    tmp = data.gl[data.gl['Release_date'] == 0]['IGDB_ID'].tolist()
    for x in tmp:
        igdb.update_id_queue.put(x)
    ui.notify('API data update for all unknown release dates queued')


def action_refresh_acces_token():
    igdb.refresh_igdb_token()
    ui.notify('IGDB token renewed')


def action_update_igdb_data(igdb_id: int):
    igdb.update_id_queue.put(igdb_id)
    ui.notify('IGDB data update queued')


def action_add_unplayed_game(name: str, igdb_id: int, platform: str, status: str, comment: str, dialog=None):
    if igdb_id == "":
        try:
            igdb_id = igdb.get_id_to_name(name)
        except Exception as e:
            ui.notify('No ID supplied and name could not be resolved: ' + str(e))
            return
    try:
        data.add_game(name, igdb_id, platform, status, comment)
        refresh_ui()
        ui.notify('Game added succesfully')
        if dialog is not None:
            dialog.delete()
    except Exception as e:
        ui.notify('Add game not succesful: ' + str(e))
        return


def action_add_played_game(name: str, igdb_id: int, platform: str, date: dt.datetime, status: str,
                           game_comment: str, playthrough_comment: str, dialog=None):
    if igdb_id == "":
        try:
            igdb_id = igdb.get_id_to_name(name)
        except Exception as e:
            ui.notify('No ID supplied and name could not be resolved: ' + str(e))
            return
    try:
        action_add_unplayed_game(name=name, igdb_id=igdb_id, platform=platform, status=status, comment=game_comment)
    except Exception as e:
        ui.notify('Adding game not successful: ' + str(e))
        return
    try:
        data.add_pt(igdb_id=igdb_id, date=date, comment=playthrough_comment)
        refresh_ui()
        ui.notify('Playthrough added succesfully')
        if dialog is not None:
            dialog.delete()
    except Exception as e:
        ui.notify('Add playthrough not succesful: ' + str(e))
        try:
            gl_index = data.gl.index[data.gl['IGDB_ID'] == igdb_id][0]
            data.rem_game(index_gl=gl_index)
        except Exception as e:
            ui.notify('Game removal after unsuccessful attempt to add playthrough failed' + str(e))


def dialog_add_played_game():
    with ui.dialog(value=True) as dialog, ui.card():
        with ui.grid(columns=2):
            igdb_id = ui.input(label="IGDB ID")
            name = ui.input(label="Name")
            status = ui.select(config.status_list_played, label="Status", with_input=True, value=config.status_list_played[0])
            platform = ui.select(config.platform_list, label="Platform", with_input=True, value=config.platform_list[0])
        with ui.row():
            with ui.input('Date') as date:
                with date.add_slot('append'):
                    ui.icon('edit_calendar').on('click', lambda: menu.open()).classes('cursor-pointer')
                with ui.menu() as menu:
                    ui.date().bind_value(date)
            game_comment = ui.input(label='Game comment')
            playthrough_comment = ui.input(label="Playthrough comment")
        with ui.row():
            ui.button('Add', on_click=lambda: action_add_played_game(
                name.value, igdb_id.value, platform.value, dt.datetime.strptime(date.value, "%Y-%m-%d"), status.value,
                game_comment.value, playthrough_comment.value, dialog))
            ui.button('Cancel', on_click=lambda: dialog.delete())


def dialog_add_unplayed_game():
    with ui.dialog(value=True) as dialog, ui.card():
        with ui.grid(columns=2):
            igdb_id = ui.input(label='IGDB ID')
            name = ui.input(label='Name')
            status = ui.select(config.status_list_unplayed, label='Status', with_input=True, value=config.status_list_backlog[0])
            platform = ui.select(config.platform_list, label='Platform', with_input=True, value=config.platform_list[0])
            comment = ui.input(label='Comment')
        with ui.row():
            ui.button('Add', on_click=lambda: action_add_unplayed_game(
                name.value, igdb_id.value, platform.value, status.value, comment.value, dialog))
            ui.button('Cancel', on_click=lambda: dialog.delete())


def action_check_database_consistency():
    try:
        data.check_consistency()
    except Exception as e:
        ui.notify('Consistency issues found: ' + str(e))
        return
    ui.notify('The database looks fine!')


def action_purge_all_data():
    data.gl.drop(data.gl.index, inplace=True)
    data.pt.drop(data.pt.index, inplace=True)
    refresh_ui()
    ui.notify('All data removed from database. Databse not saved. Save database manually to delete data permanently.')


def action_match_ids_to_names(names: str):
    try:
        igdb.match_ids_to_names(names)
    except Exception as e:
        ui.notify('Name-to-ID list export not successful: ' + str(e))
        return
    ui.notify('Name-to-ID list successfully exported')
