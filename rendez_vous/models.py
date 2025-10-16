from django.db import models
from django.core.validators import RegexValidator
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image
import json
import uuid
from datetime import datetime
from django.contrib.auth.models import User
import requests

class Profil(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profil')
    telephone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"Profil de {self.user.username}"

class RendezVous(models.Model):
    SENS_CHOICES = [
        ('entree', 'Entrée'),
        ('sortie', 'Sortie'),
    ]
    
    TYPE_CHOICES = [
        ('plein', 'Plein'),
        ('vide', 'Vide'),
    ]
    
    OPERATION_CHOICES = [
        ('import', 'Import'),
        ('export', 'Export'),
    ]
    
    # Informations du chauffeur
    cin = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^[A-Z]{1,2}\d{6}$',
                message='Le CIN doit être au format: A123456 ou AB123456'
            )
        ],
        verbose_name="CIN du chauffeur"
    )
    
    # Informations du véhicule
    plaque_camion = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\d{3,4}-[A-Z]{1,3}-\d{1,4}$',
                message='La plaque doit être au format: 123-A-456 ou 1234-ABC-12'
            )
        ],
        verbose_name="Plaque du camion"
    )
    
    # Informations du conteneur
    numero_conteneur = models.CharField(
        max_length=11,
        validators=[
            RegexValidator(
                regex=r'^[A-Z]{4}\d{7}$',
                message='Le numéro de conteneur doit être au format: ABCD1234567'
            )
        ],
        verbose_name="Numéro de conteneur"
    )
    
    # Informations du rendez-vous
    sens_trafic = models.CharField(
        max_length=10,
        choices=SENS_CHOICES,
        verbose_name="Sens du trafic"
    )
    
    type_conteneur = models.CharField(
        max_length=5,
        choices=TYPE_CHOICES,
        verbose_name="Type de conteneur"
    )
    
    operation = models.CharField(
        max_length=10,
        choices=OPERATION_CHOICES,
        verbose_name="Type d'opération"
    )
    
    date_rdv = models.DateField(verbose_name="Date du rendez-vous")
    heure_rdv = models.TimeField(verbose_name="Heure du rendez-vous")
    
    # Lien avec l'utilisateur (optionnel pour compatibilité)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Utilisateur")
    
    # Informations système
    code_unique = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(
        max_length=20,
        choices=[
            ('en_attente', 'En attente'),
            ('valide', 'Validé'),
            ('annule', 'Annulé'),
            ('termine', 'Terminé'),
        ],
        default='en_attente'
    )
    
    class Meta:
        verbose_name = "Rendez-vous"
        verbose_name_plural = "Rendez-vous"
        ordering = ['-date_creation']
    
    def __str__(self):
        return f"RDV {self.code_unique} - {self.cin} - {self.date_rdv}"
    
    def save(self, *args, **kwargs):
        # Générer le code unique s'il n'existe pas
        if not self.code_unique:
            self.code_unique = str(uuid.uuid4())
        
        # Sauvegarder d'abord pour avoir l'ID
        super().save(*args, **kwargs)
        
        # Générer le QR code
        if not self.qr_code:
            self.generate_qr_code()
            super().save(update_fields=['qr_code'])
    
    def generate_qr_code(self):
        """Génère un QR code avec les informations du rendez-vous"""
        try:
            # Créer les données pour le QR code
            qr_data = {
                'code_unique': str(self.code_unique),
                'cin': self.cin,
                'plaque_camion': self.plaque_camion,
                'numero_conteneur': self.numero_conteneur,
                'type_conteneur': self.type_conteneur,
                'operation': self.operation,
                'date_rdv': self.date_rdv.isoformat() if self.date_rdv else None
            }
            
            # Créer le QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(json.dumps(qr_data, ensure_ascii=False))
            qr.make(fit=True)
            
            # Créer l'image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Sauvegarder l'image
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            filename = f'qr_code_{self.code_unique}.png'
            
            self.qr_code.save(filename, File(buffer), save=False)
            
            # Envoyer automatiquement au portail interne
            self.send_to_internal_portal(qr_data)
            
        except Exception as e:
            # En cas d'erreur, on ne génère pas le QR code mais on continue
            print(f"Erreur lors de la génération du QR code: {e}")
            pass
    
    def send_to_internal_portal(self, qr_data):
        """Envoie le QR code au portail interne pour stockage"""
        try:
            # URL du portail interne (à adapter selon ton URL)
            internal_portal_url = "http://localhost:8001/api/qr-codes/receive/"  # Change le port selon ton portail interne
            
            # Données à envoyer
            payload = {
                'code_unique': qr_data['code_unique'],
                'cin': qr_data['cin'],
                'plaque_camion': qr_data['plaque_camion'],
                'numero_conteneur': qr_data['numero_conteneur'],
                'type_conteneur': qr_data['type_conteneur'],
                'operation': qr_data['operation'],
                'date_rdv': qr_data['date_rdv'],
                'date_creation': self.date_creation.isoformat(),
                'statut': self.statut,
                'rendez_vous_id': self.id,
                'source': 'portail_externe'
            }
            
            # Envoyer la requête
            response = requests.post(
                internal_portal_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=10  # Timeout de 10 secondes
            )
            
            if response.status_code == 201:
                print(f"QR code {self.code_unique} envoyé avec succès au portail interne")
            else:
                print(f"Erreur lors de l'envoi au portail interne: {response.status_code} - {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"Erreur de connexion au portail interne: {e}")
        except Exception as e:
            print(f"Erreur lors de l'envoi au portail interne: {e}")
    
    def get_intervalle_rdv(self):
        """Retourne l'intervalle de 2h pour le rendez-vous"""
        from datetime import timedelta
        heure_debut = self.heure_rdv
        heure_fin = (datetime.combine(self.date_rdv, heure_debut) + timedelta(hours=2)).time()
        return f"{heure_debut.strftime('%H:%M')} - {heure_fin.strftime('%H:%M')}"
    
    @property
    def description_operation(self):
        """Retourne une description claire de l'opération"""
        if self.operation == 'import':
            if self.type_conteneur == 'vide':
                return "Import - Camion vide sans plateau"
            else:
                return "Import - Camion plein"
        else:  # export
            return f"Export - Camion plein avec conteneur {self.type_conteneur}"
