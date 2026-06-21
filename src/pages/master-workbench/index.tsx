import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useQueueStore } from '@/store/queue';
import { useMatchStore } from '@/store/match';
import { useUserStore } from '@/store/user';
import Empty from '@/components/Empty';
import Tag from '@/components/Tag';
import type { QueueItem, RoutePackage } from '@/types/queue';
import type { MatchItem } from '@/types/match';
import {
  formatPrice,
  formatDistance,
  getServiceTypeLabel,
  getPriorityLabel,
} from '@/utils/index';

type SectionKey = 'pending' | 'routes' | 'serving' | 'completed';

const sections: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'pending', label: '待接单', icon: '📋' },
  { key: 'routes', label: '已接路线', icon: '🚗' },
  { key: 'serving', label: '服务中', icon: '⚡' },
  { key: 'completed', label: '已完成', icon: '✅' },
];

const MasterWorkbench: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('pending');
  const {
    queueItems,
    getMasterDailyOverview,
    getActiveRoutePackagesByMaster,
    completeService,
    updateQueueStatus,
    getQueueItemByOrder,
  } = useQueueStore();
  const { getMatchesByMaster, isOrderLocked } = useMatchStore();
  const { currentUser } = useUserStore();

  const masterId = currentUser?.id || '';
  const overview = useMemo(() => getMasterDailyOverview(masterId), [getMasterDailyOverview, masterId, queueItems]);

  const myQueueItems = useMemo(
    () => queueItems.filter((i) => i.master.id === masterId),
    [queueItems, masterId]
  );

  const waitingQueueItems = useMemo(
    () => myQueueItems.filter((i) => i.status === 'waiting' || i.status === 'called'),
    [myQueueItems]
  );

  const matchedPending = useMemo(() => {
    const matches = getMatchesByMaster(masterId);
    return matches.filter((m) => {
      const lockStatus = isOrderLocked(m.order.id);
      if (lockStatus.locked && lockStatus.master?.id !== masterId) return false;
      const hasQueueItem = myQueueItems.some((q) => q.orderId === m.order.id && q.status !== 'completed');
      return !hasQueueItem && m.customerWilling && m.masterWilling;
    });
  }, [getMatchesByMaster, masterId, myQueueItems, isOrderLocked]);

  const pendingList = useMemo(() => {
    const list: (MatchItem | QueueItem)[] = [];
    matchedPending.forEach((m) => list.push(m));
    waitingQueueItems.forEach((q) => list.push(q));
    return list;
  }, [matchedPending, waitingQueueItems]);

  const activeRoutes = useMemo(
    () => getActiveRoutePackagesByMaster(masterId),
    [getActiveRoutePackagesByMaster, masterId, queueItems]
  );

  const servingItems = useMemo(
    () => myQueueItems.filter((i) => i.status === 'serving'),
    [myQueueItems]
  );

  const completedItems = useMemo(() => {
    const today = new Date().toDateString();
    return myQueueItems.filter((i) => {
      if (i.status !== 'completed') return false;
      return i.endTime ? new Date(i.endTime).toDateString() === today : true;
    });
  }, [myQueueItems]);

  const pendingCount = pendingList.length;

  const sectionCounts: Record<SectionKey, number> = {
    pending: pendingCount,
    routes: activeRoutes.length,
    serving: servingItems.length,
    completed: completedItems.length,
  };

  const handleCompleteService = (itemId: string) => {
    Taro.showModal({
      title: '完成确认',
      content: '确认该订单已服务完成？',
      success: (res) => {
        if (res.confirm) {
          completeService(itemId);
          Taro.showToast({ title: '已完成', icon: 'success' });
        }
      },
    });
  };

  const handleAcceptRoute = (pkg: RoutePackage) => {
    if (!masterId) return;
    useQueueStore.getState().acceptRoutePackage(pkg.id, masterId);
    useQueueStore.getState().updateRoutePackageStatus(pkg.id, 'in_progress', 0);
    Taro.showToast({ title: '已接受这趟路线', icon: 'success' });
  };

  const handleGoToQueue = () => {
    Taro.switchTab({ url: '/pages/queue/index' });
  };

  const handleGoToOrders = () => {
    Taro.navigateTo({ url: '/pages/master-orders/index' });
  };

  const handleGoToMatch = () => {
    Taro.switchTab({ url: '/pages/match/index' });
  };

  const renderPendingCard = (item: MatchItem | QueueItem) => {
    const isMatchItem = 'matchScore' in item;
    if (isMatchItem) {
      const match = item as MatchItem;
      return (
        <View key={match.id} className={styles.card} onClick={handleGoToOrders}>
          <View className={styles.cardHeader}>
            <View className={styles.cardTitle}>
              <Text className={styles.cardService}>{match.order.serviceName}</Text>
              <Tag text="互选成功" color="success" size="sm" />
              <Tag text={getPriorityLabel(match.order.priority)} color={match.order.priority === 'normal' ? 'default' : match.order.priority === 'urgent' ? 'danger' : 'warning'} size="sm" />
            </View>
            <Text className={styles.cardPrice}>{formatPrice(match.order.price)}</Text>
          </View>
          <View className={styles.cardBody}>
            <View className={styles.cardInfoRow}>
              <Text className={styles.cardInfoLabel}>📍 {match.order.address}</Text>
              <Tag text={formatDistance(match.distance)} color="primary" size="sm" />
            </View>
            <View className={styles.cardInfoRow}>
              <Text className={styles.cardInfoLabel}>👤 {match.order.customerName}</Text>
              <Text className={styles.cardInfoValue}>{match.order.quantity}件</Text>
            </View>
            <View className={styles.cardInfoRow}>
              <Text className={styles.cardInfoLabel}>✨ 契合度</Text>
              <Text className={styles.cardInfoScore}>{match.matchScore}分</Text>
            </View>
          </View>
          <View className={styles.cardActions}>
            <View className={styles.actionBtnPrimary} onClick={handleGoToOrders}>
              <Text>去接单 →</Text>
            </View>
          </View>
        </View>
      );
    }
    const queueItem = item as QueueItem;
    return (
      <View key={queueItem.id} className={styles.card} onClick={handleGoToQueue}>
        <View className={styles.cardHeader}>
          <View className={styles.cardTitle}>
            <Text className={styles.cardService}>{queueItem.order.serviceName}</Text>
            <Tag text={`第${queueItem.queueNumber}号`} color="info" size="sm" />
            <Tag text={getPriorityLabel(queueItem.priority)} color={queueItem.priority === 'normal' ? 'default' : queueItem.priority === 'urgent' ? 'danger' : 'warning'} size="sm" />
          </View>
          <Text className={styles.cardPrice}>{formatPrice(queueItem.order.price)}</Text>
        </View>
        <View className={styles.cardBody}>
          <View className={styles.cardInfoRow}>
            <Text className={styles.cardInfoLabel}>📍 {queueItem.order.address}</Text>
            <Text className={styles.cardInfoValue}>
              {queueItem.status === 'waiting' ? '排队中' : '已叫号'}
            </Text>
          </View>
          <View className={styles.cardInfoRow}>
            <Text className={styles.cardInfoLabel}>👤 {queueItem.order.customerName}</Text>
            <Text className={styles.cardInfoValue}>{queueItem.order.quantity}件</Text>
          </View>
          <View className={styles.cardInfoRow}>
            <Text className={styles.cardInfoLabel}>🔢 订单号</Text>
            <Text className={styles.cardInfoValue}>{queueItem.order.orderNo}</Text>
          </View>
        </View>
        <View className={styles.cardActions}>
          <View className={styles.actionBtnSecondary} onClick={handleGoToQueue}>
            <Text>查看排队进度 →</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRouteCard = (pkg: RoutePackage) => (
    <View key={pkg.id} className={styles.card}>
      <View className={styles.cardHeader}>
        <View className={styles.cardTitle}>
          <Text className={styles.cardService}>
            {pkg.status === 'in_progress' ? '🚗 进行中路线' : pkg.accepted ? '✅ 已接受路线' : '📋 待确认路线'}
          </Text>
          <Tag
            text={`${pkg.items.length}个站点`}
            color={pkg.accepted ? 'success' : 'warning'}
            size="sm"
          />
        </View>
        <Text className={styles.cardPrice}>{formatPrice(pkg.totalPrice)}</Text>
      </View>
      <View className={styles.routeMetrics}>
        <View className={styles.routeMetricItem}>
          <Text className={styles.routeMetricValue}>{pkg.totalDistance}km</Text>
          <Text className={styles.routeMetricLabel}>总路程</Text>
        </View>
        <View className={styles.routeMetricItem}>
          <Text className={styles.routeMetricValue}>{pkg.totalDuration}min</Text>
          <Text className={styles.routeMetricLabel}>预计耗时</Text>
        </View>
        <View className={styles.routeMetricItem}>
          <Text className={styles.routeMetricValue}>
            {pkg.currentSequence || 0}/{pkg.items.length}
          </Text>
          <Text className={styles.routeMetricLabel}>进度</Text>
        </View>
      </View>
      <View className={styles.routeStops}>
        {pkg.items.slice(0, 3).map((item) => (
          <View key={item.orderId} className={styles.routeStop}>
            <View className={styles.routeStopSeq}>{item.sequence}</View>
            <View className={styles.routeStopInfo}>
              <Text className={styles.routeStopName}>{item.serviceName}</Text>
              <Text className={styles.routeStopAddr}>{item.address}</Text>
            </View>
            <Text className={styles.routeStopPrice}>{formatPrice(item.price)}</Text>
          </View>
        ))}
        {pkg.items.length > 3 && (
          <Text className={styles.routeMore}>+{pkg.items.length - 3} 站...</Text>
        )}
      </View>
      <View className={styles.cardActions}>
        {!pkg.accepted && (
          <View className={styles.actionBtnPrimary} onClick={() => handleAcceptRoute(pkg)}>
            <Text>接受这趟路线</Text>
          </View>
        )}
        {pkg.accepted && (
          <View className={styles.actionBtnSecondary} onClick={handleGoToQueue}>
            <Text>查看派单进度</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderServingCard = (item: QueueItem) => (
    <View key={item.id} className={styles.card}>
      <View className={styles.cardHeader}>
        <View className={styles.cardTitle}>
          <Text className={styles.cardService}>
            {item.status === 'serving' ? '⚡ 正在服务' : '🔔 已叫号'}
          </Text>
          <Tag text={`第${item.queueNumber}号`} color="info" size="sm" />
          <Tag text={getPriorityLabel(item.priority)} color={item.priority === 'normal' ? 'default' : item.priority === 'urgent' ? 'danger' : 'warning'} size="sm" />
        </View>
        <Text className={styles.cardPrice}>{formatPrice(item.order.price)}</Text>
      </View>
      <View className={styles.cardBody}>
        <View className={styles.cardInfoRow}>
          <Text className={styles.cardInfoLabel}>🔧 {item.order.serviceName}</Text>
        </View>
        <View className={styles.cardInfoRow}>
          <Text className={styles.cardInfoLabel}>📍 {item.order.address}</Text>
        </View>
        <View className={styles.cardInfoRow}>
          <Text className={styles.cardInfoLabel}>👤 {item.order.customerName}</Text>
          <Text className={styles.cardInfoValue}>{item.order.quantity}件</Text>
        </View>
        <View className={styles.cardInfoRow}>
          <Text className={styles.cardInfoLabel}>🔢 订单号</Text>
          <Text className={styles.cardInfoValue}>{item.order.orderNo}</Text>
        </View>
      </View>
      {item.status === 'serving' && (
        <View className={styles.cardActions}>
          <View className={styles.actionBtnPrimary} onClick={() => handleCompleteService(item.id)}>
            <Text>✅ 完成服务</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderCompletedCard = (item: QueueItem) => (
    <View key={item.id} className={classnames(styles.card, styles.cardCompleted)}>
      <View className={styles.cardHeader}>
        <View className={styles.cardTitle}>
          <Text className={styles.cardService}>✅ {item.order.serviceName}</Text>
          <Tag text={getServiceTypeLabel(item.order.serviceType)} color="primary" size="sm" />
        </View>
        <Text className={styles.cardPrice}>{formatPrice(item.order.price)}</Text>
      </View>
      <View className={styles.cardBody}>
        <View className={styles.cardInfoRow}>
          <Text className={styles.cardInfoLabel}>📍 {item.order.address}</Text>
        </View>
        <View className={styles.cardInfoRow}>
          <Text className={styles.cardInfoLabel}>👤 {item.order.customerName}</Text>
          <Text className={styles.cardInfoValue}>{item.order.quantity}件</Text>
        </View>
        {item.endTime && (
          <View className={styles.cardInfoRow}>
            <Text className={styles.cardInfoLabel}>🕐 完成时间</Text>
            <Text className={styles.cardInfoValue}>
              {new Date(item.endTime).toTimeString().slice(0, 5)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerInfo}>
          <View>
            <Text className={styles.headerTitle}>师傅工作台</Text>
            <Text className={styles.headerSubtitle}>
              📅 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </Text>
          </View>
          {currentUser && 'avatar' in currentUser && (
            <Image className={styles.headerAvatar} src={currentUser.avatar} />
          )}
        </View>

        <View className={styles.overviewGrid}>
          <View className={styles.overviewCard}>
            <Text className={styles.overviewIcon}>📋</Text>
            <Text className={styles.overviewValue}>{pendingCount}</Text>
            <Text className={styles.overviewLabel}>待接单</Text>
          </View>
          <View className={styles.overviewCard}>
            <Text className={styles.overviewIcon}>🚗</Text>
            <Text className={styles.overviewValue}>{overview.acceptedRoutes}</Text>
            <Text className={styles.overviewLabel}>已接路线</Text>
          </View>
          <View className={styles.overviewCard}>
            <Text className={styles.overviewIcon}>⚡</Text>
            <Text className={styles.overviewValue}>{overview.inProgress}</Text>
            <Text className={styles.overviewLabel}>服务中</Text>
          </View>
          <View className={styles.overviewCard}>
            <Text className={styles.overviewIcon}>💰</Text>
            <Text className={styles.overviewValue}>{formatPrice(overview.totalEarningsToday)}</Text>
            <Text className={styles.overviewLabel}>今日收入</Text>
          </View>
        </View>

        <View className={styles.completedBadge}>
          <Tag text={`今日已完成 ${overview.completedToday} 单`} color="success" size="md" />
        </View>
      </View>

      <View className={styles.sectionTabs}>
        {sections.map((sec) => (
          <View
            key={sec.key}
            className={classnames(styles.sectionTab, activeSection === sec.key && styles.sectionTabActive)}
            onClick={() => setActiveSection(sec.key)}
          >
            <Text className={styles.sectionIcon}>{sec.icon}</Text>
            <Text className={styles.sectionLabel}>{sec.label}</Text>
            {sectionCounts[sec.key] > 0 && (
              <View className={styles.sectionCount}>
                <Text className={styles.sectionCountText}>{sectionCounts[sec.key]}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View className={styles.quickActions}>
        <View className={styles.quickBtn} onClick={handleGoToOrders}>
          <Text className={styles.quickBtnIcon}>📋</Text>
          <Text className={styles.quickBtnText}>待接单列表</Text>
        </View>
        <View className={styles.quickBtn} onClick={handleGoToQueue}>
          <Text className={styles.quickBtnIcon}>🗺️</Text>
          <Text className={styles.quickBtnText}>派单视角</Text>
        </View>
        <View className={styles.quickBtn} onClick={handleGoToMatch}>
          <Text className={styles.quickBtnIcon}>🔗</Text>
          <Text className={styles.quickBtnText}>匹配页</Text>
        </View>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 950rpx)' }}>
        <View className={styles.content}>
          {activeSection === 'pending' &&
            (pendingList.length > 0 ? (
              pendingList.map(renderPendingCard)
            ) : (
              <Empty text="暂无待接订单，去匹配页看看吧" icon="📭" />
            ))}

          {activeSection === 'routes' &&
            (activeRoutes.length > 0 ? (
              activeRoutes.map(renderRouteCard)
            ) : (
              <Empty text="暂无进行中的路线，去派单视角生成吧" icon="🚗" />
            ))}

          {activeSection === 'serving' &&
            (servingItems.length > 0 ? (
              servingItems.map(renderServingCard)
            ) : (
              <Empty text="当前没有服务中的订单" icon="☕" />
            ))}

          {activeSection === 'completed' &&
            (completedItems.length > 0 ? (
              completedItems.map(renderCompletedCard)
            ) : (
              <Empty text="今天还没有完成的订单，加油！" icon="🎯" />
            ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default MasterWorkbench;
