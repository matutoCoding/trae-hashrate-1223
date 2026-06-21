import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useMatchStore } from '@/store/match';
import { useUserStore } from '@/store/user';
import Empty from '@/components/Empty';
import Tag from '@/components/Tag';
import type { ServiceType, PriorityLevel } from '@/types/service';
import type { MatchItem } from '@/types/match';
import { getPriorityLabel, getPriorityColor, formatPrice, formatDistance, getServiceTypeLabel } from '@/utils/index';

type TabType = 'all' | 'willing' | 'matched';
type SortType = 'match' | 'distance' | 'price' | 'priority';
type ServiceTypeFilter = 'all' | ServiceType;
type PriorityFilter = 'all' | PriorityLevel;

const sortOptions = [
  { key: 'match' as SortType, label: '契合度' },
  { key: 'distance' as SortType, label: '距离' },
  { key: 'price' as SortType, label: '价格' },
  { key: 'priority' as SortType, label: '加急' },
];

const serviceTypeOptions = [
  { key: 'all' as const, label: '全部类型' },
  { key: 'knife_sharpening' as const, label: '磨刀' },
  { key: 'scissors_sharpening' as const, label: '剪刀' },
  { key: 'garden_pruning' as const, label: '园艺' },
  { key: 'tree_pruning' as const, label: '树木' },
];

const priorityOptions = [
  { key: 'all' as const, label: '全部级别' },
  { key: 'normal' as const, label: '普通' },
  { key: 'urgent' as const, label: '加急' },
  { key: 'vip' as const, label: 'VIP' },
];

const MasterOrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortBy, setSortBy] = useState<SortType>('match');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceTypeFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [showFilters, setShowFilters] = useState(false);

  const { matches, setMasterWilling, isOrderLocked } = useMatchStore();
  const { role, currentUser } = useUserStore();

  const isMaster = role === 'master' && currentUser;

  const masterMatches = useMemo(() => {
    if (!isMaster || !currentUser) return [];
    return matches.filter((m) => m.master.id === currentUser.id);
  }, [matches, isMaster, currentUser]);

  const filteredAndSortedMatches = useMemo(() => {
    let result = [...masterMatches];

    if (activeTab === 'willing') {
      result = result.filter((m) => m.masterWilling);
    } else if (activeTab === 'matched') {
      result = result.filter((m) => m.isMatched);
    }

    if (serviceTypeFilter !== 'all') {
      result = result.filter((m) => m.order.serviceType === serviceTypeFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((m) => m.order.priority === priorityFilter);
    }

    result = result.filter((m) => m.order.price >= priceRange[0] && m.order.price <= priceRange[1]);

    result.sort((a, b) => {
      switch (sortBy) {
        case 'match':
          return b.matchScore - a.matchScore;
        case 'distance':
          return a.distance - b.distance;
        case 'price':
          return b.order.price - a.order.price;
        case 'priority': {
          const priorityWeight = { vip: 3, urgent: 2, normal: 1 };
          return priorityWeight[b.order.priority] - priorityWeight[a.order.priority];
        }
        default:
          return 0;
      }
    });

    return result;
  }, [masterMatches, activeTab, sortBy, serviceTypeFilter, priorityFilter, priceRange]);

  const tabCounts = useMemo(() => ({
    all: masterMatches.length,
    willing: masterMatches.filter((m) => m.masterWilling).length,
    matched: masterMatches.filter((m) => m.isMatched).length,
  }), [masterMatches]);

  const handleSetWilling = (match: MatchItem, willing: boolean) => {
    if (!currentUser) return;

    const lockStatus = isOrderLocked(match.order.id);
    if (lockStatus.locked && lockStatus.master?.id !== currentUser.id) {
      Taro.showToast({
        title: `该订单已由${lockStatus.master?.name}师傅接单`,
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    setMasterWilling(match.order.id, currentUser.id, willing);
    Taro.showToast({
      title: willing ? '已标记愿意接单' : '已取消意愿',
      icon: 'success',
    });
  };

  const handleViewDetail = (orderId: string) => {
    Taro.navigateTo({ url: `/pages/order-detail/index?id=${orderId}` });
  };

  const tabs = [
    { key: 'all' as TabType, label: '全部订单', count: tabCounts.all },
    { key: 'willing' as TabType, label: '我有意向', count: tabCounts.willing },
    { key: 'matched' as TabType, label: '互选成功', count: tabCounts.matched },
  ];

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>待接单列表</Text>
        <Text className={styles.headerDesc}>
          共 {masterMatches.length} 个可接订单
        </Text>
      </View>

      <View className={styles.tabs}>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.tab, activeTab === tab.key && styles.active)}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabLabel}>{tab.label}</Text>
            <Text className={classnames(styles.tabCount, activeTab === tab.key && styles.tabCountActive)}>
              {tab.count}
            </Text>
          </View>
        ))}
      </View>

      <View className={styles.toolbar}>
        <View className={styles.sortBar}>
          {sortOptions.map((opt) => (
            <View
              key={opt.key}
              className={classnames(styles.sortItem, sortBy === opt.key && styles.sortItemActive)}
              onClick={() => setSortBy(opt.key)}
            >
              <Text>{opt.label}</Text>
            </View>
          ))}
        </View>
        <View className={styles.filterToggle} onClick={() => setShowFilters(!showFilters)}>
          <Text className={styles.filterIcon}>🔍</Text>
          <Text className={styles.filterText}>筛选</Text>
        </View>
      </View>

      {showFilters && (
        <View className={styles.filters}>
          <View className={styles.filterSection}>
            <Text className={styles.filterTitle}>服务类型</Text>
            <View className={styles.filterOptions}>
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
          </View>

          <View className={styles.filterSection}>
            <Text className={styles.filterTitle}>加急级别</Text>
            <View className={styles.filterOptions}>
              {priorityOptions.map((opt) => (
                <View
                  key={opt.key}
                  className={classnames(styles.filterChip, priorityFilter === opt.key && styles.filterChipActive)}
                  onClick={() => setPriorityFilter(opt.key)}
                >
                  <Text>{opt.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className={styles.filterSection}>
            <Text className={styles.filterTitle}>价格范围</Text>
            <View className={styles.priceRange}>
              <Text className={styles.priceLabel}>¥{priceRange[0]}</Text>
              <View className={styles.priceSlider}>
                <View
                  className={styles.priceSliderTrack}
                  style={{ left: `${(priceRange[0] / 500) * 100}%`, right: `${100 - (priceRange[1] / 500) * 100}%` }}
                />
              </View>
              <Text className={styles.priceLabel}>¥{priceRange[1]}</Text>
            </View>
          </View>

          <View className={styles.filterActions}>
            <View
              className={styles.resetBtn}
              onClick={() => {
                setServiceTypeFilter('all');
                setPriorityFilter('all');
                setPriceRange([0, 500]);
              }}
            >
              <Text>重置</Text>
            </View>
            <View className={styles.applyBtn} onClick={() => setShowFilters(false)}>
              <Text>确定</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView scrollY style={{ height: showFilters ? 'calc(100vh - 700rpx)' : 'calc(100vh - 400rpx)' }}>
        <View className={styles.orderList}>
          {filteredAndSortedMatches.length > 0 ? (
            filteredAndSortedMatches.map((match) => {
              const lockStatus = isOrderLocked(match.order.id);
              const isLockedByOther = lockStatus.locked && lockStatus.master?.id !== currentUser?.id;
              const isMyOrder = lockStatus.locked && lockStatus.master?.id === currentUser?.id;

              return (
                <View
                  key={match.id}
                  className={classnames(styles.orderCard, isLockedByOther && styles.locked)}
                  onClick={() => handleViewDetail(match.order.id)}
                >
                  {isLockedByOther && (
                    <View className={styles.lockedBadge}>
                      🔒 已由 {lockStatus.master?.name} 师傅接单
                    </View>
                  )}
                  {isMyOrder && (
                    <View className={styles.myOrderBadge}>
                      ✅ 已锁定给我
                    </View>
                  )}

                  <View className={styles.orderHeader}>
                    <View className={styles.orderType}>
                      <Text className={styles.serviceName}>{match.order.serviceName}</Text>
                      <Tag
                        text={getServiceTypeLabel(match.order.serviceType)}
                        color="primary"
                        size="sm"
                      />
                      <Tag
                        text={getPriorityLabel(match.order.priority)}
                        color={match.order.priority === 'normal' ? 'default' : match.order.priority === 'urgent' ? 'danger' : 'warning'}
                        size="sm"
                      />
                    </View>
                    <View className={styles.matchScore}>
                      <Text className={styles.matchScoreValue}>{match.matchScore}</Text>
                      <Text className={styles.matchScoreLabel}>契合度</Text>
                    </View>
                  </View>

                  <View className={styles.orderInfo}>
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>📍 位置</Text>
                      <Text className={styles.infoValue}>{match.order.address}</Text>
                      <Tag text={formatDistance(match.distance)} color="primary" size="sm" />
                    </View>
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>👤 客户</Text>
                      <Text className={styles.infoValue}>{match.order.customerName}</Text>
                    </View>
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>📦 数量</Text>
                      <Text className={styles.infoValue}>{match.order.quantity} 件</Text>
                    </View>
                    <View className={styles.infoRow}>
                      <Text className={styles.infoLabel}>💰 价格</Text>
                      <Text className={styles.priceValue}>{formatPrice(match.order.price)}</Text>
                    </View>
                  </View>

                  <View className={styles.willingStatus}>
                    <View className={styles.statusItem}>
                      <Text className={styles.statusLabel}>客户意愿</Text>
                      <Text className={classnames(styles.statusValue, match.customerWilling && styles.statusActive)}>
                        {match.customerWilling ? '✅ 有意向' : '⚪ 待选择'}
                      </Text>
                    </View>
                    <View className={styles.statusItem}>
                      <Text className={styles.statusLabel}>我的意愿</Text>
                      <Text className={classnames(styles.statusValue, match.masterWilling && styles.statusActive)}>
                        {match.masterWilling ? '✅ 有意向' : '⚪ 待选择'}
                      </Text>
                    </View>
                  </View>

                  {match.isMatched && (
                    <View className={styles.matchSuccess}>
                      <Text className={styles.matchSuccessText}>🎉 互选成功！可以进入队列了</Text>
                    </View>
                  )}

                  <View className={styles.actionBtns}>
                    {!isLockedByOther && (
                      <>
                        {match.masterWilling ? (
                          <View
                            className={classnames(styles.actionBtn, styles.cancelBtn)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetWilling(match, false);
                            }}
                          >
                            <Text>取消意愿</Text>
                          </View>
                        ) : (
                          <View
                            className={classnames(styles.actionBtn, styles.willingBtn)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetWilling(match, true);
                            }}
                          >
                            <Text>愿意接单</Text>
                          </View>
                        )}
                        {match.isMatched && (
                          <View
                            className={classnames(styles.actionBtn, styles.primaryBtn)}
                            onClick={(e) => {
                              e.stopPropagation();
                              Taro.navigateTo({ url: '/pages/queue/index' });
                            }}
                          >
                            <Text>进入队列</Text>
                          </View>
                        )}
                      </>
                    )}
                    {isLockedByOther && (
                      <View className={styles.lockedHint}>
                        <Text>该订单已被其他师傅接单</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <Empty text="暂无待接订单" icon="📋" />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default MasterOrdersPage;
