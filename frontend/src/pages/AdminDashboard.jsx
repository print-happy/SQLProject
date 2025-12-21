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
} from '@fluentui/react-components';
import {
  SignOutRegular,
  BoxDismissRegular,
  BoxCheckmarkRegular,
  BoxRegular,
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
  
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [stats, setStats] = useState({ waiting_pickup: 0, full_shelves: 0, today_ops: 0 });
  const [retentionParcels, setRetentionParcels] = useState([]);
  const [loading, setLoading] = useState(false);

  // Status Update Dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [newStatus, setNewStatus] = useState('stored');

  useEffect(() => {
    if (selectedTab === 'dashboard') {
      fetchStats();
    } else if (selectedTab === 'retention') {
      fetchRetention();
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
          <Title3>Admin Dashboard</Title3>
        </div>
        <Button icon={<SignOutRegular />} onClick={handleLogout}>Logout</Button>
      </header>

      <main className={styles.content}>
        <TabList selectedValue={selectedTab} onTabSelect={(e, data) => setSelectedTab(data.value)}>
          <Tab value="dashboard">Overview</Tab>
          <Tab value="retention">Retention Management</Tab>
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
                        <Badge appearance="tint" color="warning">{parcel.status}</Badge>
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
