import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container, Navbar, Nav, Spinner, Alert, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import RendezVousForm from './components/RendezVousForm';
import Login from './components/Login';
import Register from './components/Register';
import MonCompte from './components/MonCompte';
import Historique from './components/Historique';
import './App.css';

const MarsaLogoImg = ({ height = 48, style = {} }) => (
  <img
    src="/marsa-maroc-logo.png"
    alt="Marsa Maroc Logo"
    height={height}
    style={{ 
      display: 'inline-block', 
      verticalAlign: 'middle',
      filter: 'brightness(0) invert(1)', // Rend le logo blanc
      ...style 
    }}
  />
);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Fonction pour renouveler le token
    const refreshToken = async () => {
      try {
        const refresh = localStorage.getItem('refresh');
        if (!refresh) {
          setIsLoggedIn(false);
          return false;
        }

        // Temporairement désactivé pour éviter les erreurs 404
        console.log('Refresh token désactivé temporairement');
        return false;

        const response = await fetch('/api/auth/refresh/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh }),
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('token', data.access);
          setIsLoggedIn(true);
          return true;
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error('Échec du renouvellement');
        }
      } catch (error) {
        // Ne pas supprimer le token ni déconnecter automatiquement
        // setIsLoggedIn(false);
        return false;
      }
    };

    // Fonction pour vérifier le token
    const checkToken = () => {
      const token = localStorage.getItem('token');
      const refresh = localStorage.getItem('refresh');
      
      if (!token || !refresh) {
        setIsLoggedIn(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp > currentTime) {
          setIsLoggedIn(true);
        } else {
          // Token expiré, essayer de le renouveler
          refreshToken();
        }
      } catch (error) {
        setIsLoggedIn(false);
      }
    };

    // Vérifier immédiatement au chargement
    checkToken();

    // SUPPRESSION du setInterval de vérification régulière
    // const interval = setInterval(checkToken, 5 * 60 * 1000);
    // return () => {
    //   clearInterval(interval);
    // };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    setIsLoggedIn(false);
    // Rediriger vers la page d'accueil
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="App">
        <Navbar bg="dark" variant="dark" expand="lg" className="mb-4" style={{ background: '#1A3761' }}>
          <Container>
            <Navbar.Brand href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MarsaLogoImg height={40} />
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="ms-auto">
                {isLoggedIn ? (
                  <>
                    <Nav.Link href="/historique" style={{ color: 'white' }}>Mes Rendez-vous</Nav.Link>
                    <Nav.Link href="/mon-compte" style={{ color: 'white' }}>Mon Compte</Nav.Link>
                    <Nav.Link onClick={handleLogout} style={{ cursor: 'pointer', color: 'white' }}>Déconnexion</Nav.Link>
                  </>
                ) : (
                  <Nav.Link href="/login" style={{ color: 'white' }}>Connexion</Nav.Link>
                )}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rendez-vous" element={<RendezVousForm type="import" />} />
          <Route path="/rendez-vous/import" element={<RendezVousForm type="import" />} />
          <Route path="/rendez-vous/export" element={<RendezVousForm type="export" />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/historique" element={<Historique title="Mes Rendez-vous" />} />
          <Route path="/mon-compte" element={<MonCompte />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/téléchargement (2) (1).jpeg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0'
    }}>
      <Container>
        <div className="text-center mb-5">
          <div style={{
            display: 'inline-block',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 20,
            padding: '20px 30px',
            marginBottom: 20,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <img
              src="/marsa-maroc-logo.png"
              alt="Marsa Maroc Logo"
              height={80}
              style={{ 
                display: 'block',
                margin: '0 auto',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
              }}
            />
          </div>
          <h1 className="display-5 mb-2 mt-3" style={{ color: 'white', fontWeight: 700, letterSpacing: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>Portail de prise de Rendez-Vous</h1>
        </div>
        <div className="row justify-content-center mb-5">
          <div className="col-md-8">
            <div className="card shadow-lg" style={{ borderRadius: 32, background: 'rgba(255,255,255,0.95)', border: 'none', backdropFilter: 'blur(10px)' }}>
              <div className="card-body p-5 text-center">
                <h3 className="mb-4" style={{ color: '#1A3761', fontWeight: 700, letterSpacing: 1 }}>
                  <i className="fas fa-calendar-plus me-2"></i>
                  Prise de Rendez-vous
                </h3>
                <div className="row mb-4">
                  <div className="col-md-6 mb-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-user-tie me-3 fa-2x" style={{ color: '#009FE3' }}></i>
                      <div>
                        <h5 style={{ color: '#1A3761', fontWeight: 600 }}>Chauffeurs</h5>
                        <p className="text-muted mb-0">Prenez rendez-vous pour vos opérations Import/Export</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-qrcode me-3 fa-2x" style={{ color: '#009FE3' }}></i>
                      <div>
                        <h5 style={{ color: '#1A3761', fontWeight: 600 }}>QR Code</h5>
                        <p className="text-muted mb-0">Recevez votre QR code après validation</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <a href="/rendez-vous/import" className="btn btn-primary btn-lg w-100 py-3" style={{ borderRadius: 16, fontWeight: 700, fontSize: 18, letterSpacing: 1, boxShadow: '0 2px 8px rgba(26,55,97,0.10)' }}>
                      <i className="fas fa-arrow-down me-2"></i>
                      Import
                    </a>
                  </div>
                  <div className="col-md-6 mb-3">
                    <a href="/rendez-vous/export" className="btn btn-outline-primary btn-lg w-100 py-3" style={{ borderRadius: 16, fontWeight: 700, fontSize: 18, letterSpacing: 1, borderWidth: 2 }}>
                      <i className="fas fa-arrow-up me-2"></i>
                      Export
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row mt-4 justify-content-center">
          <div className="col-md-4 mb-4">
            <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 20, background: '#E6F7FB', transition: 'transform 0.2s', textAlign: 'center' }}>
              <div className="card-body">
                <i className="fas fa-truck fa-3x mb-3" style={{ color: '#009FE3' }}></i>
                <h5 className="card-title" style={{ color: '#1A3761', fontWeight: 700 }}>Import/Export</h5>
                <p className="card-text text-muted">
                  Gestion des opérations Import et Export
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 20, background: '#FFF', transition: 'transform 0.2s', textAlign: 'center' }}>
              <div className="card-body">
                <i className="fas fa-cube fa-3x mb-3" style={{ color: '#1A3761' }}></i>
                <h5 className="card-title" style={{ color: '#009FE3', fontWeight: 700 }}>Conteneurs</h5>
                <p className="card-text text-muted">
                  Gestion des conteneurs vides et pleins
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 20, background: '#F5F5F5', transition: 'transform 0.2s', textAlign: 'center' }}>
              <div className="card-body">
                <i className="fas fa-clock fa-3x mb-3" style={{ color: '#009FE3' }}></i>
                <h5 className="card-title" style={{ color: '#1A3761', fontWeight: 700 }}>Horaires</h5>
                <p className="card-text text-muted">
                  Rendez-vous disponibles de 6h00 à 22h00
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default App; 