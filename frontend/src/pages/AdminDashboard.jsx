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
  TabList,
  Tab,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Select,
  Label,
  Input,
} from '@fluentui/react-components';
import {
  SignOutRegular,
  BoxDismissRegular,
  BoxCheckmarkRegular,
  BoxRegular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../i18n/LanguageContext';

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
  statsContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
  },
  statCard: {
    flex: 1,
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  card: {
    marginTop: '20px',
    ...shorthands.padding('20px'),
  },
});

export const AdminDashboard = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [stats, setStats] = useState({ waiting_pickup: 0, full_shelves: 0, today_ops: 0 });
  const [retentionParcels, setRetentionParcels] = useState([]);
  const [loading, setLoading] = useState(false);

  // Courier management
  const [couriers, setCouriers] = useState([]);
  const [courierName, setCourierName] = useState('');
  const [courierCode, setCourierCode] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [courierLoading, setCourierLoading] = useState(false);

  // Shelf management
  const [shelves, setShelves] = useState([]);
  const [shelfZone, setShelfZone] = useState('');
  const [shelfCode, setShelfCode] = useState('');
  const [shelfCapacity, setShelfCapacity] = useState('');
  const [shelfLoading, setShelfLoading] = useState(false);

  // Status Update Dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [newStatus, setNewStatus] = useState('stored');

  const isExpired = (parcel) => {
    const status = parcel?.status;
    if (status !== 'stored' && status !== 'pending') return false;
    const t = new Date(parcel?.created_at || parcel?.updated_at).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t > 3 * 24 * 60 * 60 * 1000;
  };

  useEffect(() => {
    if (selectedTab === 'dashboard') {
      fetchStats();
    } else if (selectedTab === 'retention') {
      fetchRetention();
    } else if (selectedTab === 'couriers') {
      fetchCouriers();
    } else if (selectedTab === 'shelves') {
      fetchShelves();
    }
  }, [selectedTab]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data.data || { waiting_pickup: 0, full_shelves: 0, today_ops: 0 });
    } catch (error) {
      console.error('Failed to fetch stats', error);
      if (error.response && error.response.status === 401) navigate('/login');
    }
  };

  const fetchRetention = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/admin/parcels/retention?days=3', { // Default 3 days for demo
        headers: { Authorization: `Bearer ${token}` },
      });
      setRetentionParcels(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch retention parcels', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCouriers = async () => {
    setCourierLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/admin/couriers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCouriers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch couriers', error);
      if (error.response && error.response.status === 401) navigate('/login');
      else alert(error.response?.data?.error || 'Failed to fetch couriers');
    } finally {
      setCourierLoading(false);
    }
  };

  const handleCreateCourier = async () => {
    if (!courierName.trim() || !courierCode.trim()) {
      alert('Courier name and code are required');
      return;
    }
    setCourierLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/admin/couriers', {
        name: courierName.trim(),
        code: courierCode.trim(),
        contact_phone: courierPhone.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourierName('');
      setCourierCode('');
      setCourierPhone('');
      await fetchCouriers();
    } catch (error) {
      console.error('Failed to create courier', error);
      alert(error.response?.data?.error || 'Failed to create courier');
    } finally {
      setCourierLoading(false);
    }
  };

  const handleDeleteCourier = async (code) => {
    if (!window.confirm(`Delete courier ${code}?`)) return;
    setCourierLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/admin/couriers/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCouriers();
    } catch (error) {
      console.error('Failed to delete courier', error);
      alert(error.response?.data?.error || 'Failed to delete courier');
    } finally {
      setCourierLoading(false);
    }
  };

  const fetchShelves = async () => {
    setShelfLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/admin/shelves', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShelves(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shelves', error);
      if (error.response && error.response.status === 401) navigate('/login');
      else alert(error.response?.data?.error || 'Failed to fetch shelves');
    } finally {
      setShelfLoading(false);
    }
  };

  const handleCreateShelf = async () => {
    const cap = parseInt(shelfCapacity, 10);
    if (!shelfZone.trim() || !shelfCode.trim() || Number.isNaN(cap)) {
      alert('Zone, code and capacity are required');
      return;
    }
    setShelfLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/v1/admin/shelves', {
        zone: shelfZone.trim(),
        code: shelfCode.trim(),
        capacity: cap,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShelfZone('');
      setShelfCode('');
      setShelfCapacity('');
      await fetchShelves();
      await fetchStats();
    } catch (error) {
      console.error('Failed to create shelf', error);
      alert(error.response?.data?.error || 'Failed to create shelf');
    } finally {
      setShelfLoading(false);
    }
  };

  const handleDeleteShelf = async (code) => {
    if (!window.confirm(`Delete empty shelf ${code}?`)) return;
    setShelfLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/admin/shelves/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchShelves();
      await fetchStats();
    } catch (error) {
      console.error('Failed to delete shelf', error);
      alert(error.response?.data?.error || 'Failed to delete shelf');
    } finally {
      setShelfLoading(false);
    }
  };

  const handleStatusUpdateClick = (parcel) => {
    setSelectedParcel(parcel);
    setNewStatus(parcel.status);
    setStatusDialogOpen(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedParcel) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/admin/parcels/${selectedParcel.tracking_number}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatusDialogOpen(false);
      fetchRetention(); // Refresh list
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar name="Admin" color="colorful" />
          <Title3>{t('admin.dashboard')}</Title3>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button size="small" onClick={toggleLanguage}>
            {language === 'zh' ? 'EN' : '中文'}
          </Button>
          <Button icon={<SignOutRegular />} onClick={handleLogout}>{t('common.logout')}</Button>
        </div>
      </header>

      <main className={styles.content}>
        <TabList selectedValue={selectedTab} onTabSelect={(e, data) => setSelectedTab(data.value)}>
          <Tab value="dashboard">Overview</Tab>
          <Tab value="retention">Retention Management</Tab>
          <Tab value="couriers">Couriers</Tab>
          <Tab value="shelves">Shelves</Tab>
        </TabList>

        {selectedTab === 'dashboard' && (
          <div style={{ marginTop: '20px' }}>
            <div className={styles.statsContainer}>
              <Card className={styles.statCard}>
                <BoxRegular fontSize={40} primaryFill="#0078d4" />
                <Title1>{stats.waiting_pickup}</Title1>
                <Text>Waiting for Pickup</Text>
              </Card>
              <Card className={styles.statCard}>
                <BoxDismissRegular fontSize={40} primaryFill="#d13438" />
                <Title1>{stats.full_shelves}</Title1>
                <Text>Full Shelves</Text>
              </Card>
              <Card className={styles.statCard}>
                <BoxCheckmarkRegular fontSize={40} primaryFill="#107c10" />
                <Title1>{stats.today_ops}</Title1>
                <Text>Today's Operations</Text>
              </Card>
            </div>
          </div>
        )}

        {selectedTab === 'retention' && (
          <Card className={styles.card}>
            <Title3>Retention Parcels (&gt; 3 Days)</Title3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Tracking Number</TableHeaderCell>
                  <TableHeaderCell>Courier</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Last Update</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell>Loading...</TableCell></TableRow>
                ) : retentionParcels.length === 0 ? (
                  <TableRow><TableCell>No retention parcels found.</TableCell></TableRow>
                ) : (
                  retentionParcels.map((parcel) => (
                    <TableRow key={parcel.tracking_number}>
                      <TableCell>{parcel.tracking_number}</TableCell>
                      <TableCell>{parcel.courier_name}</TableCell>
                      <TableCell>{parcel.shelf_zone}</TableCell>
                      <TableCell>
                        {isExpired(parcel) ? (
                          <Badge appearance="filled" color="danger">Expired</Badge>
                        ) : (
                          <Badge appearance="tint" color="warning">{parcel.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(parcel.updated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleStatusUpdateClick(parcel)}>
                          Update Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {selectedTab === 'couriers' && (
          <Card className={styles.card}>
            <Title3>Courier Companies</Title3>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
              <div style={{ minWidth: 220 }}>
                <Label>Name</Label>
                <Input value={courierName} onChange={(e, d) => setCourierName(d.value)} placeholder="e.g. 顺丰" />
              </div>
              <div style={{ minWidth: 160 }}>
                <Label>Code</Label>
                <Input value={courierCode} onChange={(e, d) => setCourierCode(d.value)} placeholder="e.g. SF" />
              </div>
              <div style={{ minWidth: 220 }}>
                <Label>Contact Phone (optional)</Label>
                <Input value={courierPhone} onChange={(e, d) => setCourierPhone(d.value)} placeholder="e.g. 400-000-0000" />
              </div>
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <Button appearance="primary" onClick={handleCreateCourier} disabled={courierLoading}>
                  Add
                </Button>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Contact</TableHeaderCell>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courierLoading ? (
                    <TableRow><TableCell>Loading...</TableCell></TableRow>
                  ) : couriers.length === 0 ? (
                    <TableRow><TableCell>No couriers.</TableCell></TableRow>
                  ) : (
                    couriers.map((c) => (
                      <TableRow key={c.code}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.code}</TableCell>
                        <TableCell>{c.contact_phone || '-'}</TableCell>
                        <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Button size="small" appearance="secondary" onClick={() => handleDeleteCourier(c.code)} disabled={courierLoading}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {selectedTab === 'shelves' && (
          <Card className={styles.card}>
            <Title3>Shelves</Title3>
            <Text>Only shelves created by admins can accept inbound parcels.</Text>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
              <div style={{ minWidth: 160 }}>
                <Label>Zone</Label>
                <Input value={shelfZone} onChange={(e, d) => setShelfZone(d.value)} placeholder="e.g. A" />
              </div>
              <div style={{ minWidth: 200 }}>
                <Label>Code</Label>
                <Input value={shelfCode} onChange={(e, d) => setShelfCode(d.value)} placeholder="e.g. A-01" />
              </div>
              <div style={{ minWidth: 160 }}>
                <Label>Capacity</Label>
                <Input type="number" value={shelfCapacity} onChange={(e, d) => setShelfCapacity(d.value)} placeholder="e.g. 50" />
              </div>
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <Button appearance="primary" onClick={handleCreateShelf} disabled={shelfLoading}>
                  Add
                </Button>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Zone</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Load</TableHeaderCell>
                    <TableHeaderCell>Capacity</TableHeaderCell>
                    <TableHeaderCell>Updated</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shelfLoading ? (
                    <TableRow><TableCell>Loading...</TableCell></TableRow>
                  ) : shelves.length === 0 ? (
                    <TableRow><TableCell>No shelves. Create one to enable inbound.</TableCell></TableRow>
                  ) : (
                    shelves.map((s) => (
                      <TableRow key={s.code}>
                        <TableCell>{s.zone}</TableCell>
                        <TableCell>{s.code}</TableCell>
                        <TableCell>{s.current_load}</TableCell>
                        <TableCell>{s.capacity}</TableCell>
                        <TableCell>{s.updated_at ? new Date(s.updated_at).toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          <Button size="small" appearance="secondary" onClick={() => handleDeleteShelf(s.code)} disabled={shelfLoading}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      <Dialog open={statusDialogOpen} onOpenChange={(event, data) => setStatusDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Update Parcel Status</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Label>New Status</Label>
                <Select value={newStatus} onChange={(e, data) => setNewStatus(data.value)}>
                  <option value="stored">Stored</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="returned">Returned</option>
                  <option value="exception">Exception</option>
                </Select>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={confirmStatusUpdate}>Update</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
