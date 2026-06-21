import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import Tag from '../Tag';
import RateStars from '../RateStars';
import type { MasterInfo } from '@/types/user';
import { formatPrice } from '@/utils/index';

interface MasterCardProps {
  master: MasterInfo;
  matchScore?: number;
  showWilling?: boolean;
  customerWilling?: boolean;
  masterWilling?: boolean;
  isMatched?: boolean;
  isLocked?: boolean;
  lockedByMaster?: MasterInfo;
  isCurrentMaster?: boolean;
  onCustomerWilling?: (willing: boolean) => void;
  onMasterWilling?: (willing: boolean) => void;
  onClick?: () => void;
}

const MasterCard: React.FC<MasterCardProps> = ({
  master,
  matchScore,
  showWilling,
  customerWilling,
  masterWilling,
  isMatched,
  isLocked,
  lockedByMaster,
  isCurrentMaster,
  onCustomerWilling,
  onMasterWilling,
  onClick,
}) => {
  const isLockedByOther = isLocked && lockedByMaster && lockedByMaster.id !== master.id;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({ url: `/pages/master-detail/index?id=${master.id}` });
    }
  };

  return (
    <View className={`${styles.card} ${isLockedByOther ? styles.locked : ''}`} onClick={handleClick}>
      {isMatched && <View className={styles.matchedBadge}>🎉 互选成功</View>}
      {isLockedByOther && (
        <View className={styles.lockedBadge}>
          🔒 已由 {lockedByMaster?.name} 师傅接单
        </View>
      )}

      <View className={styles.header}>
        <View className={styles.left}>
          <Image className={styles.avatar} src={master.avatar} mode="aspectFill" />
          <View className={styles.info}>
            <View className={styles.nameRow}>
              <Text className={styles.name}>{master.name}</Text>
              {master.isOnline && <Tag text="在线" color="success" size="sm" />}
              {!master.isOnline && <Tag text="离线" color="default" size="sm" />}
            </View>
            <RateStars rating={master.rating} size="sm" />
            <View className={styles.stats}>
              <Text className={styles.stat}>接单 {master.orderCount}</Text>
              <Text className={styles.stat}>·</Text>
              <Text className={styles.stat}>从业 {master.yearsOfExperience}年</Text>
            </View>
          </View>
        </View>
        {matchScore !== undefined && (
          <View className={styles.score}>
            <Text className={styles.scoreValue}>{matchScore}</Text>
            <Text className={styles.scoreLabel}>契合度</Text>
          </View>
        )}
      </View>

      <View className={styles.skills}>
        {master.skills.map((skill, idx) => (
          <Tag key={idx} text={skill} color="primary" size="sm" />
        ))}
      </View>

      <View className={styles.footer}>
        <Text className={styles.priceRange}>
          {formatPrice(master.priceRange.min)} - {formatPrice(master.priceRange.max)}
        </Text>
        <Text className={styles.address}>📍 {master.address}</Text>
      </View>

      {showWilling && !isLockedByOther && (
        <View className={styles.willingSection}>
          <View className={styles.willingRow}>
            <Text className={styles.willingLabel}>客户意愿：</Text>
            <View className={styles.willingBtns}>
              <View
                className={`${styles.willingBtn} ${customerWilling ? styles.active : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCustomerWilling?.(true);
                }}
              >
                <Text>有意向</Text>
              </View>
              <View
                className={`${styles.willingBtn} ${!customerWilling && customerWilling !== undefined ? styles.inactive : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCustomerWilling?.(false);
                }}
              >
                <Text>暂无意向</Text>
              </View>
            </View>
          </View>
          <View className={styles.willingRow}>
            <Text className={styles.willingLabel}>师傅意愿：</Text>
            <View className={styles.willingBtns}>
              <View
                className={`${styles.willingBtn} ${masterWilling ? styles.active : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMasterWilling?.(true);
                }}
              >
                <Text>愿意接单</Text>
              </View>
              <View
                className={`${styles.willingBtn} ${!masterWilling && masterWilling !== undefined ? styles.inactive : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMasterWilling?.(false);
                }}
              >
                <Text>暂不接单</Text>
              </View>
            </View>
          </View>
          {isMatched && (
            <View className={styles.matchSuccess}>
              <Text>✅ 双方已确认意向，匹配成功！</Text>
            </View>
          )}
        </View>
      )}

      {isLockedByOther && (
        <View className={styles.lockedHint}>
          <Text>该订单已分配给 {lockedByMaster?.name} 师傅，不再接受其他意向</Text>
        </View>
      )}
    </View>
  );
};

export default MasterCard;
