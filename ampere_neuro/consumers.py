import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync


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