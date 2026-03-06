from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import ShopMember


# ─── Global role checks ──────────────────────────────────────────────────────

class IsOwner(BasePermission):
    """User whose Profile.role == 'owner'."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.is_owner
        )


class IsManagerOrOwner(BasePermission):
    """Owner or Manager at the global profile level."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role in ('owner', 'manager')


# ─── Shop-scoped permission helpers ──────────────────────────────────────────

def get_user_shop_role(user, shop):
    """Return the user's role string for a given shop, or None."""
    if not user.is_authenticated:
        return None
    # Owner always has full access to their own shops
    if shop.owner_id == user.id:
        return 'owner'
    try:
        return ShopMember.objects.get(shop=shop, user=user).role
    except ShopMember.DoesNotExist:
        return None


class IsShopOwner(BasePermission):
    """Only the shop's owner (checked at object level)."""
    def has_object_permission(self, request, view, obj):
        shop = getattr(obj, 'shop', obj)   # works for Shop or related objects
        return get_user_shop_role(request.user, shop) == 'owner'


class IsShopManagerOrAbove(BasePermission):
    """Owner or Manager of the specific shop."""
    def has_object_permission(self, request, view, obj):
        shop = getattr(obj, 'shop', obj)
        return get_user_shop_role(request.user, shop) in ('owner', 'manager')


class IsShopMember(BasePermission):
    """Any member of the shop (owner / manager / staff) — read + limited write."""
    def has_object_permission(self, request, view, obj):
        shop = getattr(obj, 'shop', obj)
        return get_user_shop_role(request.user, shop) is not None


class ShopInventoryPermission(BasePermission):
    """
    GET  → any shop member
    POST/PATCH/PUT → manager or owner
    DELETE → owner only
    """
    def has_object_permission(self, request, view, obj):
        shop = getattr(obj, 'shop', obj)
        role = get_user_shop_role(request.user, shop)
        if role is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.method == 'DELETE':
            return role == 'owner'
        return role in ('owner', 'manager')


class ShopSalesPermission(BasePermission):
    """
    GET  → any shop member
    POST → staff, manager, or owner  (staff can create sales)
    PATCH/PUT/DELETE → manager or owner only
    """
    def has_object_permission(self, request, view, obj):
        shop = getattr(obj, 'shop', obj)
        role = get_user_shop_role(request.user, shop)
        if role is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.method == 'POST':
            return role in ('owner', 'manager', 'staff')
        return role in ('owner', 'manager')