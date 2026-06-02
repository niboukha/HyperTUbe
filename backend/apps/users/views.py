
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

from .serializer import RegisterSerializer, LoginSerializer, PasswordSerializer
from allauth.socialaccount.providers.oauth2.views import OAuth2CallbackView


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
        },status=201)


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

# this view just for testing

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response({
        "id": str(request.user.id),
        "username": request.user.username,
        "email": request.user.email,
    })


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

    # check passwords match
    if new_password != confirm_password:
        return Response(
            {"error": "Passwords do not match"},
            status=400
        )
    try:
        user_id = urlsafe_base64_decode(uid).decode()
        user = User.objects.get(pk=user_id)

        # verify token
        if default_token_generator.check_token(user, token):
            serializer = PasswordSerializer(data = {"password": new_password})
            if serializer.is_valid():
                user.set_password(new_password)
                user.save()
                return Response({
                    "message": "Password updated successfully"
                })
            return Response(serializer.errors, status=400)


    except Exception as e:
        return Response(
            {"error": str(e)},
            status=400
        )

    return Response(
        {"error": "Invalid token"},
        status=400
    )

@api_view(["POST"])
@permission_classes([AllowAny])
def settings_change_password(request):
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    user = request.user
    if not user.check_password(old_password):
            return Response({
                "old_password": "the old password Wrong"
            })

    if new_password != confirm_password:
        return Response(
            {"error": "Passwords do not match"},
            status=400
        )
    serializer = PasswordSerializer(data = {"password": new_password})
    if serializer.is_valid():
        user.set_password(new_password)
        user.save()
    return Response({
        "message": "Password updated successfully"
    })

 


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    
    response = Response({"message": "Logged out"})
    response.delete_cookie("access_token")
    response.delete_cookie("sessionid")
    response.delete_cookie("csrftoken")
    response.delete_cookie("messages")

    

    return response




