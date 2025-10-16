import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Card, Container, Row, Col } from 'react-bootstrap';
import axios from 'axios';

const Login = ({ setIsLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Le sérialiseur attend un champ email obligatoire
      const response = await axios.post('/api/auth/login/', { 
        email: email, // Utiliser le champ email
        password 
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data && response.data.access) {
        localStorage.setItem('token', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);
        // Mettre à jour l'état de connexion
        setIsLoggedIn(true);
        // Attendre un peu avant de naviguer pour laisser le temps à l'état de se mettre à jour
        setTimeout(() => {
          navigate('/');
        }, 100);
      } else {
        setError('Identifiants invalides');
      }
    } catch (err) {
      console.error('Erreur connexion:', err);
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        console.log('Données d\'erreur:', errorData);
        if (typeof errorData === 'object') {
          setError(Object.values(errorData).join(' '));
        } else {
          setError(errorData.toString());
        }
      } else {
        setError('Erreur réseau lors de la connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F5F5 0%, #E6F7FB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="shadow-lg" style={{ borderRadius: 24 }}>
              <Card.Body style={{ padding: 36 }}>
                <h3 className="mb-4 text-center" style={{ color: '#1A3761', fontWeight: 700 }}>
                  Connexion
                </h3>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Mot de passe</Form.Label>
                    <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  </Form.Group>
                  <div className="d-grid">
                    <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ borderRadius: 16, fontWeight: 700 }}>
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                  </div>
                </Form>
                <div className="mt-3 text-center">
                  <a href="/register">Créer un compte</a>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login; 