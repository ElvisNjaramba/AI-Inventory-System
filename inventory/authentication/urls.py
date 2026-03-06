from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ProfileViewSet, UserViewSet, RegisterView, ShopViewSet

router = DefaultRouter()
router.register(r'profile', ProfileViewSet, basename='profile')
router.register(r'users',   UserViewSet,   basename='users')
router.register(r'shops',   ShopViewSet,   basename='shops')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    *router.urls,
]