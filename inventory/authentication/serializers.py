from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Shop, ShopMember


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role     = serializers.ChoiceField(
        choices=Profile.ROLE_CHOICES,
        default=Profile.ROLE_STAFF,
        write_only=True,
    )

    class Meta:
        model  = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password', 'role']

    def create(self, validated_data):
        role = validated_data.pop('role', Profile.ROLE_STAFF)
        user = User.objects.create_user(
            username   = validated_data['username'],
            first_name = validated_data.get('first_name', ''),
            last_name  = validated_data.get('last_name', ''),
            email      = validated_data.get('email', ''),
            password   = validated_data['password'],
        )
        # Profile is auto-created by signal; just set the role
        user.profile.role = role
        user.profile.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class ProfileSerializer(serializers.ModelSerializer):
    user  = UserSerializer(read_only=True)
    image = serializers.ImageField(required=False)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    bio   = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    role  = serializers.CharField(read_only=True)  # role shown but not editable here

    class Meta:
        model  = Profile
        fields = ['id', 'user', 'role', 'phone', 'image', 'title', 'bio']

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = instance.user
        user.username   = request.data.get('username',   user.username)
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name  = request.data.get('last_name',  user.last_name)
        user.email      = request.data.get('email',      user.email)
        user.save()

        instance.phone = request.data.get('phone', instance.phone)
        instance.title = request.data.get('title', instance.title)
        instance.bio   = request.data.get('bio',   instance.bio)
        if 'image' in request.FILES:
            instance.image = request.FILES['image']
        instance.save()
        return instance


# ─── Shop ────────────────────────────────────────────────────────────────────

class AddMemberSerializer(serializers.Serializer):
    """
    Used by the add_member action.
    Creates a new User + Profile, then assigns them to the shop.
    """
    first_name = serializers.CharField()
    last_name  = serializers.CharField()
    username   = serializers.CharField()
    email      = serializers.EmailField()
    password   = serializers.CharField(write_only=True)
    role       = serializers.ChoiceField(choices=ShopMember.ROLE_CHOICES)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class ShopMemberSerializer(serializers.ModelSerializer):
    user     = UserSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = ShopMember
        fields = ['id', 'user', 'username', 'role', 'created_at']
        read_only_fields = ['created_at']


class ShopSerializer(serializers.ModelSerializer):
    owner   = UserSerializer(read_only=True)
    members = ShopMemberSerializer(many=True, read_only=True)
    logo    = serializers.ImageField(required=False)

    class Meta:
        model  = Shop
        fields = [
            'id', 'name', 'address', 'phone', 'email',
            'logo', 'is_active', 'owner', 'members',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['owner', 'created_at', 'updated_at']

    # owner is injected by perform_create via serializer.save(owner=request.user)


class ShopListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing shops (no nested members)."""
    owner         = UserSerializer(read_only=True)
    member_count  = serializers.SerializerMethodField()
    user_role     = serializers.SerializerMethodField()

    class Meta:
        model  = Shop
        fields = [
            'id', 'name', 'address', 'phone', 'email',
            'logo', 'is_active', 'owner',
            'member_count', 'user_role',
            'created_at', 'updated_at',
        ]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_user_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        if obj.owner_id == request.user.id:
            return 'owner'
        try:
            return ShopMember.objects.get(shop=obj, user=request.user).role
        except ShopMember.DoesNotExist:
            return None