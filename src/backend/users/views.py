from rest_framework.decorators import api_view,permission_classes
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from .serializer import RegisterSerializer
from .serializer import LoginSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import redirect
from rest_framework.permissions import AllowAny

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_decode
from django.conf import settings
from django.contrib.auth import logout
from .serializer import PasswordSerializer


# @csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])  
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        access_token  = str(refresh.access_token)
        refresh_token = str(refresh)
        

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
        refresh_token = str(refresh)
        

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

@api_view(["GET"])
def user_list(request):
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_authenticated": True,
    })



def social_login_callback(request):
    user = request.user

    if user.is_authenticated:
        # generate JWT for the social user
        refresh = RefreshToken.for_user(user)
        access_token  = str(refresh.access_token)
        refresh_token = str(refresh)

        # redirect to frontend with cookie set
        response = redirect("http://localhost:8000/")

        response.set_cookie(
            key      = "access_token",
            value    = access_token,
            httponly = True,
            secure   = False, 
            samesite = "Lax",
            max_age  = 3600,
        )
        return response

    #this to error page  page 
    return redirect("http://localhost:8000") 

@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request(request):

    email = request.data.get("email")
    user = User.objects.filter(email=email).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        link = f"http://localhost:5173/confirm-password?uid={uid}&token={token}"
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
            print("===>",serializer.errors)
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

# test itttttttttttttt and give it url
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
    # logout(request)
    # remove cookies and eveything thath related to user
    response = Response({"message": "Logged out"})
    response.delete_cookie("access_token")

    return response


# await fetch("/api/logout/", {
#   method: "POST",
#   credentials: "include"
# })

# comments 
# add comments and react for a movie



