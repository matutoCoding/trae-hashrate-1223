import React, { useState, useMemo } from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useServiceStore } from '@/store/service';
import { useUserStore } from '@/store/user';
import { useMatchStore } from '@/store/match';
import type { ServiceType, PriorityLevel } from '@/types/service';

const PublishServicePage: React.FC = () => {
  const router = useRouter();
  const { serviceItems, addOrder, updateOrder } = useServiceStore();
  const { currentUser } = useUserStore();

  const preSelectedType = router.params?.type as ServiceType;

  const [selectedType, setSelectedType] = useState<ServiceType | null>(preSelectedType || null);
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');

  const selectedService = useMemo(
    () => serviceItems.find((s) => s.type === selectedType),
    [serviceItems, selectedType]
  );

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    let price = selectedService.basePrice * quantity;
    if (priority === 'urgent') price += 30;
    if (priority === 'vip') price += 50;
    return price;
  }, [selectedService, quantity, priority]);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleSubmit = () => {
    if (!selectedType) {
      Taro.showToast({ title: '请选择服务类型', icon: 'none' });
      return;
    }
    if (!address) {
      Taro.showToast({ title: '请填写服务地址', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '确认发布',
      content: `确认发布"${selectedService?.name}"服务需求吗？\n预估费用：¥${totalPrice}`,
      success: (res) => {
        if (res.confirm) {
          addOrder({
            customerId: currentUser?.id || 'c1',
            customerName: currentUser?.name || '用户',
            customerAvatar: currentUser?.avatar || '',
            serviceType: selectedType,
            serviceName: selectedService?.name || '',
            description,
            quantity,
            address,
            location: currentUser?.location || { lat: 39.9042, lng: 116.4074 },
            appointmentTime: appointmentTime || '尽快安排',
            priority,
            price: totalPrice,
            customerWilling: true,
          });

          Taro.showToast({ title: '发布成功', icon: 'success' });
          setTimeout(() => {
            Taro.switchTab({ url: '/pages/match/index' });
          }, 1500);
        }
      },
    });
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.page}>
      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>选择服务类型</Text>
        <View className={styles.serviceTypeGrid}>
          {serviceItems.map((item) => (
            <View
              key={item.id}
              className={classnames(styles.serviceTypeItem, selectedType === item.type && styles.active)}
              onClick={() => setSelectedType(item.type)}
            >
              <Text className={styles.serviceTypeIcon}>{item.icon}</Text>
              <Text className={styles.serviceTypeName}>{item.name}</Text>
              <Text className={styles.serviceTypePrice}>¥{item.basePrice}/{item.unit}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>服务详情</Text>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>数量</Text>
          <View className={styles.quantityControl}>
            <View className={styles.quantityBtn} onClick={() => handleQuantityChange(-1)}>
              <Text>−</Text>
            </View>
            <Text className={styles.quantityValue}>{quantity}</Text>
            <View className={styles.quantityBtn} onClick={() => handleQuantityChange(1)}>
              <Text>+</Text>
            </View>
          </View>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>服务描述（选填）</Text>
          <Textarea
            className={styles.formTextarea}
            placeholder="请描述您的具体需求，如刀具数量、修剪要求等"
            value={description}
            onInput={(e) => setDescription(e.detail.value)}
            maxlength={500}
          />
        </View>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>服务地址</Text>
          <Input
            className={styles.formInput}
            placeholder="请输入上门服务地址"
            value={address}
            onInput={(e) => setAddress(e.detail.value)}
          />
        </View>

        <View className={styles.formItem}>
          <Text className={styles.formLabel}>预约时间（选填）</Text>
          <Input
            className={styles.formInput}
            placeholder="如：今天下午 14:00"
            value={appointmentTime}
            onInput={(e) => setAppointmentTime(e.detail.value)}
          />
        </View>
      </View>

      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>优先级</Text>
        <View className={styles.priorityOptions}>
          <View
            className={classnames(styles.priorityOption, priority === 'normal' && styles.active)}
            onClick={() => setPriority('normal')}
          >
            <Text className={styles.priorityLabel}>普通</Text>
            <Text className={styles.priorityDesc}>正常排队</Text>
          </View>
          <View
            className={classnames(styles.priorityOption, styles.urgent, priority === 'urgent' && styles.active)}
            onClick={() => setPriority('urgent')}
          >
            <Text className={styles.priorityLabel}>加急</Text>
            <Text className={styles.priorityDesc}>+¥30 优先处理</Text>
          </View>
          <View
            className={classnames(styles.priorityOption, styles.vip, priority === 'vip' && styles.active)}
            onClick={() => setPriority('vip')}
          >
            <Text className={styles.priorityLabel}>VIP</Text>
            <Text className={styles.priorityDesc}>+¥50 最优先</Text>
          </View>
        </View>

        {selectedService && (
          <View className={styles.pricePreview}>
            <Text className={styles.priceLabel}>预估费用</Text>
            <Text className={styles.priceValue}>¥{totalPrice}</Text>
          </View>
        )}
      </View>

      <View className={styles.submitBar}>
        <View className={styles.cancelBtn} onClick={handleCancel}>
          <Text>取消</Text>
        </View>
        <View className={styles.submitBtn} onClick={handleSubmit}>
          <Text>发布需求</Text>
        </View>
      </View>
    </View>
  );
};

export default PublishServicePage;
