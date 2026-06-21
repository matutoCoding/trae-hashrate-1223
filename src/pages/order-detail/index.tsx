import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { mockOrderDetails } from '@/data/orders';
import Tag from '@/components/Tag';
import classnames from 'classnames';

const statusMap: Record<string, { text: string; desc: string }> = {
  pending: { text: '待匹配', desc: '正在为您匹配合适的师傅' },
  matching: { text: '匹配中', desc: '多位师傅正在查看您的订单' },
  matched: { text: '已匹配', desc: '双方已确认意向，请等待服务' },
  in_queue: { text: '排队中', desc: '已进入服务队列，请耐心等待' },
  in_progress: { text: '服务中', desc: '师傅正在为您服务' },
  completed: { text: '已完成', desc: '服务已完成，感谢您的使用' },
  cancelled: { text: '已取消', desc: '订单已取消' },
};

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const orderId = router.params?.id;

  const order = useMemo(() => {
    return mockOrderDetails.find((o) => o.id === orderId) || mockOrderDetails[0];
  }, [orderId]);

  const status = statusMap[order.status] || statusMap.pending;

  return (
    <View className={styles.page}>
      <View className={styles.statusHeader}>
        <Text className={styles.statusText}>{status.text}</Text>
        <Text className={styles.statusDesc}>{status.desc}</Text>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 200rpx)' }}>
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>订单信息</Text>
          <View className={styles.orderNoRow}>
            <Text className={styles.orderNoLabel}>订单编号</Text>
            <Text className={styles.orderNoValue}>{order.orderNo}</Text>
          </View>
          <View className={styles.orderNoRow}>
            <Text className={styles.orderNoLabel}>创建时间</Text>
            <Text className={styles.orderNoValue}>{order.createTime}</Text>
          </View>

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
            <View className={styles.servicePrice}>
              <Text className={styles.priceValue}>¥{order.price}</Text>
              <Text className={styles.quantity}>x{order.quantity}</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>服务信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>服务地址</Text>
            <Text className={styles.infoValue}>{order.address}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>预约时间</Text>
            <Text className={styles.infoValue}>{order.appointmentTime}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>优先级</Text>
            <Text className={styles.infoValue}>
              {order.priority === 'normal' && '普通'}
              {order.priority === 'urgent' && (
                <Tag text="加急" color="danger" size="sm" />
              )}
              {order.priority === 'vip' && (
                <Tag text="VIP" color="warning" size="sm" />
              )}
            </Text>
          </View>
        </View>

        {order.masterName && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>服务师傅</Text>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>师傅姓名</Text>
              <Text className={styles.infoValue}>{order.masterName}</Text>
            </View>
            {order.matchScore && (
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>契合度</Text>
                <Text className={styles.infoValue} style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                  {order.matchScore} 分
                </Text>
              </View>
            )}
          </View>
        )}

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>订单进度</Text>
          <View className={styles.timeline}>
            {order.timeline.map((item, idx) => (
              <View
                key={idx}
                className={classnames(
                  styles.timelineItem,
                  idx === order.timeline.length - 1 && ''
                )}
              >
                <View className={styles.timelineDot} />
                <Text className={styles.timelineTime}>{item.time}</Text>
                <Text className={styles.timelineText}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default OrderDetailPage;
