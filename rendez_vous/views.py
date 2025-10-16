from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import RendezVous
from .serializers import RendezVousSerializer, RendezVousCreateSerializer
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import generics
from rest_framework import serializers
from .models import Profil
import uuid
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    telephone = serializers.CharField(write_only=True, required=True)
    class Meta:
        model = User
        fields = ('password', 'email', 'first_name', 'last_name', 'telephone')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Cet email est déjà utilisé.')
        return value

    def create(self, validated_data):
        telephone = validated_data.pop('telephone')
        email = validated_data.get('email', '')
        # Générer un username unique basé sur l'email
        base_username = email.split('@')[0] if email else 'user'
        username = base_username
        # S'assurer que le username est unique
        i = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{uuid.uuid4().hex[:6]}"
        user = User.objects.create_user(
            username=username,
            password=validated_data['password'],
            email=email,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        Profil.objects.create(user=user, telephone=telephone)
        return user

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class RendezVousViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les rendez-vous des chauffeurs
    """
    queryset = RendezVous.objects.all()
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]
        return [AllowAny()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RendezVousCreateSerializer
        return RendezVousSerializer
    
    def create(self, request, *args, **kwargs):
        """Créer un nouveau rendez-vous"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Lier le rendez-vous à l'utilisateur connecté s'il est authentifié
            if request.user.is_authenticated:
                rendez_vous = serializer.save(user=request.user)
            else:
                rendez_vous = serializer.save()
            # Retourner les données complètes avec le QR code
            response_serializer = RendezVousSerializer(rendez_vous, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Valider un rendez-vous"""
        rendez_vous = self.get_object()
        if rendez_vous.statut == 'en_attente':
            rendez_vous.statut = 'valide'
            rendez_vous.save()
            serializer = self.get_serializer(rendez_vous)
            return Response({
                'message': 'Rendez-vous validé avec succès',
                'rendez_vous': serializer.data
            })
        else:
            return Response({
                'error': 'Ce rendez-vous ne peut pas être validé'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        """Annuler un rendez-vous"""
        rendez_vous = self.get_object()
        if rendez_vous.statut in ['en_attente', 'valide']:
            rendez_vous.statut = 'annule'
            rendez_vous.save()
            serializer = self.get_serializer(rendez_vous)
            return Response({
                'message': 'Rendez-vous annulé avec succès',
                'rendez_vous': serializer.data
            })
        else:
            return Response({
                'error': 'Ce rendez-vous ne peut pas être annulé'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def terminer(self, request, pk=None):
        """Terminer un rendez-vous"""
        rendez_vous = self.get_object()
        if rendez_vous.statut == 'valide':
            rendez_vous.statut = 'termine'
            rendez_vous.save()
            serializer = self.get_serializer(rendez_vous)
            return Response({
                'message': 'Rendez-vous terminé avec succès',
                'rendez_vous': serializer.data
            })
        else:
            return Response({
                'error': 'Ce rendez-vous ne peut pas être terminé'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def par_plaque(self, request):
        """Rechercher les rendez-vous par plaque de camion"""
        plaque = request.query_params.get('plaque')
        if not plaque:
            return Response({
                'error': 'Le paramètre "plaque" est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        rendez_vous = RendezVous.objects.filter(
            plaque_camion__icontains=plaque
        ).order_by('-date_creation')
        
        serializer = self.get_serializer(rendez_vous, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def par_cin(self, request):
        """Rechercher les rendez-vous par CIN du chauffeur"""
        cin = request.query_params.get('cin')
        if not cin:
            return Response({
                'error': 'Le paramètre "cin" est requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        rendez_vous = RendezVous.objects.filter(
            cin__icontains=cin
        ).order_by('-date_creation')
        
        serializer = self.get_serializer(rendez_vous, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def par_date(self, request):
        """Rechercher les rendez-vous par date"""
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({
                'error': 'Le paramètre "date" est requis (format: YYYY-MM-DD)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'error': 'Format de date invalide. Utilisez YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        rendez_vous = RendezVous.objects.filter(
            date_rdv=date
        ).order_by('heure_rdv')
        
        serializer = self.get_serializer(rendez_vous, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def aujourd_hui(self, request):
        """Obtenir tous les rendez-vous d'aujourd'hui"""
        aujourd_hui = timezone.now().date()
        rendez_vous = RendezVous.objects.filter(
            date_rdv=aujourd_hui
        ).order_by('heure_rdv')
        
        serializer = self.get_serializer(rendez_vous, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def prochains(self, request):
        """Obtenir les prochains rendez-vous (aujourd'hui et demain)"""
        aujourd_hui = timezone.now().date()
        demain = aujourd_hui + timedelta(days=1)
        
        rendez_vous = RendezVous.objects.filter(
            date_rdv__in=[aujourd_hui, demain],
            statut__in=['en_attente', 'valide']
        ).order_by('date_rdv', 'heure_rdv')
        
        serializer = self.get_serializer(rendez_vous, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        """Obtenir le QR code d'un rendez-vous"""
        rendez_vous = self.get_object()
        if rendez_vous.qr_code:
            return Response({
                'qr_code_url': request.build_absolute_uri(rendez_vous.qr_code.url),
                'code_unique': rendez_vous.code_unique
            })
        else:
            return Response({
                'error': 'QR code non disponible'
            }, status=status.HTTP_404_NOT_FOUND)

class RendezVousPublicViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet public pour la consultation des rendez-vous
    """
    queryset = RendezVous.objects.all()
    serializer_class = RendezVousSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Filtrer les rendez-vous selon les paramètres"""
        queryset = RendezVous.objects.all()
        
        # Filtre par plaque
        plaque = self.request.query_params.get('plaque')
        if plaque:
            queryset = queryset.filter(plaque_camion__icontains=plaque)
        
        # Filtre par CIN
        cin = self.request.query_params.get('cin')
        if cin:
            queryset = queryset.filter(cin__icontains=cin)
        
        # Filtre par date
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(date_rdv=date)
            except ValueError:
                pass
        
        # Filtre par statut
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        return queryset.order_by('-date_creation')

class EmailTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            # Utiliser filter().first() au lieu de get() pour éviter MultipleObjectsReturned
            user = User.objects.filter(email=email).first()
            if not user:
                raise serializers.ValidationError({'detail': 'Email ou mot de passe invalide.'})
        except Exception as e:
            raise serializers.ValidationError({'detail': 'Email ou mot de passe invalide.'})
        
        if not user.check_password(password):
            raise serializers.ValidationError({'detail': 'Email ou mot de passe invalide.'})
        
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'Ce compte est inactif.'})

        # Générer les tokens JWT
        refresh = RefreshToken.for_user(user)
        
        # Retourner les données
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }

class ProfilUtilisateurView(generics.RetrieveAPIView):
    """Vue pour récupérer les informations du profil utilisateur"""
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer
    
    def get_object(self):
        return self.request.user
    
    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        try:
            profil = user.profil
            telephone = profil.telephone
        except:
            telephone = "Non renseigné"
        
        data = {
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'telephone': telephone,
        }
        return Response(data)

class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

class MesRendezVousView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        # Récupérer les rendez-vous de l'utilisateur connecté
        rdvs = RendezVous.objects.filter(user=request.user).order_by('-date_creation')
        serializer = RendezVousSerializer(rdvs, many=True, context={'request': request})
        return Response(serializer.data)

class ModifierRendezVousView(APIView):
    permission_classes = [IsAuthenticated]
    
    def put(self, request, pk):
        """Modifier un rendez-vous existant"""
        try:
            # Vérifier que le rendez-vous appartient à l'utilisateur
            rendez_vous = RendezVous.objects.get(
                pk=pk,
                user=request.user
            )
            
            # Vérifier que le rendez-vous peut être modifié (pas terminé ou annulé)
            if rendez_vous.statut in ['termine', 'annule']:
                return Response({
                    'error': 'Ce rendez-vous ne peut plus être modifié'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Utiliser le serializer de création pour la validation
            serializer = RendezVousCreateSerializer(rendez_vous, data=request.data, partial=True)
            if serializer.is_valid():
                # Mettre à jour le rendez-vous
                updated_rdv = serializer.save()
                
                # Régénérer le QR code si nécessaire
                if not updated_rdv.qr_code:
                    updated_rdv.generate_qr_code()
                    updated_rdv.save(update_fields=['qr_code'])
                
                # Retourner les données complètes
                response_serializer = RendezVousSerializer(updated_rdv, context={'request': request})
                return Response({
                    'message': 'Rendez-vous modifié avec succès',
                    'rendez_vous': response_serializer.data
                })
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except RendezVous.DoesNotExist:
            return Response({
                'error': 'Rendez-vous non trouvé ou vous n\'avez pas les permissions pour le modifier'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Erreur lors de la modification: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SupprimerRendezVousView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pk):
        """Supprimer un rendez-vous"""
        try:
            # Vérifier que le rendez-vous appartient à l'utilisateur
            rendez_vous = RendezVous.objects.get(
                pk=pk,
                user=request.user
            )
            
            # Vérifier que le rendez-vous peut être supprimé (pas terminé)
            if rendez_vous.statut == 'termine':
                return Response({
                    'error': 'Ce rendez-vous ne peut plus être supprimé car il est terminé'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Supprimer le rendez-vous
            rendez_vous.delete()
            
            return Response({
                'message': 'Rendez-vous supprimé avec succès'
            })
                
        except RendezVous.DoesNotExist:
            return Response({
                'error': 'Rendez-vous non trouvé ou vous n\'avez pas les permissions pour le supprimer'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Erreur lors de la suppression: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        new_password_confirm = request.data.get('new_password_confirm')

        if not old_password or not new_password or not new_password_confirm:
            return Response({'detail': 'Tous les champs sont obligatoires.'}, status=400)
        if new_password != new_password_confirm:
            return Response({'detail': 'Les nouveaux mots de passe ne correspondent pas.'}, status=400)
        if not user.check_password(old_password):
            return Response({'detail': 'Ancien mot de passe incorrect.'}, status=400)
        # Suppression de la validation du mot de passe
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Mot de passe changé avec succès.'})

@api_view(['GET', 'POST'])
def test_api(request):
    """Vue de test pour vérifier que l'API fonctionne"""
    if request.method == 'POST':
        return Response({
            'message': 'API fonctionne !',
            'method': 'POST',
            'data': request.data
        })
    return Response({
        'message': 'API fonctionne !',
        'method': 'GET'
    })
