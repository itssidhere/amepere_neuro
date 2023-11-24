from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from . import consumers  # Replace with your app name and actual consumer
from django.core.asgi import get_asgi_application

websocket_urlpatterns = [
    path(
        "ws/message/", consumers.MessageConsumer.as_asgi()
    ), 

    path(
        'ws/skull_message/', consumers.SkullMessageConsumer.as_asgi()
    ),

    path(
        'ws/needle_message/', consumers.NeedleMessageConsumer.as_asgi()
    ),
    path(
        'ws/record_message/', consumers.RecordMessageConsumer.as_asgi()
    ),
]

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": URLRouter(websocket_urlpatterns),
    }
)
