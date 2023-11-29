from nicegui import app, ui
import datetime as dt
import pandas as pd
import numpy as np
import Slaanesh_config as config
import Slaanesh_data as data
import Slaanesh_importexport as imex
import Slaanesh_IGDB as igdb

dark = ui.dark_mode()
browser_dm = None

# general confirmation dialog
with ui.dialog() as confirmation, ui.card():
    ui.label('Are you sure?')
    with ui.row():
        ui.button('Do it!', on_click=lambda: confirmation.submit(True))
        ui.button('Cancel', on_click=lambda: confirmation.submit(False))


def refresh_ui():
    global dark
    dark.set_value(config.dark_mode)
    panel_overview.refresh()
    panel_playing.refresh()
    panel_played.refresh()
    panel_backlog.refresh()
    panel_wishlist.refresh()


async def handle_connection():
    global browser_dm
    browser_dm = await ui.run_javascript('''return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;''')
    refresh_ui()


def display_ui():
    global dark
    dark.set_value(config.dark_mode)
    with ui.column().classes('w-full h-[95vh] flex-nowrap'):
        ui_header()
        tabs_lists()
    app.on_connect(handle_connection)
    ui.run(title=config.gt_name, favicon=config.file_icon, reload=False)


def ui_header():
    with ui.grid(columns=3).classes('w-full'):
        with ui.row().classes('justify-center items-center'):
            ui.image(config.file_icon).classes('w-12')
            ui.label(config.gt_name).classes('text-4xl')
        with ui.row().classes('justify-center items-center'):
            ui.button(text='Add game', icon='add_circle', on_click=action_add_game)
        with ui.row().classes('justify-center items-center'):
            ui.button(icon='refresh', on_click=lambda: refresh_ui()).props('round')
            ui.button(icon='build', on_click=lambda: dialog_tools()).props('round')
            ui.button(icon='settings', on_click=lambda: dialog_settings()).props('round')
            ui.button(icon='question_mark', on_click=lambda: dialog_about()).props('round')
    ui.separator()


