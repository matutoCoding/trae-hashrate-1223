import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface TagProps {
  text: string;
  color?: 'primary' | 'warning' | 'danger' | 'success' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

const Tag: React.FC<TagProps> = ({ text, color = 'default', size = 'sm', className }) => {
  return (
    <View className={classnames(styles.tag, styles[color], styles[size], className)}>
      <Text>{text}</Text>
    </View>
  );
};

export default Tag;
