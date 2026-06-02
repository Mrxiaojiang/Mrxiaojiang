import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const AMAP_BASE = 'https://restapi.amap.com/v3';

export interface GeocodeResult {
  lng: number;
  lat: number;
  formattedAddress: string;
}

export interface RouteSegment {
  type: 'flight' | 'high_speed_rail' | 'train' | 'transit' | 'driving' | 'walking';
  label: string;
  detail: string;
  duration?: string;
  distance?: string;
  price?: string;
}

export interface PoiResult {
  name: string;
  address: string;
  type: string;
  distance: string;
  location: string; // "lng,lat"
}

export interface RouteSegmentGroup {
  from: string;
  to: string;
  routes: RouteSegment[];
}

export interface CityPoiGroup {
  city: string;
  attractions: PoiResult[];
  restaurants: PoiResult[];
  shopping: PoiResult[];
}

export interface CustomizeResult {
  origin: string;
  destination: string;
  stopovers: { name: string; duration: string }[];
  routes: RouteSegment[];
  segments: RouteSegmentGroup[];
  cityPois: CityPoiGroup[];
  attractions: PoiResult[];
  restaurants: PoiResult[];
  shopping: PoiResult[];
}

@Injectable()
export class AmapService {
  private readonly logger = new Logger(AmapService.name);
  private readonly key: string;

  constructor(private configService: ConfigService) {
    this.key = this.configService.get<string>('AMAP_API_KEY', '');
    if (!this.key) {
      this.logger.warn('高德地图 API Key 未配置，定制功能将使用模拟数据');
    }
  }

  // ─── 地理编码：地址 → 经纬度 ─────────────────────────
  async geocode(address: string): Promise<GeocodeResult | null> {
    if (!this.key) return this.mockGeocode(address);

    try {
      const url = `${AMAP_BASE}/geocode/geo?key=${this.key}&address=${encodeURIComponent(address)}&city=`;
      const res = await fetch(url).then((r) => r.json());

      if (res.status === '1' && res.geocodes?.length > 0) {
        const [lng, lat] = res.geocodes[0].location.split(',').map(Number);
        return { lng, lat, formattedAddress: res.geocodes[0].formatted_address };
      }
      this.logger.warn(`地理编码失败: ${address}`, res);
      return null;
    } catch (err) {
      this.logger.error(`高德地理编码请求失败: ${address}`, err);
      return null;
    }
  }

  // ─── 路径规划（驾车） ────────────────────────────────
  async driveRoute(
    origin: string,
    destination: string,
    waypoints?: string[],
  ): Promise<{ distance: number; duration: number; tolls: string; steps: string[] } | null> {
    if (!this.key) {
      return {
        distance: Math.random() * 500 + 50,
        duration: Math.random() * 8 + 1,
        tolls: '约 200 元',
        steps: [`从 ${origin} 出发`, `途经主要道路`, `到达 ${destination}`],
      };
    }

    const originCoord = await this.geocode(origin);
    const destCoord = await this.geocode(destination);
    if (!originCoord || !destCoord) return null;

    let url = `${AMAP_BASE}/direction/driving?key=${this.key}&origin=${originCoord.lng},${originCoord.lat}&destination=${destCoord.lng},${destCoord.lat}&strategy=0&extensions=all`;
    if (waypoints?.length) {
      const waypointCoords: string[] = [];
      for (const wp of waypoints) {
        const coord = await this.geocode(wp);
        if (coord) waypointCoords.push(`${coord.lng},${coord.lat}`);
      }
      if (waypointCoords.length > 0) {
        url += `&waypoints=${waypointCoords.join(';')}`;
      }
    }

    try {
      const res = await fetch(url).then((r) => r.json());
      if (res.status === '1' && res.route?.paths?.length > 0) {
        const path = res.route.paths[0];
        return {
          distance: Math.round(path.distance / 1000), // km
          duration: Math.round(path.duration / 3600), // hours
          tolls: path.toll,
          steps: path.steps?.map((s: any) => s.instruction) || [],
        };
      }
      return null;
    } catch (err) {
      this.logger.error('驾车路径规划失败', err);
      return null;
    }
  }

