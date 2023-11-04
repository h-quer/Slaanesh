from igdb.wrapper import IGDBWrapper
import datetime as dt
import requests
import json
import pandas as pd
import time
import Slaanesh_config as config
import Slaanesh_data as data
import Slaanesh_importexport as imex
import threading
import queue

igdb = IGDBWrapper(config.client_id, config.auth_token)
update_id_queue = queue.Queue()

request_limit = 105


def init_api() -> bool:
    global igdb
    igdb = IGDBWrapper(config.client_id, config.auth_token)
    check_igdb_token()
    threading.Thread(target=igdb_update_daemon, daemon=True).start()
    return True


def igdb_update_daemon():
    while True:
        time.sleep(10)
        id_list = list()
        i = 0
        while (i < request_limit - 5) and (not update_id_queue.empty()):
            i = i+1
            try:
                item = update_id_queue.get()
            except Exception as e:
                print(str(e))
                continue
            if item in id_list:
                update_id_queue.task_done()
                continue
            tmp = data.gl.index[data.gl['IGDB_ID'] == item].tolist()
            check = data.gl.at[tmp[0], 'IGDB_queried'] + dt.timedelta(hours=config.data_refresh_limit) > dt.datetime.now()
            if check:
                update_id_queue.task_done()
                continue
            id_list.append(item)
            update_id_queue.task_done()
        if id_list:
            id_tuple = tuple(id_list)
            new_data = collect_game_info(id_tuple)
            data.update_igdb_data(new_data)


def check_igdb_token() -> bool:
    expiry_datetime = dt.datetime.strptime(config.token_timestamp, "%Y-%m-%d %H:%M:%S")
    if dt.datetime.now() > expiry_datetime:
        refresh_igdb_token()
    return True


def refresh_igdb_token() -> bool:
    now = dt.datetime.now()
    url = 'https://id.twitch.tv/oauth2/token'
    params = {'client_id': config.client_id,
              'client_secret': config.client_secret,
              'grant_type': 'client_credentials'}
    response = requests.post(url, json=params)
    json_response = json.loads(response.text)
    dataframe_response = pd.json_normalize(json_response)
    expiry_timestamp = now + dt.timedelta(seconds=int(dataframe_response['expires_in'][0])) - dt.timedelta(days=2)
    expiry_string = dt.datetime.strftime(expiry_timestamp, "%Y-%m-%d %H:%M:%S")
    config.update_config(dataframe_response['access_token'][0], expiry_string)
    return True


def collect_game_info(query_list: tuple) -> pd.DataFrame:
    timestamp = dt.datetime.now()
    if len(query_list) == 1:
        query_str = query_list[0]
    else:
        query_str = f"{query_list}"
    name_url_status_release = process_api_data(query_ids(query_str)).rename(
        columns={"id": "IGDB_ID", "name": "Name", "url": "IGDB_url", "first_release_date": "Release_date", "status": "IGDB_status"})
    if 'IGDB_status' not in name_url_status_release.columns:
        name_url_status_release['IGDB_status'] = 0
    if 'Release_date' not in name_url_status_release.columns:
        name_url_status_release['Release_date'] = 0
    steam_id = process_api_data(query_websites(query_str)).rename(columns={"game": "IGDB_ID", "url": "Steam_ID"})
    if steam_id.empty:
        steam_id = pd.DataFrame(columns=['IGDB_ID', 'Steam_ID'])
    cover = process_api_data(query_covers(query_str)).rename(columns={"game": "IGDB_ID", "url": "IGDB_image"})
    if cover.empty:
        cover = pd.DataFrame(columns=['IGDB_ID', 'IGDB_image'])
    res = name_url_status_release.merge(steam_id, on='IGDB_ID', how='left').merge(cover, on='IGDB_ID', how='left')
    res['IGDB_queried'] = timestamp
    res = res.astype({'IGDB_ID': int})
    res['IGDB_status'].fillna(0, inplace=True)
    res['Release_date'].fillna(0, inplace=True)
    return res


def query_ids(query_list: str):
    time.sleep(0.5)
    byte_array = igdb.api_request(
        'games',
        f"""fields name, id, url, status, first_release_date; limit {request_limit}; where id = {query_list};"""
    )
    return byte_array


def query_covers(query_list: str):
    time.sleep(0.5)
    byte_array = igdb.api_request(
        'covers',
        f"""fields game, url; limit {request_limit}; where game = {query_list};"""
    )
    return byte_array


def query_websites(query_list: str):
    time.sleep(0.5)
    byte_array = igdb.api_request(
        'websites',
        f"""fields game, url; limit {request_limit}; where game = {query_list} & category = 13;"""
    )
    return byte_array


def process_api_data(api_data) -> pd.DataFrame:
    result = json.loads(api_data)
    output = pd.json_normalize(result)
    return output


def get_id_to_name(name: str) -> int:
    # time.sleep(0.5)
    # todo: add to background queue, then also add sleep to prevent API timeouts
    byte_array = igdb.api_request(
        'games',
        f"""fields name, id; limit 1; where name = "{name}";"""
    )
    output = process_api_data(byte_array)
    return int(output['id'][0])


def match_ids_to_names(names_string: str):
    import numpy as npy
    import math
    split_string = names_string.split("\n")
    list_unique = tuple(set(split_string))
    list_split = npy.array_split(list_unique, math.ceil(len(list_unique) / (request_limit-5)))
    collection = []
    for names in list_split:
        tmp = "("
        for item in names:
            tmp += '"' + item + '"'
            tmp += ", "
        tmp = tmp[:-2]
        tmp += ")"
        list_names = tmp
        byte_array = igdb.api_request(
            'games',
            f"""fields name, id; limit {request_limit}; where name = {list_names};"""
        )
        collection.append(process_api_data(byte_array))
    res = pd.concat(collection, ignore_index=True)
    imex.export_id_name_list(res)
