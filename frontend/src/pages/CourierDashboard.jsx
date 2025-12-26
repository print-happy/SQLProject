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
  Toast,
  ToastTitle,
  ToastBody,
  Toaster,
  useToastController,
  createToaster,
  Alert,
} from '@fluentui/react-components';
import {
  BoxMultipleRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  SignOutRegular,
  AddCircleRegular,
  ErrorCircleRegular,
  DismissRegular,
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
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    maxWidth: '500px',
    marginTop: '15px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  toastContainer: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '400px',
  },
  toast: {
    animation: 'slideIn 0.3s ease-out',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
});

// 自定义Toast组件
const CustomToast = ({ title, message, type, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckmarkCircleRegular style={{ color: '#0F6CBD', fontSize: '20px' }} />;
      case 'error':
        return <ErrorCircleRegular style={{ color: '#C50F1F', fontSize: '20px' }} />;
      default:
        return null;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#0F6CBD';
      case 'error':
        return '#C50F1F';
      default:
        return '#616161';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '12px 16px',
      backgroundColor: 'white',
      borderRadius: '4px',
      borderLeft: `4px solid ${getBorderColor()}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: '300px',
      maxWidth: '400px',
      animation: 'slideIn 0.3s ease-out',
    }}>
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 'bold',
          fontSize: '14px',
          marginBottom: '4px',
          color: '#323130'
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#605E5C',
          lineHeight: '1.4'
        }}>
          {message}
        </div>
      </div>
      <Button
        appearance="subtle"
        size="small"
        icon={<DismissRegular />}
        onClick={onClose}
        style={{
          minWidth: 'auto',
          padding: '2px',
          marginLeft: '5px'
        }}
      />
    </div>
  );
};

export const CourierDashboard = () => {
  const styles = useStyles();
  const navigate = useNavigate();

  // Toast 状态管理
  const [toasts, setToasts] = useState([]);

  // Tab 状态
  const [selectedTab, setSelectedTab] = useState('inbound');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Inbound Form State
  const [trackingNumber, setTrackingNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [studentName, setStudentName] = useState('');
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

      // 显示任务加载成功提示
      showToast('任务加载成功', `已加载 ${response.data.data?.length || 0} 个任务`, 'success');
    } catch (error) {
      console.error('Failed to fetch tasks', error);
      showToast('加载失败', '无法加载任务列表，请稍后重试', 'error');

      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // 显示Toast函数
  const showToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      title,
      message,
      type,
      timestamp: new Date(),
    };

    setToasts(prev => [newToast, ...prev]); // 新的toast放在最上面

    // 5秒后自动移除
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  // 移除Toast函数
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleInbound = async () => {
    // 验证输入
    if (!trackingNumber.trim()) {
      showToast('入库失败', '请填写运单号', 'error');
      return;
    }

    if (!phone.trim()) {
      showToast('入库失败', '请填写收件人手机号', 'error');
      return;
    }

    // 手机号格式验证（简单验证）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      showToast('入库失败', '请输入有效的手机号（11位数字）', 'error');
      return;
    }

    setInboundLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/inbound', {
        tracking_number: trackingNumber.trim(),
        phone: phone.trim(),
        user_name: studentName.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 入库成功提示
      showToast('入库成功', `运单 ${trackingNumber} 入库成功！`, 'success');

      // Reset form
      setTrackingNumber('');
      setPhone('');
      setStudentName('');

      // 自动切换到任务标签页，显示新任务
      setSelectedTab('tasks');
      // 重新加载任务列表
      setTimeout(() => {
        fetchTasks();
      }, 500);

    } catch (error) {
      console.error(error);
      const resp = error.response;
      let reason = '';

      if (resp) {
        const serverMsg = resp.data?.error || resp.data?.message || resp.data?.detail || '';

        if (resp.status === 400) {
          reason = '请求参数错误：' + (serverMsg || '请检查输入信息');
        } else if (resp.status === 401) {
          reason = '登录已过期，请重新登录';
          setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            navigate('/login');
          }, 2000);
        } else if (resp.status === 403) {
          reason = '权限不足，无法执行此操作';
        } else if (resp.status === 409) {
          reason = '运单号已存在：' + serverMsg;
        } else if (resp.status === 422) {
          reason = '数据验证失败：' + serverMsg;
        } else if (resp.status === 500) {
          if (/duplicate|unique|already exists|重复|exists/i.test(serverMsg)) {
            reason = '快递单号重复，无法重复入库';
          } else if (/shelf|space|full|没有空间|货架/i.test(serverMsg)) {
            reason = '货架空间不足，请联系管理员';
          } else if (/not found|不存在|找不到/i.test(serverMsg)) {
            reason = '相关资源不存在：' + serverMsg;
          } else {
            reason = serverMsg || '服务器内部错误，请稍后重试';
          }
        } else if (resp.status === 503) {
          reason = '服务暂时不可用，请稍后重试';
        } else {
          reason = serverMsg || `服务器错误 (${resp.status})`;
        }
      } else if (error.request) {
        reason = '网络连接失败，请检查网络设置';
      } else {
        reason = error.message || '未知错误，请稍后重试';
      }

      showToast('入库失败', reason, 'error');
    } finally {
      setInboundLoading(false);
    }
  };

  const handleLogout = () => {
    showToast('退出登录', '您已成功退出系统', 'info');
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login');
    }, 1000);
  };

  // 添加 CSS 动画
  const animationStyles = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
    
    .toast-exit {
      animation: fadeOut 0.3s ease-out forwards;
    }
  `;

  return (
    <div className={styles.container}>
      {/* 添加 CSS 动画样式 */}
      <style>{animationStyles}</style>

      {/* Toast 容器 - 固定在右上角 */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <CustomToast
            key={toast.id}
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* 顶部导航栏 */}
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar name="Courier" color="brand" />
          <Title3>快递员工作台</Title3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Text style={{ color: '#616161' }}>
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
          <Button
            appearance="secondary"
            icon={<SignOutRegular />}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className={styles.content}>
        {/* 标签页切换 */}
        <div style={{ marginBottom: '20px' }}>
          <TabList
            selectedValue={selectedTab}
            onTabSelect={(e, data) => setSelectedTab(data.value)}
            size="large"
          >
            <Tab value="inbound" icon={<AddCircleRegular />}>
              包裹入库
            </Tab>
            <Tab value="tasks" icon={<BoxMultipleRegular />}>
              我的任务 ({tasks.length})
            </Tab>
          </TabList>
        </div>

        {/* 入库表单 */}
        {selectedTab === 'inbound' && (
          <Card className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0F6CBD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}>
                <AddCircleRegular />
              </div>
              <Title3>入库新包裹</Title3>
            </div>

            <Text style={{ color: '#616161', marginBottom: '20px' }}>
              请扫描或输入快递单号，填写收件人信息完成包裹入库
            </Text>

            <div className={styles.formContainer}>
              <div className={styles.inputGroup}>
                <Label htmlFor="tracking" required>
                  运单号
                </Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e, d) => setTrackingNumber(d.value)}
                  placeholder="例如：SF123456789、YT987654321"
                  size="large"
                />
                <Text size={200} style={{ color: '#616161' }}>
                  请仔细核对运单号，确保准确无误
                </Text>
              </div>

              <div className={styles.inputGroup}>
                <Label htmlFor="phone" required>
                  收件人手机号
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e, d) => setPhone(d.value)}
                  placeholder="例如：13800138000"
                  size="large"
                  type="tel"
                />
              </div>

              <div className={styles.inputGroup}>
                <Label htmlFor="name">
                  收件人姓名（可选）
                </Label>
                <Input
                  id="name"
                  value={studentName}
                  onChange={(e, d) => setStudentName(d.value)}
                  placeholder="例如：张三"
                  size="large"
                />
                <Text size={200} style={{ color: '#616161' }}>
                  填写姓名有助于收件人快速识别包裹
                </Text>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Button
                  appearance="primary"
                  size="large"
                  icon={inboundLoading ? <ClockRegular /> : <CheckmarkCircleRegular />}
                  onClick={handleInbound}
                  disabled={inboundLoading}
                  style={{ flex: 1 }}
                >
                  {inboundLoading ? '处理中...' : '确认入库'}
                </Button>

                <Button
                  appearance="secondary"
                  size="large"
                  onClick={() => {
                    setTrackingNumber('');
                    setPhone('');
                    setStudentName('');
                    showToast('表单已重置', '所有输入框已清空', 'info');
                  }}
                >
                  清空
                </Button>
              </div>
            </div>

            <div style={{
              marginTop: '25px',
              padding: '15px',
              backgroundColor: '#F3F2F1',
              borderRadius: '4px',
              borderLeft: '4px solid #0F6CBD'
            }}>
              <Text size={300} weight="semibold" style={{ marginBottom: '5px' }}>
                入库说明：
              </Text>
              <Text size={200} style={{ color: '#616161' }}>
                1. 请确保运单号和手机号准确无误<br />
                2. 系统会自动分配货架位置<br />
                3. 入库成功后系统会自动发送取件通知<br />
                4. 如有问题请联系管理员
              </Text>
            </div>
          </Card>
        )}

        {/* 任务列表 */}
        {selectedTab === 'tasks' && (
          <Card className={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#0F6CBD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}>
                  <BoxMultipleRegular />
                </div>
                <Title3>我的任务</Title3>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  appearance="outline"
                  size="small"
                  onClick={fetchTasks}
                  disabled={loading}
                >
                  刷新列表
                </Button>
                <Badge appearance="filled" size="large">
                  总计: {tasks.length}
                </Badge>
              </div>
            </div>

            {loading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px'
              }}>
                <div className="spinner" style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #F3F2F1',
                  borderTop: '3px solid #0F6CBD',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '15px'
                }}></div>
                <Text>正在加载任务列表...</Text>
              </div>
            ) : tasks.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                textAlign: 'center'
              }}>
                <BoxMultipleRegular style={{ fontSize: '48px', color: '#C8C6C4', marginBottom: '15px' }} />
                <Title3 style={{ marginBottom: '10px' }}>暂无任务</Title3>
                <Text style={{ color: '#616161', marginBottom: '20px' }}>
                  您还没有处理过任何包裹，点击"包裹入库"开始工作
                </Text>
                <Button
                  appearance="primary"
                  onClick={() => setSelectedTab('inbound')}
                >
                  去入库包裹
                </Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>运单号</TableHeaderCell>
                      <TableHeaderCell>收件人</TableHeaderCell>
                      <TableHeaderCell>手机号</TableHeaderCell>
                      <TableHeaderCell>状态</TableHeaderCell>
                      <TableHeaderCell>入库时间</TableHeaderCell>
                      <TableHeaderCell>操作</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task, index) => (
                      <TableRow key={task.tracking_number || index}>
                        <TableCell>
                          <Text weight="semibold">{task.tracking_number || 'N/A'}</Text>
                        </TableCell>
                        <TableCell>
                          {task.user_name || task.student_name || '-'}
                        </TableCell>
                        <TableCell>
                          {task.phone || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            appearance="filled"
                            style={{
                              backgroundColor: task.status === '已完成' ? '#DFF6DD' :
                                task.status === '处理中' ? '#FFF4CE' : '#E1DFDD',
                              color: task.status === '已完成' ? '#0B5C00' :
                                task.status === '处理中' ? '#8A5800' : '#323130',
                            }}
                          >
                            {task.status || '未知'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            appearance="subtle"
                            size="small"
                            onClick={() => {
                              showToast('详情查看', `运单 ${task.tracking_number} 的详细信息`, 'info');
                            }}
                          >
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}
      </main>

      {/* 页脚 */}
      <footer style={{
        padding: '15px 20px',
        backgroundColor: 'white',
        borderTop: '1px solid #E1DFDD',
        textAlign: 'center',
        color: '#616161',
        fontSize: '14px'
      }}>
        <Text>
          快递管理系统 © {new Date().getFullYear()} | 当前版本: 1.0.0
        </Text>
      </footer>
    </div>
  );
};