import { useState } from 'react';
import {
  Card, Form, Input, Button, message, Typography, Spin, Tag,
  List, Collapse, Divider, Row, Col, Steps, Tooltip,
} from 'antd';
import {
  PlusOutlined, EnvironmentOutlined, CarOutlined,
  CloudOutlined, DashboardOutlined, CompassOutlined,
  CoffeeOutlined, ShopOutlined, FlagOutlined, LinkOutlined,
} from '@ant-design/icons';
import { travelApi } from '../../api/travel';

const { Title, Text } = Typography;

interface Stopover {
  name: string;
  duration: string;
}

interface RouteSegment {
  type: string;
  label: string;
  detail: string;
  duration?: string;
  distance?: string;
  price?: string;
}

interface RouteSegmentGroup {
  from: string;
  to: string;
  routes: RouteSegment[];
}

interface PoiItem {
  name: string;
  address: string;
  type: string;
  distance: string;
  location?: string;
}

interface CityPoiGroup {
  city: string;
  attractions: PoiItem[];
  restaurants: PoiItem[];
  shopping: PoiItem[];
}

interface CustomizeResult {
  origin: string;
  destination: string;
  stopovers: { name: string; duration: string }[];
  routes: RouteSegment[];
  segments: RouteSegmentGroup[];
  cityPois: CityPoiGroup[];
  attractions: PoiItem[];
  restaurants: PoiItem[];
  shopping: PoiItem[];
}

const routeIcons: Record<string, React.ReactNode> = {
  flight: <CloudOutlined />,
  high_speed_rail: <DashboardOutlined />,
  train: <DashboardOutlined />,
  transit: <CarOutlined />,
  driving: <CarOutlined />,
  walking: <FlagOutlined />,
};

const routeColors: Record<string, string> = {
  flight: '#722ed1',
  high_speed_rail: '#1890ff',
  train: '#52c41a',
  transit: '#faad14',
  driving: '#fa8c16',
  walking: '#eb2f96',
};

