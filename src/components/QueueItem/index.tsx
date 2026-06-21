import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import Tag from '../Tag';
import type { QueueItem as QueueItemType } from '@/types/queue';
import { formatPrice, getPriorityLabel, getPriorityColor } from '@/utils/index';

interface QueueItemProps {
  item: QueueItemType;
  onClick?: () => void;
  showActions?: boolean;
  onUpgradePriority?: () => void;
}

const statusMap: Record<string, { label: string; color: 'primary' | 'warning' | 'danger' | 'success' | 'default' }> = {
  waiting: { label: '等待中', color: 'default' },
  called: { label: '已叫号', color: 'warning' },
  serving: { label: '服务中', color: 'primary' },
  completed: { label: '已完成', color: 'success' },
  left: { label: '已离开', color: 'danger' },
};

const QueueItem: React.FC<QueueItemProps> = ({ item, onClick, showActions, onUpgradePriority }) => {
  const status = statusMap[item.status] || statusMap.waiting;
  const priorityColor: 'primary' | 'warning' | 'danger' | 'success' | 'default' =
    item.priority === 'urgent' ? 'danger' : item.priority === 'vip' ? 'warning' : 'default';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({ url: `/pages/queue-detail/index?id=${item.id}` });
    }
  };

  return (
    <View className={classnames(styles.item, styles[item.status])} onClick={handleClick}>
      <View className={styles.left}>
        <View className={styles.numberBox}>
          <Text className={styles.number}>{item.queueNumber}</Text>
          <Text className={styles.numberLabel}>号</Text>
        </View>
        {item.position > 0 && item.status === 'waiting' && (
          <Text className={styles.position}>第{item.position}位</Text>
        )}
      </View>

      <View className={styles.middle}>
        <View className={styles.header}>
          <Text className={styles.serviceName}>{item.order.serviceName}</Text>
          <Tag text={status.label} color={status.color} size="sm" />
        </View>
        <Text className={styles.customer}>{item.order.customerName} · {item.order.quantity}件</Text>
        <View className={styles.footer}>
          {item.priority !== 'normal' && (
            <Tag text={getPriorityLabel(item.priority)} color={priorityColor} size="sm" />
          )}
          <Text className={styles.price}>{formatPrice(item.order.price)}</Text>
        </View>
      </View>

      <View className={styles.right}>
        {item.status === 'waiting' && (
          <View className={styles.waitTime}>
            <Text className={styles.waitTimeValue}>约{item.estimatedWaitTime}</Text>
            <Text className={styles.waitTimeLabel}>分钟</Text>
          </View>
        )}
        {item.status === 'serving' && (
          <Tag text="进行中" color="primary" size="sm" />
        )}
        {item.status === 'called' && (
          <Tag text="请就位" color="warning" size="sm" />
        )}
        {showActions && item.status === 'waiting' && item.priority === 'normal' && (
          <View
            className={styles.upgradeBtn}
            onClick={(e) => {
              e.stopPropagation();
              onUpgradePriority?.();
            }}
          >
            <Text>加急</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default QueueItem;
