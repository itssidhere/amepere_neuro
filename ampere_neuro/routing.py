from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from . import consumers  # Replace with your app name and actual consumer
from django.core.asgi import get_asgi_application

websocket_urlpatterns = [
    path(
        "ws/message/", consumers.MessageConsumer.as_asgi()
    ),  # Adjust path and consumer name
]

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": URLRouter(websocket_urlpatterns),
    }
)
