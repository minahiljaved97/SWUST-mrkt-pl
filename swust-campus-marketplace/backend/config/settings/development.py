from .base import *  # noqa: F403
from .env import env_bool

DEBUG = env_bool("DEBUG", True)
