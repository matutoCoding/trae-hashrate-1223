import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
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

type TabType = 'all' | 'matched' | 'waiting';

const MatchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { matches, setCustomerWilling, setMasterWilling } = useMatchStore();
  const { role } = useUserStore();
  const { updateOrder } = useServiceStore();
  const { addToQueue } = useQueueStore();

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

  const handleCustomerWilling = (matchId: string, willing: boolean) => {
    setCustomerWilling(matchId, willing);
  };

  const handleMasterWilling = (matchId: string, willing: boolean) => {
    setMasterWilling(matchId, willing);
  };

  const handleJoinQueue = (item: MatchItem) => {
    Taro.showModal({
      title: '确认进入队列',
      content: `匹配成功！是否将订单"${item.order.serviceName}"加入服务队列？`,
      success: (res) => {
        if (res.confirm) {
          updateOrder(item.order.id, {
            status: 'in_queue',
            masterId: item.master.id,
            masterName: item.master.name,
            masterAvatar: item.master.avatar,
            isMatched: true,
          });
          addToQueue(item.order.id, item.order.priority, item.order);
          Taro.showToast({ title: '已加入队列', icon: 'success' });
        }
      },
    });
  };

  const handleViewMaster = (masterId: string) => {
    Taro.navigateTo({ url: `/pages/master-detail/index?id=${masterId}` });
  };

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
            filteredMatches.map((item) => (
              <View
                key={item.id}
                className={classnames(styles.matchCard, item.isMatched && styles.matchMatched)}
              >
                <View className={styles.matchHeader}>
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

                {!item.isMatched && (
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

                {item.isMatched && (
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
              </View>
            ))
          ) : (
            <Empty text="暂无匹配记录" icon="🤝" />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default MatchPage;