  // ─── 公交路径规划（含地铁） ──────────────────────────
  async transitRoute(
    origin: string,
    destination: string,
  ): Promise<{ distance: number; duration: number; steps: string[] } | null> {
    if (!this.key) {
      return {
        distance: Math.random() * 30 + 1,
        duration: Math.random() * 2 + 0.5,
        steps: [`乘坐地铁 X 号线`, `换乘 Y 号线`, `到达 ${destination}`],
      };
    }

    const originCoord = await this.geocode(origin);
    const destCoord = await this.geocode(destination);
    if (!originCoord || !destCoord) return null;

    const url = `${AMAP_BASE}/direction/transit/integrated?key=${this.key}&origin=${originCoord.lng},${originCoord.lat}&destination=${destCoord.lng},${destCoord.lat}&city=北京&cityd=北京&extensions=all`;

    try {
      const res = await fetch(url).then((r) => r.json());
      if (res.status === '1' && res.route?.transits?.length > 0) {
        const transit = res.route.transits[0];
        return {
          distance: Math.round(transit.distance / 1000),
          duration: Math.round(transit.duration / 3600 * 10) / 10,
          steps: transit.segments?.map((s: any) => s.instruction || s.walking?.steps?.[0]?.instruction).filter(Boolean) || [],
        };
      }
      return null;
    } catch (err) {
      this.logger.error('公交路径规划失败', err);
      return null;
    }
  }

  // ─── POI 搜索 ────────────────────────────────────────
  async searchPoi(
    keywords: string[],
    city: string,
    types?: string,
    limit = 10,
  ): Promise<PoiResult[]> {
    if (!this.key) {
      return this.mockPoi(city, keywords);
    }

    const results: PoiResult[] = [];
    for (const keyword of keywords) {
      try {
        const url = `${AMAP_BASE}/place/text?key=${this.key}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&offset=${limit}&extensions=all`;
        const res = await fetch(url).then((r) => r.json());
        if (res.status === '1' && res.pois?.length > 0) {
          res.pois.slice(0, 3).forEach((poi: any) => {
            results.push({
              name: poi.name,
              address: poi.address || '',
              type: poi.type,
              distance: poi.distance || '',
              location: poi.location,
            });
          });
        }
      } catch (err) {
        this.logger.error(`POI 搜索失败: ${keyword}`, err);
      }
    }
    return results.slice(0, limit);
  }

  // ─── 核心定制逻辑 ─────────────────────────────────────
  async customize(params: {
    origin: string;
    stopovers: { name: string; duration: string }[];
    destination: string;
  }): Promise<CustomizeResult> {
    const { origin, stopovers, destination } = params;
    const waypointNames = stopovers.map((s) => s.name);
    const allCities = [origin, ...waypointNames, destination];

    // 1. 逐段计算路线
    const segments: RouteSegmentGroup[] = [];
    for (let i = 0; i < allCities.length - 1; i++) {
      const from = allCities[i];
      const to = allCities[i + 1];
      const segmentRoutes = await this.planSegmentRoutes(from, to);
      segments.push({ from, to, routes: segmentRoutes });
    }

    // 2. 总距离（用于向后兼容的 routes 字段）
    const totalRoute = await this.driveRoute(origin, destination, waypointNames);
    const totalDistance = totalRoute?.distance || 0;
    const routes = this.buildRouteRecommendations(origin, destination, waypointNames, totalDistance);

    // 3. 逐城市搜索 POI（经停地 + 目的地）
    const cityPois: CityPoiGroup[] = [];
    for (const city of [...waypointNames, destination]) {
      const [attractions, shopping, restaurants] = await Promise.all([
        this.searchPoi(['名胜古迹', '风景区', '公园'], city, '风景名胜', 6),
        this.searchPoi(['商业街', '步行街', '商业中心'], city, '购物', 4),
        this.searchPoi(['当地特色美食', '小吃街', '美食城'], city, '餐饮', 6),
      ]);
      cityPois.push({ city, attractions, restaurants, shopping });
    }

    // 4. 向后兼容：合并所有 POI
    const allAttractions = cityPois.flatMap((p) => p.attractions);
    const allRestaurants = cityPois.flatMap((p) => p.restaurants);
    const allShopping = cityPois.flatMap((p) => p.shopping);

    return {
      origin,
      destination,
      stopovers,
      routes,
      segments,
      cityPois,
      attractions: allAttractions,
      restaurants: allRestaurants,
      shopping: allShopping,
    };
  }

  // ─── 单段路线规划 ─────────────────────────────────────
  private async planSegmentRoutes(from: string, to: string): Promise<RouteSegment[]> {
    const distance = await this.estimateDistance(from, to);
    return this.buildRouteRecommendations(from, to, [], distance);
  }

  // ─── 估算两点间距离 ────────────────────────────────────
  private async estimateDistance(from: string, to: string): Promise<number> {
    const route = await this.driveRoute(from, to);
    return route?.distance || 0;
  }

