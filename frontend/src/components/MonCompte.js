import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Alert, Spinner, Button, Modal, Form } from 'react-bootstrap';

const MonCompte = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Veuillez vous connecter pour voir votre compte.');
          return;
        }

        // Récupérer les informations complètes du profil via l'API
        const response = await fetch('/api/profil/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
        } else {
          // Fallback: décoder le token JWT si l'API échoue
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserInfo({
            email: payload.email,
            first_name: payload.first_name,
            last_name: payload.last_name,
            telephone: 'Non renseigné',
          });
        }
      } catch (err) {
        setError('Erreur lors du chargement des informations du compte.');
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    window.location.href = '/';
  };

  const handlePwdChange = (e) => {
    setPwdForm({ ...pwdForm, [e.target.name]: e.target.value });
  };

  const handlePwdSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    if (!pwdForm.old_password || !pwdForm.new_password || !pwdForm.confirm_password) {
      setPwdError('Tous les champs sont obligatoires.');
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setPwdLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: pwdForm.old_password,
          new_password: pwdForm.new_password,
          new_password_confirm: pwdForm.confirm_password
        })
      });
      const data = await response.json();
      if (response.ok) {
        setPwdSuccess('Mot de passe changé avec succès.');
        setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        setPwdError(data.detail || Object.values(data).join(' '));
      }
    } catch (err) {
      setPwdError('Erreur réseau.');
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Chargement des informations...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F5F5 0%, #E6F7FB 100%)', padding: '40px 0' }}>
      <Container>
        <div className="text-center mb-5">
          <h1 className="display-5 mb-3" style={{ color: '#1A3761', fontWeight: 700 }}>
            Mon Compte
          </h1>
          <p className="lead" style={{ color: '#009FE3', fontWeight: 500 }}>
            Gestion de votre compte utilisateur
          </p>
        </div>

        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-lg" style={{ borderRadius: 24, border: 'none' }}>
              <Card.Body style={{ padding: 36 }}>
                <div className="text-center mb-4">
                  <h3 style={{ color: '#1A3761', fontWeight: 700 }}>
                    {userInfo?.first_name} {userInfo?.last_name}
                  </h3>
                  <p className="text-muted">{userInfo?.email}</p>
                </div>

                <div className="mb-4">
                  <h5 style={{ color: '#1A3761', fontWeight: 600, marginBottom: 20 }}>Informations du compte</h5>
                  
                  <div className="mb-3">
                    <label className="form-label text-muted">Nom</label>
                    <div className="form-control-plaintext" style={{ fontWeight: 500 }}>
                      {userInfo?.last_name || 'Non renseigné'}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Prénom</label>
                    <div className="form-control-plaintext" style={{ fontWeight: 500 }}>
                      {userInfo?.first_name || 'Non renseigné'}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Email</label>
                    <div className="form-control-plaintext" style={{ fontWeight: 500 }}>
                      {userInfo?.email || 'Non renseigné'}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted">Numéro de téléphone</label>
                    <div className="form-control-plaintext" style={{ fontWeight: 500 }}>
                      {userInfo?.telephone || 'Non renseigné'}
                    </div>
                  </div>
                </div>

                <div className="d-grid gap-2 mb-3">
                  <Button 
                    variant="outline-danger" 
                    size="lg" 
                    style={{ borderRadius: 16, fontWeight: 600 }}
                    onClick={handleLogout}
                  >
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Se déconnecter
                  </Button>
                  <Button
                    variant="outline-warning"
                    size="lg"
                    style={{ borderRadius: 16, fontWeight: 600 }}
                    onClick={() => setShowPwdModal(true)}
                  >
                    <i className="fas fa-key me-2"></i>
                    Changer le mot de passe
                  </Button>
                </div>
                {/* Modal changement mot de passe */}
                <Modal show={showPwdModal} onHide={() => { setShowPwdModal(false); setPwdError(''); setPwdSuccess(''); }} centered>
                  <Modal.Header closeButton>
                    <Modal.Title>Changer le mot de passe</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    {pwdError && <Alert variant="danger">{pwdError}</Alert>}
                    {pwdSuccess && <Alert variant="success">{pwdSuccess}</Alert>}
                    <Form onSubmit={handlePwdSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>Ancien mot de passe</Form.Label>
                        <Form.Control
                          type="password"
                          name="old_password"
                          value={pwdForm.old_password}
                          onChange={handlePwdChange}
                          required
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Nouveau mot de passe</Form.Label>
                        <Form.Control
                          type="password"
                          name="new_password"
                          value={pwdForm.new_password}
                          onChange={handlePwdChange}
                          required
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Confirmer le nouveau mot de passe</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirm_password"
                          value={pwdForm.confirm_password}
                          onChange={handlePwdChange}
                          required
                        />
                      </Form.Group>
                      <div className="d-grid">
                        <Button type="submit" variant="primary" disabled={pwdLoading} style={{ borderRadius: 12, fontWeight: 600 }}>
                          {pwdLoading ? 'Changement en cours...' : 'Changer le mot de passe'}
                        </Button>
                      </div>
                    </Form>
                  </Modal.Body>
                </Modal>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default MonCompte; 