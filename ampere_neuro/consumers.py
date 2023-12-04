import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
import csv
import datetime
import os
class MessageConsumer(WebsocketConsumer):
    def connect(self):
        self.group_name = "message_group"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name, self.channel_name
        )

    def chat_message(self, event):
        self.send(text_data=json.dumps({"message": str(event.get("text"))}))

class SkullMessageConsumer(WebsocketConsumer):
    def connect(self):
        self.group_name = "skull_message_group"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name, self.channel_name
        )

    def chat_message(self, event):
        self.send(text_data=json.dumps({"message": str(event.get("text"))}))


class NeedleMessageConsumer(WebsocketConsumer):
    def connect(self):
        self.group_name = "needle_message_group"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name, self.channel_name
        )

    def chat_message(self, event):
        self.send(text_data=json.dumps({"message": str(event.get("text"))}))


class RecordMessageConsumer(WebsocketConsumer):
    def connect(self):
        self.group_name = "record_message_group"
        async_to_sync(self.channel_layer.group_add)(self.group_name, self.channel_name)
        self.accept()

        self._recording = False
        self._recorded_data = []

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.group_name, self.channel_name
        )

    def receive(self, text_data=None, bytes_data=None):
        data = json.loads(text_data)
        if data.get('command') == "start_record":
            self._recording = True
            self._recorded_data = []
        
        elif data.get('command') == "stop_record":
            self._recording = False
            self.save_to_csv(self._recorded_data, data.get('foldername'), data.get('header'))


    def chat_message(self, event):
        self.send(text_data=json.dumps({"message": str(event.get("text"))}))

        if self._recording:
            self._recorded_data.append(event.get("text"))
    
    def save_to_csv(self, data, foldername, header="header"):
        folder_path = f'media/recorded_data/{foldername}'
        # create recorded_data folder if not exists
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)

        # get the numbber of files in the folder
        num_files = len([f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))])+1

        # create a new csv file with number_date
        filename = f'{folder_path}/{num_files}_{datetime.datetime.now().strftime("%Y-%m-%d")}.csv'
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['time', 'x', 'y', 'z','d', 'q0', 'q1', 'q2', 'q3', 'force_x', 'force_y', 'force_z'])
            writer.writerow([header])
            for row in data:
                current_timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                curr_row = []
                curr_row.append(current_timestamp)
                curr_row.extend(row.split(','))
                writer.writerow(curr_row)