def dialog_settings():
    async def update_config(check_confirm=True, button=None,
                            platforms=None, played_pos=None, played_neg=None, playing=None, backlog=None, wishlist=None,
                            dark_mode=None, color_coding=None, row_height=None, card_width=None,
                            type_playing=None, type_played=None, type_backlog=None, type_wishlist=None,
                            filter_playing=None, filter_played=None, filter_backlog=None, filter_wishlist=None):
        if check_confirm:
            confirm = await confirmation
        else:
            confirm = True
        if confirm:
            if button:
                button.set_visibility(False)
            try:
                config.update_config(new_platform_list=platforms, new_backlog=backlog, new_playing=playing,
                                     new_wishlist=wishlist, new_played_neg=played_neg, new_played_pos=played_pos,
                                     new_dark_mode=dark_mode, new_color_coding=color_coding, new_row_height=row_height, new_cards_width=card_width,
                                     new_type_playing=type_playing, new_type_played=type_played, new_type_backlog=type_backlog,
                                     new_type_wishlist=type_wishlist, new_filter_playing=filter_playing, new_filter_played=filter_played,
                                     new_filter_backlog=filter_backlog, new_filter_wishlist=filter_wishlist)
                ui.notify('Successfully updated config file')
                refresh_ui()
            except Exception as e:
                ui.notify('Config update failed: ' + str(e))

    with ui.dialog(value=True) as dialog, ui.card().classes('w-3/4'):
        with ui.row().classes('w-full justify-end'):
            ui.button(icon='close', on_click=lambda: dialog.delete()).props('round size=sm')

        # General UI settings
        with ui.scroll_area().classes('h-[70vh]'):
            with ui.card().classes('w-full'):
                with ui.row():
                    ui.label('General UI settings').classes('text-lg font-bold w-full')
                with ui.grid(columns=4).classes('justify-center items-center w-full'):
                    with ui.row().classes('items-center flex-nowrap'):
                        new_dark_mode = ui.checkbox(text='Dark mode', value=config.dark_mode,
                                                    on_change=lambda: save_dark_mode.set_visibility(True))
                        new_dark_mode.props(add='toggle-indeterminate')
                        new_dark_mode.props(add='indeterminate-value="default"')
                        save_dark_mode = ui.button(icon='save', on_click=lambda: update_config(button=save_dark_mode, check_confirm=False,
                                                                                               dark_mode=new_dark_mode.value)).props('round size=sm')
                        save_dark_mode.set_visibility(False)
                    with ui.row().classes('items-center flex-nowrap'):
                        new_color_coding = ui.checkbox(text='Color coding', value=config.color_coding,
                                                       on_change=lambda: save_color_coding.set_visibility(True))
                        save_color_coding = ui.button(icon='save',
                                                      on_click=lambda: update_config(button=save_color_coding, check_confirm=False,
                                                                                     color_coding=new_color_coding.value)).props('round size=sm')
                        save_color_coding.set_visibility(False)
                    with ui.row().classes('items-center flex-nowrap'):
                        new_row_height = ui.number(label='Row height (px)', value=config.row_height, format='%d',
                                                   on_change=lambda: save_row_height.set_visibility(True))
                        save_row_height = ui.button(icon='save', on_click=lambda: update_config(button=save_row_height, check_confirm=False,
                                                                                                row_height=new_row_height.value)).props('round size=sm')
                        save_row_height.set_visibility(False)
                    with ui.row().classes('items-center flex-nowrap'):
                        new_card_width = ui.number(label='Card width (rem)', value=config.cards_width, format='%d',
                                                   on_change=lambda: save_card_width.set_visibility(True))
                        save_card_width = ui.button(icon='save', on_click=lambda: update_config(button=save_card_width, check_confirm=False,
                                                                                                card_width=new_card_width.value)).props('round size=sm')
                        save_card_width.set_visibility(False)

            # Tabs settings
            with ui.card().classes('w-full'):
                with ui.row():
                    ui.label('Tab layout').classes('text-lg font-bold w-full')
                with ui.grid(columns=2):
                    with ui.card():
                        with ui.row().classes('justify-center items-center flex-nowrap w-full font-bold'):
                            ui.label('Playing')
                            s_playing = ui.button(icon='save',
                                                  on_click=lambda: update_config(button=s_playing, check_confirm=False,
                                                                                 type_playing=playing_type.value,
                                                                                 filter_playing=playing_filter.value)).props('round size=sm')
                            s_playing.set_visibility(False)
                        with ui.row().classes('justify-center items-center flex-nowrap w-full'):
                            playing_type = ui.select(config.display_types, label='Style', value=config.type_playing,
                                                     on_change=lambda: s_playing.set_visibility(True))
                            playing_filter = ui.checkbox(text='Filter', value=config.filter_playing,
                                                         on_change=lambda: s_playing.set_visibility(True))
                    with ui.card():
                        with ui.row().classes('justify-center items-center flex-nowrap w-full font-bold'):
                            ui.label('Played')
                            s_played = ui.button(icon='save',
                                                 on_click=lambda: update_config(button=s_played, check_confirm=False,
                                                                                type_played=played_type.value,
                                                                                filter_played=played_filter.value)).props('round size=sm')
                            s_played.set_visibility(False)
                        with ui.row().classes('justify-center items-center flex-nowrap w-full'):
                            played_type = ui.select(config.display_types, label='Style', value=config.type_played,
                                                    on_change=lambda: s_played.set_visibility(True))
                            played_filter = ui.checkbox(text='Filter', value=config.filter_played,
                                                        on_change=lambda: s_played.set_visibility(True))
                    with ui.card():
                        with ui.row().classes('justify-center items-center flex-nowrap w-full font-bold'):
                            ui.label('Backlog')
                            s_backlog = ui.button(icon='save',
                                                  on_click=lambda: update_config(button=s_backlog, check_confirm=False,
                                                                                 type_backlog=backlog_type.value,
                                                                                 filter_backlog=backlog_filter.value)).props('round size=sm')
                            s_backlog.set_visibility(False)
                        with ui.row().classes('justify-center items-center flex-nowrap w-full'):
                            backlog_type = ui.select(config.display_types, label='Style', value=config.type_backlog,
                                                     on_change=lambda: s_backlog.set_visibility(True))
                            backlog_filter = ui.checkbox(text='Filter', value=config.filter_backlog,
                                                         on_change=lambda: s_backlog.set_visibility(True))
                    with ui.card():
                        with ui.row().classes('justify-center items-center flex-nowrap w-full font-bold'):
                            ui.label('Wishlist')
                            s_wishlist = ui.button(icon='save',
                                                   on_click=lambda: update_config(button=s_wishlist, check_confirm=False,
                                                                                  type_wishlist=wishlist_type.value,
                                                                                  filter_wishlist=wishlist_filter.value)).props('round size=sm')
                            s_wishlist.set_visibility(False)
                        with ui.row().classes('justify-center items-center flex-nowrap w-full'):
                            wishlist_type = ui.select(config.display_types, label='Style', value=config.type_wishlist,
                                                      on_change=lambda: s_wishlist.set_visibility(True))
                            wishlist_filter = ui.checkbox(text='Filter', value=config.filter_wishlist,
                                                          on_change=lambda: s_wishlist.set_visibility(True))

            # Platform and category settings
            with ui.card().classes('w-full'):
                with ui.row():
                    ui.label('Platforms and categories').classes('text-lg font-bold w-full')
                with ui.row().classes('justify-between items-center flex-nowrap w-full'):
                    new_platform_list = ui.input(label='Platforms', value=config.platform_list,
                                                 on_change=lambda: save_platforms.set_visibility(True)).classes('w-full')
                    save_platforms = ui.button(icon='save', on_click=lambda: update_config(button=save_platforms,
                                                                                           platforms=new_platform_list.value)).props('round size=sm')
                    save_platforms.set_visibility(False)
                with ui.row().classes('justify-between items-center flex-nowrap w-full'):
                    new_playing = ui.input(label='Playing', value=config.status_list_playing,
                                           on_change=lambda: save_playing.set_visibility(True)).classes('w-full')
                    save_playing = ui.button(icon='save', on_click=lambda: update_config(button=save_playing,
                                                                                         playing=new_playing.value)).props('round size=sm')
                    save_playing.set_visibility(False)
                with ui.row().classes('justify-between items-center flex-nowrap w-full'):
                    new_played_pos = ui.input(label='Played positive', value=config.status_list_played_pos,
                                              on_change=lambda: save_played_pos.set_visibility(True)).classes('w-full')
                    save_played_pos = ui.button(icon='save', on_click=lambda: update_config(button=save_played_pos,
                                                                                            played_pos=new_played_pos.value)).props('round size=sm')
                    save_played_pos.set_visibility(False)
                with ui.row().classes('justify-between items-center flex-nowrap w-full'):
                    new_played_neg = ui.input(label='Played negative', value=config.status_list_played_neg,
                                              on_change=lambda: save_played_neg.set_visibility(True)).classes('w-full')
                    save_played_neg = ui.button(icon='save', on_click=lambda: update_config(button=save_played_neg,
                                                                                            played_neg=new_played_neg.value)).props('round size=sm')
                    save_played_neg.set_visibility(False)
                with ui.row().classes('justify-between items-center flex-nowrap w-full'):
                    new_backlog = ui.input(label='Backlog', value=config.status_list_backlog,
                                           on_change=lambda: save_backlog.set_visibility(True)).classes('w-full')
                    save_backlog = ui.button(icon='save', on_click=lambda: update_config(button=save_backlog,
                                                                                         backlog=new_backlog.value)).props('round size=sm')
                    save_backlog.set_visibility(False)
                with ui.row().classes('justify-between items-center flex-nowrap w-full'):
                    new_wishlist = ui.input(label='Wishlist', value=config.status_list_wishlist,
                                            on_change=lambda: save_wishlist.set_visibility(True)).classes('w-full')
                    save_wishlist = ui.button(icon='save', on_click=lambda: update_config(button=save_wishlist,
                                                                                          wishlist=new_wishlist.value)).props('round size=sm')
                    save_wishlist.set_visibility(False)


