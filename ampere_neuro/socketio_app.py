import socketio
import eventlet
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import os
import datetime

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")

channel_layer = get_channel_layer()

sio = socketio.Server(cors_allowed_origins="*")
app = socketio.WSGIApp(sio)


@sio.event
def connect(sid, environ):
    print("Client connected:", sid)
    message_data = "Welcome to the server!"
    print(f"Sending message of type: {type(message_data)}")
    async_to_sync(channel_layer.group_send)(
        "message_group", {"type": "chat_message", "text": message_data}
    )
    sio.emit("message", message_data, to=sid)


@sio.event
def send_message(sid, data):
    print("Received message from", sid, ":", data)
    # send current time to string
    dateToStr = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sio.emit("message", dateToStr, sid)
    async_to_sync(channel_layer.group_send)(
        "message_group", {"type": "chat_message", "text": data}
    )

@sio.event
def send_skull_message(sid, data):
    #print("Received skull message from", sid, ":", data)
    # send current time to string
    dateToStr = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sio.emit("skull_message", dateToStr, sid)
    async_to_sync(channel_layer.group_send)(
        "skull_message_group", {"type": "chat_message", "text": data}
        
    )



@sio.event
def send_needle_messsage(sid, data):
    #print("Received needle message from", sid, ":", data)
    # send current time to string
    dateToStr = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sio.emit("needle_message", dateToStr, sid)
    async_to_sync(channel_layer.group_send)(
        "needle_message_group", {"type": "chat_message", "text": data}
    )

@sio.event
def send_record_message(sid, data):
    # print("Received record message from", sid, ":", data)
    # send current time to string
    dateToStr = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sio.emit("record_message", dateToStr, sid)
    async_to_sync(channel_layer.group_send)(
        "record_message_group", {"type": "chat_message", "text": data}
    )


@sio.event
def disconnect(sid):
    print("Client disconnected:", sid)


if __name__ == "__main__":
    eventlet.wsgi.server(eventlet.listen(("127.0.0.1", 8001)), app)
