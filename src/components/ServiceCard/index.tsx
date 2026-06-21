import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import Tag from '../Tag';
import type { ServiceOrder } from '@/types/service';
import { formatPrice, formatTime, getPriorityLabel, getPriorityColor } from '@/utils/index';

interface ServiceCardProps {
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

const ServiceCard: React.FC<ServiceCardProps> = ({ order, onClick }) => {
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
        <View className={styles.left}>
          <Text className={styles.serviceName}>{order.serviceName}</Text>
          <Tag text={status.label} color={status.color} size="sm" />
        </View>
        <Text className={styles.price}>{formatPrice(order.price)}</Text>
      </View>

      <View className={styles.content}>
        <Text className={styles.desc}>{order.description}</Text>
        <View className={styles.meta}>
          <Text className={styles.metaItem}>📍 {order.address}</Text>
          <Text className={styles.metaItem}>⏰ {order.appointmentTime}</Text>
        </View>
      </View>

      <View className={styles.footer}>
        <View className={styles.customer}>
          <Image className={styles.avatar} src={order.customerAvatar} mode="aspectFill" />
          <Text className={styles.customerName}>{order.customerName}</Text>
        </View>
        <View className={styles.rightInfo}>
          {order.priority !== 'normal' && (
            <Tag
              text={getPriorityLabel(order.priority)}
              color={order.priority === 'urgent' ? 'danger' : 'warning'}
              size="sm"
            />
          )}
          <Text className={styles.time}>{formatTime(order.createTime)}</Text>
        </View>
      </View>
    </View>
  );
};

export default ServiceCard;