def dialog_tools():
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
        with ui.card():
            with ui.row():
                ui.label("Database operations").classes('text-lg font-bold')
            with ui.row():
                async def purge_data():
                    confirm = await confirmation
                    if confirm:
                        action_purge_all_data()

                ui.button('Check database consistency', on_click=lambda: action_check_database_consistency())
                ui.button('Purge all data', on_click=purge_data)
        with ui.card().classes('w-full'):
            with ui.row():
                ui.label('Match IGDB IDs to names').classes('text-lg font-bold')
            with ui.row().classes('w-full'):
                namelist = ui.textarea(label='List of names',
                                       placeholder='Enter one name per line, results will be saved in export directory').classes('w-full')
                ui.button('Export ID list', on_click=lambda: action_match_ids_to_names(namelist.value))


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
    with ui.tabs().classes('w-5/6 self-center') as tabs:
        tab_ov = ui.tab('Overview').classes('grow')
        tab_pl = ui.tab('Playing').classes('grow')
        tab_pt = ui.tab('Played').classes('grow')
        tab_bl = ui.tab('Backlog').classes('grow')
        tab_wl = ui.tab('Wishlist').classes('grow')
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
    match config.type_playing:
        case 'cards': x = display_cards
        case 'alt_table': x = display_table
        case 'table': x = display_aggrid
        case _: x = display_aggrid
    x(res, has_playthroughs=False, show_release_status=False, show_filter=config.filter_playing)


