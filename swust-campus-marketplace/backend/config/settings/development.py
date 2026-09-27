from .base import *  # noqa: F403
from .env import env_bool, env_list

DEBUG = env_bool("DEBUG", True)

ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    "localhost,127.0.0.1,testserver",
)

WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True
