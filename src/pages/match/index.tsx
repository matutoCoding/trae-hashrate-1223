import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useMatchStore } from '@/store/match';
import { useUserStore } from '@/store/user';
import { useServiceStore } from '@/store/service';
import { useQueueStore } from '@/store/queue';
import Empty from '@/components/Empty';
import Tag from '@/components/Tag';
import RateStars from '@/components/RateStars';
import type { MatchItem } from '@/types/match';
import type { CustomerRouteProgress } from '@/types/queue';

type TabType = 'all' | 'matched' | 'waiting';

const MatchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { matches, setCustomerWilling, setMasterWilling, lockOrderForMaster, isOrderLocked } = useMatchStore();
  const { role, currentUser } = useUserStore();
  const { updateOrder } = useServiceStore();
  const { addToQueue, getMyQueueItem, getCustomerRouteProgress, getQueueItemByOrder, queueItems } = useQueueStore();
  const isCustomer = role === 'customer' && currentUser;

  const tabs = [
    { key: 'all' as TabType, label: '全部' },
    { key: 'matched' as TabType, label: '已撮合' },
    { key: 'waiting' as TabType, label: '待确认' },
  ];

  const { totalCount, matchedCount, waitingCount } = useMemo(() => {
    return {
      totalCount: matches.length,
      matchedCount: matches.filter((m) => m.isMatched).length,
      waitingCount: matches.filter((m) => !m.isMatched).length,
    };
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (activeTab === 'all') return matches;
    if (activeTab === 'matched') return matches.filter((m) => m.isMatched);
    return matches.filter((m) => !m.isMatched);
  }, [matches, activeTab]);

  const progressMap = useMemo(() => {
    const map: Record<string, CustomerRouteProgress | null> = {};
    if (!isCustomer) return map;
    const myOrderIds = new Set(matches.map((m) => m.order.id));
    myOrderIds.forEach((orderId) => {
      const q = getQueueItemByOrder(orderId);
      if (q) {
        map[orderId] = getCustomerRouteProgress(orderId);
      }
    });
    return map;
  }, [isCustomer, matches, getQueueItemByOrder, getCustomerRouteProgress, role, currentUser, queueItems]);

  const handleCustomerWilling = (matchId: string, willing: boolean) => {
    setCustomerWilling(matchId, willing);
  };

  const handleMasterWilling = (matchId: string, willing: boolean) => {
    setMasterWilling(matchId, willing);
  };

  const handleJoinQueue = (item: MatchItem) => {
    const existingQueueItem = getMyQueueItem(item.order.id);
    if (existingQueueItem) {
      Taro.showModal({
        title: '订单已在队列中',
        content: `该订单已由 ${existingQueueItem.master.name} 师傅接单\n\n取号：${existingQueueItem.queueNumber}号\n当前排位：第${existingQueueItem.position}位\n状态：${existingQueueItem.status === 'waiting' ? '排队中' : existingQueueItem.status === 'called' ? '已叫号' : '服务中'}`,
        showCancel: true,
        cancelText: '知道了',
        confirmText: '查看队列',
        success: (res) => {
          if (res.confirm) {
            Taro.switchTab({ url: '/pages/queue/index' });
          }
        },
      });
      return;
    }

    Taro.showModal({
      title: '确认进入队列',
      content: `匹配成功！将由 ${item.master.name} 师傅为您服务。\n\n是否将订单"${item.order.serviceName}"加入服务队列？`,
      success: (res) => {
        if (res.confirm) {
          updateOrder(item.order.id, {
            status: 'in_queue',
            masterId: item.master.id,
            masterName: item.master.name,
            masterAvatar: item.master.avatar,
            isMatched: true,
          });
          
          lockOrderForMaster(item.order.id, item.master);
          
          const result = addToQueue(item.order.id, item.order.priority, item.order, item.master);
          
          if (result.isNew) {
            Taro.showToast({ title: `取号成功，${result.queueNumber}号`, icon: 'success' });
          } else {
            Taro.showModal({
              title: '已在队列中',
              content: `该订单已在队列中\n\n取号：${result.queueNumber}号\n当前排位：第${result.position}位\n接单师傅：${result.masterName}\n状态：${result.status}`,
              showCancel: false,
            });
          }
        }
      },
    });
  };

  const handleViewMaster = (masterId: string) => {
    Taro.navigateTo({ url: `/pages/master-detail/index?id=${masterId}` });
  };

  const renderProgressCard = (progress: CustomerRouteProgress, masterId: string) => (
    <View className={styles.progressCard}>
      <View className={styles.progressHeader}>
        <View className={styles.progressMasterRow}>
          <Image className={styles.progressAvatar} src={progress.master.avatar} />
          <View>
            <Text className={styles.progressMasterName}>{progress.master.name}</Text>
            <Text className={styles.progressMasterMeta}>⭐ {progress.master.rating} · {progress.master.orderCount}单</Text>
          </View>
        </View>
        <Tag
          text={progress.stopsAhead === 0 ? '轮到我了' : progress.stopsAhead <= 2 ? '马上到' : '在路上'}
          color={progress.stopsAhead === 0 ? 'success' : progress.stopsAhead <= 2 ? 'warning' : 'primary'}
        />
      </View>
      <View className={styles.progressGrid}>
        <View className={styles.progressItem}>
          <Text className={styles.progressNum}>{progress.totalStops}</Text>
          <Text className={styles.progressTxt}>总共站点</Text>
        </View>
        <View className={styles.progressItem}>
          <Text className={styles.progressNum}>{progress.currentStop}</Text>
          <Text className={styles.progressTxt}>当前站点</Text>
        </View>
        <View className={styles.progressItem}>
          <Text className={styles.progressNum}>{progress.stopsAhead}</Text>
          <Text className={styles.progressTxt}>前面还有</Text>
        </View>
        <View className={styles.progressItem}>
          <Text className={styles.progressNum}>{progress.estimatedWaitMinutes}min</Text>
          <Text className={styles.progressTxt}>预计等待</Text>
        </View>
      </View>
      <View className={styles.progressEta}>
        <Text className={styles.progressEtaLabel}>⏰ 预计到达</Text>
        <Text className={styles.progressEtaValue}>{progress.estimatedArrival}</Text>
        <Text className={styles.progressEtaNote}>
          {progress.stopsAhead === 0
            ? '师傅马上到达！请准备好待服务物品'
            : progress.stopsAhead === 1
              ? '正在处理上一单，请准备'
              : `师傅还需处理${progress.stopsAhead}单，请耐心等待`}
        </Text>
      </View>
      {progress.allStops.length > 0 && (
        <View className={styles.progressStopsMini}>
          {progress.allStops.map((stop) => {
            const isMine = stop.orderId === progress.orderId;
            const isDone = stop.sequence <= progress.currentStop;
            return (
              <View
                key={stop.orderId}
                className={classnames(
                  styles.progressStopMini,
                  isMine && styles.progressStopMineMini,
                  isDone && styles.progressStopDoneMini
                )}
              >
                <View className={classnames(
                  styles.progressStopDotMini,
                  isMine && styles.progressStopDotMineMini,
                  isDone && styles.progressStopDotDoneMini
                )}>
                  <Text>{isMine ? '我' : isDone ? '✓' : stop.sequence}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <View className={styles.page}>
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

      <View className={styles.stats}>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{totalCount}</Text>
          <Text className={styles.statLabel}>总匹配数</Text>
        </View>
        <View className={classnames(styles.statCard, styles.matched)}>
          <Text className={styles.statValue}>{matchedCount}</Text>
          <Text className={styles.statLabel}>互选成功</Text>
        </View>
        <View className={classnames(styles.statCard, styles.waiting)}>
          <Text className={styles.statValue}>{waitingCount}</Text>
          <Text className={styles.statLabel}>待确认</Text>
        </View>
      </View>

      <View className={styles.filterBar}>
        <Text className={styles.filterTitle}>匹配列表</Text>
        <Text className={styles.filterInfo}>按契合度排序</Text>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 500rpx)' }}>
        <View className={styles.matchList}>
          {filteredMatches.length > 0 ? (
            filteredMatches.map((item) => {
              const lockInfo = isOrderLocked(item.order.id);
              const progress = progressMap[item.order.id];
              const isMyLockedMaster = lockInfo.locked && lockInfo.master?.id === item.master.id;
              const queueItem = getQueueItemByOrder(item.order.id);
              return (
              <View
                key={item.id}
                className={classnames(styles.matchCard, item.isMatched && styles.matchMatched, lockInfo.locked && lockInfo.master?.id !== item.master.id && styles.locked)}
              >
                <View className={styles.matchHeader}>
                  {lockInfo.locked && lockInfo.master?.id !== item.master.id && (
                    <View className={styles.lockedBadge}>
                      🔒 已由 {lockInfo.master?.name} 师傅接单
                    </View>
                  )}
                  {isMyLockedMaster && queueItem && (
                    <View className={styles.myOrderBadge}>
                      ✅ 由 {lockInfo.master?.name} 师傅接单中 · 第{queueItem.queueNumber}号
                    </View>
                  )}
                  <View className={styles.orderInfo}>
                    <View className={styles.orderTitle}>
                      <Text className={styles.serviceType}>{item.order.serviceName}</Text>
                      {item.order.priority !== 'normal' && (
                        <Tag
                          text={item.order.priority === 'urgent' ? '加急' : 'VIP'}
                          color={item.order.priority === 'urgent' ? 'danger' : 'warning'}
                          size="sm"
                        />
                      )}
                    </View>
                    <Text className={styles.orderNo}>{item.order.orderNo}</Text>
                    <Text className={styles.orderDesc}>{item.order.description}</Text>
                  </View>
                  <View className={styles.scoreBadge}>
                    <Text className={styles.scoreValue}>{item.matchScore}</Text>
                    <Text className={styles.scoreLabel}>契合度</Text>
                  </View>
                </View>

                {isMyLockedMaster && progress && renderProgressCard(progress, item.master.id)}

                <View className={styles.matchBody} onClick={() => handleViewMaster(item.master.id)}>
                  <Text className={styles.avatar} style={{ background: `url(${item.master.avatar}) center/cover` }} />
                  <View className={styles.masterInfo}>
                    <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
                      <Text className={styles.masterName}>{item.master.name}</Text>
                      {item.master.isOnline ? (
                        <Tag text="在线" color="success" size="sm" />
                      ) : (
                        <Tag text="离线" color="default" size="sm" />
                      )}
                    </View>
                    <RateStars rating={item.master.rating} size="sm" />
                    <View className={styles.masterMeta}>
                      <Text className={styles.masterMetaText}>
                        接单{item.master.orderCount} · 从业{item.master.yearsOfExperience}年
                      </Text>
                    </View>
                  </View>
                  <View className={styles.priceInfo}>
                    <Text className={styles.price}>¥{item.order.price}</Text>
                    <Text className={styles.distance}>{item.distance}km</Text>
                  </View>
                </View>

                <View className={styles.scoreDetails}>
                  <View className={styles.scoreItem}>
                    <Text className={styles.scoreItemLabel}>距离</Text>
                    <Text className={styles.scoreItemValue}>{item.distance}km</Text>
                  </View>
                  <View className={styles.scoreItem}>
                    <Text className={styles.scoreItemLabel}>技能匹配</Text>
                    <Text className={styles.scoreItemValue}>{item.skillMatch}</Text>
                  </View>
                  <View className={styles.scoreItem}>
                    <Text className={styles.scoreItemLabel}>价格匹配</Text>
                    <Text className={styles.scoreItemValue}>{item.priceMatch}</Text>
                  </View>
                  <View className={styles.scoreItem}>
                    <Text className={styles.scoreItemLabel}>评分</Text>
                    <Text className={styles.scoreItemValue}>{item.ratingScore}</Text>
                  </View>
                </View>

                {lockInfo.locked && lockInfo.master?.id !== item.master.id && (
                  <View className={styles.lockedHint}>
                    <Text>该订单已分配给 {lockInfo.master?.name} 师傅，不再接受其他意向</Text>
                  </View>
                )}

                {!item.isMatched && !lockInfo.locked && (
                  <View className={styles.willingSection}>
                    <View className={styles.willingRow}>
                      <Text className={styles.willingLabel}>客户意愿：</Text>
                      <View className={styles.willingBtns}>
                        <View
                          className={classnames(styles.willingBtn, item.customerWilling && styles.active)}
                          onClick={() => handleCustomerWilling(item.id, true)}
                        >
                          <Text>有意向</Text>
                        </View>
                        <View
                          className={classnames(
                            styles.willingBtn,
                            item.customerWilling === false && styles.inactive
                          )}
                          onClick={() => handleCustomerWilling(item.id, false)}
                        >
                          <Text>暂无意向</Text>
                        </View>
                      </View>
                    </View>
                    <View className={styles.willingRow}>
                      <Text className={styles.willingLabel}>师傅意愿：</Text>
                      <View className={styles.willingBtns}>
                        <View
                          className={classnames(styles.willingBtn, item.masterWilling && styles.active)}
                          onClick={() => handleMasterWilling(item.id, true)}
                        >
                          <Text>愿意接单</Text>
                        </View>
                        <View
                          className={classnames(
                            styles.willingBtn,
                            item.masterWilling === false && styles.inactive
                          )}
                          onClick={() => handleMasterWilling(item.id, false)}
                        >
                          <Text>暂不接单</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {item.isMatched && !queueItem && (
                  <>
                    <View className={styles.matchSuccess}>
                      <Text className={styles.matchSuccessText}>🎉 双方确认意向，匹配成功！</Text>
                      <Text className={styles.matchSuccessDesc}>契合度 {item.matchScore} · 可进入服务队列</Text>
                    </View>
                    <View className={styles.actionBtns}>
                      <View className={classnames(styles.actionBtn, styles.secondaryBtn)} onClick={() => handleViewMaster(item.master.id)}>
                        <Text>师傅详情</Text>
                      </View>
                      <View className={classnames(styles.actionBtn, styles.primaryBtn)} onClick={() => handleJoinQueue(item)}>
                        <Text>进入队列</Text>
                      </View>
                    </View>
                  </>
                )}

                {queueItem && isMyLockedMaster && (
                  <View className={styles.actionBtns}>
                    <View className={classnames(styles.actionBtn, styles.secondaryBtn)} onClick={() => handleViewMaster(item.master.id)}>
                      <Text>师傅详情</Text>
                    </View>
                    <View
                      className={classnames(styles.actionBtn, styles.primaryBtn)}
                      onClick={() => Taro.switchTab({ url: '/pages/queue/index' })}
                    >
                      <Text>查看师傅路线进度</Text>
                    </View>
                  </View>
                )}
              </View>
              );
            })
          ) : (
            <Empty text="暂无匹配记录" icon="🤝" />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default MatchPage;
