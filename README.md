# Steps to run the project

# install the requirements
```
pip install -r requirements.txt
```

# Start the reddis server
```
sudo docker run --rm -p 6379:6379 redis:7
```

# then run the script using python3
```
python3 socketio_app.py
```

# then in a new terminal run the app using asgi server
```
daphne ampere_neuro.asgi:application
```