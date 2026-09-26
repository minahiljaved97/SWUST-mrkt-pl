from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthBurstAnonThrottle(AnonRateThrottle):
    scope = "auth_burst"


class AuthBurstUserThrottle(UserRateThrottle):
    scope = "auth_burst"


class AuthSustainedAnonThrottle(AnonRateThrottle):
    scope = "auth_sustained"