  // ─── 根据距离推荐交通方式 ───────────────────────────────
  private buildRouteRecommendations(
    origin: string,
    destination: string,
    waypoints: string[],
    totalDistance: number,
  ): RouteSegment[] {
    const routes: RouteSegment[] = [];

    if (totalDistance > 800) {
      routes.push({
        type: 'flight',
        label: '✈️ 飞机',
        detail: `从 ${origin} → ${this.buildWaypointLabel(waypoints)}${destination}`,
        duration: `${Math.max(1, Math.round(totalDistance / 800))}h`,
        distance: `${totalDistance} km`,
        price: this.estimatePrice('flight', totalDistance),
      });
      routes.push({
        type: 'high_speed_rail',
        label: '🚄 高铁（备选）',
        detail: `从 ${origin} 出发，乘坐高铁至 ${destination}`,
        duration: `${Math.round(totalDistance / 300)}h`,
        distance: `${totalDistance} km`,
        price: this.estimatePrice('high_speed_rail', totalDistance),
      });
    } else if (totalDistance > 200) {
      routes.push({
        type: 'high_speed_rail',
        label: '🚄 高铁',
        detail: `从 ${origin} 站出发 → 直达 ${destination} 站`,
        duration: `${Math.round(totalDistance / 280)}h`,
        distance: `${totalDistance} km`,
        price: this.estimatePrice('high_speed_rail', totalDistance),
      });
      routes.push({
        type: 'train',
        label: '🚃 火车（备选）',
        detail: `从 ${origin} 站出发 → ${destination} 站`,
        duration: `${Math.round(totalDistance / 100)}h`,
        distance: `${totalDistance} km`,
        price: this.estimatePrice('train', totalDistance),
      });
    } else if (totalDistance > 50) {
      routes.push({
        type: 'train',
        label: '🚃 火车/高铁',
        detail: `从 ${origin} → ${destination}`,
        duration: `${Math.round(totalDistance / 120)}h`,
        distance: `${totalDistance} km`,
        price: this.estimatePrice('train', totalDistance),
      });
      routes.push({
        type: 'transit',
        label: '🚌 当地公共交通',
        detail: '到达后乘坐公交/地铁前往具体地点',
        duration: '30min - 1h',
        distance: `${totalDistance} km`,
      });
    } else if (totalDistance > 10) {
      routes.push({
        type: 'transit',
        label: '🚌 公共交通',
        detail: `从 ${origin} → ${destination}`,
        duration: `${Math.round(totalDistance / 30 * 10) / 10}h`,
        distance: `${totalDistance} km`,
      });
      routes.push({
        type: 'driving',
        label: '🚗 自驾/打车',
        detail: `从 ${origin} → ${destination}`,
        duration: `${Math.round(totalDistance / 40 * 10) / 10}h`,
        distance: `${totalDistance} km`,
      });
    } else {
      routes.push({
        type: 'walking',
        label: '🚶 步行/骑行',
        detail: `从 ${origin} 步行或骑行至 ${destination}`,
        duration: `${Math.round(totalDistance / 5 * 10) / 10}h`,
        distance: `${totalDistance} km`,
      });
    }

    return routes;
  }

  // ─── 辅助方法 ────────────────────────────────────────
  private buildWaypointLabel(waypoints: string[]): string {
    if (!waypoints?.length) return '';
    return waypoints.map((w) => `${w} → `).join('');
  }

  private estimatePrice(type: string, distanceKm: number): string {
    const prices: Record<string, number> = {
      flight: 0.8,
      high_speed_rail: 0.45,
      train: 0.2,
    };
    const unitPrice = prices[type] || 0.3;
    const price = Math.round(distanceKm * unitPrice);
    if (price === 0) return '免费';
    return `约 ${price} 元`;
  }

  // ─── 无 API Key 时的模拟数据 ─────────────────────────
  private mockGeocode(address: string): GeocodeResult {
    const hash = address.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return {
      lng: 116.3 + (hash % 100) / 1000,
      lat: 39.9 + (hash % 80) / 1000,
      formattedAddress: address,
    };
  }

  private mockPoi(city: string, keywords: string[]): PoiResult[] {
    const items: PoiResult[] = [];
    keywords.forEach((kw) => {
      for (let i = 1; i <= 3; i++) {
        items.push({
          name: `${city}${kw}${i > 1 ? `（${i}）` : ''}`,
          address: `${city}市区`,
          type: kw,
          distance: `${Math.round(Math.random() * 5000)}m`,
          location: `116.${Math.floor(Math.random() * 900 + 100)},39.${Math.floor(Math.random() * 900 + 100)}`,
        });
      }
    });
    return items;
  }
}
