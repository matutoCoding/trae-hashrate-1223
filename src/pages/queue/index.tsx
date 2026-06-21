import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useQueueStore } from '@/store/queue';
import QueueItemComp from '@/components/QueueItem';
import Empty from '@/components/Empty';
import type { PriorityLevel } from '@/types/service';

type TabType = 'all' | 'waiting' | 'serving';

const QueuePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { queueInfo, queueItems, callNext, upgradePriority } = useQueueStore();

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

      <ScrollView scrollY style={{ height: 'calc(100vh - 750rpx)' }}>
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

      <View className={styles.callNextBtn} onClick={handleCallNext}>
        <Text>呼叫下一位</Text>
      </View>
    </View>
  );
};

export default QueuePage;
