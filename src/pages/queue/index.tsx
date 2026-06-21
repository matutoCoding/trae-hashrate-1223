import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useQueueStore } from '@/store/queue';
import { useUserStore } from '@/store/user';
import QueueItemComp from '@/components/QueueItem';
import Empty from '@/components/Empty';
import Tag from '@/components/Tag';
import type { PriorityLevel, ServiceType } from '@/types/service';
import { getPriorityLabel, getPriorityColor, formatPrice } from '@/utils/index';

type ViewType = 'queue' | 'route';
type TabType = 'all' | 'waiting' | 'serving';
type ServiceTypeFilter = 'all' | ServiceType;

const serviceTypeOptions = [
  { key: 'all' as const, label: '全部' },
  { key: 'knife_sharpening' as const, label: '磨刀' },
  { key: 'scissors_sharpening' as const, label: '剪刀' },
  { key: 'garden_pruning' as const, label: '园艺' },
  { key: 'tree_pruning' as const, label: '树木' },
];

const QueuePage: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('queue');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceTypeFilter>('all');
  const { queueInfo, queueItems, callNext, upgradePriority, generateRoutePlanForMaster } = useQueueStore();
  const { role, currentUser } = useUserStore();

  const viewTabs = [
    { key: 'queue' as ViewType, label: '队列视角' },
    { key: 'route' as ViewType, label: '派单视角' },
  ];

  const tabs = [
    { key: 'all' as TabType, label: '全部' },
    { key: 'waiting' as TabType, label: '等待中' },
    { key: 'serving' as TabType, label: '服务中' },
  ];

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return queueItems;
    if (activeTab === 'waiting') return queueItems.filter((i) => i.status === 'waiting' || i.status === 'called');
    return queueItems.filter((i) => i.status === 'serving');
  }, [queueItems, activeTab]);

  const currentItem = useMemo(() => queueItems.find((i) => i.status === 'serving'), [queueItems]);

  const waitingCount = useMemo(() => queueItems.filter((i) => i.status === 'waiting').length, [queueItems]);
  const servingCount = useMemo(() => queueItems.filter((i) => i.status === 'serving').length, [queueItems]);
  const calledCount = useMemo(() => queueItems.filter((i) => i.status === 'called').length, [queueItems]);

  const routePlan = useMemo(() => {
    if (!currentUser || activeView !== 'route') return null;
    const location = 'location' in currentUser ? currentUser.location : { lat: 39.9042, lng: 116.4074 };
    return generateRoutePlanForMaster(
      currentUser.id,
      location,
      serviceTypeFilter === 'all' ? undefined : serviceTypeFilter
    );
  }, [queueItems, serviceTypeFilter, currentUser, generateRoutePlanForMaster, activeView]);

  const handleCallNext = () => {
    Taro.showModal({
      title: '叫号确认',
      content: '是否呼叫下一位客户？',
      success: (res) => {
        if (res.confirm) {
          callNext();
          Taro.showToast({ title: '已叫号', icon: 'success' });
        }
      },
    });
  };

  const handleUpgradePriority = (itemId: string) => {
    Taro.showActionSheet({
      itemList: ['升级为加急 (+¥30)', '升级为VIP (+¥50)'],
      success: (res) => {
        const priorities: PriorityLevel[] = ['urgent', 'vip'];
        upgradePriority(itemId, priorities[res.tapIndex]);
        Taro.showToast({ title: '优先级已升级', icon: 'success' });
      },
    });
  };

  const handleNavigateToOrder = (orderId: string) => {
    Taro.navigateTo({ url: `/pages/order-detail/index?id=${orderId}` });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>{queueInfo.name}</Text>
        <Text className={styles.headerDesc}>📍 {queueInfo.location}</Text>
        <View className={styles.statusBoard}>
          <View className={styles.statusItem}>
            <Text className={styles.statusValue}>{waitingCount}</Text>
            <Text className={styles.statusLabel}>等待中</Text>
          </View>
          <View className={styles.statusItem}>
            <Text className={styles.statusValue}>{calledCount}</Text>
            <Text className={styles.statusLabel}>已叫号</Text>
          </View>
          <View className={styles.statusItem}>
            <Text className={styles.statusValue}>{servingCount}</Text>
            <Text className={styles.statusLabel}>服务中</Text>
          </View>
        </View>
      </View>

      {currentItem && (
        <View className={styles.currentCall}>
          <Text className={styles.currentCallTitle}>
            🔔 当前正在服务
            {currentItem.priority !== 'normal' && (
              <Text className={styles.urgentTag}>
                {currentItem.priority === 'urgent' ? '加急' : 'VIP'}
              </Text>
            )}
          </Text>
          <View className={styles.currentCallContent}>
            <Text className={styles.currentNumber}>{currentItem.queueNumber}</Text>
            <View className={styles.currentInfo}>
              <Text className={styles.currentService}>{currentItem.order.serviceName}</Text>
              <Text className={styles.currentCustomer}>
                {currentItem.order.customerName} · {currentItem.order.quantity}件
              </Text>
            </View>
          </View>
        </View>
      )}

      <View className={styles.viewTabs}>
        {viewTabs.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.viewTab, activeView === tab.key && styles.viewTabActive)}
            onClick={() => setActiveView(tab.key)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </View>

      {activeView === 'queue' && (
        <>
          <View className={styles.tabs}>
            {tabs.map((tab) => (
              <View
                key={tab.key}
                className={classnames(styles.tab, activeTab === tab.key && styles.active)}
                onClick={() => setActiveTab(tab.key)}
              >
                <Text>{tab.label}</Text>
              </View>
            ))}
          </View>

          <View className={styles.queueInfo}>
            <Text className={styles.queueInfoText}>平均等待 {queueInfo.avgWaitTime} 分钟</Text>
            <View className={styles.priorityLegend}>
              <View className={styles.legendItem}>
                <View className={classnames(styles.legendDot, styles.normal)} />
                <Text className={styles.legendText}>普通</Text>
              </View>
              <View className={styles.legendItem}>
                <View className={classnames(styles.legendDot, styles.urgent)} />
                <Text className={styles.legendText}>加急</Text>
              </View>
              <View className={styles.legendItem}>
                <View className={classnames(styles.legendDot, styles.vip)} />
                <Text className={styles.legendText}>VIP</Text>
              </View>
            </View>
          </View>

          <ScrollView scrollY style={{ height: 'calc(100vh - 950rpx)' }}>
            <View className={styles.queueList}>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <QueueItemComp
                    key={item.id}
                    item={item}
                    showActions
                    onUpgradePriority={() => handleUpgradePriority(item.id)}
                  />
                ))
              ) : (
                <Empty text="暂无排队记录" icon="📋" />
              )}
            </View>
          </ScrollView>
        </>
      )}

      {activeView === 'route' && (
        <>
          <View className={styles.serviceTypeFilter}>
            {serviceTypeOptions.map((opt) => (
              <View
                key={opt.key}
                className={classnames(styles.filterChip, serviceTypeFilter === opt.key && styles.filterChipActive)}
                onClick={() => setServiceTypeFilter(opt.key)}
              >
                <Text>{opt.label}</Text>
              </View>
            ))}
          </View>

          {routePlan && routePlan.items.length > 0 && (
            <View className={styles.routeSummary}>
              <View className={styles.routeSummaryItem}>
                <Text className={styles.routeSummaryValue}>{routePlan.items.length}</Text>
                <Text className={styles.routeSummaryLabel}>待服务</Text>
              </View>
              <View className={styles.routeSummaryItem}>
                <Text className={styles.routeSummaryValue}>{routePlan.totalDistance}km</Text>
                <Text className={styles.routeSummaryLabel}>预计路程</Text>
              </View>
              <View className={styles.routeSummaryItem}>
                <Text className={styles.routeSummaryValue}>{routePlan.totalDuration}min</Text>
                <Text className={styles.routeSummaryLabel}>预计时长</Text>
              </View>
              <View className={styles.routeSummaryItem}>
                <Text className={styles.routeSummaryValue}>{formatPrice(routePlan.totalPrice)}</Text>
                <Text className={styles.routeSummaryLabel}>预计收入</Text>
              </View>
            </View>
          )}

          <ScrollView scrollY style={{ height: 'calc(100vh - 1050rpx)' }}>
            <View className={styles.routeList}>
              {routePlan && routePlan.items.length > 0 ? (
                routePlan.items.map((item, idx) => (
                  <View
                    key={item.orderId}
                    className={styles.routeItem}
                    onClick={() => handleNavigateToOrder(item.orderId)}
                  >
                    <View className={styles.routeItemHeader}>
                      <View className={styles.routeSequence}>
                        <Text className={styles.routeSequenceText}>{item.sequence}</Text>
                      </View>
                      <View className={styles.routeItemInfo}>
                        <View className={styles.routeItemTitle}>
                          <Text className={styles.routeServiceName}>{item.serviceName}</Text>
                          <Tag
                            text={getPriorityLabel(item.priority)}
                            color={item.priority === 'normal' ? 'default' : item.priority === 'urgent' ? 'danger' : 'warning'}
                            size="sm"
                          />
                        </View>
                        <Text className={styles.routeCustomer}>{item.customerName}</Text>
                        <Text className={styles.routeAddress}>📍 {item.address}</Text>
                      </View>
                      <View className={styles.routeItemRight}>
                        <Text className={styles.routePrice}>{formatPrice(item.price)}</Text>
                        <Text className={styles.routeEta}>预计 {item.estimatedArrival}</Text>
                      </View>
                    </View>
                    
                    {idx < routePlan.items.length - 1 && (
                      <View className={styles.routeConnector}>
                        <View className={styles.routeConnectorLine} />
                        <View className={styles.routeConnectorInfo}>
                          <Text className={styles.routeConnectorText}>
                            → 下一站 {item.distanceFromPrev}km · 约{Math.round(item.distanceFromPrev * 10)}分钟
                          </Text>
                        </View>
                      </View>
                    )}

                    <View className={styles.routeItemFooter}>
                      <View className={styles.routeStat}>
                        <Text className={styles.routeStatLabel}>累计路程</Text>
                        <Text className={styles.routeStatValue}>{item.cumulativeDistance}km</Text>
                      </View>
                      <View className={styles.routeStat}>
                        <Text className={styles.routeStatLabel}>优先级权重</Text>
                        <Text className={styles.routeStatValue}>×{item.priorityWeight}</Text>
                      </View>
                      <View className={styles.routeStat}>
                        <Text className={styles.routeStatLabel}>订单号</Text>
                        <Text className={styles.routeStatValue}>{item.orderNo}</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Empty text="暂无路线规划" icon="🗺️" />
              )}
            </View>
          </ScrollView>
        </>
      )}

      <View className={styles.callNextBtn} onClick={handleCallNext}>
        <Text>呼叫下一位</Text>
      </View>
    </View>
  );
};

export default QueuePage;
