import React, { useEffect, useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
  Card,
  CardHeader,
  Button,
  Title1,
  Title3,
  Text,
  Badge,
  makeStyles,
  shorthands,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Avatar,
  Input,
  Label,
  TabList,
  Tab,
  Toaster,
  useToastController,
  Toast,
  ToastTitle,
  ToastBody,
} from '@fluentui/react-components';
import {
  BoxMultipleRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  SignOutRegular,
  AddCircleRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding('10px', '20px'),
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
    ...shorthands.padding('20px'),
    overflowY: 'auto',
  },
  card: {
    marginTop: '20px',
    ...shorthands.padding('20px'),
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    maxWidth: '500px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
});

export const CourierDashboard = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const toasterId = useToastController('toaster');
  
  const [selectedTab, setSelectedTab] = useState('inbound');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Inbound Form State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [shelfZone, setShelfZone] = useState('');
  const [shelfRow, setShelfRow] = useState('');
  const [shelfUnit, setShelfUnit] = useState('');
  const [inboundLoading, setInboundLoading] = useState(false);

  useEffect(() => {
    if (selectedTab === 'tasks') {
      fetchTasks();
    }
  }, [selectedTab]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/courier/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInbound = async () => {
    if (!trackingNumber || !phone || !shelfZone || !shelfRow || !shelfUnit) {
      notify('Error', 'Please fill in all fields', 'error');
      return;
    }

    setInboundLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/inbound', {
        tracking_number: trackingNumber,
        phone: phone,
        shelf_zone: shelfZone,
        shelf_row: parseInt(shelfRow),
        shelf_unit: parseInt(shelfUnit),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify('Success', `Parcel ${trackingNumber} inbound successfully!`, 'success');
      
      // Reset form
      setTrackingNumber('');
      setPhone('');
      setShelfZone('');
      setShelfRow('');
      setShelfUnit('');
    } catch (error) {
      console.error(error);
      notify('Error', error.response?.data?.error || 'Inbound failed', 'error');
    } finally {
      setInboundLoading(false);
    }
  };

  const notify = (title, body, intent) => {
    toasterId.dispatchToast(
      <Toast>
        <ToastTitle>{title}</ToastTitle>
        <ToastBody>{body}</ToastBody>
      </Toast>,
      { intent }
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <Toaster toasterId={toasterId} />
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar name="Courier" color="brand" />
          <Title3>Courier Dashboard</Title3>
        </div>
        <Button icon={<SignOutRegular />} onClick={handleLogout}>Logout</Button>
      </header>

      <main className={styles.content}>
        <TabList selectedValue={selectedTab} onTabSelect={(e, data) => setSelectedTab(data.value)}>
          <Tab value="inbound">Inbound Parcel</Tab>
          <Tab value="tasks">My Tasks</Tab>
        </TabList>

        {selectedTab === 'inbound' && (
          <Card className={styles.card}>
            <Title3>Inbound New Parcel</Title3>
            <div className={styles.formContainer}>
              <div className={styles.inputGroup}>
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input id="tracking" value={trackingNumber} onChange={(e, d) => setTrackingNumber(d.value)} placeholder="e.g. SF123456789" />
              </div>
              <div className={styles.inputGroup}>
                <Label htmlFor="phone">Student Phone</Label>
                <Input id="phone" value={phone} onChange={(e, d) => setPhone(d.value)} placeholder="e.g. 13800138000" />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <Label htmlFor="zone">Zone</Label>
                  <Input id="zone" value={shelfZone} onChange={(e, d) => setShelfZone(d.value)} placeholder="A" />
                </div>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <Label htmlFor="row">Row</Label>
                  <Input id="row" type="number" value={shelfRow} onChange={(e, d) => setShelfRow(d.value)} placeholder="1" />
                </div>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" type="number" value={shelfUnit} onChange={(e, d) => setShelfUnit(d.value)} placeholder="1" />
                </div>
              </div>
              <Button 
                appearance="primary" 
                icon={<AddCircleRegular />} 
                onClick={handleInbound}
                disabled={inboundLoading}
              >
                {inboundLoading ? 'Processing...' : 'Confirm Inbound'}
              </Button>
            </div>
          </Card>
        )}

        {selectedTab === 'tasks' && (
          <Card className={styles.card}>
            <Title3>My Tasks (Parcels Handled)</Title3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Tracking Number</TableHeaderCell>
                  <TableHeaderCell>Student Phone</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Time</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell>Loading...</TableCell></TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow><TableCell>No tasks found.</TableCell></TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.tracking_number}>
                      <TableCell>{task.tracking_number}</TableCell>
                      <TableCell>{task.student_phone || '-'}</TableCell>
                      <TableCell>{`${task.shelf_zone}-${task.shelf_row}-${task.shelf_unit}`}</TableCell>
                      <TableCell>
                        <Badge appearance="tint">{task.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(task.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
};
