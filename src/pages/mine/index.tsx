import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useUserStore } from '@/store/user';
import { useServiceStore } from '@/store/service';
import type { UserRole } from '@/types/user';

const MinePage: React.FC = () => {
  const { currentUser, role, setRole } = useUserStore();
  const { orders } = useServiceStore();

  const stats = useMemo(() => {
    return {
      total: orders.length,
      matched: orders.filter((o) => o.isMatched).length,
      completed: orders.filter((o) => o.status === 'completed').length,
    };
  }, [orders]);

  const handleRoleSwitch = (newRole: UserRole) => {
    setRole(newRole);
    Taro.showToast({ title: `已切换为${newRole === 'customer' ? '客户' : '师傅'}`, icon: 'none' });
  };

  const menuItems = [
    { icon: '📋', text: '我的订单', onClick: () => Taro.showToast({ title: '我的订单', icon: 'none' }) },
    { icon: '🤝', text: '我的匹配', onClick: () => Taro.switchTab({ url: '/pages/match/index' }) },
    { icon: '📞', text: '联系客服', onClick: () => Taro.showToast({ title: '联系客服', icon: 'none' }) },
    { icon: '⚙️', text: '设置', onClick: () => Taro.showToast({ title: '设置', icon: 'none' }) },
  ];

  const masterMenuItems = [
    { icon: '📊', text: '接单统计', onClick: () => Taro.showToast({ title: '接单统计', icon: 'none' }) },
    { icon: '💰', text: '收入明细', onClick: () => Taro.showToast({ title: '收入明细', icon: 'none' }) },
    { icon: '🎯', text: '技能管理', onClick: () => Taro.showToast({ title: '技能管理', icon: 'none' }) },
    { icon: '⭐', text: '评价管理', onClick: () => Taro.showToast({ title: '评价管理', icon: 'none' }) },
  ];

  const displayMenuItems = role === 'customer' ? menuItems : masterMenuItems;

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.profile}>
          <Text
            className={styles.avatar}
            style={{
              background: currentUser?.avatar
                ? `url(${currentUser.avatar}) center/cover`
                : undefined,
            }}
          />
          <View className={styles.info}>
            <Text className={styles.name}>{currentUser?.name || '用户'}</Text>
            <Text className={styles.role}>
              {role === 'customer' ? '👤 客户' : '🔧 师傅'}
            </Text>
            <Text className={styles.phone}>{currentUser?.phone || '未绑定手机'}</Text>
          </View>
          <View className={styles.roleSwitch}>
            <View
              className={classnames(styles.roleOption, role === 'customer' && styles.active)}
              onClick={() => handleRoleSwitch('customer')}
            >
              <Text>客户</Text>
            </View>
            <View
              className={classnames(styles.roleOption, role === 'master' && styles.active)}
              onClick={() => handleRoleSwitch('master')}
            >
              <Text>师傅</Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.stats}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.total}</Text>
          <Text className={styles.statLabel}>总订单</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.matched}</Text>
          <Text className={styles.statLabel}>已匹配</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.completed}</Text>
          <Text className={styles.statLabel}>已完成</Text>
        </View>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 500rpx)' }}>
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>常用功能</Text>
          <View className={styles.menuList}>
            {displayMenuItems.map((item, idx) => (
              <View key={idx} className={styles.menuItem} onClick={item.onClick}>
                <Text className={styles.menuIcon}>{item.icon}</Text>
                <Text className={styles.menuText}>{item.text}</Text>
                <Text className={styles.menuArrow}>›</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>更多</Text>
          <View className={styles.menuList}>
            <View
              className={styles.menuItem}
              onClick={() => Taro.showToast({ title: '关于我们', icon: 'none' })}
            >
              <Text className={styles.menuIcon}>ℹ️</Text>
              <Text className={styles.menuText}>关于我们</Text>
              <Text className={styles.menuArrow}>›</Text>
            </View>
            <View
              className={styles.menuItem}
              onClick={() => Taro.showToast({ title: '用户协议', icon: 'none' })}
            >
              <Text className={styles.menuIcon}>📄</Text>
              <Text className={styles.menuText}>用户协议</Text>
              <Text className={styles.menuArrow}>›</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default MinePage;
