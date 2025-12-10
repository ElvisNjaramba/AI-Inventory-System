from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ProfileViewSet, UserViewSet, RegisterView

authentication_router = DefaultRouter()
authentication_router.register(r'profile', ProfileViewSet, basename='profile')
authentication_router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    # Router URLs
    *authentication_router.urls,

]