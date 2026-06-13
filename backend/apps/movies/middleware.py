"""
LanguageMiddleware

Resolves the active language once per request and stores it on
request.lang.  All movie views and services read request.lang
instead of computing it themselves.

Resolution priority:
  1. ?lang=  query param           (highest — explicit API call)
  2. Accept-Language request header (fetch wrapper / browser)
  3. Authenticated user's profile   (saved preference)
  4. "en"                           (default)
"""

VALID_LANGUAGES = frozenset({"en", "fr", "es"})


def _resolve_language(request) -> str:
    # 1. Explicit query param always wins
    param = request.GET.get("lang", "").strip().lower()
    if param in VALID_LANGUAGES:
        return param

    # 2. Accept-Language header — take the first supported locale
    #    e.g. "fr-FR,fr;q=0.9,en-US,en;q=0.8"
    accept = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
    for tag in accept.split(","):
        code = tag.strip().split(";")[0].strip()[:2].lower()
        if code in VALID_LANGUAGES:
            return code

    # 3. Authenticated user's saved profile language
    if request.user.is_authenticated:
        try:
            from apps.users.models import UserProfile
            profile = UserProfile.objects.get(pk=request.user.pk)
            if profile.language in VALID_LANGUAGES:
                return profile.language
        except Exception:
            pass

    return "en"


class LanguageMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.lang = _resolve_language(request)
        return self.get_response(request)