@ui.refreshable
def panel_played():
    res = pd.merge(data.pt, data.gl, how='left', on='IGDB_ID')
    res['Platform'] = pd.Categorical(res['Platform'], config.platform_list)
    res['Status'] = pd.Categorical(res['Status'], config.status_list_played)
    res.sort_values(by='Date', ascending=False, inplace=True)
    match config.type_played:
        case 'cards': x = display_cards
        case 'alt_table': x = display_table
        case 'table': x = display_aggrid
        case _: x = display_aggrid
    x(res, has_playthroughs=True, show_release_status=False, show_filter=config.filter_played)


@ui.refreshable
def panel_backlog():
    res = data.gl[data.gl.Status.isin(config.status_list_backlog)].copy()
    res['Platform'] = pd.Categorical(res['Platform'], config.platform_list)
    res['Status'] = pd.Categorical(res['Status'], config.status_list_backlog)
    res.sort_values(by=['Status', 'Platform', 'Game_comment'], inplace=True)
    match config.type_backlog:
        case 'cards': x = display_cards
        case 'alt_table': x = display_table
        case 'table': x = display_aggrid
        case _: x = display_aggrid
    x(res, has_playthroughs=False, show_release_status=False, show_filter=config.filter_backlog)


@ui.refreshable
def panel_wishlist():
    res = data.gl[data.gl.Status.isin(config.status_list_wishlist)].copy()
    res['Platform'] = pd.Categorical(res['Platform'], config.platform_list)
    res['Status'] = pd.Categorical(res['Status'], config.status_list_wishlist)
    res.sort_values(by=['Status', 'Platform', 'Release_date', 'Game_comment'], key=lambda col: col.replace(0, np.nan), na_position='last', inplace=True)
    match config.type_wishlist:
        case 'cards': x = display_cards
        case 'alt_table': x = display_table
        case 'table': x = display_aggrid
        case _: x = display_aggrid
    x(res, has_playthroughs=False, show_release_status=True, show_filter=config.filter_wishlist)


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
                    'yAxis': {'type': 'value', 'splitLine': {'lineStyle': {'color': '#333' if dark_table() else '#eee'}}},
                    'xAxis': {'type': 'category', 'data': ['Games', 'Playthroughs']},
                    'tooltip': {'trigger': 'item'},
                    'series': {'type': 'bar', 'data': [len(data.gl.index.to_list()), len(data.pt.index.to_list())],
                               'label': {'normal': {'show': True, 'position': 'top', 'textStyle': {'color': 'white' if dark_table() else 'black'}}}},
                })
            with ui.row().classes('justify-center w-full'):
                ui.echart({
                    'yAxis': {'type': 'log', 'splitLine': {'lineStyle': {'color': '#333' if dark_table() else '#eee'}}},
                    'xAxis': {'type': 'category', 'data': ['Playing', 'Played', 'Backlog', 'Wishlist']},
                    'tooltip': {'trigger': 'item'},
                    'series': {'type': 'bar', 'data': [sum(data.gl['Status'].isin(config.status_list_playing)),
                                                       sum(data.gl['Status'].isin(config.status_list_played)),
                                                       sum(data.gl['Status'].isin(config.status_list_backlog)),
                                                       sum(data.gl['Status'].isin(config.status_list_wishlist))],
                               'label': {'normal': {'show': True, 'position': 'top', 'textStyle': {'color': 'white' if dark_table() else 'black'}}}},
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
                               'series': {'type': 'pie', 'data': graph_data,
                                          'label': {'show': True, 'textStyle': {'color': 'white' if dark_table() else 'black'}}}})

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
                        'yAxis': {'type': 'log', 'splitLine': {'lineStyle': {'color': '#333' if dark_table() else '#eee'}}},
                        'xAxis': {'type': 'category', 'data': platform_names},
                        'tooltip': {'trigger': 'item'},
                        'series': {'type': 'bar', 'data': graph_data,
                                   'label': {'normal': {'show': True, 'position': 'top', 'textStyle': {'color': 'white' if dark_table() else 'black'}}}},
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
                    graph_data.append({'type': 'bar', 'name': status, 'data': yearly_data,
                                       'label': {'normal': {'show': True, 'position': 'right',
                                                            'textStyle': {'color': 'white' if dark_table() else 'black'}}}})

                ui.echart({
                    'xAxis': {'type': 'value', 'splitLine': {'lineStyle': {'color': '#333' if dark_table() else '#eee'}}},
                    'yAxis': {'type': 'category', 'data': list_years, 'inverse': True},
                    'legend': {'show': True, 'textStyle': {'color': 'white' if dark_table() else 'black'}},
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

    # game info section
    # with ui.dialog(value=True).props('persistent') as game_editor, ui.card().classes('w-1/3 h-3/4 items-center'):
    with ui.dialog(value=True).props('persistent'), ui.card().classes('w-1/2 min-w-[32rem] h-3/4 items-center'):
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
                                                 label='Status', value=game_info['Status'][game_index])
                            d_platform = ui.select(config.platform_list, label='Platform', value=game_info['Platform'][game_index])
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
            with ui.row().classes('w-full flex-1 items-center'):
                def add_pt(new_status: str, new_date: dt.datetime, comment: str):
                    try:
                        data.add_pt(igdb_id, date=new_date, comment=comment)
                        data.edit_game(index=game_index, status=new_status)
                        ui.notify('Playthrough added successfully')
                        dialog_game_editor.refresh()
                    except Exception as e:
                        ui.notify('Add playthrough not successful: ' + str(e))

                pt_status = ui.select(config.status_list_played, label='Status',
                                      value=game_info['Status'][game_index] if has_pt else config.status_list_played[0]).classes('w-1/4 flex-1')
                with ui.input('Date', value=dt.date.today().strftime("%Y-%m-%d")).classes('w-1/4 flex-1') as pt_date:
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


def display_table(table_data: pd.DataFrame, has_playthroughs=False, show_release_status=False, use_cards=False, show_filter=True):
    if show_release_status:
        today = dt.date.today()
        table_data['Release_status'] = table_data.apply(lambda x: get_release_status(x['Release_date'], x['IGDB_status'], today), axis=1)
    if has_playthroughs:
        table_data['StrDate'] = table_data['Date'].apply(lambda x: x.strftime('%Y-%m-%d'))
        table_data['Comment'] = table_data['Playthrough_comment'].replace({None: " "}) + " " + table_data['Game_comment'].replace({None: " "})
        table_data.drop(['Game_comment', 'Playthrough_comment', 'Date'], axis=1, inplace=True)
    table_data.drop(['IGDB_queried', 'Release_date', 'Steam_ID', 'IGDB_status', 'IGDB_url'], axis=1, inplace=True)

    columns = [{'name': 'Image', 'label': '', 'field': 'IGDB_image', 'align': 'center'},
               {'name': 'Name', 'label': 'Name', 'field': 'Name', 'align': 'left',
                'sortable': True, 'headerStyle': 'font-size: 1.25rem; font-weight: 600', 'style': 'font-size: 1rem;'},
               {'name': 'Status', 'label': 'Status', 'field': 'Status', 'align': 'center',
                'sortable': True, 'headerStyle': 'font-size: 1.25rem; font-weight: 600', 'style': 'font-size: 1rem;'}]
    if has_playthroughs:
        columns.append({'name': 'Date', 'label': 'Date', 'field': 'StrDate', 'align': 'center',
                        'sortable': True, 'headerStyle': 'font-size: 1.25rem; font-weight: 600', 'style': 'font-size: 1rem;'})
    if show_release_status:
        columns.append({'name': 'Release Status', 'label': 'Release Status', 'field': 'Release_status', 'align': 'center',
                        'sortable': True, 'headerStyle': 'font-size: 1.25rem; font-weight: 600', 'style': 'font-size: 1rem;'})
    columns.append({'name': 'Platform', 'label': 'Platform', 'field': 'Platform', 'align': 'center',
                    'sortable': True, 'headerStyle': 'font-size: 1.25rem; font-weight: 600', 'style': 'font-size: 1rem;'})
    if has_playthroughs:
        columns.append({'name': 'Comment', 'label': 'Comment', 'field': 'Comment', 'align': 'left',
                        'sortable': True, 'headerStyle': 'font-size: 1.25rem; font-weight: 600', 'style': 'font-size: 1rem;'})
    else:
        columns.append({'name': 'Game_comment', 'label': 'Comment', 'field': 'Game_comment', 'align': 'left',
                        'sortable': True, 'headerStyle': 'font-size: 1.25rem; font-weight: 600', 'style': 'font-size: 1rem;'})
    rows = table_data.to_dict('records')
    with ui.row().classes('justify-center w-full h-0'):
        table = ui.table(columns=columns, rows=rows, pagination=10).classes('w-11/12')

        if use_cards:
            table.props(add='grid')
            # todo: not working properly, fix
            table.props(add=r'''
                <div class="q-pa-xs col-xs-12 col-sm-6 col-md-4">
                  <q-card flat bordered>
                    <q-card-section class="text-center">
                      Test line
                      <br>
                      <strong>{{ props.row.Name }}</strong>
                    </q-card-section>
                    <q-separator />
                    <q-card-section class="flex flex-center">
                      <div>{{ props.row.Status }}</div>
                    </q-card-section>
                  </q-card>
                </div>
            ''')
        else:
            table.on('rowClick', lambda x: dialog_game_editor(x.args[1]['IGDB_ID']))
            if show_filter:
                with table.add_slot('top-right'):
                    table_filter = ui.input(label='Search')
                table.bind_filter(table_filter, 'value')

            if config.color_coding:
                table.add_slot('body-cell-Status', f'''
                    <q-td v-if="{config.status_list_played_neg}.includes(props.value)" key="Status" :props="props">
                        <q-badge color='red-10'><p style='font-size: 1rem;'>{{{{ props.value }}}}</p></q-badge>
                    </q-td>
                    <q-td v-else-if="{config.status_list_played_pos}.includes(props.value)" key="Status" :props="props">
                        <q-badge color='green-10'><p style='font-size: 1rem;'>{{{{ props.value }}}}</p></q-badge>
                    </q-td>
                    <q-td v-else key="Status" :props="props">
                        <p style='font-size: 1rem;'>{{{{ props.value }}}}</p>
                    </q-td>
                ''')
            table.add_slot('body-cell-Image', f'''
                <q-td :props="props">
                    <q-img :src="props.row.IGDB_image" style="width: {config.row_height*0.75}px;">
                </q-td>
            ''')


def dark_table():
    if config.dark_mode is None:
        return browser_dm
    else:
        return config.dark_mode


def display_aggrid(aggrid_data: pd.DataFrame, has_playthroughs=False, show_release_status=False, show_filter=True):
    dark_res = dark_table()

    def color_badges(val):
        if val in config.status_list_played_pos:
            if dark_res:
                return """<span class="bg-green-900 px-3 py-2 rounded">""" + val + """</span>"""
            else:
                return """<span class="bg-green-100 px-3 py-2 rounded">""" + val + """</span>"""
        if val in config.status_list_played_neg:
            if dark_res:
                return """<span class="bg-red-900 px-3 py-2 rounded">""" + val + """</span>"""
            else:
                return """<span class="bg-red-100 px-3 py-2 rounded">""" + val + """</span>"""
        return val

    # todo: doesn't align/center headers - line height, flex and align seem to be ignored?
    ui.add_head_html("""
        <style>
            .ag-header-cell {
                font-weight: 600;
                font-size: 1.125rem;
            }
        </style>
        """)
    aggrid_data.update(aggrid_data['IGDB_image'].apply(
        lambda x: f"""<style>img {{align-items: center; width: auto; height: 100%; object-fit: contain;}}</style><img src="{x}"/>"""))
    if show_release_status:
        today = dt.date.today()
        aggrid_data['Release_status'] = aggrid_data.apply(lambda x: get_release_status(x['Release_date'], x['IGDB_status'], today), axis=1)
    if has_playthroughs:
        aggrid_data['StrDate'] = aggrid_data['Date'].apply(lambda x: x.strftime('%Y-%m-%d'))
        aggrid_data['Comment'] = aggrid_data['Playthrough_comment'].replace({None: " "}) + " " + aggrid_data['Game_comment'].replace({None: " "})
        aggrid_data.drop(['Game_comment', 'Playthrough_comment', 'Date'], axis=1, inplace=True)
    if config.color_coding:
        aggrid_data['Status'] = aggrid_data.apply(lambda x: color_badges(x['Status']), axis=1)
    aggrid_data.drop(['IGDB_queried', 'Release_date', 'Steam_ID', 'IGDB_status', 'IGDB_url'], axis=1, inplace=True)
    with ui.row().classes('justify-center w-full h-full'):
        columns = [
            {'headerName': '', 'field': 'IGDB_image', 'cellDataType': 'object', 'maxWidth': 128, 'cellClass': 'justify-center', 'filter': False},
            {'headerName': 'ID', 'field': 'IGDB_id', 'hide': True},
            {'headerName': 'Name', 'field': 'Name', 'cellDataType': 'text', 'cellClass': 'justify-start items-center text-base font-medium', 'flex': 6},
            {'headerName': 'Status', 'field': 'Status', 'cellDataType': 'text', 'flex': 2}]
        if has_playthroughs:
            columns.append({'headerName': 'Date', 'field': 'StrDate', 'cellDataType': 'dateString', 'flex': 2})
        if show_release_status:
            columns.append({'headerName': 'Release Status', 'field': 'Release_status', 'cellDataType': 'text', 'flex': 2})
        columns.append({'headerName': 'Platform', 'field': 'Platform', 'cellDataType': 'text', 'flex': 2})
        if has_playthroughs:
            columns.append({'headerName': 'Comment', 'field': 'Comment', 'cellDataType': 'text', 'flex': 5,
                            'cellClass': 'justify-start items-center text-base font-normal'})
        else:
            columns.append({'headerName': 'Comment', 'field': 'Game_comment', 'cellDataType': 'text', 'flex': 5,
                            'cellClass': 'justify-start items-center text-base font-normal'})
        default_col_def = {'floatingFilter': show_filter,
                           'filter': 'agTextColumnFilter',
                           'minWidth': 128,
                           'sortable': True,
                           'resizable': True,
                           'cellStyle': {'display': 'flex'},
                           'cellClass': 'justify-center items-center text-base font-normal'}
        row_data = aggrid_data.to_dict('records')
        table = ui.aggrid({'columnDefs': columns, 'rowData': row_data, 'rowHeight': config.row_height, 'defaultColDef': default_col_def},
                          theme=("alpine-dark" if dark_res else "alpine"),
                          html_columns=[0, 3],
                          auto_size_columns=False).classes('w-11/12 h-full')
        table.on('cellClicked', lambda e: dialog_game_editor(e.args['data']['IGDB_ID']))


def display_cards(card_data: pd.DataFrame, has_playthroughs=False, show_release_status=False, show_filter=False):
    if show_filter:
        print('filter for cards not yet implemented')  # todo: implement
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
    igdb.start_update_daemon()
    ui.notify('API data update queued')


def action_update_release_dates():
    relevance = (data.gl['Release_date'] == 0) | (data.gl['Status'].isin(config.status_list_wishlist))
    for x in data.gl[relevance]['IGDB_ID'].tolist():
        igdb.update_id_queue.put(x)
    igdb.start_update_daemon()
    ui.notify('Update for wishlist and all unknown release dates queued')


def action_refresh_acces_token():
    igdb.refresh_igdb_token()
    ui.notify('IGDB token renewed')


def action_update_igdb_data(igdb_id: int):
    data.rem_cover(igdb_id)
    igdb.update_id_queue.put(igdb_id)
    igdb.start_update_daemon()
    ui.notify('IGDB data update queued')


async def action_add_game():
    with ui.dialog() as dialog_ag, ui.card():
        with ui.row().classes('items-center flex-nowrap'):
            d_add_by_id = ui.switch('Add by', value=True)
            d_igdb_id = ui.input(label="IGDB ID").bind_visibility_from(d_add_by_id, 'value')
            d_name = ui.input(label="Name").bind_visibility_from(d_add_by_id, 'value', backward=lambda x: not x)
        with ui.row().classes('items-center flex-nowrap'):
            d_status_g = ui.select(config.status_list_unplayed, label="Status", value=config.status_list_unplayed[0]).classes('w-1/4')
            d_platform = ui.select(config.platform_list, label="Platform", value=config.platform_list[0]).classes('w-1/4')
            d_game_comment = ui.input(label='Game comment').classes('w-5/12')
        with ui.row().classes('items-center flex-nowrap'):
            d_add_pt = ui.checkbox('Also add playthrough', value=False)
            d_status_g.bind_visibility_from(d_add_pt, 'value', backward=lambda x: not x)
        with ui.row().classes('items-center flex-nowrap').bind_visibility_from(d_add_pt, 'value'):
            d_status_pt = ui.select(config.status_list_played, label="Status", value=config.status_list_played[0])
            d_status_pt.bind_visibility_from(d_add_pt, 'value').classes('w-1/4')
            with ui.input('Date', value=dt.date.today().strftime("%Y-%m-%d")).classes('w-1/4') as d_date:
                with d_date.add_slot('append'):
                    ui.icon('edit_calendar').on('click', lambda: menu.open()).classes('cursor-pointer')
                with ui.menu() as menu:
                    ui.date().bind_value(d_date).bind_visibility_from(d_add_pt)
            d_playthrough_comment = ui.input(label="Playthrough comment").classes('w-5/12')
        with ui.row():
            ui.button('Add', on_click=lambda: dialog_ag.submit([
                d_add_by_id.value, d_igdb_id.value, d_name.value, d_status_g.value, d_platform.value, d_game_comment.value, d_add_pt.value,
                d_status_pt.value, dt.datetime.strptime(d_date.value, "%Y-%m-%d"), d_playthrough_comment.value]))
            ui.button('Cancel', on_click=lambda: dialog_ag.submit(False))

    res = await dialog_ag
    if res:
        add_by_id, igdb_id, name, status_g, platform, game_comment, add_pt, status_pt, date, playthrough_comment = res
        if not add_by_id:
            try:
                igdb_id = igdb.get_id_to_name(name)
            except Exception as e:
                ui.notify('Name could not be resolved: ' + str(e))
                return
        try:
            data.add_game(name=name, igdb_id=igdb_id, platform=platform, status=(status_pt if add_pt else status_g), comment=game_comment)
            ui.notify('Game added succesfully')
        except Exception as e:
            ui.notify('Adding game not successful: ' + str(e))
            return
        if add_pt:
            try:
                data.add_pt(igdb_id=igdb_id, date=date, comment=playthrough_comment)
                ui.notify('Playthrough added succesfully')
            except Exception as e:
                ui.notify('Add playthrough not succesful: ' + str(e))
                try:
                    gl_index = data.gl.index[data.gl['IGDB_ID'] == igdb_id][0]
                    data.rem_game(index_gl=gl_index)
                except Exception as e:
                    ui.notify('Game removal after unsuccessful attempt to add playthrough failed' + str(e))
        refresh_ui()


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
    ui.notify('All data removed from database. Database not saved. Any further actions (e.g. add game) will save the database and make this permanent.')


def action_match_ids_to_names(names: str):
    try:
        igdb.match_ids_to_names(names)
    except Exception as e:
        ui.notify('Name-to-ID list export not successful: ' + str(e))
        return
    ui.notify('Name-to-ID list successfully exported')
