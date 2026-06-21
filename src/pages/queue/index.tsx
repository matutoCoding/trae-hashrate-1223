import React, { useState, useMemo, useEffect } from 'react';
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
import type { RoutePackage, CustomerRouteProgress } from '@/types/queue';
import { getPriorityLabel, getPriorityColor, formatPrice, formatDistance, getServiceTypeLabel } from '@/utils/index';

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
  const [currentRoutePackage, setCurrentRoutePackage] = useState<RoutePackage | null>(null);
  const [customerProgress, setCustomerProgress] = useState<CustomerRouteProgress | null>(null);
  const {
    queueInfo,
    queueItems,
    callNext,
    upgradePriority,
    generateRoutePlanForMaster,
    createRoutePackage,
    acceptRoutePackage,
    getActiveRoutePackagesByMaster,
    getCustomerRouteProgress,
    updateRoutePackageStatus,
    getQueueItemByOrder,
  } = useQueueStore();
  const { role, currentUser } = useUserStore();
  const isMaster = role === 'master' && currentUser;
  const isCustomer = role === 'customer' && currentUser;

  const viewTabs = [
    { key: 'queue' as ViewType, label: '队列视角' },
    { key: 'route' as ViewType, label: isMaster ? '派单视角' : '师傅路线进度' },
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

  const masterLocation = useMemo(() => {
    if (!currentUser) return { lat: 39.9042, lng: 116.4074 };
    return 'location' in currentUser ? currentUser.location : { lat: 39.9042, lng: 116.4074 };
  }, [currentUser]);

  const routePlan = useMemo(() => {
    if (!isMaster || activeView !== 'route' || currentRoutePackage?.accepted) return null;
    return generateRoutePlanForMaster(
      currentUser.id,
      masterLocation,
      serviceTypeFilter === 'all' ? undefined : serviceTypeFilter
    );
  }, [queueItems, serviceTypeFilter, currentUser, masterLocation, generateRoutePlanForMaster, activeView, isMaster, currentRoutePackage]);

  useEffect(() => {
    if (isMaster && currentUser && activeView === 'route') {
      const activePkgs = getActiveRoutePackagesByMaster(currentUser.id);
      const accepted = activePkgs.find((p) => p.accepted && p.status !== 'completed');
      if (accepted) {
        setCurrentRoutePackage(accepted);
      }
    }
  }, [isMaster, currentUser, activeView, getActiveRoutePackagesByMaster, queueItems]);

  useEffect(() => {
    if (isCustomer && currentUser && activeView === 'route') {
      const myQueueItem = queueItems.find((i) => i.order.customerId === currentUser.id);
      if (myQueueItem) {
        const progress = getCustomerRouteProgress(myQueueItem.orderId);
        setCustomerProgress(progress);
      }
    }
  }, [isCustomer, currentUser, activeView, queueItems, getCustomerRouteProgress]);

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

  const handleCreateRoutePackage = () => {
    if (!currentUser) return;
    const pkg = createRoutePackage(
      currentUser.id,
      masterLocation,
      serviceTypeFilter === 'all' ? undefined : serviceTypeFilter
    );
    if (pkg) {
      setCurrentRoutePackage(pkg);
      Taro.showToast({ title: `生成${pkg.items.length}单路线`, icon: 'success' });
    } else {
      Taro.showToast({ title: '暂无可合单的订单', icon: 'none' });
    }
  };

  const handleAcceptRoutePackage = () => {
    if (!currentRoutePackage) return;
    const ok = acceptRoutePackage(currentRoutePackage.id);
    if (ok) {
      updateRoutePackageStatus(currentRoutePackage.id, 'in_progress', 0);
      setCurrentRoutePackage({ ...currentRoutePackage, accepted: true, status: 'in_progress' });
      Taro.showToast({ title: '已接受这趟路线', icon: 'success' });
    }
  };

  const handleMarkStopComplete = (itemSeq: number, orderId: string) => {
    if (!currentRoutePackage) return;
    const qi = getQueueItemByOrder(orderId);
    if (qi) {
      useQueueStore.getState().updateQueueStatus(qi.id, itemSeq === 1 ? 'serving' : 'completed');
      if (itemSeq > 1) {
        useQueueStore.getState().completeService(qi.id);
      }
    }
    updateRoutePackageStatus(currentRoutePackage.id, 'in_progress', itemSeq);
    setCurrentRoutePackage((prev) => (prev ? { ...prev, currentSequence: itemSeq } : prev));
    Taro.showToast({ title: `第${itemSeq}站已处理`, icon: 'success' });
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
            onClick={() => {
              setActiveView(tab.key);
              if (tab.key === 'queue') {
                setCurrentRoutePackage(null);
                setCustomerProgress(null);
              }
            }}
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

      {activeView === 'route' && isMaster && (
        <>
          <View className={styles.serviceTypeFilter}>
            {serviceTypeOptions.map((opt) => (
              <View
                key={opt.key}
                className={classnames(styles.filterChip, serviceTypeFilter === opt.key && styles.filterChipActive)}
                onClick={() => {
                  setServiceTypeFilter(opt.key);
                  if (currentRoutePackage && !currentRoutePackage.accepted) setCurrentRoutePackage(null);
                }}
              >
                <Text>{opt.label}</Text>
              </View>
            ))}
          </View>

          {!currentRoutePackage && routePlan && routePlan.items.length > 0 && (
            <View className={styles.routePackageCard}>
              <View className={styles.routePackageHeader}>
                <Text className={styles.routePackageTitle}>
                  🚗 可合成 {routePlan.items.length} 单路线包
                </Text>
                <Tag
                  text={serviceTypeFilter === 'all' ? '全部类型' : getServiceTypeLabel(serviceTypeFilter)}
                  color="primary"
                  size="sm"
                />
              </View>
              <View className={styles.routePackageMetrics}>
                <View className={styles.routeMetricItem}>
                  <Text className={styles.routeMetricValue}>{routePlan.totalDistance}km</Text>
                  <Text className={styles.routeMetricLabel}>总路程</Text>
                </View>
                <View className={styles.routeMetricItem}>
                  <Text className={styles.routeMetricValue}>{routePlan.totalDuration}min</Text>
                  <Text className={styles.routeMetricLabel}>预计耗时</Text>
                </View>
                <View className={styles.routeMetricItem}>
                  <Text className={styles.routeMetricValue}>{formatPrice(routePlan.totalPrice)}</Text>
                  <Text className={styles.routeMetricLabel}>预计收入</Text>
                </View>
              </View>
              <View className={styles.routePackageActions}>
                <View className={styles.createRouteBtn} onClick={handleCreateRoutePackage}>
                  <Text>✨ 生成这趟路线</Text>
                </View>
              </View>
            </View>
          )}

          {currentRoutePackage && (
            <View className={styles.routeSummary}>
              <View className={styles.routePackageHeader}>
                <View>
                  <Text className={styles.routePackageTitle}>
                    {currentRoutePackage.status === 'in_progress' ? '🚗 进行中路线' : currentRoutePackage.accepted ? '✅ 已接受路线' : '📋 推荐路线'}
                  </Text>
                  <Text className={styles.routePackageSubtitle}>
                    {currentRoutePackage.items.length} 个站点
                    {currentRoutePackage.currentSequence ? ` · 当前第 ${currentRoutePackage.currentSequence} 站` : ''}
                  </Text>
                </View>
                <Tag
                  text={currentRoutePackage.accepted ? '已接受' : '待确认'}
                  color={currentRoutePackage.accepted ? 'success' : 'warning'}
                  size="sm"
                />
              </View>
              <View className={styles.routeSummaryInner}>
                <View className={styles.routeSummaryItem}>
                  <Text className={styles.routeSummaryValue}>{currentRoutePackage.items.length}</Text>
                  <Text className={styles.routeSummaryLabel}>站点</Text>
                </View>
                <View className={styles.routeSummaryItem}>
                  <Text className={styles.routeSummaryValue}>{currentRoutePackage.totalDistance}km</Text>
                  <Text className={styles.routeSummaryLabel}>路程</Text>
                </View>
                <View className={styles.routeSummaryItem}>
                  <Text className={styles.routeSummaryValue}>{currentRoutePackage.totalDuration}min</Text>
                  <Text className={styles.routeSummaryLabel}>耗时</Text>
                </View>
                <View className={styles.routeSummaryItem}>
                  <Text className={styles.routeSummaryValue}>{formatPrice(currentRoutePackage.totalPrice)}</Text>
                  <Text className={styles.routeSummaryLabel}>收入</Text>
                </View>
              </View>
              {!currentRoutePackage.accepted && (
                <View className={styles.routePackageActions}>
                  <View
                    className={styles.discardBtn}
                    onClick={() => setCurrentRoutePackage(null)}
                  >
                    <Text>重新生成</Text>
                  </View>
                  <View className={styles.acceptRouteBtn} onClick={handleAcceptRoutePackage}>
                    <Text>✅ 一键接受这趟路线</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <ScrollView scrollY style={{ height: currentRoutePackage ? 'calc(100vh - 1400rpx)' : 'calc(100vh - 1250rpx)' }}>
            <View className={styles.routeList}>
              {currentRoutePackage || routePlan ? (
                (currentRoutePackage?.items || routePlan?.items || []).map((item, idx) => {
                  const isCurrentStop = currentRoutePackage?.currentSequence === item.sequence;
                  const isCompleted = currentRoutePackage?.status === 'completed'
                    || (currentRoutePackage?.currentSequence && item.sequence < currentRoutePackage.currentSequence);
                  return (
                    <View
                      key={item.orderId}
                      className={classnames(
                        styles.routeItem,
                        isCurrentStop && styles.routeItemCurrent,
                        isCompleted && styles.routeItemCompleted
                      )}
                      onClick={() => handleNavigateToOrder(item.orderId)}
                    >
                      <View className={styles.routeItemHeader}>
                        <View
                          className={classnames(
                            styles.routeSequence,
                            isCurrentStop && styles.routeSequenceCurrent,
                            isCompleted && styles.routeSequenceDone
                          )}
                        >
                          <Text className={styles.routeSequenceText}>
                            {isCompleted ? '✓' : item.sequence}
                          </Text>
                        </View>
                        <View className={styles.routeItemInfo}>
                          <View className={styles.routeItemTitle}>
                            <Text className={styles.routeServiceName}>{item.serviceName}</Text>
                            <Tag
                              text={getPriorityLabel(item.priority)}
                              color={item.priority === 'normal' ? 'default' : item.priority === 'urgent' ? 'danger' : 'warning'}
                              size="sm"
                            />
                            {item.queueNumber && (
                              <Tag text={`第${item.queueNumber}号`} color="info" size="sm" />
                            )}
                          </View>
                          <Text className={styles.routeCustomer}>{item.customerName}</Text>
                          <Text className={styles.routeAddress}>📍 {item.address}</Text>
                        </View>
                        <View className={styles.routeItemRight}>
                          <Text className={styles.routePrice}>{formatPrice(item.price)}</Text>
                          <Text className={styles.routeEta}>预计 {item.estimatedArrival}</Text>
                        </View>
                      </View>

                      {idx < (currentRoutePackage?.items.length || routePlan?.items.length || 0) - 1 && (
                        <View className={styles.routeConnector}>
                          <View className={styles.routeConnectorLine} />
                          <View className={styles.routeConnectorInfo}>
                            <Text className={styles.routeConnectorText}>
                              → {item.distanceFromPrev > 0 ? `${formatDistance(item.distanceFromPrev)} · 约${Math.round(item.distanceFromPrev * 10)}分钟` : '起始站'}
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
                        {currentRoutePackage?.accepted && !isCompleted && (
                          <View
                            className={styles.stopActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkStopComplete(item.sequence, item.orderId);
                            }}
                          >
                            <Text>
                              {isCurrentStop
                                ? '完成本站'
                                : currentRoutePackage.currentSequence === item.sequence - 1
                                  ? '开始服务'
                                  : `到达第${item.sequence}站`}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Empty text="暂无路线规划，请先选择服务类型" icon="🗺️" />
              )}
            </View>
          </ScrollView>
        </>
      )}

      {activeView === 'route' && isCustomer && (
        <ScrollView scrollY style={{ height: 'calc(100vh - 850rpx)' }}>
          {customerProgress ? (
            <View className={styles.customerProgress}>
              <View className={styles.progressHeader}>
                <View className={styles.progressMasterInfo}>
                  <Image className={styles.progressMasterAvatar} src={customerProgress.master.avatar} />
                  <View>
                    <Text className={styles.progressMasterName}>{customerProgress.master.name}</Text>
                    <Text className={styles.progressMasterRating}>⭐ {customerProgress.master.rating} · {customerProgress.master.orderCount}单</Text>
                  </View>
                </View>
                <Tag
                  text={customerProgress.stopsAhead === 0 ? '轮到我了' : customerProgress.stopsAhead <= 2 ? '马上到' : '在路上'}
                  color={customerProgress.stopsAhead === 0 ? 'success' : customerProgress.stopsAhead <= 2 ? 'warning' : 'primary'}
                  size="md"
                />
              </View>

              <View className={styles.progressTimeline}>
                <View className={styles.progressStats}>
                  <View className={styles.progressStatItem}>
                    <Text className={styles.progressStatValue}>{customerProgress.totalStops}</Text>
                    <Text className={styles.progressStatLabel}>总共站点</Text>
                  </View>
                  <View className={styles.progressStatItem}>
                    <Text className={styles.progressStatValue}>{customerProgress.currentStop}</Text>
                    <Text className={styles.progressStatLabel}>当前站点</Text>
                  </View>
                  <View className={styles.progressStatItem}>
                    <Text className={styles.progressStatValue}>{customerProgress.stopsAhead}</Text>
                    <Text className={styles.progressStatLabel}>前面还有</Text>
                  </View>
                  <View className={styles.progressStatItem}>
                    <Text className={styles.progressStatValue}>{customerProgress.estimatedWaitMinutes}min</Text>
                    <Text className={styles.progressStatLabel}>预计等待</Text>
                  </View>
                </View>

                <View className={styles.progressEtaCard}>
                  <Text className={styles.progressEtaTitle}>⏰ 预计到达时间</Text>
                  <Text className={styles.progressEtaValue}>{customerProgress.estimatedArrival}</Text>
                  <Text className={styles.progressEtaNote}>
                    {customerProgress.stopsAhead === 0
                      ? '师傅马上到达！'
                      : customerProgress.stopsAhead === 1
                        ? '正在服务上一单，请准备'
                        : `还需处理${customerProgress.stopsAhead}单，请耐心等待`}
                  </Text>
                </View>

                {customerProgress.allStops.length > 0 && (
                  <View className={styles.progressStopsList}>
                    <Text className={styles.progressStopsTitle}>📋 师傅路线</Text>
                    {customerProgress.allStops.map((stop) => {
                      const isMyStop = stop.orderId === customerProgress.orderId;
                      const isDone = stop.sequence <= customerProgress.currentStop;
                      const isCurrent = stop.sequence === customerProgress.currentStop + 1;
                      return (
                        <View
                          key={stop.orderId}
                          className={classnames(
                            styles.progressStop,
                            isMyStop && styles.progressStopMine,
                            isDone && styles.progressStopDone
                          )}
                        >
                          <View
                            className={classnames(
                              styles.progressStopSeq,
                              isMyStop && styles.progressStopSeqMine,
                              isCurrent && styles.progressStopSeqCurrent
                            )}
                          >
                            <Text className={styles.progressStopSeqText}>
                              {isMyStop ? '我' : isDone ? '✓' : stop.sequence}
                            </Text>
                          </View>
                          <View className={styles.progressStopInfo}>
                            <Text className={styles.progressStopName}>{stop.serviceName}</Text>
                            <Text className={styles.progressStopAddr}>{stop.address}</Text>
                          </View>
                          {isMyStop && <Tag text="我的订单" color="primary" size="sm" />}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Empty text="暂无排队中的订单，请先在匹配页进入队列" icon="📭" />
          )}
        </ScrollView>
      )}

      <View className={styles.callNextBtn} onClick={handleCallNext}>
        <Text>呼叫下一位</Text>
      </View>
    </View>
  );
};

export default QueuePage;
