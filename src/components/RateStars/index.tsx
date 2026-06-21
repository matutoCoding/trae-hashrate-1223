import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface RateStarsProps {
  rating: number;
  maxRating?: number;
  showValue?: boolean;
  size?: 'sm' | 'md';
}

const RateStars: React.FC<RateStarsProps> = ({ rating, maxRating = 5, showValue = true, size = 'sm' }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalf ? 1 : 0);

  return (
    <View className={styles.rate}>
      <View className={styles.stars}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <Text key={`full-${i}`} className={styles[size]}>⭐</Text>
        ))}
        {hasHalf && <Text className={styles[size]}>☆</Text>}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Text key={`empty-${i}`} className={styles[`${size}Empty`]}>☆</Text>
        ))}
      </View>
      {showValue && <Text className={styles.value}>{rating.toFixed(1)}</Text>}
    </View>
  );
};

export default RateStars;
