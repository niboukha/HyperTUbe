
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from .serializer import RegisterSerializer, LoginSerializer, PasswordSerializer, ProfileUpdateSerializer
from allauth.socialaccount.providers.oauth2.views import OAuth2CallbackView
from django.db.models import Q
from rest_framework.views import APIView
import os
import uuid


class JWTOAuth2CallbackView(OAuth2CallbackView):
    """Wraps allauth's OAuth2 callback to set JWT cookies instead of a session."""
    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        if request.user.is_authenticated:
            refresh = RefreshToken.for_user(request.user)
            response.set_cookie(
                "access_token", str(refresh.access_token),
                httponly=True, secure=False, samesite="Lax", max_age=3600,
            )
        return response

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        access_token  = str(refresh.access_token)

        response = Response({
            "message":  "User created",
            "user_id":  user.id,
            "username": user.username,
        }, status=201)

        response.set_cookie(
            key      = "access_token",
            value    = access_token,
            httponly = True,
            secure   = False,
            samesite = "Lax",
            max_age  = 3600,
        )
        return response

    return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        access_token  = str(refresh.access_token)

        response = Response({
            "message":  "Login successful",
            "user_id":  user.id,
            "username": user.username,
        })

        response.set_cookie(
            key      = "access_token",
            value    = access_token,
            httponly = True,
            secure   = False,
            samesite = "Lax",
            max_age  = 3600,
        )
        return response

    return Response(serializer.errors, status=400)


def _profile_response(profile, request_user, request=None):
    """Build the standard me-response dict from a UserProfile instance."""
    user = profile if profile else request_user
    avatar = None
    if profile and profile.profile_picture:
        pic = profile.profile_picture
        if not pic.startswith("http"):
            if request:
                pic = request.build_absolute_uri(f"/media/{pic.lstrip('/')}")
            else:
                pic = f"/media/{pic.lstrip('/')}"
        avatar = pic
    return {
        "id":         str(user.id),
        "username":   user.username,
        "first_name": user.first_name,
        "last_name":  user.last_name,
        "email":      user.email,
        "avatar":     avatar,
        "language":   profile.language if profile else "en",
    }


@api_view(["GET", "PATCH"])
def me(request):
    from .models import UserProfile
    try:
        profile = UserProfile.objects.get(pk=request.user.pk)
    except UserProfile.DoesNotExist:
        profile = None

    if request.method == "GET":
        return Response(_profile_response(profile, request.user, request))

    # PATCH — update profile fields
    if profile is None:
        return Response({"error": "Profile not found"}, status=404)

    serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        updated = serializer.save()
        return Response(_profile_response(updated, request.user, request))
    return Response(serializer.errors, status=400)


@api_view(["POST"])
def upload_avatar(request):
    """Accept a multipart file upload, save to media/avatars/, update profile_picture."""
    from .models import UserProfile
    file = request.FILES.get("avatar")
    if not file:
        return Response({"error": "No file provided"}, status=400)

    # Validate content type
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed:
        return Response({"error": "Unsupported file type. Use JPEG, PNG, GIF or WebP."}, status=400)

    # Max 5 MB
    if file.size > 5 * 1024 * 1024:
        return Response({"error": "File too large. Max 5 MB."}, status=400)

    ext = os.path.splitext(file.name)[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    rel_path = os.path.join("avatars", filename)
    abs_path = os.path.join(str(settings.MEDIA_ROOT), "avatars", filename)

    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "wb") as f:
        for chunk in file.chunks():
            f.write(chunk)

    avatar_url = request.build_absolute_uri(f"/media/avatars/{filename}")

    try:
        profile = UserProfile.objects.get(pk=request.user.pk)
        # Remove old avatar file if it was a local upload
        if profile.profile_picture and not profile.profile_picture.startswith("http"):
            old_path = os.path.join(settings.MEDIA_ROOT, profile.profile_picture.lstrip("/"))
            if os.path.exists(old_path):
                os.remove(old_path)
        profile.profile_picture = f"avatars/{filename}"
        profile.save(update_fields=["profile_picture"])
    except UserProfile.DoesNotExist:
        return Response({"error": "Profile not found"}, status=404)

    return Response({"avatar": avatar_url})


@api_view(["PATCH"])
def set_language(request):
    from .models import UserProfile, LANGUAGE_CHOICES
    lang = request.data.get("language", "")
    valid = [code for code, _ in LANGUAGE_CHOICES]
    if lang not in valid:
        return Response({"error": f"language must be one of {valid}"}, status=400)
    try:
        profile = UserProfile.objects.get(pk=request.user.pk)
        profile.language = lang
        profile.save(update_fields=["language"])
    except UserProfile.DoesNotExist:
        pass
    return Response({"language": lang})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get("email")
    user = User.objects.filter(email=email).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        link = f"http://localhost:3000/reset-password?uid={uid}&token={token}"
        send_mail(
            "Reset Password",
            f"Click here to reset your password: {link}",
            settings.EMAIL_HOST_USER,
            [email],
        )

    return Response({"message": "If email exists, link sent"})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    uid = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if new_password != confirm_password:
        return Response({"error": "Passwords do not match"}, status=400)

    try:
        user_id = urlsafe_base64_decode(uid).decode()
        user = User.objects.get(pk=user_id)

        if default_token_generator.check_token(user, token):
            serializer = PasswordSerializer(data={"password": new_password})
            if serializer.is_valid():
                user.set_password(new_password)
                user.save()
                return Response({"message": "Password updated successfully"})
            return Response(serializer.errors, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=400)

    return Response({"error": "Invalid token"}, status=400)


@api_view(["POST"])
def settings_change_password(request):
    old_password     = request.data.get("old_password")
    new_password     = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    user = request.user
    if not user.check_password(old_password):
        return Response({"error": "Current password is incorrect."}, status=400)

    if new_password != confirm_password:
        return Response({"error": "Passwords do not match."}, status=400)

    serializer = PasswordSerializer(data={"password": new_password})
    if serializer.is_valid():
        user.set_password(new_password)
        user.save()
        return Response({"message": "Password updated successfully."})
    return Response(serializer.errors, status=400)


# logout
@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    response = Response({"message": "Logged out"})
    response.delete_cookie("access_token")
    response.delete_cookie("sessionid")
    response.delete_cookie("csrftoken")
    response.delete_cookie("messages")
    return response


@api_view(["GET"])
def user_profile(request, pk):
    from .models import UserProfile
    try:
        profile = UserProfile.objects.get(pk=pk)
    except UserProfile.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    pic = profile.profile_picture or None
    if pic and not pic.startswith("http"):
        pic = request.build_absolute_uri(f"/media/{pic.lstrip('/')}")
    return Response({
        "id":         str(profile.pk),
        "username":   profile.username,
        "first_name": profile.first_name,
        "last_name":  profile.last_name,
        "avatar":     pic,
        "language":   profile.language,
    })


from rest_framework.pagination import PageNumberPagination
@permission_classes([AllowAny])
class UserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.GET.get("q", "")

        users = User.objects.filter(
            username__icontains=query
        ).order_by("id")

        paginator = PageNumberPagination()
        paginator.page_size = 5

        result_page = paginator.paginate_queryset(users, request)

        data = []
        for u in result_page:
            pic = u.userprofile.profile_picture if hasattr(u, "userprofile") else None
            if pic and not pic.startswith("http"):
                pic = request.build_absolute_uri(f"/media/{pic.lstrip('/')}")
            data.append({"id": u.id, "username": u.username, "avatar": pic})

        return paginator.get_paginated_response(data)
