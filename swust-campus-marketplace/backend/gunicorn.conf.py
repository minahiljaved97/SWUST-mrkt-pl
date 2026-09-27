import os

bind = os.getenv("GUNICORN_BIND", "127.0.0.1:8000")
workers = int(os.getenv("GUNICORN_WORKERS", "3") or "3")
threads = int(os.getenv("GUNICORN_THREADS", "2") or "2")
timeout = int(os.getenv("GUNICORN_TIMEOUT", "60") or "60")
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()
capture_output = True
preload_app = True
max_requests = 1000
max_requests_jitter = 50
