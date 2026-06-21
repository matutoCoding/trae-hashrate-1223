import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import Tag from '../Tag';
import type { ServiceOrder } from '@/types/service';
import { formatPrice, formatTime, getPriorityLabel } from '@/utils/index';

interface OrderCardProps {
  order: ServiceOrder;
  onClick?: () => void;
}

const statusMap: Record<string, { label: string; color: 'primary' | 'warning' | 'danger' | 'success' | 'default' }> = {
  pending: { label: '待匹配', color: 'default' },
  matching: { label: '匹配中', color: 'primary' },
  matched: { label: '已匹配', color: 'success' },
  in_queue: { label: '排队中', color: 'warning' },
  in_progress: { label: '服务中', color: 'primary' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'danger' },
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  const status = statusMap[order.status] || statusMap.pending;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <Text className={styles.orderNo}>{order.orderNo}</Text>
        <Tag text={status.label} color={status.color} size="sm" />
      </View>

      <View className={styles.body}>
        <View className={styles.serviceInfo}>
          <Text className={styles.serviceIcon}>
            {order.serviceType === 'knife_sharpening' && '🔪'}
            {order.serviceType === 'scissors_sharpening' && '✂️'}
            {order.serviceType === 'garden_pruning' && '🌿'}
            {order.serviceType === 'tree_pruning' && '🌳'}
          </Text>
          <View className={styles.serviceDetail}>
            <Text className={styles.serviceName}>{order.serviceName}</Text>
            <Text className={styles.serviceDesc}>{order.description}</Text>
          </View>
        </View>

        <View className={styles.priceRow}>
          <Text className={styles.quantity}>x{order.quantity}</Text>
          <Text className={styles.price}>{formatPrice(order.price)}</Text>
        </View>
      </View>

      <View className={styles.footer}>
        <View className={styles.meta}>
          {order.priority !== 'normal' && (
            <Tag
              text={getPriorityLabel(order.priority)}
              color={order.priority === 'urgent' ? 'danger' : 'warning'}
              size="sm"
            />
          )}
          <Text className={styles.time}>{formatTime(order.createTime)}</Text>
        </View>
        {order.masterName && (
          <View className={styles.master}>
            <Image className={styles.masterAvatar} src={order.masterAvatar} mode="aspectFill" />
            <Text className={styles.masterName}>{order.masterName}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default OrderCard;
