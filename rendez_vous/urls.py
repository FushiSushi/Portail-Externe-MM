from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RendezVousViewSet, 
    RendezVousPublicViewSet, 
    RegisterView, 
    MesRendezVousView, 
    ModifierRendezVousView, 
    SupprimerRendezVousView, 
    ProfilUtilisateurView, 
    test_api, 
    creneaux_pleins,
    ChangePasswordView
)

router = DefaultRouter()
router.register(r'rendez-vous', RendezVousViewSet, basename='rendezvous')
router.register(r'public/rendez-vous', RendezVousPublicViewSet, basename='public-rendez-vous')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('mes-rendez-vous/', MesRendezVousView.as_view(), name='mes-rendez-vous'),
    path('modifier-rendez-vous/<int:pk>/', ModifierRendezVousView.as_view(), name='modifier-rendez-vous'),
    path('supprimer-rendez-vous/<int:pk>/', SupprimerRendezVousView.as_view(), name='supprimer-rendez-vous'),
    path('profil/', ProfilUtilisateurView.as_view(), name='profil'),
    path('test/', test_api, name='test-api'),
    path('rdv/creneaux-pleins/', creneaux_pleins, name='creneaux-pleins'),
] 