import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { useUserStore } from '@/store/user';
import RateStars from '@/components/RateStars';
import Tag from '@/components/Tag';

const MasterDetailPage: React.FC = () => {
  const router = useRouter();
  const { masters } = useUserStore();

  const master = useMemo(() => {
    const id = router.params?.id;
    return masters.find((m) => m.id === id) || masters[0];
  }, [router.params, masters]);

  if (!master) {
    return (
      <View className={styles.page}>
        <View style={{ padding: '100rpx', textAlign: 'center' }}>
          <Text>师傅不存在</Text>
        </View>
      </View>
    );
  }

  const handleContact = () => {
    Taro.showToast({ title: `联系电话：${master.phone}`, icon: 'none', duration: 3000 });
  };

  const handleOrder = () => {
    Taro.navigateTo({ url: '/pages/publish-service/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text
          className={styles.avatar}
          style={{ background: `url(${master.avatar}) center/cover` }}
        />
        <View className={styles.info}>
          <Text className={styles.name}>{master.name}</Text>
          <RateStars rating={master.rating} size="md" />
          <Text className={styles.meta}>
            接单{master.orderCount} · 从业{master.yearsOfExperience}年
          </Text>
          {master.isOnline ? (
            <Text className={styles.online}>● 在线</Text>
          ) : (
            <Text className={styles.online} style={{ background: 'rgba(134, 144, 156, 0.3)' }}>
              ● 离线
            </Text>
          )}
        </View>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 400rpx)' }}>
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>服务数据</Text>
          <View className={styles.ratingRow}>
            <View className={styles.ratingItem}>
              <Text className={styles.ratingValue}>{master.rating}</Text>
              <Text className={styles.ratingLabel}>综合评分</Text>
            </View>
            <View className={styles.ratingItem}>
              <Text className={styles.ratingValue}>{master.orderCount}</Text>
              <Text className={styles.ratingLabel}>累计接单</Text>
            </View>
            <View className={styles.ratingItem}>
              <Text className={styles.ratingValue}>{master.yearsOfExperience}</Text>
              <Text className={styles.ratingLabel}>从业年限</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>擅长技能</Text>
          <View className={styles.skills}>
            {master.skills.map((skill, idx) => (
              <Text key={idx} className={styles.skillTag}>
                {skill}
              </Text>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>价格范围</Text>
          <Text style={{ fontSize: '36rpx', fontWeight: 'bold', color: '#F53F3F' }}>
            ¥{master.priceRange.min} - ¥{master.priceRange.max}
          </Text>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>师傅简介</Text>
          <Text className={styles.description}>{master.description}</Text>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>资质证书</Text>
          <View className={styles.certificates}>
            {master.certificates.map((cert, idx) => (
              <View key={idx} className={styles.certItem}>
                <Text>📜</Text>
                <Text>{cert}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>服务区域</Text>
          <Text className={styles.description}>{master.address}</Text>
        </View>
      </ScrollView>

      <View className={styles.actionBar}>
        <View className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={handleContact}>
          <Text>联系师傅</Text>
        </View>
        <View className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={handleOrder}>
          <Text>立即下单</Text>
        </View>
      </View>
    </View>
  );
};

export default MasterDetailPage;
