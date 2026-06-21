import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useServiceStore } from '@/store/service';
import { useUserStore } from '@/store/user';
import ServiceCard from '@/components/ServiceCard';
import Empty from '@/components/Empty';

const HomePage: React.FC = () => {
  const { serviceItems, orders } = useServiceStore();
  const { currentUser } = useUserStore();

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  const handleServiceClick = (serviceType: string) => {
    Taro.navigateTo({ url: `/pages/publish-service/index?type=${serviceType}` });
  };

  const handlePublish = () => {
    Taro.navigateTo({ url: '/pages/publish-service/index' });
  };

  const handleViewQueue = () => {
    Taro.switchTab({ url: '/pages/queue/index' });
  };

  const handleViewMatch = () => {
    Taro.switchTab({ url: '/pages/match/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.greeting}>
          <Text className={styles.greetingTitle}>您好，{currentUser?.name || '用户'}</Text>
          <Text className={styles.greetingSubtitle}>专业磨刀修剪，上门服务</Text>
        </View>
        <View className={styles.location}>
          <Text>📍</Text>
          <Text className={styles.locationText}>{currentUser?.address || '定位中...'}</Text>
        </View>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 200rpx)' }}>
        <View className={styles.banner}>
          <View className={styles.bannerContent}>
            <Text className={styles.bannerTitle}>双向匹配 · 智能撮合</Text>
            <Text className={styles.bannerDesc}>客户师傅双向选择，契合度排序，双方满意才成交</Text>
            <View className={styles.bannerBtn} onClick={handlePublish}>
              <Text>立即发布需求</Text>
            </View>
          </View>
          <Text className={styles.bannerDecoration}>🔪</Text>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>服务类型</Text>
          </View>
          <View className={styles.serviceGrid}>
            {serviceItems.map((item) => (
              <View
                key={item.id}
                className={styles.serviceItem}
                onClick={() => handleServiceClick(item.type)}
              >
                <Text className={styles.serviceIcon}>{item.icon}</Text>
                <Text className={styles.serviceName}>{item.name}</Text>
                <Text className={styles.servicePrice}>¥{item.basePrice}/{item.unit}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.quickActions}>
            <View className={styles.quickAction} onClick={handlePublish}>
              <Text className={styles.quickActionIcon}>📝</Text>
              <Text className={styles.quickActionText}>发布服务</Text>
            </View>
            <View className={styles.quickAction} onClick={handleViewMatch}>
              <Text className={styles.quickActionIcon}>🤝</Text>
              <Text className={styles.quickActionText}>双向匹配</Text>
            </View>
            <View className={styles.quickAction} onClick={handleViewQueue}>
              <Text className={styles.quickActionIcon}>📋</Text>
              <Text className={styles.quickActionText}>排队叫号</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>最近订单</Text>
            <Text className={styles.sectionMore}>查看全部</Text>
          </View>
          <View className={styles.orderList}>
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => <ServiceCard key={order.id} order={order} />)
            ) : (
              <Empty text="暂无订单" icon="📋" />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomePage;
