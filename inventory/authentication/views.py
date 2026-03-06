from rest_framework.viewsets import ModelViewSet
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from .models import Profile, Shop, ShopMember
from .serializers import (
    ProfileSerializer,
    UserSerializer,
    RegisterSerializer,
    ShopSerializer,
    ShopListSerializer,
    ShopMemberSerializer,
    AddMemberSerializer,
)
from .permissions import IsOwner, IsShopOwner, IsShopManagerOrAbove, IsShopMember


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]


class UserViewSet(ModelViewSet):
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated]
    # Never expose full user list — lookup by username or email only
    http_method_names  = ['get', 'head', 'options']

    def get_queryset(self):
        return User.objects.none()   # blocks list endpoint

    @action(detail=False, methods=['get'], url_path='lookup')
    def lookup(self, request):
        """
        GET /api/users/lookup/?q=<username_or_email>
        Returns at most one matching user (exact username OR exact email).
        Does NOT expose partial matches or the full user list.
        """
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({"detail": "Provide a username or email via ?q="}, status=400)

        user = (
            User.objects.filter(username=q).first() or
            User.objects.filter(email=q).first()
        )
        if not user:
            return Response({"detail": "No user found with that username or email."}, status=404)

        return Response(UserSerializer(user).data)


class ProfileViewSet(ModelViewSet):
    serializer_class   = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        return {"request": self.request}

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


# ─── Shop ────────────────────────────────────────────────────────────────────

class ShopViewSet(ModelViewSet):
    """
    Owners can CRUD their own shops.
    Managers/Staff can view shops they're assigned to.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ShopListSerializer
        return ShopSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)

        if profile and profile.is_owner:
            # Owners see only their own shops
            return Shop.objects.filter(owner=user)

        # Managers/Staff see shops they're assigned to
        member_shop_ids = ShopMember.objects.filter(user=user).values_list('shop_id', flat=True)
        return Shop.objects.filter(id__in=member_shop_ids)

    def perform_create(self, serializer):
        # Only owners can create shops
        if not self.request.user.profile.is_owner:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only owners can create shops.")
        serializer.save(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        shop = self.get_object()
        if shop.owner != request.user:
            return Response(
                {"detail": "Only the shop owner can delete this shop."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    # ── /api/shops/{id}/members/ ─────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='members')
    def list_members(self, request, pk=None):
        shop = self.get_object()
        role = self._get_role(request.user, shop)
        if role is None:
            return Response({"detail": "Not a member of this shop."}, status=403)
        members = ShopMember.objects.filter(shop=shop).select_related('user')
        return Response(ShopMemberSerializer(members, many=True).data)

    @action(detail=True, methods=['post'], url_path='members/add')
    def add_member(self, request, pk=None):
        shop = self.get_object()
        caller_role = self._get_role(request.user, shop)

        # Only owners and managers can add members
        if caller_role not in ('owner', 'manager'):
            return Response({"detail": "Only the shop owner or manager can add members."}, status=403)

        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        role_to_add = data['role']

        # Managers can only add staff — not other managers
        if caller_role == 'manager' and role_to_add == ShopMember.ROLE_MANAGER:
            return Response({"detail": "Managers can only add staff members."}, status=403)

        # Create the new user account
        new_user = User.objects.create_user(
            username   = data['username'],
            first_name = data['first_name'],
            last_name  = data['last_name'],
            email      = data['email'],
            password   = data['password'],
        )
        # Set profile role to match shop role
        new_user.profile.role = role_to_add
        new_user.profile.save()

        # Assign to shop
        member = ShopMember.objects.create(shop=shop, user=new_user, role=role_to_add)

        return Response(
            ShopMemberSerializer(member).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['delete'], url_path='members/remove/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        shop = self.get_object()
        caller_role = self._get_role(request.user, shop)

        if caller_role not in ('owner', 'manager'):
            return Response({"detail": "Only the shop owner or manager can remove members."}, status=403)

        member = get_object_or_404(ShopMember, shop=shop, user_id=user_id)

        # Managers can only remove staff, not other managers
        if caller_role == 'manager' and member.role == ShopMember.ROLE_MANAGER:
            return Response({"detail": "Managers cannot remove other managers."}, status=403)

        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='members/role/(?P<user_id>[^/.]+)')
    def update_member_role(self, request, pk=None, user_id=None):
        shop = self.get_object()
        if self._get_role(request.user, shop) != 'owner':
            return Response({"detail": "Only owners can change roles."}, status=403)

        member = get_object_or_404(ShopMember, shop=shop, user_id=user_id)
        new_role = request.data.get('role')
        if new_role not in dict(ShopMember.ROLE_CHOICES):
            return Response({"detail": "Invalid role."}, status=400)
        member.role = new_role
        member.save()
        return Response(ShopMemberSerializer(member).data)

    # helper
    def _get_role(self, user, shop):
        if shop.owner_id == user.id:
            return 'owner'
        try:
            return ShopMember.objects.get(shop=shop, user=user).role
        except ShopMember.DoesNotExist:
            return None