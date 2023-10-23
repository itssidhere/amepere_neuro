# Steps to run the project

# Install Django
```
pip install django
```

# Install the requirements
```
chmod +x install_script.sh
./install_script.sh
```

# Start the reddis server
```
sudo docker run --rm -p 6379:6379 redis:7
```

# Run the script using python3
```
python3 socketio_app.py
```

# then in a new terminal run the app using asgi server
```
python3 manage.py runserver
```


