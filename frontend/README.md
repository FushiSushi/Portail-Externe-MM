# Portail Externe - Frontend React

Application frontend pour la prise de rendez-vous des chauffeurs de camions.

## Fonctionnalités

- **Formulaire de prise de rendez-vous** avec validation complète
- **Génération automatique de QR code** après création du rendez-vous
- **Interface moderne et responsive** avec Bootstrap
- **Validation en temps réel** des données saisies
- **Gestion des erreurs** avec messages clairs

## Installation

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Démarrer le serveur de développement** :
   ```bash
   npm start
   ```

3. **Ouvrir l'application** :
   L'application sera accessible à l'adresse : http://localhost:3000

## Structure du projet

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   └── RendezVousForm.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   └── index.js
├── package.json
└── README.md
```

## Dépendances principales

- **React 18** : Framework principal
- **React Router** : Navigation entre les pages
- **React Bootstrap** : Composants UI
- **Axios** : Client HTTP pour l'API
- **React QR Code** : Génération de QR codes
- **Date-fns** : Manipulation des dates

## Configuration

L'application est configurée pour communiquer avec le backend Django sur `http://localhost:8000`.

Pour changer l'URL de l'API, modifiez la variable `API_BASE_URL` dans `src/services/api.js`.

## Scripts disponibles

- `npm start` : Démarre le serveur de développement
- `npm build` : Construit l'application pour la production
- `npm test` : Lance les tests
- `npm eject` : Éjecte la configuration (irréversible)

## Utilisation

1. **Accueil** : Page d'accueil avec présentation du système
2. **Prise de Rendez-vous** : Formulaire complet pour créer un rendez-vous
3. **QR Code** : Affichage automatique du QR code après validation

## Validation des données

Le formulaire valide :
- Format du CIN (A123456 ou AB123456)
- Format de la plaque (123-A-456 ou 1234-ABC-12)
- Format du numéro de conteneur (ABCD1234567)
- Cohérence entre opération et type de conteneur
- Dates et heures dans les plages autorisées
- Conflits de rendez-vous 