export default function CustomizePage() {
  const [form] = Form.useForm();
  const [stopovers, setStopovers] = useState<Stopover[]>([]);
  const [stopoverName, setStopoverName] = useState('');
  const [stopoverDuration, setStopoverDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CustomizeResult | null>(null);

  const addStopover = () => {
    if (!stopoverName || !stopoverDuration) {
      message.warning('请填写经停地和经停时间');
      return;
    }
    setStopovers([...stopovers, { name: stopoverName, duration: stopoverDuration }]);
    setStopoverName('');
    setStopoverDuration('');
  };

  const removeStopover = (index: number) => {
    setStopovers(stopovers.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: { origin: string; destination: string }) => {
    setLoading(true);
    try {
      const res = await travelApi.customize({
        origin: values.origin,
        stopovers,
        destination: values.destination,
      });
      setResult(res.data as CustomizeResult);
      message.success('定制完成');
    } catch {
      message.error('定制失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={3}>🗺️ 智能旅游定制</Title>
      <Text type="secondary">填写出发地和目的地，获取路线规划、游玩推荐和美食推荐。</Text>

      <Card style={{ marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="origin" label="出发地" rules={[{ required: true, message: '请输入出发地' }]}>
                <Input prefix={<EnvironmentOutlined />} placeholder="例如：北京" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="destination" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}>
                <Input prefix={<EnvironmentOutlined />} placeholder="例如：成都" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: 16 }}>
            <Text strong>经停地（可选）</Text>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Input value={stopoverName} onChange={(e) => setStopoverName(e.target.value)} placeholder="经停地名" style={{ flex: 1 }} />
              <Input value={stopoverDuration} onChange={(e) => setStopoverDuration(e.target.value)} placeholder="停留时间" style={{ width: 140 }} />
              <Button icon={<PlusOutlined />} onClick={addStopover}>添加</Button>
            </div>
            {stopovers.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {stopovers.map((s, i) => (
                  <Tag key={i} closable onClose={() => removeStopover(i)} color="blue" style={{ marginBottom: 4 }}>
                    {s.name}（{s.duration}）
                  </Tag>
                ))}
              </div>
            )}
          </div>

          <Button type="primary" htmlType="submit" loading={loading} block size="large" icon={<CompassOutlined />}>
            开始定制
          </Button>
        </Form>
      </Card>

      {result && <ResultDisplay result={result} />}
    </div>
  );
}

function ResultDisplay({ result }: { result: CustomizeResult }) {
  const amapLink = (name: string) =>
    `https://ditu.amap.com/search?query=${encodeURIComponent(name)}`;

  const poiList = (items: PoiItem[]) => (
    items.length > 0 ? (
      <List size="small" dataSource={items} renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={
              <a href={amapLink(item.name)} target="_blank" rel="noopener noreferrer">
                {item.name} <LinkOutlined style={{ fontSize: 12, color: '#1890ff' }} />
              </a>
            }
            description={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.address} · {item.distance} · 点击查看地图
              </Text>
            }
          />
        </List.Item>
      )} />
    ) : <Text type="secondary">暂无推荐结果</Text>
  );

  return (
    <div style={{ marginTop: 24 }}>
      {/* 路线概览：全程步骤 */}
      <Card title={<span><FlagOutlined /> 完整行程</span>} style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {result.origin} → {result.stopovers.map((s) => `${s.name} → `)}{result.destination}
        </Text>
        <Steps
          direction="horizontal"
          current={-1}
          items={[
            { title: result.origin, status: 'finish' as const },
            ...result.stopovers.map((s) => ({ title: s.name, description: s.duration, status: 'finish' as const })),
            { title: result.destination, status: 'process' as const },
          ]}
        />
      </Card>

      {/* 逐站行程：每段路程 + 当地推荐 */}
      {result.segments?.length > 0 && result.cityPois?.length > 0 ? (
        result.segments.map((seg, idx) => {
          const cityPoi = result.cityPois[idx];
          const isDestination = seg.to === result.destination;
          const stopover = result.stopovers.find((s) => s.name === seg.to);
          return (
            <Card
              key={idx}
              title={
                <span>
                  <EnvironmentOutlined style={{ color: '#1890ff' }} /> {seg.to}
                  {stopover && (
                    <Text style={{ marginLeft: 8, fontSize: 13, color: '#999' }}>
                      （经停 {stopover.duration}）
                    </Text>
                  )}
                  {isDestination && (
                    <Text style={{ marginLeft: 8, fontSize: 13, color: '#999' }}>（目的地）</Text>
                  )}
                </span>
              }
              style={{ marginBottom: 16 }}
            >
              {/* 到达交通 */}
              <div style={{ marginBottom: cityPoi ? 12 : 0, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <FlagOutlined /> 从 <Text strong>{seg.from}</Text> 前往 <Text strong>{seg.to}</Text>
                </Text>
                <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                  {seg.routes.map((route, ridx) => (
                    <Col xs={24} sm={12} key={ridx}>
                      <Card size="small" style={{ borderLeft: `3px solid ${routeColors[route.type] || '#1890ff'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 20, color: routeColors[route.type] }}>
                            {routeIcons[route.type] || <CarOutlined />}
                          </span>
                          <Text strong>{route.label}</Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 13 }}>{route.detail}</Text>
                        <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 13, color: '#666' }}>
                          {route.duration && <span>⏱ {route.duration}</span>}
                          {route.distance && <span>📏 {route.distance}</span>}
                          {route.price && <span>💰 {route.price}</span>}
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>

              {/* 当地推荐 */}
              {cityPoi && (
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>🏛️ 游玩推荐</Text>
                    {poiList(cityPoi.attractions)}
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>🛍️ 商业街区</Text>
                    {poiList(cityPoi.shopping)}
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>🍜 饮食推荐</Text>
                    {poiList(cityPoi.restaurants)}
                  </Col>
                </Row>
              )}
            </Card>
          );
        })
      ) : (
        /* 向后兼容：无 segments/cityPois 时的降级显示 */
        <Row gutter={16}>
          {result.attractions.length > 0 && (
            <Col xs={24} md={8}>
              <Card title="🏛️ 游玩推荐" size="small" style={{ marginBottom: 16 }}>{poiList(result.attractions)}</Card>
            </Col>
          )}
          {result.shopping.length > 0 && (
            <Col xs={24} md={8}>
              <Card title="🛍️ 商业街区" size="small" style={{ marginBottom: 16 }}>{poiList(result.shopping)}</Card>
            </Col>
          )}
          {result.restaurants.length > 0 && (
            <Col xs={24} md={8}>
              <Card title="🍜 饮食推荐" size="small" style={{ marginBottom: 16 }}>{poiList(result.restaurants)}</Card>
            </Col>
          )}
        </Row>
      )}
    </div>
  );
}
