import React, { useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
  Card,
  CardHeader,
  CardFooter,
  Input,
  Label,
  Button,
  TabList,
  Tab,
  Title1,
  makeStyles,
  shorthands,
  Text,
} from '@fluentui/react-components';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../i18n/LanguageContext';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#ffffff',
  },
  card: {
    width: '400px',
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  error: {
    color: '#d13438',
    fontSize: '12px',
  }
});

export const Login = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [courierCode, setCourierCode] = useState('');

  const handleTabSelect = (event, data) => {
    setSelectedTab(data.value);
    setError('');
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    let url = '';
    let payload = {};

    try {
      if (selectedTab === 'admin') {
        url = '/api/v1/auth/admin/login';
        payload = { username, password };
      } else if (selectedTab === 'student') {
        url = '/api/v1/auth/student/login';
        payload = { phone, name: 'Student' }; // Name is optional in backend logic usually, but struct has it.
      } else if (selectedTab === 'courier') {
        url = '/api/v1/auth/courier/login';
        payload = { courier_code: courierCode };
      }

      const response = await axios.post(url, payload);
      
      if (response.data && response.data.data && response.data.data.access_token) {
        const token = response.data.data.access_token;
        const role = response.data.data.role;
        
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);

        // Redirect based on role
        if (role === 'admin') navigate('/admin/dashboard');
        else if (role === 'student') navigate('/student/dashboard');
        else if (role === 'courier') navigate('/courier/dashboard');
        else navigate('/'); // Fallback
      } else {
        setError(`${t('login.loginFailed')}: Invalid response from server`);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || t('login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Title1 className={styles.title}>{t('login.title')}</Title1>
      <Card className={styles.card}>
        <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
          <Tab value="student">{t('login.student')}</Tab>
          <Tab value="courier">{t('login.courier')}</Tab>
          <Tab value="admin">{t('login.admin')}</Tab>
        </TabList>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {selectedTab === 'admin' && (
            <>
              <div className={styles.inputContainer}>
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e, data) => setUsername(data.value)} 
                />
              </div>
              <div className={styles.inputContainer}>
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e, data) => setPassword(data.value)} 
                />
              </div>
            </>
          )}

          {selectedTab === 'student' && (
            <div className={styles.inputContainer}>
              <Label htmlFor="phone">{t('login.phone')}</Label>
              <Input 
                id="phone" 
                placeholder={t('login.enterPhone')}
                value={phone} 
                onChange={(e, data) => setPhone(data.value)} 
              />
            </div>
          )}

          {selectedTab === 'courier' && (
            <div className={styles.inputContainer}>
              <Label htmlFor="courierCode">Courier Code</Label>
              <Input 
                id="courierCode" 
                placeholder="Enter your courier code"
                value={courierCode} 
                onChange={(e, data) => setCourierCode(data.value)} 
              />
            </div>
          )}
        </div>

        {error && <Text className={styles.error}>{error}</Text>}

        <CardFooter>
          <Button 
            appearance="primary" 
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Logging in...' : t('login.login')}
          </Button>
        </CardFooter>

        <Button appearance="secondary" onClick={() => navigate('/shipping')} style={{ width: '100%' }}>
          {t('login.shippingCalculator')}
        </Button>
      </Card>
    </div>
  );
};
